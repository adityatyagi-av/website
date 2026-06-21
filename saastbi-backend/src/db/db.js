import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const db = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" },
    { emit: "event", level: "info" },
  ],
});

db.$on("query", (e) => {
  console.log("=== Prisma Query ===");
  console.log("Query:", e.query);
  console.log("Params:", e.params);
  console.log("Duration:", `${e.duration}ms`);
  console.log("====================");
});

db.$on("error", (e) => {
  console.error("=== Prisma Error ===");
  console.error(e);
  console.error("====================");
});

db.$on("warn", (e) => {
  console.warn("=== Prisma Warning ===");
  console.warn(e);
  console.warn("======================");
});

db.$on("info", (e) => {
  console.info("=== Prisma Info ===");
  console.info(e.message);
  console.info("===================");
});


export default db;