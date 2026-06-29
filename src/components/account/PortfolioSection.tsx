"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Transaction,
  Hierarchy,
  decodeTransactions,
} from "@/data/abu-dhabi";
import {
  OwnedProperty,
  OwnedPropertyInput,
  readPortfolio,
  addProperty,
  updateProperty,
  removeProperty,
  buildValuationIndex,
  estimateValue,
  summarize,
  BASIS_LABEL,
} from "@/lib/portfolio";
import {
  Building2,
  Plus,
  Trash2,
  Pencil,
  TrendingUp,
  TrendingDown,
  MapPin,
  X,
  Wallet,
  FileText,
} from "lucide-react";

function formatAED(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return Math.round(n).toLocaleString();
}

function brLabel(br: number): string {
  if (br === 0) return "Studio";
  if (br >= 6) return "6+ BR";
  return `${br} BR`;
}

const EMPTY_FORM: OwnedPropertyInput = {
  project: "",
  district: "",
  propertyType: "Apartment",
  bedrooms: 1,
  sizeSqft: 0,
  purchasePrice: 0,
  purchaseDate: "",
  notes: "",
};

export default function PortfolioSection({ userId }: { userId: string }) {
  const [items, setItems] = useState<OwnedProperty[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<OwnedPropertyInput>(EMPTY_FORM);

  useEffect(() => {
    setItems(readPortfolio(userId));
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [txRes, hierRes] = await Promise.all([
          fetch("/data/transactions.json", { cache: "no-cache" }),
          fetch("/data/hierarchy.json", { cache: "no-cache" }),
        ]);
        if (!txRes.ok || !hierRes.ok) return;
        const [txJson, hierJson] = await Promise.all([txRes.json(), hierRes.json()]);
        if (cancelled) return;
        setTransactions(decodeTransactions(txJson));
        setHierarchy(hierJson as Hierarchy);
      } catch {
        /* valuation just stays empty if data fails to load */
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const valIndex = useMemo(
    () => (transactions.length ? buildValuationIndex(transactions) : null),
    [transactions]
  );
  const summary = useMemo(
    () => (valIndex ? summarize(valIndex, items) : null),
    [valIndex, items]
  );

  const sortedDistricts = useMemo(
    () => (hierarchy ? [...hierarchy.districts].sort((a, b) => a.name.localeCompare(b.name)) : []),
    [hierarchy]
  );
  const projectsForDistrict = useMemo(() => {
    if (!hierarchy) return [];
    const base = form.district
      ? hierarchy.projects.filter((p) => p.district === form.district)
      : hierarchy.projects;
    return [...base].sort((a, b) => a.name.localeCompare(b.name));
  }, [hierarchy, form.district]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  };
  const openEdit = (p: OwnedProperty) => {
    setForm({
      project: p.project, district: p.district, propertyType: p.propertyType,
      bedrooms: p.bedrooms, sizeSqft: p.sizeSqft, purchasePrice: p.purchasePrice,
      purchaseDate: p.purchaseDate, notes: p.notes ?? "",
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const canSave =
    form.project.trim() && form.district.trim() &&
    form.sizeSqft > 0 && form.purchasePrice > 0;

  const save = () => {
    if (!canSave) return;
    if (editId) {
      setItems(updateProperty(userId, editId, form));
    } else {
      setItems(addProperty(userId, form));
    }
    setShowForm(false);
    setEditId(null);
  };

  const del = (id: string) => {
    setItems(removeProperty(userId, id));
  };

  return (
    <section className="mb-6 rounded-xl border border-card-border bg-card-bg p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">My properties</h2>
          <span className="rounded-full bg-input-bg px-2 py-0.5 text-[10px] font-semibold text-muted">
            {items.length}
          </span>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-background transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          Add property
        </button>
      </div>

      {/* Portfolio summary */}
      {summary && items.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat label="Properties" value={summary.count.toString()} />
          <SummaryStat label="Invested" value={`AED ${formatAED(summary.totalInvested)}`} />
          <SummaryStat label="Est. value" value={`AED ${formatAED(summary.totalCurrentValue)}`} />
          <SummaryStat
            label="Gain / loss"
            value={`${summary.totalGainAED >= 0 ? "+" : "−"}${formatAED(Math.abs(summary.totalGainAED))}`}
            sub={`${summary.totalGainPct >= 0 ? "+" : ""}${summary.totalGainPct.toFixed(1)}%`}
            accent={summary.totalGainAED >= 0 ? "positive" : "negative"}
          />
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-card-border px-6 py-10 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-muted" />
          <p className="text-sm font-semibold text-foreground">Track the units you own</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted">
            Add a property and we&apos;ll estimate its current market value from recent
            ADREC sales — so you can see your paper gain at a glance.
          </p>
          <button
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-background hover:bg-accent-hover"
          >
            <Plus className="h-3.5 w-3.5" /> Add your first property
          </button>
        </div>
      )}

      {/* Property cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((p) => {
            const v = valIndex ? estimateValue(valIndex, p) : null;
            return (
              <div key={p.id} className="rounded-xl border border-card-border bg-background/40 p-4 hover-lift">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{p.project}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted">
                      <MapPin className="h-3 w-3" />
                      {p.district} · {brLabel(p.bedrooms)} · {p.sizeSqft.toLocaleString()} sqft
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => openEdit(p)} className="rounded-md p-1.5 text-muted hover:bg-input-bg hover:text-foreground" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => del(p.id)} className="rounded-md p-1.5 text-muted hover:bg-negative/10 hover:text-negative" title="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-card-bg p-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Paid</p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">AED {formatAED(p.purchasePrice)}</p>
                  </div>
                  <div className="rounded-lg bg-card-bg p-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Est. now</p>
                    <p className="mt-0.5 text-sm font-bold text-accent">
                      {v && v.estValue > 0 ? `AED ${formatAED(v.estValue)}` : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-card-bg p-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Gain</p>
                    {v && v.estValue > 0 ? (
                      <p className={`mt-0.5 inline-flex items-center gap-0.5 text-sm font-bold ${v.gainAED >= 0 ? "text-positive" : "text-negative"}`}>
                        {v.gainAED >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {v.gainPct >= 0 ? "+" : ""}{v.gainPct.toFixed(1)}%
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm font-bold text-muted">—</p>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                  <span>{v ? BASIS_LABEL[v.basis] : "Loading valuation…"}</span>
                  {p.purchaseDate && <span>Bought {p.purchaseDate}</span>}
                </div>

                {p.notes && (
                  <p className="mt-2 rounded-md bg-card-bg px-2 py-1 text-[11px] text-muted">{p.notes}</p>
                )}

                <a
                  href={`/mls/report?project=${encodeURIComponent(p.project)}&bedrooms=${p.bedrooms}`}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                >
                  <FileText className="h-3 w-3" /> View investor report
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit form */}
      {showForm && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {editId ? "Edit property" : "Add a property"}
            </p>
            <button onClick={() => setShowForm(false)} className="rounded-md p-1 text-muted hover:bg-input-bg hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="District">
              <select
                value={form.district}
                onChange={(e) => setForm((f) => ({ ...f, district: e.target.value, project: "" }))}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="">Select district…</option>
                {sortedDistricts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </Field>

            <Field label="Project">
              <input
                list="portfolio-projects"
                value={form.project}
                onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
                placeholder="Type or pick a project"
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
              <datalist id="portfolio-projects">
                {projectsForDistrict.map((p) => <option key={`${p.district}-${p.id}`} value={p.name} />)}
              </datalist>
            </Field>

            <Field label="Property type">
              <select
                value={form.propertyType}
                onChange={(e) => setForm((f) => ({ ...f, propertyType: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                {["Apartment", "Villa", "Townhouse", "Duplex", "Penthouse"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field label="Bedrooms">
              <select
                value={form.bedrooms}
                onChange={(e) => setForm((f) => ({ ...f, bedrooms: Number(e.target.value) }))}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value={0}>Studio</option>
                {[1, 2, 3, 4, 5, 6].map((b) => <option key={b} value={b}>{b === 6 ? "6+ BR" : `${b} BR`}</option>)}
              </select>
            </Field>

            <Field label="Size (sqft)">
              <input
                type="number" min={0}
                value={form.sizeSqft || ""}
                onChange={(e) => setForm((f) => ({ ...f, sizeSqft: Number(e.target.value) }))}
                placeholder="e.g. 900"
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </Field>

            <Field label="Purchase price (AED)">
              <input
                type="number" min={0}
                value={form.purchasePrice || ""}
                onChange={(e) => setForm((f) => ({ ...f, purchasePrice: Number(e.target.value) }))}
                placeholder="e.g. 1200000"
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </Field>

            <Field label="Purchase date">
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </Field>

            <Field label="Notes (optional)">
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. unit 1204, rented at 75k/yr"
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </Field>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={save}
              disabled={!canSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-background hover:bg-accent-hover disabled:opacity-50"
            >
              {editId ? "Save changes" : "Add to portfolio"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-card-border px-4 py-2 text-xs font-medium text-foreground hover:border-accent/40">
              Cancel
            </button>
            {!canSave && (
              <span className="text-[11px] text-muted">District, project, size and price are required.</span>
            )}
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted">
        Valuations are modelled from recent ADREC closed sales (last 12 months) and are
        estimates, not appraisals. Your portfolio is saved in this browser for the demo.
      </p>
    </section>
  );
}

function SummaryStat({
  label, value, sub, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "positive" | "negative";
}) {
  const accentClass = accent === "positive" ? "text-positive" : accent === "negative" ? "text-negative" : "text-foreground";
  return (
    <div className="rounded-xl border border-card-border bg-background/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${accentClass}`}>{value}</p>
      {sub && <p className={`text-[11px] font-semibold ${accentClass}`}>{sub}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</label>
      {children}
    </div>
  );
}
