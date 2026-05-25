import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const errors = [];

function validateTsFile(path) {
  if (path.endsWith("tokens.ts")) return;
  const content = readFileSync(path, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/.test(line)) {
      errors.push(`${path}:${index + 1} hex hardcoded`);
    }
    if (/rgba?\(/.test(line)) {
      errors.push(`${path}:${index + 1} rgba hardcoded`);
    }
  });
}

function validateIndexCss(path) {
  const content = readFileSync(path, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    const hasHex = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/.test(line);
    if (!hasHex) return;
    const isTokenDeclaration = /^\s*--ui-color-[\w-]+:\s*#/.test(line);
    if (!isTokenDeclaration) {
      errors.push(`${path}:${index + 1} hex fora do token set CSS`);
    }
  });
}

const tsTargets = [
  ...globSync("src/app/pages/ProjectsPage/**/*.{ts,tsx}"),
  ...globSync("src/app/components/ui/**/*.{ts,tsx}")
];

tsTargets.forEach(validateTsFile);
validateIndexCss("src/index.css");

if (errors.length > 0) {
  console.error("UI hardcode check failed:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log("UI hardcode check passed.");
