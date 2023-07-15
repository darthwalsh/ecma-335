const child_process = require("child_process");
const fs = require("fs");
const path = require("path");

const buildPath = path.join(__dirname, "/../build");
fs.rmSync(buildPath, {recursive: true, force: true});
fs.mkdirSync(buildPath, {recursive: true});
const htmlPath = path.join(buildPath, "index.html");

const docsPath = path.join(__dirname, "/../docs");

// Run everything from the docs/ folder, so that relative links work
process.chdir(docsPath);

const mdFiles = [];
for (const f of fs.readdirSync(docsPath)) {
  if (f.endsWith(".md")) {
    mdFiles.push(f);
  } else if (f.endsWith(".png")) {
    fs.copyFileSync(path.join(docsPath, f), path.join(buildPath, f));
  } else {
    throw new Error(`Unexpected file docs/${f}`);
  }
};
fs.copyFileSync(path.join(__dirname, "pandoc.css"), path.join(buildPath, "pandoc.css"));
fs.copyFileSync(path.join(__dirname, "favicon.png"), path.join(buildPath, "favicon.png"));


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
mdFiles.sort(sorter);

if (process.env.ECMA_TRIM) {
  mdFiles.splice(Number(process.env.ECMA_TRIM), 9999); // Make the HTML smaller, helps debugging
}

const metadata = {
  lang: 'en-US',
  title: 'ECMA-335',
  subtitle: 'Common Language Infrastructure (CLI)',
};

/* Specify the source dialect as Github Flavored Markdown (GFM) https://github.github.com/gfm/
Ensures semantics of markdown are parsed like the preview at github.com:
- Fixes bare URLs so they are auto-linked
- Fixes parsing of _ within words
- Fixes allowing <p> in a table cell

But disable the default extension gfm_auto_identifiers which mangles ids, removing the . from file names in the HTML ids
*/
const from_gfm = "--from gfm-gfm_auto_identifiers";

const command = [
  "pandoc",
  ...Object.entries(metadata).map(([k, v]) => `--metadata "${k}=${v}"`),
  `"--include-in-header=${path.join(__dirname, "search.html")}"`,
  "--css pandoc.css",
  "--file-scope", // causes links between markdown files to be rewritten to links within HTML
  from_gfm,
  ...mdFiles,
  "--standalone", // generate a full HTML document
  `-o "${htmlPath}"`,
].join(" ");
// If passing 24k chars as CLI args is a problem, could use https://pandoc.org/MANUAL.html#option--defaults to pass the list of MD files?

child_process.execSync(command, {stdio: "inherit"});

// TODO go through custom styles.css and spot check results
