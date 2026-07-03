/**
 * ROI / deal calculator.
 *
 * Pure, dependency-free math shared by /calculator and the embedded
 * calculator on /mls/report. All inputs are plain numbers (already parsed
 * from form fields) so this stays trivially unit-testable.
 */

export interface CalculatorInputs {
  purchasePrice: number;
  sizeSqft: number;
  annualRent: number;
  serviceChargeAedSqftYr: number;
  dmtFeePct: number; // DMT (Abu Dhabi) transfer fee, default 2
  agencyFeePct: number; // default 2
  otherCostsAed: number;
}

export const DEFAULT_CALCULATOR_INPUTS: CalculatorInputs = {
  purchasePrice: 0,
  sizeSqft: 0,
  annualRent: 0,
  serviceChargeAedSqftYr: 14,
  dmtFeePct: 2,
  agencyFeePct: 2,
  otherCostsAed: 0,
};

export interface RentSensitivityRow {
  deltaPct: number; // -10, 0, +10
  annualRentAed: number;
  monthlyNetIncomeAed: number;
  netYieldPct: number;
}

export interface CalculatorResult {
  dmtFeeAed: number;
  agencyFeeAed: number;
  totalAcquisitionCostAed: number;
  annualServiceChargeAed: number;
  grossYieldPct: number;
  netYieldPct: number;
  monthlyNetIncomeAed: number;
  yearsToPayback: number | null;
  rentSensitivity: RentSensitivityRow[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeDeal(inputs: CalculatorInputs): CalculatorResult {
  const {
    purchasePrice,
    sizeSqft,
    annualRent,
    serviceChargeAedSqftYr,
    dmtFeePct,
    agencyFeePct,
    otherCostsAed,
  } = inputs;

  const dmtFeeAed = purchasePrice * (dmtFeePct / 100);
  const agencyFeeAed = purchasePrice * (agencyFeePct / 100);
  const totalAcquisitionCostAed = purchasePrice + dmtFeeAed + agencyFeeAed + otherCostsAed;
  const annualServiceChargeAed = Math.max(0, sizeSqft) * Math.max(0, serviceChargeAedSqftYr);

  const grossYieldPct = purchasePrice > 0 ? round1((annualRent / purchasePrice) * 100) : 0;

  const netAnnualIncomeAed = annualRent - annualServiceChargeAed;
  const netYieldPct =
    totalAcquisitionCostAed > 0 ? round1((netAnnualIncomeAed / totalAcquisitionCostAed) * 100) : 0;
  const monthlyNetIncomeAed = Math.round(netAnnualIncomeAed / 12);
  const yearsToPayback =
    netAnnualIncomeAed > 0 && totalAcquisitionCostAed > 0
      ? round1(totalAcquisitionCostAed / netAnnualIncomeAed)
      : null;

  const rentSensitivity: RentSensitivityRow[] = [-10, 0, 10].map((deltaPct) => {
    const rent = annualRent * (1 + deltaPct / 100);
    const netAnnual = rent - annualServiceChargeAed;
    return {
      deltaPct,
      annualRentAed: Math.round(rent),
      monthlyNetIncomeAed: Math.round(netAnnual / 12),
      netYieldPct: totalAcquisitionCostAed > 0 ? round1((netAnnual / totalAcquisitionCostAed) * 100) : 0,
    };
  });

  return {
    dmtFeeAed,
    agencyFeeAed,
    totalAcquisitionCostAed,
    annualServiceChargeAed,
    grossYieldPct,
    netYieldPct,
    monthlyNetIncomeAed,
    yearsToPayback,
    rentSensitivity,
  };
}
