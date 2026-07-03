"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import CalculatorPanel from "@/components/CalculatorPanel";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Transaction, Hierarchy, decodeTransactions } from "@/data/abu-dhabi";
import { buildCompareStats } from "@/lib/analytics/compare";
import { districtYieldFloor } from "@/lib/investor-report";
import { lookupServiceCharge, ServiceChargeData } from "@/lib/service-charge";
import { Calculator as CalculatorIcon, Wand2 } from "lucide-react";

export default function CalculatorView({ initialDistrict }: { initialDistrict: string }) {
  const [allData, setAllData] = useState<Transaction[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [serviceCharges, setServiceCharges] = useState<ServiceChargeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [district, setDistrict] = useState(initialDistrict);
  const [sizeSqftInput, setSizeSqftInput] = useState(1000);
  const [prefillNonce, setPrefillNonce] = useState(0);
  const [prefill, setPrefill] = useState<
    { purchasePrice?: number; sizeSqft?: number; annualRent?: number; serviceChargeAedSqftYr?: number } | undefined
  >();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [txRes, hierRes, scRes] = await Promise.all([
          fetch("/data/transactions.json", { cache: "no-cache" }),
          fetch("/data/hierarchy.json", { cache: "no-cache" }),
          fetch("/data/service-charges.json", { cache: "no-cache" }),
        ]);
        if (!txRes.ok || !hierRes.ok || !scRes.ok) throw new Error("Failed to load market data");
        const [txJson, hierJson, scJson] = await Promise.all([txRes.json(), hierRes.json(), scRes.json()]);
        if (cancelled) return;
        setAllData(decodeTransactions(txJson));
        setHierarchy(hierJson as Hierarchy);
        setServiceCharges(scJson as ServiceChargeData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const districtEstimate = useMemo(() => {
    if (!district || !allData.length || !serviceCharges) return null;
    const stats = buildCompareStats(allData, "district", district);
    if (!stats) return null;
    const grossYieldPct = Math.round((districtYieldFloor(district) + 0.0075) * 1000) / 10;
    const sc = lookupServiceCharge(serviceCharges, district);
    return {
      medianRateSqft: stats.medianRateSqft,
      grossYieldPct,
      serviceChargeAedSqftYr: sc.aedSqftYr,
      isDefaultServiceCharge: sc.isDefault,
    };
  }, [district, allData, serviceCharges]);

  const applyEstimate = () => {
    if (!districtEstimate || sizeSqftInput <= 0) return;
    const purchasePrice = Math.round(districtEstimate.medianRateSqft * sizeSqftInput);
    const annualRent = Math.round(purchasePrice * (districtEstimate.grossYieldPct / 100));
    setPrefill({
      purchasePrice,
      sizeSqft: sizeSqftInput,
      annualRent,
      serviceChargeAedSqftYr: districtEstimate.serviceChargeAedSqftYr,
    });
    setPrefillNonce((n) => n + 1);
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-10 lg:px-8">
          <SkeletonPage cards={3} />
        </main>
      </>
    );
  }

  if (error || !hierarchy) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="rounded-xl border border-negative/30 bg-negative/10 px-6 py-4">
            <p className="text-sm font-medium text-negative">{error || "Failed to load data"}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-6 lg:px-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            <CalculatorIcon className="h-6 w-6 text-accent" />
            ROI / deal calculator
          </h1>
          <p className="mt-1 text-sm text-muted">
            Model acquisition cost, gross &amp; net yield and payback for any deal. Your inputs
            are saved automatically.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-card-border bg-card-bg/60 p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Prefill from district</span>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-56 rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">Select a district…</option>
              {hierarchy.districts
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Assumed size (sqft)</span>
            <input
              type="number"
              min={1}
              value={sizeSqftInput}
              onChange={(e) => setSizeSqftInput(Number(e.target.value) || 0)}
              className="w-32 rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </label>
          <button
            onClick={applyEstimate}
            disabled={!districtEstimate || sizeSqftInput <= 0}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Prefill deal
          </button>
          {districtEstimate && (
            <p className="w-full text-[11px] text-muted">
              {district} median: {districtEstimate.medianRateSqft.toLocaleString()} AED/sqft · modelled gross yield{" "}
              {districtEstimate.grossYieldPct.toFixed(1)}% · service charge {districtEstimate.serviceChargeAedSqftYr} AED/sqft/yr
              {districtEstimate.isDefaultServiceCharge ? " (indicative default)" : " (indicative)"}
            </p>
          )}
        </div>

        <CalculatorPanel prefillNonce={prefillNonce} prefill={prefill} />
      </main>
    </>
  );
}
