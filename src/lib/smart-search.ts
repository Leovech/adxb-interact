import { FilterState, defaultFilters } from "./filters";
import { Hierarchy } from "@/data/abu-dhabi";

/**
 * Smart search: parses a natural language query and applies matching filters.
 * Examples:
 *   "villa yas island ready 3 bedroom" → propertyType=Villa, district=Yas Island, status=Ready, bedrooms=3
 *   "apartment reem island off plan 2br" → propertyType=Apartment, district=Al Reem Island, status=Off-Plan, bedrooms=2
 *   "land al reef primary" → propertyType=Land, district=Al Reef, sequence=Primary
 *   "studio masdar city" → bedrooms=0, district=Masdar City
 */

interface ParseResult {
  filters: Partial<FilterState>;
  matchedTerms: string[]; // which parts of the query were consumed
  remainingQuery: string; // what's left for text search
}

/**
 * Normalize a string for fuzzy matching:
 *  - lowercase
 *  - strip diacritics (Saadiyat vs Saʿādiyāt, Muhammad vs Muḥammad)
 *  - strip quotes, dashes, underscores
 *  - collapse whitespace
 * Keeps non-Latin scripts (Arabic, Russian, CJK) intact — the NFD/replace
 * dance only affects combining marks, not the base glyph.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining diacritical marks
    // Standalone transliteration letters (ʿayn, ʾalif, etc.) aren't
    // combining marks — strip them to a space so "Saʿādiyāt" normalises
    // to the same tokens as "Saadiyat".
    .replace(/[ʿʾʻʼʽ]/g, " ")
    .replace(/[‘’'`"“”]/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Keyword maps for property types
const propertyTypeKeywords: Record<string, string> = {
  apartment: "Apartment",
  apartments: "Apartment",
  flat: "Apartment",
  flats: "Apartment",
  villa: "Villa",
  villas: "Villa",
  townhouse: "Townhouse",
  townhouses: "Townhouse",
  "town house": "Townhouse",
  duplex: "Duplex",
  land: "Land",
  plot: "Land",
  plots: "Land",
  penthouse: "Penthouse",
  penthouses: "Penthouse",
  office: "Office",
  offices: "Office",
  retail: "Retail",
  shop: "Retail",
  shops: "Retail",
  // Arabic keywords
  "شقة": "Apartment",
  "شقق": "Apartment",
  "فيلا": "Villa",
  "فلل": "Villa",
  "تاون هاوس": "Townhouse",
  "دوبلكس": "Duplex",
  "أرض": "Land",
  "بنتهاوس": "Penthouse",
  "مكتب": "Office",
  // Russian keywords
  "квартира": "Apartment",
  "вилла": "Villa",
  "таунхаус": "Townhouse",
  "земля": "Land",
  "пентхаус": "Penthouse",
  "офис": "Office",
};

// Status keywords
const statusKeywords: Record<string, string> = {
  "off-plan": "Off-Plan",
  "offplan": "Off-Plan",
  "off plan": "Off-Plan",
  "under construction": "Off-Plan",
  ready: "Ready",
  completed: "Ready",
  "على الخارطة": "Off-Plan",
  "جاهز": "Ready",
  "строящиеся": "Off-Plan",
  "готово": "Ready",
};

// Sequence keywords
const sequenceKeywords: Record<string, string> = {
  primary: "Primary",
  "first sale": "Primary",
  "new sale": "Primary",
  secondary: "Secondary",
  resale: "Secondary",
  "re-sale": "Secondary",
  "أولي": "Primary",
  "ثانوي": "Secondary",
  "первичная": "Primary",
  "вторичная": "Secondary",
};

// Bedroom keywords
const bedroomKeywords: Record<string, string> = {
  studio: "0",
  "استوديو": "0",
  "студия": "0",
  "1br": "1",
  "1 br": "1",
  "1bed": "1",
  "1 bed": "1",
  "1 bedroom": "1",
  "1bedroom": "1",
  "2br": "2",
  "2 br": "2",
  "2bed": "2",
  "2 bed": "2",
  "2 bedroom": "2",
  "2bedroom": "2",
  "3br": "3",
  "3 br": "3",
  "3bed": "3",
  "3 bed": "3",
  "3 bedroom": "3",
  "3bedroom": "3",
  "4br": "4",
  "4 br": "4",
  "4bed": "4",
  "4 bed": "4",
  "4 bedroom": "4",
  "4bedroom": "4",
  "5br": "5",
  "5 br": "5",
  "5bed": "5",
  "5 bed": "5",
  "5 bedroom": "5",
  "5bedroom": "5",
  "6br": "6+",
  "6 br": "6+",
  "6+ br": "6+",
  "6 bedroom": "6+",
  "6+bedroom": "6+",
};

// Asset class keywords
const assetClassKeywords: Record<string, string> = {
  residential: "residential",
  commercial: "commercial",
  agricultural: "agricultural",
  "سكني": "residential",
  "تجاري": "commercial",
  "زراعي": "agricultural",
  "жилая": "residential",
  "коммерческая": "commercial",
};

export function parseSmartSearch(
  query: string,
  hierarchy: Hierarchy
): ParseResult {
  if (!query.trim()) {
    return { filters: {}, matchedTerms: [], remainingQuery: "" };
  }

  const filters: Partial<FilterState> = {};
  const matchedTerms: string[] = [];
  // Normalize so "sa'adiyat", "saadiyat", and "Saadiyat" all match.
  let remaining = normalize(query);

  // Helper: try to match and consume a term from remaining
  function tryMatch(
    keywords: Record<string, string>,
    onMatch: (value: string, matched: string) => void
  ) {
    // Sort by length descending so "off plan" matches before "off"
    const sorted = Object.entries(keywords).sort(
      (a, b) => b[0].length - a[0].length
    );
    for (const [keyword, value] of sorted) {
      const idx = remaining.indexOf(keyword);
      if (idx !== -1) {
        // Check word boundaries (don't match "apartment" inside "apartments2")
        const before = idx > 0 ? remaining[idx - 1] : " ";
        const after =
          idx + keyword.length < remaining.length
            ? remaining[idx + keyword.length]
            : " ";
        if (
          (before === " " || before === "," || idx === 0) &&
          (after === " " || after === "," || idx + keyword.length === remaining.length)
        ) {
          onMatch(value, keyword);
          matchedTerms.push(keyword);
          remaining =
            remaining.substring(0, idx) +
            remaining.substring(idx + keyword.length);
          remaining = remaining.replace(/\s+/g, " ").trim();
          return true;
        }
      }
    }
    return false;
  }

  // 1. Match property types
  tryMatch(propertyTypeKeywords, (value) => {
    filters.propertyType = value;
  });

  // 2. Match status
  tryMatch(statusKeywords, (value) => {
    filters.status = value;
  });

  // 3. Match sequence
  tryMatch(sequenceKeywords, (value) => {
    filters.sequence = value;
  });

  // 4. Match bedrooms
  tryMatch(bedroomKeywords, (value) => {
    filters.bedrooms = value;
  });

  // 5. Match asset class
  tryMatch(assetClassKeywords, (value) => {
    filters.assetClass = value;
  });

  // 6. Match districts (try longest names first, diacritic-folded)
  const districtNames = hierarchy.districts
    .map((d) => ({ name: d.name, norm: normalize(d.name) }))
    .sort((a, b) => b.norm.length - a.norm.length);

  for (const d of districtNames) {
    const idx = remaining.indexOf(d.norm);
    if (idx !== -1) {
      filters.district = d.name;
      matchedTerms.push(d.norm);
      remaining =
        remaining.substring(0, idx) + remaining.substring(idx + d.norm.length);
      remaining = remaining.replace(/\s+/g, " ").trim();
      break;
    }
  }

  // 7. Match projects (try longest names first, only if no district matched or after district)
  const projectNames = hierarchy.projects
    .map((p) => ({ name: p.name, district: p.district, norm: normalize(p.name) }))
    .sort((a, b) => b.norm.length - a.norm.length);

  for (const proj of projectNames) {
    const idx = remaining.indexOf(proj.norm);
    if (idx !== -1) {
      filters.project = proj.name;
      if (!filters.district) {
        filters.district = proj.district;
      }
      matchedTerms.push(proj.norm);
      remaining =
        remaining.substring(0, idx) + remaining.substring(idx + proj.norm.length);
      remaining = remaining.replace(/\s+/g, " ").trim();
      break;
    }
  }

  // Clean up remaining
  remaining = remaining.replace(/\s+/g, " ").trim();

  return {
    filters,
    matchedTerms,
    remainingQuery: remaining,
  };
}

/**
 * Merge smart search results into existing filters. Previously this reset to
 * defaultFilters before applying parsed fields, which silently wiped the
 * user's date range / price range / any filters they had set by hand. Users
 * expect smart search to ADD context to what they already picked, not
 * replace it — so we start from `currentFilters` and only overwrite fields
 * the parser actually recognised. `defaultFilters` is still referenced so
 * callers can import a known-clean state if they want.
 */
export function applySmartSearch(
  currentFilters: FilterState,
  parsed: ParseResult
): FilterState {
  // Changing district auto-resets project in the manual update() path on the
  // Dashboard; we mirror that here so the parsed district doesn't leave a
  // stale project tag hanging around.
  const next: FilterState = { ...currentFilters };

  if (parsed.filters.district && parsed.filters.district !== next.district) {
    next.district = parsed.filters.district;
    next.project = "";
  }
  if (parsed.filters.project) next.project = parsed.filters.project;
  if (parsed.filters.propertyType) next.propertyType = parsed.filters.propertyType;
  if (parsed.filters.status) next.status = parsed.filters.status;
  if (parsed.filters.sequence) next.sequence = parsed.filters.sequence;
  if (parsed.filters.assetClass) next.assetClass = parsed.filters.assetClass;
  if (parsed.filters.bedrooms) next.bedrooms = parsed.filters.bedrooms;

  // Free-text remainder goes into searchQuery; blank it if nothing useful
  // remains so stale text doesn't sit behind new filters.
  next.searchQuery = parsed.remainingQuery || "";

  return next;
}

// Keep an explicit "reset + apply parsed" helper for the rare caller that
// DOES want the old behavior (e.g. a "New search" power-user button).
export function resetAndApplySmartSearch(parsed: ParseResult): FilterState {
  const next = { ...defaultFilters };
  if (parsed.filters.district) next.district = parsed.filters.district;
  if (parsed.filters.project) next.project = parsed.filters.project;
  if (parsed.filters.propertyType) next.propertyType = parsed.filters.propertyType;
  if (parsed.filters.status) next.status = parsed.filters.status;
  if (parsed.filters.sequence) next.sequence = parsed.filters.sequence;
  if (parsed.filters.assetClass) next.assetClass = parsed.filters.assetClass;
  if (parsed.filters.bedrooms) next.bedrooms = parsed.filters.bedrooms;
  if (parsed.remainingQuery) next.searchQuery = parsed.remainingQuery;
  return next;
}
