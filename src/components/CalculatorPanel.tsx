"use client";

import { useEffect, useState } from "react";
import { Calculator as CalculatorIcon, TrendingDown, TrendingUp } from "lucide-react";
import {
  CalculatorInputs,
  DEFAULT_CALCULATOR_INPUTS,
  computeDeal,
} from "@/lib/calculator";

const STORAGE_KEY = "adxb.calculator.v1";

function readStored(): CalculatorInputs {
  if (typeof window === "undefined") return DEFAULT_CALCULATOR_INPUTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CALCULATOR_INPUTS, ...(JSON.parse(raw) as Partial<CalculatorInputs>) } : DEFAULT_CALCULATOR_INPUTS;
  } catch {
    return DEFAULT_CALCULATOR_INPUTS;
  }
}

function writeStored(inputs: CalculatorInputs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
}

function fmtAED(n: number): string {
  return `${Math.round(n).toLocaleString()} AED`;
}

interface Props {
  /** Bump this number to push `prefill` into the form (e.g. after picking a district). */
  prefillNonce?: number;
  prefill?: Partial<CalculatorInputs>;
  compact?: boolean;
  className?: string;
}

export default function CalculatorPanel({ prefillNonce, prefill, compact = false, className = "" }: Props) {
  // Remounting on prefillNonce change (rather than patching state in an
  // effect) sidesteps ordering/StrictMode-double-invoke ambiguity — a fresh
  // mount deterministically re-reads storage and merges the new prefill
  // exactly once.
  return (
    <CalculatorPanelInner
      key={prefillNonce ?? "base"}
      prefill={prefill}
      compact={compact}
      className={className}
    />
  );
}

function CalculatorPanelInner({
  prefill,
  compact,
  className,
}: {
  prefill?: Partial<CalculatorInputs>;
  compact: boolean;
  className: string;
}) {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_CALCULATOR_INPUTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setInputs({ ...readStored(), ...prefill });
    setHydrated(true);
    // Only re-run if this instance is remounted (new key) — intentionally
    // ignores `prefill` identity changes so it doesn't re-apply mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hydrated) writeStored(inputs);
  }, [inputs, hydrated]);

  const set = <K extends keyof CalculatorInputs>(key: K, value: number) =>
    setInputs((prev) => ({ ...prev, [key]: Number.isFinite(value) ? value : 0 }));

  const result = computeDeal(inputs);

  return (
    <div className={`rounded-2xl border border-card-border bg-card-bg p-5 sm:p-6 ${className}`}>
      {!compact && (
        <div className="mb-4 flex items-center gap-2">
          <CalculatorIcon className="h-5 w-5 text-accent" />
          <h3 className="text-base font-bold text-foreground">ROI / deal calculator</h3>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField label="Purchase price (AED)" value={inputs.purchasePrice} onChange={(v) => set("purchasePrice", v)} />
        <NumberField label="Size (sqft)" value={inputs.sizeSqft} onChange={(v) => set("sizeSqft", v)} />
        <NumberField label="Expected annual rent (AED)" value={inputs.annualRent} onChange={(v) => set("annualRent", v)} />
        <NumberField
          label="Service charge (AED/sqft/yr)"
          value={inputs.serviceChargeAedSqftYr}
          onChange={(v) => set("serviceChargeAedSqftYr", v)}
          step={0.5}
        />
        <NumberField label="DMT transfer fee (%)" value={inputs.dmtFeePct} onChange={(v) => set("dmtFeePct", v)} step={0.1} />
        <NumberField label="Agency fee (%)" value={inputs.agencyFeePct} onChange={(v) => set("agencyFeePct", v)} step={0.1} />
        <NumberField label="Other one-off costs (AED)" value={inputs.otherCostsAed} onChange={(v) => set("otherCostsAed", v)} />
      </div>

      {inputs.purchasePrice <= 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-card-border px-4 py-6 text-center text-xs text-muted">
          Enter a purchase price to see the deal breakdown.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metric label="Total acquisition cost" value={fmtAED(result.totalAcquisitionCostAed)} />
          <Metric label="Gross yield" value={`${result.grossYieldPct.toFixed(1)}%`} />
          <Metric
            label="Net yield"
            value={`${result.netYieldPct.toFixed(1)}%`}
            tone={result.netYieldPct >= 0 ? "positive" : "negative"}
          />
          <Metric
            label="Monthly net income"
            value={fmtAED(result.monthlyNetIncomeAed)}
            tone={result.monthlyNetIncomeAed >= 0 ? "positive" : "negative"}
          />
          <Metric label="Years to payback" value={result.yearsToPayback === null ? "—" : `${result.yearsToPayback.toFixed(1)}y`} />
          <Metric label="Annual service charge" value={fmtAED(result.annualServiceChargeAed)} />
        </div>
      )}

      {inputs.purchasePrice > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Rent sensitivity</p>
          <div className="overflow-hidden rounded-xl border border-card-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-background/40 text-muted">
                  <th className="px-3 py-2 text-left font-medium">Rent scenario</th>
                  <th className="px-3 py-2 text-right font-medium">Annual rent</th>
                  <th className="px-3 py-2 text-right font-medium">Monthly net</th>
                  <th className="px-3 py-2 text-right font-medium">Net yield</th>
                </tr>
              </thead>
              <tbody>
                {result.rentSensitivity.map((row) => (
                  <tr key={row.deltaPct} className="border-t border-card-border">
                    <td className="flex items-center gap-1.5 px-3 py-2 text-foreground">
                      {row.deltaPct > 0 && <TrendingUp className="h-3 w-3 text-positive" />}
                      {row.deltaPct < 0 && <TrendingDown className="h-3 w-3 text-negative" />}
                      {row.deltaPct === 0 ? "Base case" : `${row.deltaPct > 0 ? "+" : ""}${row.deltaPct}%`}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">{fmtAED(row.annualRentAed)}</td>
                    <td className="px-3 py-2 text-right text-foreground">{fmtAED(row.monthlyNetIncomeAed)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">{row.netYieldPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
        className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "positive" | "negative" }) {
  const toneCls = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <div className="rounded-xl border border-card-border bg-background/30 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-sm font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}
