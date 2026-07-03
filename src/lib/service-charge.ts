/**
 * Service-charge & net-yield layer.
 *
 * Curated, clearly-labelled ESTIMATES of typical annual service charges
 * (AED/sqft/yr) per district, loaded from /data/service-charges.json.
 * Used to turn a modelled gross yield into a net yield across Market
 * Analysis, the comparison tool, and the ROI calculator.
 */

export interface ServiceChargeEntry {
  district: string;
  aedSqftYr: number;
}

export interface ServiceChargeData {
  asOf: string;
  source: string;
  note: string;
  defaultAedSqftYr: number;
  districts: ServiceChargeEntry[];
}

export interface ServiceChargeLookup {
  aedSqftYr: number;
  /** true when no curated entry exists for this district and the site-wide default was used */
  isDefault: boolean;
}

export function lookupServiceCharge(
  data: ServiceChargeData,
  district: string
): ServiceChargeLookup {
  const found = data.districts.find((d) => d.district === district);
  return found
    ? { aedSqftYr: found.aedSqftYr, isDefault: false }
    : { aedSqftYr: data.defaultAedSqftYr, isDefault: true };
}

/**
 * Net yield % = (gross annual rent − annual service charge) / price.
 * Returns 0 when price or size are non-positive.
 */
export function computeNetYieldPct(
  grossYieldPct: number,
  priceAed: number,
  sizeSqft: number,
  serviceChargeAedSqftYr: number
): number {
  if (priceAed <= 0 || sizeSqft <= 0) return 0;
  const grossRentAed = priceAed * (grossYieldPct / 100);
  const annualServiceChargeAed = sizeSqft * serviceChargeAedSqftYr;
  const netRentAed = grossRentAed - annualServiceChargeAed;
  return (netRentAed / priceAed) * 100;
}
