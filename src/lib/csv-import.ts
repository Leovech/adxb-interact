/**
 * Shared CSV import logic — used by both the CLI script
 * (scripts/process-csv.mjs) and the web upload API endpoint
 * (/api/admin/import-csv). Pure functions, no IO.
 */

// --- Types -----------------------------------------------------------------

export interface CompactData {
  l: {
    di: string[];   // districts
    pn: string[];   // projects
    co: string[];   // communities
    ac: string[];   // asset classes
    pt: string[];   // property types
  };
  r: (string | number)[][];
}

export interface HierarchyOutput {
  districts: Array<{
    id: string;
    name: string;
    count: number;
    projectCount: number;
  }>;
  projects: Array<{
    id: string;
    name: string;
    district: string;
    community: string;
    count: number;
  }>;
}

export interface ImportResult {
  transactions: CompactData;
  hierarchy: HierarchyOutput;
  stats: {
    totalRows: number;
    validRows: number;
    skipped: number;
    districts: number;
    projects: number;
    communities: number;
    fileSizeBytes: number;
  };
}

// --- CSV parser (handles quoted fields) ------------------------------------

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1; // BOM

  while (i < text.length) {
    const row: string[] = [];
    while (i < text.length) {
      if (text[i] === '"') {
        i++;
        let field = "";
        while (i < text.length) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') { field += '"'; i += 2; }
            else { i++; break; }
          } else { field += text[i]; i++; }
        }
        row.push(field);
      } else {
        let field = "";
        while (i < text.length && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i]; i++;
        }
        row.push(field);
      }
      if (i < text.length && text[i] === ",") i++;
      else break;
    }
    while (i < text.length && (text[i] === "\n" || text[i] === "\r")) i++;
    if (row.length > 1) rows.push(row);
  }
  return rows;
}

// --- Field mappers ---------------------------------------------------------

function parseBedrooms(layout: string): number {
  if (!layout) return -1;
  const l = layout.toLowerCase().trim();
  if (l === "studio") return 0;
  const match = l.match(/^(\d+)\s*bed/);
  if (match) return parseInt(match[1]);
  if (l.includes("5+")) return 5;
  if (l.includes("6+")) return 6;
  return -1;
}

function mapPropertyType(rawType: string): string {
  const t = (rawType || "").toLowerCase().trim();
  if (t === "apartment") return "Apartment";
  if (t === "villa") return "Villa";
  if (t.includes("townhouse") || t.includes("attached villa")) return "Townhouse";
  if (t === "duplex") return "Duplex";
  if (t.includes("plot for villa") || t.includes("plot for townhouse") || t.includes("plot for residential")) return "Land";
  if (t.includes("plot for farm") || t === "farm") return "Land";
  if (t === "residential complex") return "Residential Complex";
  if (t === "office") return "Office";
  if (t === "retail" || t.includes("mall") || t.includes("market")) return "Retail";
  if (t.includes("commercial plot") || t.includes("other commercial")) return "Commercial";
  if (t.includes("penthouse")) return "Penthouse";
  return "Other";
}

function mapStatus(rawStatus: string): string {
  const s = (rawStatus || "").toLowerCase().trim();
  if (s === "off-plan") return "Off-Plan";
  if (s === "ready") return "Ready";
  if (s === "court-mandated") return "Court";
  return "Other";
}

function mapSequence(rawSeq: string): string {
  const s = (rawSeq || "").toLowerCase().trim();
  if (s === "primary") return "Primary";
  if (s === "secondary") return "Secondary";
  return "Other";
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// --- Main processor --------------------------------------------------------

export function processCsvText(csvText: string): ImportResult {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    throw new Error("CSV is empty or has only header");
  }

  const districtIndex = new Map<string, number>();
  const projectIndex = new Map<string, number>();
  const communityIndex = new Map<string, number>();
  const assetClassIndex = new Map<string, number>();
  const propertyTypeIndex = new Map<string, number>();

  const getOrAddIndex = (m: Map<string, number>, v: string): number => {
    const existing = m.get(v);
    if (existing !== undefined) return existing;
    const idx = m.size;
    m.set(v, idx);
    return idx;
  };

  const compactRows: (string | number)[][] = [];
  const districtSet = new Map<string, { id: string; projects: Set<string>; count: number }>();
  const projectSet = new Map<string, { id: string; district: string; community: string; count: number }>();

  let skipped = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 14) { skipped++; continue; }

    const [assetClass, rawPropertyType, date, soldAreaStr, landAreaStr, layout,
      district, community, projectName, priceStr, , rateStr,
      saleAppType, saleSequence] = row;

    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) { skipped++; continue; }

    const soldArea = parseFloat(soldAreaStr) || 0;
    const landArea = parseFloat(landAreaStr) || 0;
    const price = parseFloat(priceStr) || 0;
    const rateSqm = parseFloat(rateStr) || 0;

    const sizeSqm = soldArea > 0 ? soldArea : landArea;
    if (price <= 0) { skipped++; continue; }

    const sizeSqft = sizeSqm > 0 ? Math.round(sizeSqm * 10.7639) : 0;
    const rateSqft = rateSqm > 0
      ? Math.round(rateSqm / 10.7639)
      : (sizeSqft > 0 ? Math.round(price / sizeSqft) : 0);

    const propertyType = mapPropertyType(rawPropertyType);
    const status = mapStatus(saleAppType);
    const sequence = mapSequence(saleSequence);
    const bedrooms = parseBedrooms(layout);

    const districtId = slugify(district);
    const projectId = slugify(projectName);

    let dEntry = districtSet.get(district);
    if (!dEntry) {
      dEntry = { id: districtId, projects: new Set(), count: 0 };
      districtSet.set(district, dEntry);
    }
    dEntry.projects.add(projectName);
    dEntry.count++;

    let pEntry = projectSet.get(projectName);
    if (!pEntry) {
      pEntry = { id: projectId, district, community, count: 0 };
      projectSet.set(projectName, pEntry);
    }
    pEntry.count++;

    const diIdx = getOrAddIndex(districtIndex, district);
    const pnIdx = getOrAddIndex(projectIndex, projectName);
    const coIdx = getOrAddIndex(communityIndex, community);
    const acIdx = getOrAddIndex(assetClassIndex, assetClass.toLowerCase().trim());
    const ptIdx = getOrAddIndex(propertyTypeIndex, propertyType);

    const statusCode = status === "Off-Plan" ? 0 : status === "Ready" ? 1 : status === "Court" ? 2 : 3;
    const seqCode = sequence === "Primary" ? 0 : sequence === "Secondary" ? 1 : 2;

    compactRows.push([
      date, acIdx, ptIdx, sizeSqft, bedrooms, diIdx, coIdx, pnIdx,
      Math.round(price), rateSqft, statusCode, seqCode,
      Math.round(sizeSqm * 100) / 100,
    ]);
  }

  const hierarchy: HierarchyOutput = {
    districts: Array.from(districtSet.entries())
      .map(([name, data]) => ({
        id: data.id, name,
        count: data.count, projectCount: data.projects.size,
      }))
      .sort((a, b) => b.count - a.count),
    projects: Array.from(projectSet.entries())
      .map(([name, data]) => ({
        id: data.id, name,
        district: data.district, community: data.community,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count),
  };

  const transactions: CompactData = {
    l: {
      di: Array.from(districtIndex.keys()),
      pn: Array.from(projectIndex.keys()),
      co: Array.from(communityIndex.keys()),
      ac: Array.from(assetClassIndex.keys()),
      pt: Array.from(propertyTypeIndex.keys()),
    },
    r: compactRows,
  };

  const txJson = JSON.stringify(transactions);

  return {
    transactions,
    hierarchy,
    stats: {
      totalRows: rows.length - 1,
      validRows: compactRows.length,
      skipped,
      districts: hierarchy.districts.length,
      projects: hierarchy.projects.length,
      communities: transactions.l.co.length,
      fileSizeBytes: Buffer.byteLength(txJson, "utf8"),
    },
  };
}
