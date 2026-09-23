/**
 * Creates a sign-in user (there is no self-service signup).
 *
 *   npm run add-user -- --email you@example.com --name "Your Name"
 *   npm run add-user -- --email you@example.com --password 'secret' --name "Your Name"
 *   npm run add-user -- --email you@example.com --reset-password
 *   npm run add-user -- --list
 *
 * The password is prompted for (hidden) when --password is omitted.
 */
import "../env.js";
import { closePool, connectionHint, migrate } from "../db.js";
import { usersRepo } from "../auth.js";
import { Email } from "../types.js";
import { askHidden, parseArgs } from "../cli.js";

const args = parseArgs(process.argv.slice(2));

if (args.list) {
  try {
    await migrate();
  } catch (e) {
    console.error(connectionHint(e));
    process.exit(1);
  }
  const users = await usersRepo.list();
  if (users.length === 0) console.log("No users yet.");
  for (const u of users) console.log(`#${u.id}  ${u.email}  ${u.name}`);
  await closePool();
  process.exit(0);
}

const parsedEmail = Email.safeParse(typeof args.email === "string" ? args.email : "");
if (!parsedEmail.success) {
  console.error('Usage: npm run add-user -- --email you@example.com [--name "Your Name"] [--password ...] [--reset-password]');
  console.error("       npm run add-user -- --list");
  process.exit(1);
}
const email = parsedEmail.data;
const name = typeof args.name === "string" ? args.name : "";

let password = typeof args.password === "string" ? args.password : "";
if (!password) {
  password = await askHidden(`Password for ${email}: `);
  const again = await askHidden("Confirm password: ");
  if (password !== again) {
    console.error("Passwords don't match.");
    process.exit(1);
  }
}
if (password.length < 8) {
  console.error("Use a password of at least 8 characters.");
  process.exit(1);
}

try {
  await migrate();
} catch (e) {
  console.error(connectionHint(e));
  process.exit(1);
}
const existing = await usersRepo.findByEmail(email);
if (existing) {
  if (args["reset-password"]) {
    await usersRepo.setPassword(existing.id, password);
    console.log(`Password updated for ${email} (existing sessions were signed out).`);
  } else {
    console.error(`${email} already exists. Add --reset-password to change their password.`);
    await closePool();
    process.exit(1);
  }
} else {
  const user = await usersRepo.create(email, name, password);
  console.log(`Created user #${user.id} ${user.email}${user.name ? ` (${user.name})` : ""}.`);
}
await closePool();
