const child_process = require("child_process");
const fs = require("fs");
const path = require("path");

const buildPath = path.join(__dirname, "/../build");
fs.mkdirSync(buildPath, {recursive: true});
const htmlPath = path.join(buildPath, "index.html");

const docsPath = path.join(__dirname, "/../docs");

// Run everything from the docs/ folder, so that relative links work
process.chdir(docsPath);

const files = fs.readdirSync(docsPath)
    .filter(f => f.endsWith(".md"));

const roman = new Map([
  ["i", 1],
  ["ii", 2],
  ["iii", 3],
  ["iv", 4],
  ["v", 5],
  ["vi", 6],
])

/** @param {string} f */
function getNumbers(f) {
  if (f === "COPYRIGHT.md") return [-3];
  if (f === "TABLE_OF_CONTENTS.md") return [-2];
  if (f === "FOREWORD.md") return [-1];

  const parts = f.split(/-|\./);
  return parts.map(s => {
    if (roman.has(s)) return roman.get(s);
    const n = Number(s);
    return isNaN(n) ? s : n;
  });
}

function sorter(a, b) {
  const aParts = getNumbers(a);
  const bParts = getNumbers(b);
  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    // strings come before numbers, so i.1-header < i.1.1-sub
    if (Number.isInteger(aParts[i]) && !Number.isInteger(bParts[i])) return 1;
    if (!Number.isInteger(aParts[i]) && Number.isInteger(bParts[i])) return -1;
    if (aParts[i] < bParts[i]) return -1;
    if (aParts[i] > bParts[i]) return 1;
  }
  return aParts.length - bParts.length;
}
files.sort(sorter);

if (process.env.ECMA_TRIM) {
  files.splice(10, 999); // Useful for debugging
}

const metadata = {
  lang: 'en-US',
  title: 'ECMA-335',
  subtitle: 'Common Language Infrastructure (CLI)',
};
const metaArgs = Object.entries(metadata).map(([k, v]) => `--metadata "${k}=${v}"`).join(" ");


// Use --file-scope so links between markdown files are rewritten to links within HTML
const command = `pandoc ${metaArgs} --css pandoc.css --file-scope ${files.join(" ")} --standalone -o ${htmlPath}`;
// If passing 24k chars as CLI args is a problem, could use https://pandoc.org/MANUAL.html#option--defaults to pass the list of MD files?
const result = child_process.execSync(command);
console.log(result.toString());


// TODO go through custom styles.css and spot check results
