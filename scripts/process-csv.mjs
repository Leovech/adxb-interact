#!/usr/bin/env node
/**
 * Processes ADREC CSV export into optimized JSON for the web app.
 * Run: node scripts/process-csv.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// -- CSV Parser that handles quoted fields --
function parseCSV(text) {
  const rows = [];
  let i = 0;
  // Skip BOM
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  while (i < text.length) {
    const row = [];
    while (i < text.length) {
      if (text[i] === '"') {
        // Quoted field
        i++; // skip opening quote
        let field = "";
        while (i < text.length) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        row.push(field);
      } else {
        // Unquoted field
        let field = "";
        while (i < text.length && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i];
          i++;
        }
        row.push(field);
      }
      if (i < text.length && text[i] === ",") {
        i++; // skip comma
      } else {
        break; // end of row
      }
    }
    // Skip line endings
    while (i < text.length && (text[i] === "\n" || text[i] === "\r")) i++;
    if (row.length > 1) rows.push(row);
  }
  return rows;
}

function parseBedrooms(layout) {
  if (!layout) return -1;
  const l = layout.toLowerCase().trim();
  if (l === "studio") return 0;
  const match = l.match(/^(\d+)\s*bed/);
  if (match) return parseInt(match[1]);
  if (l.includes("5+")) return 5;
  if (l.includes("6+")) return 6;
  return -1; // unclassified / commercial
}

function mapPropertyType(rawType) {
  const t = (rawType || "").toLowerCase().trim();
  if (t === "apartment") return "Apartment";
  if (t === "villa") return "Villa";
  if (t.includes("townhouse") || t.includes("attached villa")) return "Townhouse";
  if (t === "duplex") return "Duplex";
  if (t.includes("plot for villa") || t.includes("plot for townhouse") || t.includes("plot for residential")) return "Land";
  if (t.includes("plot for farm") || t === "farm") return "Land";
  if (t === "residential complex") return "Residential Complex";
  if (t === "office") return "Office";
  if (t === "retail" || t.includes("mall") || t.includes("market") || t.includes("retail")) return "Retail";
  if (t.includes("commercial plot") || t.includes("other commercial")) return "Commercial";
  if (t.includes("penthouse")) return "Penthouse";
  return "Other";
}

function mapStatus(rawStatus) {
  const s = (rawStatus || "").toLowerCase().trim();
  if (s === "off-plan") return "Off-Plan";
  if (s === "ready") return "Ready";
  if (s === "court-mandated") return "Court";
  return "Other";
}

function mapSequence(rawSeq) {
  const s = (rawSeq || "").toLowerCase().trim();
  if (s === "primary") return "Primary";
  if (s === "secondary") return "Secondary";
  return "Other";
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---- Main ----
// Accept CSV path as CLI arg, fall back to ./recent_sales.csv
const cliPath = process.argv[2];
const csvPath = cliPath
  ? (cliPath.startsWith("/") ? cliPath : join(process.cwd(), cliPath))
  : join(ROOT, "recent_sales.csv");

console.log(`Reading CSV from: ${csvPath}`);
const csvText = readFileSync(csvPath, "utf-8");

console.log("Parsing CSV...");
const rows = parseCSV(csvText);
const header = rows[0];
console.log(`Header: ${header.join(" | ")}`);
console.log(`Total rows (incl header): ${rows.length}`);

// String index helpers for compact encoding
const districtIndex = new Map();
const projectIndex = new Map();
const communityIndex = new Map();
const assetClassIndex = new Map();
const propertyTypeIndex = new Map();

function getOrAddIndex(map, value) {
  if (map.has(value)) return map.get(value);
  const idx = map.size;
  map.set(value, idx);
  return idx;
}

// Build transactions
const compactRows = [];
const districtSet = new Map(); // name -> { count, projects }
const projectSet = new Map();  // name -> { district, count }

let skipped = 0;
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (row.length < 14) { skipped++; continue; }

  const [assetClass, rawPropertyType, date, soldAreaStr, landAreaStr, layout,
    district, community, projectName, priceStr, shareStr, rateStr,
    saleAppType, saleSequence] = row;

  // Validate date
  if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) { skipped++; continue; }

  const soldArea = parseFloat(soldAreaStr) || 0;
  const landArea = parseFloat(landAreaStr) || 0;
  const price = parseFloat(priceStr) || 0;
  const rateSqm = parseFloat(rateStr) || 0;
  const share = parseFloat(shareStr) || 1;

  // Use sold area, fall back to land area for plots/villas
  const sizeSqm = soldArea > 0 ? soldArea : landArea;

  // Skip only zero-price rows (keep zero-size as they may be valid)
  if (price <= 0) { skipped++; continue; }

  const sizeSqft = sizeSqm > 0 ? Math.round(sizeSqm * 10.7639) : 0;
  const rateSqft = rateSqm > 0 ? Math.round(rateSqm / 10.7639) : (sizeSqft > 0 ? Math.round(price / sizeSqft) : 0);

  const propertyType = mapPropertyType(rawPropertyType);
  const status = mapStatus(saleAppType);
  const sequence = mapSequence(saleSequence);
  const bedrooms = parseBedrooms(layout);

  const districtId = slugify(district);
  const projectId = slugify(projectName);

  // Track hierarchy
  if (!districtSet.has(district)) {
    districtSet.set(district, { id: districtId, projects: new Set(), count: 0 });
  }
  districtSet.get(district).projects.add(projectName);
  districtSet.get(district).count++;

  if (!projectSet.has(projectName)) {
    projectSet.set(projectName, { id: projectId, district, community, count: 0 });
  }
  projectSet.get(projectName).count++;

  // Use string indices to save space
  const diIdx = getOrAddIndex(districtIndex, district);
  const pnIdx = getOrAddIndex(projectIndex, projectName);
  const coIdx = getOrAddIndex(communityIndex, community);
  const acIdx = getOrAddIndex(assetClassIndex, assetClass.toLowerCase().trim());
  const ptIdx = getOrAddIndex(propertyTypeIndex, propertyType);

  // Compact array format: [date, acIdx, ptIdx, sizeSqft, bedrooms, diIdx, coIdx, pnIdx, price, rateSqft, statusCode, sequenceCode]
  // statusCode: 0=Off-Plan, 1=Ready, 2=Court, 3=Other
  // sequenceCode: 0=Primary, 1=Secondary, 2=Other
  const statusCode = status === "Off-Plan" ? 0 : status === "Ready" ? 1 : status === "Court" ? 2 : 3;
  const seqCode = sequence === "Primary" ? 0 : sequence === "Secondary" ? 1 : 2;

  compactRows.push([
    date, acIdx, ptIdx, sizeSqft, bedrooms, diIdx, coIdx, pnIdx,
    Math.round(price), rateSqft, statusCode, seqCode,
    Math.round(sizeSqm * 100) / 100, // keep sqm for display
  ]);
}

console.log(`Parsed: ${compactRows.length} valid transactions (${skipped} skipped)`);

// Build hierarchy
const hierarchy = {
  districts: Array.from(districtSet.entries())
    .map(([name, data]) => ({
      id: data.id,
      name,
      count: data.count,
      projectCount: data.projects.size,
    }))
    .sort((a, b) => b.count - a.count),

  projects: Array.from(projectSet.entries())
    .map(([name, data]) => ({
      id: data.id,
      name,
      district: data.district,
      community: data.community,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count),
};

// Build lookup tables
const lookups = {
  di: Array.from(districtIndex.keys()),    // districts
  pn: Array.from(projectIndex.keys()),     // projects
  co: Array.from(communityIndex.keys()),   // communities
  ac: Array.from(assetClassIndex.keys()),  // asset classes
  pt: Array.from(propertyTypeIndex.keys()),// property types
};

// Write output: single file with lookups + rows
const output = { l: lookups, r: compactRows };

console.log("Writing JSON files...");

writeFileSync(
  join(ROOT, "public/data/transactions.json"),
  JSON.stringify(output),
  "utf-8"
);

writeFileSync(
  join(ROOT, "public/data/hierarchy.json"),
  JSON.stringify(hierarchy, null, 0),
  "utf-8"
);

const fileSize = Buffer.byteLength(JSON.stringify(output));
console.log(`\nDone!`);
console.log(`  transactions.json: ${(fileSize / 1024 / 1024).toFixed(1)} MB (${compactRows.length} rows)`);
console.log(`  hierarchy.json: districts=${hierarchy.districts.length}, projects=${hierarchy.projects.length}`);
console.log(`  Lookups: ${lookups.di.length} districts, ${lookups.pn.length} projects, ${lookups.co.length} communities`);
console.log(`\nDate range: ${compactRows[compactRows.length - 1][0]} to ${compactRows[0][0]}`);
console.log(`\nTop districts:`);
hierarchy.districts.slice(0, 10).forEach(d => {
  console.log(`  ${d.name}: ${d.count.toLocaleString()} tx, ${d.projectCount} projects`);
});
