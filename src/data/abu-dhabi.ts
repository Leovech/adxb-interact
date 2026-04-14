// Abu Dhabi Real Estate data from ADREC (Abu Dhabi Real Estate Centre)
// Data loaded from pre-processed JSON at /public/data/transactions.json

export interface Transaction {
  id: number;
  date: string;
  assetClass: string;
  propertyType: string;
  sizeSqft: number;
  sizeSqm: number;
  bedrooms: number;
  layout: string;
  district: string;
  districtId: string;
  community: string;
  project: string;
  projectId: string;
  price: number;
  ratePerSqft: number;
  status: string; // "Off-Plan" | "Ready" | "Court" | "Other"
  sequence: string; // "Primary" | "Secondary" | "Other"
}

export interface District {
  id: string;
  name: string;
  count: number;
  projectCount: number;
}

export interface ProjectInfo {
  id: string;
  name: string;
  district: string;
  community: string;
  count: number;
}

export interface Hierarchy {
  districts: District[];
  projects: ProjectInfo[];
}

// Compact format from the pre-processed JSON
interface CompactData {
  l: {
    di: string[];   // district names
    pn: string[];   // project names
    co: string[];   // community codes
    ac: string[];   // asset classes
    pt: string[];   // property types
  };
  r: (string | number)[][]; // rows
}

const STATUS_MAP = ["Off-Plan", "Ready", "Court", "Other"];
const SEQUENCE_MAP = ["Primary", "Secondary", "Other"];

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function decodeTransactions(data: CompactData): Transaction[] {
  const { l, r } = data;
  return r.map((row, idx) => {
    const [date, acIdx, ptIdx, sizeSqft, bedrooms, diIdx, coIdx, pnIdx, price, rateSqft, statusCode, seqCode, sizeSqm] = row;
    const district = l.di[acIdx as number] ? l.di[diIdx as number] : "";
    const project = l.pn[pnIdx as number] || "";
    return {
      id: idx,
      date: date as string,
      assetClass: l.ac[acIdx as number] || "",
      propertyType: l.pt[ptIdx as number] || "",
      sizeSqft: sizeSqft as number,
      sizeSqm: sizeSqm as number,
      bedrooms: bedrooms as number,
      layout: "",
      district: l.di[diIdx as number] || "",
      districtId: slugify(l.di[diIdx as number] || ""),
      community: l.co[coIdx as number] || "",
      project,
      projectId: slugify(project),
      price: price as number,
      ratePerSqft: rateSqft as number,
      status: STATUS_MAP[(statusCode as number)] || "Other",
      sequence: SEQUENCE_MAP[(seqCode as number)] || "Other",
    };
  });
}

// Hierarchy helpers
export function getProjectsForDistrict(hierarchy: Hierarchy, districtName: string): ProjectInfo[] {
  return hierarchy.projects.filter(p => p.district === districtName);
}
