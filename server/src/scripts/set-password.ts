/**
 * Sets (resets) an existing user's password and signs out their sessions.
 *
 *   npm run set-password -- --email you@example.com                 (prompts, hidden)
 *   npm run set-password -- --email you@example.com --password '...'
 */
import "../env.js";
import { closePool, connectionHint, migrate } from "../db.js";
import { usersRepo } from "../auth.js";
import { Email } from "../types.js";
import { askHidden, parseArgs } from "../cli.js";

const args = parseArgs(process.argv.slice(2));

const parsedEmail = Email.safeParse(typeof args.email === "string" ? args.email : "");
if (!parsedEmail.success) {
  console.error("Usage: npm run set-password -- --email you@example.com [--password '...']");
  process.exit(1);
}
const email = parsedEmail.data;

try {
  await migrate();
} catch (e) {
  console.error(connectionHint(e));
  process.exit(1);
}
const user = await usersRepo.findByEmail(email);
if (!user) {
  console.error(`No user with email ${email}. Create one with: npm run add-user -- --email ${email}`);
  await closePool();
  process.exit(1);
}

let password = typeof args.password === "string" ? args.password : "";
if (!password) {
  password = await askHidden(`New password for ${email}: `);
  const again = await askHidden("Confirm password: ");
  if (password !== again) {
    console.error("Passwords don't match.");
    await closePool();
    process.exit(1);
  }
}
if (password.length < 8) {
  console.error("Use a password of at least 8 characters.");
  await closePool();
  process.exit(1);
}

await usersRepo.setPassword(user.id, password);
console.log(`Password updated for ${email}. Existing sessions were signed out.`);
await closePool();
