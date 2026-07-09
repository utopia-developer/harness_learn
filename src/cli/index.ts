import { runCli } from "./run-cli.js";

const exitCode = await runCli({
  args: process.argv.slice(2),
  cwd: process.cwd(),
  write: (line) => process.stdout.write(`${line}\n`)
});

process.exitCode = exitCode;
