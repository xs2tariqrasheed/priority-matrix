/**
 * Seeds a user's task list with the initial items.
 *
 *   npm run seed -- --email you@example.com            (skips if the user already has items)
 *   npm run seed -- --email you@example.com --force    (replaces the user's items)
 *
 * --email can be omitted when exactly one user exists.
 */
import "./env.js";
import { closePool, connectionHint, migrate } from "./db.js";
import { usersRepo } from "./auth.js";
import { itemsRepo } from "./repo.js";
import type { ItemInput } from "./types.js";
import { parseArgs } from "./cli.js";

type Label = "PS" | "PL" | "VS" | "VL";

const seed: [area: string, category: string, title: string, label: Label][] = [
  ["Company", "Projects", "RC Main App", "VS"],
  ["Company", "Projects", "RC Payment with Stripe", "VS"],
  ["Company", "Projects", "RC Support Agent", "PL"],
  ["Company", "Projects", "BR Dispatch", "PL"],
  ["Company", "Projects", "BR Network", "VL"],
  ["Company", "Projects", "xyzCar", "PL"],
  ["Company", "Projects", "elite-ebill", "PS"],
  ["Company", "Projects", "dash-cam", "VS"],
  ["Company", "Projects", "product", "VS"],
  ["Company", "Portfolio", "Transportation", "VL"],
  ["Company", "Portfolio", "Creating Content", "VL"],
  ["Company", "Portfolio", "Building Portfolio", "VL"],
  ["Company", "Sales", "Outreach", "PS"],
  ["Company", "Website", "SEO", "PS"],
  ["Company", "Website", "CMS", "PS"],
  ["Company", "Website", "Content Pipelines", "PS"],
  ["Academia", "Math", "Stat 101", "PL"],
  ["Academia", "Math", "Calculus 1", "PL"],
  ["Academia", "Math", "Calculus 2", "PL"],
  ["Academia", "Math", "Linear Algebra", "PL"],
  ["Academia", "Math", "Matrix Calculus", "PL"],
  ["Academia", "Math", "Matrix Method of Machine Learning", "PL"],
  ["Academia", "NLP", "Assignments", "PS"],
  ["Academia", "NLP", "Quizzes", "PS"],
  ["Academia", "NLP", "Spacy", "PS"],
  ["Academia", "DS", "Data 100", "PL"],
  ["Academia", "DS", "Applied DS Book", "PL"],
  ["Job", "", "Job Applications", "PS"],
  ["Job", "", "Interview Questions and Interview Prep", "PS"],
  ["Job", "", "Showcase projects", "PL"],
];

const args = parseArgs(process.argv.slice(2));
const force = args.force === true;

try {
  await migrate();
} catch (e) {
  console.error(connectionHint(e));
  process.exit(1);
}

let user = typeof args.email === "string" ? await usersRepo.findByEmail(args.email) : undefined;
if (!user) {
  const users = await usersRepo.list();
  if (typeof args.email === "string") {
    console.error(`No user with email ${args.email}. Create one first: npm run add-user -- --email ${args.email}`);
  } else if (users.length === 1) {
    user = await usersRepo.findByEmail(users[0].email);
  } else if (users.length === 0) {
    console.error("No users yet. Create one first: npm run add-user -- --email you@example.com");
  } else {
    console.error("Several users exist; pass --email to choose one:");
    for (const u of users) console.error(`  ${u.email}`);
  }
  if (!user) {
    await closePool();
    process.exit(1);
  }
}

const existing = await itemsRepo.count(user.id);
if (existing > 0 && !force) {
  console.log(`${user.email} already has ${existing} items. Use "npm run seed -- --email ${user.email} --force" to replace them.`);
  await closePool();
  process.exit(0);
}
if (force) await itemsRepo.removeAll(user.id);

const rows: ItemInput[] = seed.map(([area, category, title, label]) => ({
  title,
  area,
  category,
  impact: label[0] as "P" | "V",
  focus: label[1] as "S" | "L",
  notes: "",
  done: false,
  allocatedMinutes: 0,
  spentMinutes: 0,
  progress: 0,
  deadline: null,
}));

await itemsRepo.insertMany(user.id, rows);
console.log(`Seeded ${rows.length} items for ${user.email}.`);
await closePool();
