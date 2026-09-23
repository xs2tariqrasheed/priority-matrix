/** Tiny helpers shared by the command-line scripts. */
import { EOL } from "node:os";
import readline from "node:readline";

/** Parses `--key value` and `--flag` arguments. */
export function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

export function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

const CODE_ENTER_LF = 10;
const CODE_ENTER_CR = 13;
const CODE_CTRL_C = 3;
const CODE_CTRL_D = 4;
const CODE_BACKSPACE = 8;
const CODE_DELETE = 127;

/** Prompts without echoing the typed characters. */
export function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    if (!stdin.isTTY) {
      // Piped input: read the first line.
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (c) => (data += c));
      stdin.on("end", () => resolve(data.split(/\r?\n/)[0] ?? ""));
      return;
    }
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        const code = ch.charCodeAt(0);
        if (code === CODE_ENTER_LF || code === CODE_ENTER_CR || code === CODE_CTRL_D) {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write(EOL);
          resolve(value);
          return;
        }
        if (code === CODE_CTRL_C) {
          stdout.write(EOL);
          process.exit(130);
        }
        if (code === CODE_DELETE || code === CODE_BACKSPACE) value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}
