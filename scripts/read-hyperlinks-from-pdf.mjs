/**
  This script downloads the ECMA pdf, and extracts the headings and hyperlinks from it.
  Then it tries to match the hyperlinks to the markdown files in the docs/ directory.
  It prints the diff if the link count is not the same.

  Code quality is not great, but it does a reliable job parsing these PDF and markdown files.

  When running, might warnings from PDF.js but these don't cause a problem with parsing:
    Warning: Cannot polyfill `DOMMatrix`, rendering may be broken.
    Warning: Cannot polyfill `Path2D`, rendering may be broken.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {getDocument} from "pdfjs-dist/legacy/build/pdf.mjs";
import {fileURLToPath} from "url";

const pdfPath = "/tmp/ecma.pdf";
if (!fs.existsSync(pdfPath)) {
  console.error("Downloading ECMA PDF");
  const response = await fetch("https://www.ecma-international.org/wp-content/uploads/ECMA-335_6th_edition_june_2012.pdf");
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(pdfPath, Buffer.from(buffer));
}
const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
const pdfDocument = await getDocument({ data: dataBuffer }).promise;

try {
  // Zero-out debugging log files
  fs.truncateSync("/tmp/headings.txt", 0);
  fs.truncateSync("/tmp/findLinks.txt", 0);
  fs.truncateSync("/tmp/currSection.txt", 0);
  fs.truncateSync("/tmp/groupings.txt", 0);
} catch {
  // Ignore any file-not-existing yet errors
}


async function getHeadingFont() {
  // Can't just hardcode i.e. "g_d0_f5" because it changes each time the script runs
  const FOREWORD_PAGE = 23;
  const forewordPage = await pdfDocument.getPage(FOREWORD_PAGE);
  const texts = await forewordPage.getTextContent();
  for (const item of texts.items) {
    if (item.str.includes("Foreword")) return item.fontName;
  }
  throw new Error("Foreword not found");
}

/** @returns {number} */
function makeY(p, y) {
  return p + (height - y) / height;
}

async function findHeadings() {
  const headings = [];
  const TOC_END = 22;
  for (let p = TOC_END; p <= pdfDocument.numPages; p++) {
    const page = await pdfDocument.getPage(p);
    const texts = await page.getTextContent();

    for (const item of texts.items) {
      const x = item.transform[4]; // https://dev.opera.com/articles/understanding-the-css-transforms-matrix/
      const y = item.transform[5]; // y was starting at 0 at bottom of page, increasing as we go up

      // Some heuristics to find only the headings
      let correctX = x < 91;
      let text = item.str.replace(/\s+/g, "");
      if (text.startsWith("Foreword") || text.startsWith("Partition")) {
        text = text.replace(/:/g, "");
      } else if (text.startsWith("TableI") || text.startsWith("CLSRule") || text.startsWith("Figure")) {
        fs.appendFileSync("/tmp/headings.txt", `Adding special entry: `);
        text = item.str;
        correctX = true;
      } else if (!text.startsWith("I") && !text.startsWith("V")) {
        continue; // not roman numeral
      } else if (!text.includes(".")) {
        continue;
      }

      if (!correctX || item.fontName != headingFont || item.str.length < 3)
        continue;

      fs.appendFileSync("/tmp/headings.txt", `${makeY(p, y)} ${text}\n`);
      headings.push([(makeY(p, y)), text]);
    }
  }
  return headings; // don't need to sort, they are returned by PDF lib in order
}

/** @returns {Promise<number>} */
async function getDest(p, annot) {
  if (annot.url) return annot.url;
  if (annot.unsafeUrl) return annot.unsafeUrl;

  if (!annot.dest)
    throw new Error("No dest: " + p + ":" + JSON.stringify(annot));
  const [ref, _name, _dx, dy, _dz] = annot.dest;
  const destPage = await pdfDocument.getPageIndex(ref);
  return makeY(destPage + 1, dy);
}

/** @returns {number[][]} */
async function findHyperlinks() {
  const hyperlinks = [];
  const TOC_END = 22;
  const seen = new Set();
  for (let p = TOC_END; p <= pdfDocument.numPages; p++) {
    const page = await pdfDocument.getPage(p);
    for (const annot of await page.getAnnotations()) {
      if (annot.subtype !== "Link") throw new Error(annot.subtype);

      /** @type {number[]} */
      const rect = annot.rect
      const [x, y, right, top] = rect;
      if (right === x && top === y) {
        fs.appendFileSync("/tmp/findLinks.txt", `SKIPPING_ZERO ${makeY(p, y)},${x} size==0\n`);
        continue
      }

      const key = JSON.stringify([p, ...annot.rect]);
      if (seen.has(key)) {
        fs.appendFileSync("/tmp/findLinks.txt", `SKIPPING_DUPE ${makeY(p, y)} ${key}\n`);
        continue;
      }
      seen.add(key);

      const width = right - x;
      const fromY = makeY(p, y);

      const lastLink = hyperlinks.length ? hyperlinks[hyperlinks.length - 1] : null;
      const lastFromY = lastLink ? lastLink[0] : null;
      const lastDest = lastLink ? lastLink[2] : null;
      const atLeftEdge = Math.abs(x - 87.75) < 0.1;
      const isFollowingLine = Math.abs(fromY - lastFromY) < 0.05;

      const linkDest = await getDest(p, annot);
      if (lastDest === linkDest && atLeftEdge && isFollowingLine) {
        // Skip the duplicate links that continued from the previous page
        fs.appendFileSync("/tmp/findLinks.txt", `SKIPPING_LEFT_DUPE ${makeY(p, y)},${x} ${width},${top - y} -> ${ linkDest }\n`);
        continue;
      }

      fs.appendFileSync("/tmp/findLinks.txt", `${makeY(p, y)},${x} ${width.toFixed(2)},${(top - y).toFixed(2)} ${key} -> ${ linkDest}\n`);
      hyperlinks.push([fromY, x, linkDest]);
    }
  }
  return hyperlinks;
  // Could sort it by y then maybe by x, but in practice doesn't seem to be necessary:
  // return hyperlinks.sort((a, b) => height * (a[0] - b[0]) + a[1] - b[1]);
}

function groupLinks() {
  // Zip together headings and links to find which links belong to which section
  let headI = 0, linkI = 0;
  /** @type {{y:number, text:string, links:number[]}} */
  let currSection = null;
  const allSections = [];
  while (headI < headings.length && linkI < hyperlinks.length) {
    const [headY, headText] = headings[headI];
    const [linkY, _x, linkDest] = hyperlinks[linkI];
    if (headY <= linkY) {
      if (headText.startsWith("Table I") || headText.startsWith("CLS Rule ") || headText.startsWith("Figure")) {
        fs.appendFileSync("/tmp/groupings.txt", `  SKIPPING! ${headText}\n`);
        headI++;
        continue;
      }
      fs.appendFileSync("/tmp/groupings.txt", `HEAD ${headY} ${headText}\n`);

      if (currSection && currSection.links.length) {
        fs.appendFileSync("/tmp/currSection.txt", JSON.stringify(currSection, null, 2) + "\n");
        allSections.push(currSection);
      }
      currSection = {y: headY, text: headText, links: []};
      headI++;
      continue;
    }
    fs.appendFileSync("/tmp/groupings.txt", `LINK ${linkY} ${linkDest}\n`);
    currSection.links.push(linkDest);
    linkI++;
    continue;
  }
  if (currSection && currSection.links.length) {
    fs.appendFileSync("/tmp/currSection.txt", JSON.stringify(currSection, null, 2) + "\n");
    allSections.push(currSection);
  }
  return allSections;
}

function resolveLink(link) {
  if (typeof link === "string") return link;

  const offsetLink = link + 0.015; // Links are slightly above the text
  const diffs = headings.map(([y, text]) => [Math.abs(y - offsetLink), text]);
  diffs.sort((a, b) => a[0] - b[0]);
  const [[diff, text], [diff2, text2]] = diffs;
  if (diff * 4 > diff2) {
    throw new Error(`Link ${link} not unique, closest is ${text} with ${diff} vs. ${text2} with ${diff2}`);
  }
  return text;
}

const height = (await pdfDocument.getPage(1)).view[3];
const headingFont = await getHeadingFont();
const headings = await findHeadings();
const hyperlinks = await findHyperlinks();
const allSections = groupLinks();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsPath = path.join(__dirname, "/../docs");
const mdFiles = fs.readdirSync(docsPath).filter(f => f.endsWith(".md"));


// These ignored sections are due to missing markdown files in this project: https://github.com/stakx/ecma-335/issues/9
function notDone(heading) {
  if (heading.startsWith("I.8.6.1.")) return true;
  if (/I.12.4.2.[4-8]/.test(heading)) return true;
  return false;
}

function findFileByHeading(heading) {
  if (heading.startsWith("http")) return heading;
  if (heading === "Foreword") return "foreword.md";

  if (notDone(heading)) return "#todo-not-done-file-" + heading.toLowerCase();
  if (heading.startsWith("file:///C:/Users/Joel")) return "#todo-users-joel";
  if (heading.startsWith("CLS Rule") || heading.startsWith("Partition") || heading.startsWith("Table") || heading.startsWith("Figure")) {
    return "#todo-" + heading.toLowerCase().replace(/ /g, "-");
  }

  heading = heading.replace("VI.Annex", "VI.");
  const [found, extra] = mdFiles.filter(f => f.startsWith(heading.toLowerCase() + "-"));
  if (!found) throw new Error("No file found for heading " + heading);
  if (extra) throw new Error(`Multiple files ${[found, extra]} found for ${heading}`);
  return found;
}

function linksInMd(f) {
  // Didn't want to use another library if a regex works
  const content = fs.readFileSync(path.join(docsPath, f), "utf-8");
  const regex = /\]\(([^\)]+)\)|(https?(?:(?!\. )\S)+)/g;
  const links = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const link = match[1] || match[2];
    if (link.endsWith(".png")) continue
    links.push(link);
  }
  return links;
}

function printDiff(arr1, arr2) {
  const s1 = arr1.map(s => " " + s).join("\n");
  const s2 = arr2.map(s => " " + s).join("\n");
  const file1 = "/tmp/diff-s1.tmp";
  const file2 = "/tmp/diff-s2.tmp";

  fs.writeFileSync(file1, s1 + "\n");
  fs.writeFileSync(file2, s2 + "\n");

  try {
    const diffOutput = execSync(`diff --color=always -U 9999 ${file1} ${file2}`, { encoding: 'utf8' });
    if (diffOutput) {
      console.log(diffOutput);
    }
  } catch (error) {
    if (error.status === 1) { // expected diff exit code if files are different
      const lines = error.stdout.toString().split("\n");
      if (lines[0].startsWith("---") && lines[1].startsWith("+++") && lines[2].startsWith("@@")) {
        lines.splice(0, 3);
      }
      console.log(lines.join("\n"));
    } else {
      throw new Error(`Error executing diff: ${error.message}`);
    }
  }
}

let problemCount = 0;
for (const sect of allSections) {
  // Issue in project docs/, should eventually remove:
  if (notDone(sect.text)) continue;

  // Issues in this script with parsing links. I manually checked all links in files:
  switch (sect.text) {
    case "II.6.2.1": continue; // Table cells overflow, too hard to de-dupe the links that overflow to next line within cell
    case "IV.7.1": continue; // Link to Figure 0-4 was too hard to parse
  }

  // Ignore sections with PDF weirdness. I manually checked all links in files:
  switch (sect.text) {
    case "I.12.1.4": continue; // The PDF links I.12.3.2.1 to I.12.3.1
    case "I.12.3.2": continue; // The PDF links I.12.3.2.1 to I.12.3.1
    case "I.12.4": continue; // The PDF references I.12.4.2 but should be I.12.4.2.3 -- also mentioned in https://github.com/stakx/ecma-335/pull/22
    case "II.4.2": continue; // PDF has extra C:/Users/Joel link overtop Partition VI
    case "II.5.3": continue; // PDF has extra C:/Users/Joel link overtop Partition VI
    case "II.5.4": continue; // The PDF link to II.25 is broken
    case "II.6.2.3": continue; // The PDF link to II.22.19 is broken
    case "II.6.4": continue; // The PDF links II.22.30 to II.22.16
    case "II.9.1": continue; // The PDF should link to i.8.7.3 but instead links to C:/Users/Joel...
    case "II.10.1.5": continue; // The PDF links II.23.1.15 to II.13
    case "II.10.1.7": continue; // the PDF links II.9.5 to II.10.5.3 (twice) TODO change to "text says" "but it links "
    case "II.10.2": continue; // The second PDF link to II.10.6 is broken
    case "II.10.3.2": continue; // The PDF link to II.22.27 is broken
    case "II.10.3.3": continue; // The PDF text says II.23.1.10 but it links to II.12
    case "II.14.6": continue; // The PDF links II.24.6.1 to II.10.5.1
    case "II.16": continue; // The PDF links II.5.4 to II.16.2
    case "II.17": continue; // The PDF links II.21 to "i.10.6-custom-attributes" instead of "ii.21-custom-attribute"
    case "II.22.2": continue; // The PDF link to II.23.1.1 is broken
    case "II.22.10": continue; // The PDF links II.21 to "i.10.6-custom-attributes" instead of "ii.21-custom-attribute"
    case "II.22.22": continue; // The PDF links 23.1.8 to II.23.1.7 but the content is at II.23.1.8... Also, the PDF link to II.23.1.7 is broken
    case "II.22.24": continue; // The PDF has two broken links to II.23.1.9
    case "II.22.26": continue; // Two problems: the link to II.15 is dead, but also the reference to II.23.1.10 should be to II.23.1.11 -- also mentioned in https://github.com/stakx/ecma-335/pull/22
    case "II.22.27": continue; // The PDF links to II.10.3.2 and II.15.4.1 are broken
    case "II.22.34": continue; // The PDF link to Partition I goes to C:/Users/...
    case "II.22.37": continue; // The PDF links II.23.1.15 to II.23.1.3
    case "II.23.2": continue; // The link on II.23.2.6 instead goes to II.23.2.10 (twice)
    case "II.24.2.6": continue; // The PDF links to II.22 are all broken
    case "II.25.4": continue; // The PDF the link to II.22.26 is broken
    case "II.25.4.5": continue; // The PDF links II.19 to "i.12.4.2-exception-handling.md" instead of "ii.19-exception-handling.md"
    case "III.1.8.1.1": continue; // The PDF links III.1.8.1.2.2 to III.1.5, III.2.3 to III.1.5, and III.4.28 to III.4.30
    case "III.3.45": continue; // The PDF links I.8.7.3 to I.8.7
    case "III.1.8.1.2.1": continue; // The PDF links III.1.8 to III.1.5
    case "III.4.2": continue; // The PDF links III.1.8 to III.1.5
    case "III.4.15": continue; // The PDF links III.1.8 to III.1.5 (twice)
  }


  // The PDF also references some sections plaintext without linking to them. I manually checked all links in files:
  switch (sect.text) {
    case "I.8.7": continue; // III.1.8.1.2.1 and Partition III
    case "I.11": continue; // unicode.org and Partition IV Library and I.8.6.1 and I.10.4 (twice) and Partition II (twice)
    case "I.12.6.4": continue; // Annex F of Partition VI
    case "II.9.1": continue; // Partition I, §8.9.9
    case "II.10.3.3": continue; // Table 7.1
    case "II.23.3": continue; // Annex B ref
    case "II.25.2.2.1": continue; // 25.3.3.1
    case "III.1.6": continue; // Table 8
    case "III.1.8": continue; // II.3
    case "III.1.8.1.2.3": continue; // Partition III
  }

  const pdfLinksAsMd = sect.links.map(resolveLink).map(findFileByHeading);

  const headingFile = findFileByHeading(sect.text);
  const linksInFile = linksInMd(headingFile);
  const mdLinks = linksInFile;

  if (sect.links.length != linksInFile.length) {
    ++problemCount;

    console.warn(`${sect.links.length} links in PDF vs. ${linksInFile.length} links in ${headingFile}`);
    printDiff(pdfLinksAsMd, mdLinks);
    continue;
  }

  if (pdfLinksAsMd.join("\n") === mdLinks.join("\n")) {
    // Section links are perfect!
    continue;
  }

  const donePdfLinks = pdfLinksAsMd.filter((link, i) => !link.startsWith("#todo") && !mdLinks[i].startsWith("#todo"));
  const doneMdLinks = mdLinks.filter((link, i) => !link.startsWith("#todo") && !pdfLinksAsMd[i].startsWith("#todo"));
  if (donePdfLinks.join("\n") !== doneMdLinks.join("\n")) {
    ++problemCount;
    console.warn(`DONE links in ${headingFile} do not match PDF links for ${sect.text}`);
    printDiff(pdfLinksAsMd, mdLinks);
  }

  // TODO fix the #todo- links in Markdown when the PDF isn't #todo-
  continue;
}

console.log(problemCount, "problems found");
