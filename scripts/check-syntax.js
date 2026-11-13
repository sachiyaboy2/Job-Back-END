#!/usr/bin/env node
/**
 * Syntax check every JavaScript file in the project.
 * Run with: npm run check
 */
import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scanDirs = ["src", "scripts"];
const ignored = new Set(["node_modules", ".git", "uploads", "coverage"]);

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full)));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(full);
  }

  return files;
}

async function main() {
  const files = [join(projectRoot, "index.js")];

  for (const dir of scanDirs) {
    const full = join(projectRoot, dir);
    try {
      await stat(full);
      files.push(...(await collect(full)));
    } catch {
      console.warn(`[check] Skipping missing directory: ${dir}`);
    }
  }

  console.log(`[check] Syntax-checking ${files.length} files...`);

  let failed = 0;

  for (const file of files) {
    const name = relative(projectRoot, file).replace(/\\/g, "/");
    try {
      await execFileAsync(process.execPath, ["--check", file]);
      console.log(`  ok    ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`  FAIL  ${name}`);
      console.error(`        ${(error.stderr || error.message).trim()}`);
    }
  }

  console.log("[check] Import-checking the route tree...");
  try {
    await import(pathToFileURL(join(projectRoot, "src/routes/index.js")).href);
    console.log("  ok    src/routes/index.js");
  } catch (error) {
    failed += 1;
    console.error("  FAIL  src/routes/index.js");
    console.error(`        ${error.message}`);
  }

  if (failed > 0) {
    console.error(`[check] FAILED with ${failed} error(s).`);
    process.exit(1);
  }

  console.log(`[check] All ${files.length} files are clean.`);
}

main().catch((error) => {
  console.error("[check] Unexpected error:", error);
  process.exit(1);
});
