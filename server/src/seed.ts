/**
 * Seeds the database with the initial list of items.
 * Run with: npm run seed   (add --force to wipe existing items first)
 */
import { db, repo } from "./db.js";
import type { ItemInput } from "./types.js";

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

const force = process.argv.includes("--force");

if (repo.count() > 0 && !force) {
  console.log(`Database already has ${repo.count()} items. Use "npm run seed -- --force" to replace them.`);
  process.exit(0);
}

if (force) db.exec("DELETE FROM items; DELETE FROM sqlite_sequence WHERE name = 'items';");

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
}));

repo.insertMany(rows);
console.log(`Seeded ${rows.length} items.`);
