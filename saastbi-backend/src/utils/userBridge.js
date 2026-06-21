import db from "../db/db.js";

async function generateUniqueUsername(firstName, lastName, tx) {
  const client = tx || db;
  const base = `${firstName}${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  let username = base || "user";
  let isUnique = false;

  while (!isUnique) {
    const exists = await client.user.findUnique({ where: { username } });
    if (!exists) isUnique = true;
    else username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return username;
}

async function generateUniquePageSlug(name, tx) {
  const client = tx || db;
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  let slug = base || "organization";
  let isUnique = false;

  while (!isUnique) {
    const exists = await client.page.findUnique({ where: { slug } });
    if (!exists) isUnique = true;
    else slug = `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return slug;
}

async function findOrCreateEcosystemUser({ email, name, passwordHash, tx }) {
  const client = tx || db;

  const existingUser = await client.user.findUnique({
    where: { email },
    select: { id: true, username: true, email: true, firstName: true, lastName: true },
  });

  if (existingUser) {
    const hasRole = await client.userRole.findUnique({
      where: {
        userId_roleType: {
          userId: existingUser.id,
          roleType: "INCUBATION_PERSON",
        },
      },
    });
    if (!hasRole) {
      await client.userRole.create({
        data: {
          userId: existingUser.id,
          roleType: "INCUBATION_PERSON",
          isPrimary: false,
        },
      });
    }
    return existingUser;
  }

  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || "User";
  const lastName = nameParts.slice(1).join(" ") || "";
  const username = await generateUniqueUsername(firstName, lastName, client);

  const newUser = await client.user.create({
    data: {
      username,
      email,
      passwordHash,
      firstName,
      lastName,
      emailVerified: true,
      profileCurrentStage: 1,
      isActive: true,
    },
    select: { id: true, username: true, email: true, firstName: true, lastName: true },
  });

  await client.userRole.create({
    data: {
      userId: newUser.id,
      roleType: "INCUBATION_PERSON",
      isPrimary: true,
    },
  });

  return newUser;
}

export { generateUniqueUsername, generateUniquePageSlug, findOrCreateEcosystemUser };
