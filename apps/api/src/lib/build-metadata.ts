import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readApiPackageJson(): { version: string } {
  const packagePath = path.join(API_PACKAGE_ROOT, "package.json");
  const raw = fs.readFileSync(packagePath, "utf-8");
  const parsed = JSON.parse(raw) as { version?: string };

  if (!parsed.version) {
    throw new Error(`Missing version in ${packagePath}`);
  }

  return { version: parsed.version };
}

export const apiVersion = readApiPackageJson().version;
