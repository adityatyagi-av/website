import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = resolve(__dirname, "..", "src/routes/incubation/portal");

// Routes that intentionally have no requireAccess gate. Key: "METHOD PATH".
const ALLOWLIST = {
  "GET /me/access": "DISCOVERY",

  "POST /check-tenant": "PUBLIC_AUTH",
  "POST /sign-up": "PUBLIC_AUTH",
  "POST /resend-otp": "PUBLIC_AUTH",
  "POST /verify-otp": "PUBLIC_AUTH",
  "POST /login": "PUBLIC_AUTH",
  "POST /select-tenant": "PUBLIC_AUTH",
  "GET /refresh": "PUBLIC_AUTH",
  "POST /forgot-password": "PUBLIC_AUTH",
  "POST /verify-forgot-otp": "PUBLIC_AUTH",
  "POST /reset-password": "PUBLIC_AUTH",
  "GET /logout": "PUBLIC_AUTH",

  "GET /profile": "SELF_EDIT",
  "POST /update-profile": "SELF_EDIT",

  "GET /tenant/get-tenant-info": "PUBLIC_AUTH",
};

const VERB_RE =
  /^\s*([A-Za-z_][A-Za-z0-9_]*)\.(get|post|put|patch|delete)\s*\(\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/;

const GATE_TOKENS = /\b(requireAccess|requireAccessByMethod)\s*\(/;

function listRouteFiles(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".route.js"))
    .map((f) => join(dir, f))
    .sort();
}

function hasRouterLevelGate(text) {
  // Detect `Router.use(...)` calls (potentially multi-line) that contain a
  // gate token. The `.use(` form applies middleware to every route below it.
  const useRe = /\.\s*use\s*\(/g;
  let m;
  while ((m = useRe.exec(text)) !== null) {
    let depth = 1;
    let i = useRe.lastIndex;
    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      i++;
    }
    const block = text.slice(m.index, i);
    if (GATE_TOKENS.test(block)) return true;
  }
  return false;
}

function extractCallBlock(lines, startIdx) {
  let depth = 0;
  let started = false;
  const collected = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    collected.push(line);
    for (const ch of line) {
      if (ch === "(") {
        depth++;
        started = true;
      } else if (ch === ")") {
        depth--;
      }
    }
    if (started && depth === 0) break;
  }
  return collected.join("\n");
}

function findGatedHelpers(text) {
  // Detect single-line helper declarations that wrap requireAccess, e.g.
  //   const management = (action) => [authenticatePortal, requireAccess({...})];
  // Any route call that spreads the helper (`...management(ACTIONS.R)`) is gated.
  const names = new Set();
  const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=[^\n]*\b(?:requireAccess|requireAccessByMethod)\s*\(/g;
  let m;
  while ((m = re.exec(text)) !== null) names.add(m[1]);
  return names;
}

function scanFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  const fileGated = hasRouterLevelGate(text);
  const helpers = findGatedHelpers(text);
  const helperRe = helpers.size
    ? new RegExp(`\\.\\.\\.\\s*(?:${[...helpers].join("|")})\\s*\\(`)
    : null;
  const lines = text.split("\n");
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(VERB_RE);
    if (!m) continue;

    const method = m[2].toUpperCase();
    const path = m[3] ?? m[4] ?? m[5];
    const block = extractCallBlock(lines, i);
    const hasGate =
      fileGated ||
      GATE_TOKENS.test(block) ||
      (helperRe !== null && helperRe.test(block));

    rows.push({ file: filePath, line: i + 1, method, path, hasGate });
  }

  return rows;
}

function classify(row) {
  if (row.hasGate) return "OK";
  const key = `${row.method} ${row.path}`;
  if (ALLOWLIST[key]) return `ALLOWLISTED (${ALLOWLIST[key]})`;
  return "MISSING";
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function main() {
  const files = listRouteFiles(ROUTES_DIR);
  const allRows = files.flatMap(scanFile);

  let missing = 0;
  let ok = 0;
  let allowlisted = 0;

  console.log(
    pad("FILE", 55) + pad("LINE", 6) + pad("METHOD", 8) + pad("PATH", 55) + "STATUS"
  );
  console.log("-".repeat(150));

  for (const row of allRows) {
    const status = classify(row);
    if (status === "OK") ok++;
    else if (status === "MISSING") missing++;
    else allowlisted++;

    const rel = row.file.replace(resolve(__dirname, ".."), "");
    console.log(
      pad(rel, 55) +
        pad(row.line, 6) +
        pad(row.method, 8) +
        pad(row.path, 55) +
        status
    );
  }

  console.log("-".repeat(150));
  console.log(
    `TOTAL=${allRows.length}  OK=${ok}  ALLOWLISTED=${allowlisted}  MISSING=${missing}`
  );

  if (missing > 0) {
    console.error(
      `\nFAIL: ${missing} portal route(s) are missing requireAccess and are not on the allowlist.`
    );
    process.exit(1);
  }
}

main();
