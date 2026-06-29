"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/components/auth/AuthProvider";
import { USER_TYPE_LABELS, UserType } from "@/lib/auth/session";
import PortfolioSection from "@/components/account/PortfolioSection";
import {
  User as UserIcon,
  LogOut,
  Save,
  ListChecks,
  Bell,
  MessageSquare,
  Sparkles,
  Check,
} from "lucide-react";

const INTEREST_CHIPS = [
  "Off-plan for flip",
  "Ready apartments for rental income",
  "High-yield studios",
  "Villas for family use",
  "Distress / below-market deals",
  "Long-term capital appreciation",
  "Portfolio diversification",
  "First home",
];

export default function AccountPage() {
  const { user, status, signOut, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [userType, setUserType] = useState<UserType>("investor");
  const [interests, setInterests] = useState<string[]>([]);
  const [preferredDistricts, setPreferredDistricts] = useState("");
  const [preferredPropertyTypes, setPreferredPropertyTypes] = useState("");
  const [preferredBedrooms, setPreferredBedrooms] = useState("");
  const [saved, setSaved] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/sign-in";
    }
  }, [status]);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setUserType(user.userType);
    setInterests(user.interests);
    setPreferredDistricts(user.preferredDistricts.join(", "));
    setPreferredPropertyTypes(user.preferredPropertyTypes.join(", "));
    setPreferredBedrooms(user.preferredBedrooms.join(", "));
  }, [user]);

  useEffect(() => {
    const url = new URL(window.location.href);
    setWelcomeSeen(url.searchParams.get("welcome") === "1");
  }, []);

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    updateUser({
      name: name || undefined,
      userType,
      interests,
      preferredDistricts: preferredDistricts
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      preferredPropertyTypes: preferredPropertyTypes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      preferredBedrooms: preferredBedrooms
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (status === "loading" || !user) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {welcomeSeen && (
          <div className="mb-6 rounded-xl border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">
            <Sparkles className="me-2 inline h-4 w-4" />
            Welcome aboard! Your account is ready. Below you can fine-tune how
            recommendations are ranked for you.
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your account</h1>
            <p className="text-sm text-muted">
              {user.email} · {USER_TYPE_LABELS[user.userType]} · {user.tier} tier
            </p>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-xs font-medium text-foreground hover:border-negative/50 hover:text-negative"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>

        {/* My properties — portfolio tracker */}
        <PortfolioSection userId={user.id} />

        <section className="mb-6 rounded-xl border border-card-border bg-card-bg p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Profile</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">User type</label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value as UserType)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              >
                {(Object.entries(USER_TYPE_LABELS) as [UserType, string][]).map(
                  ([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  )
                )}
              </select>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-card-border bg-card-bg p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Investment interests</h2>
          </div>
          <p className="mb-3 text-xs text-muted">
            We use these to bias Market Analysis toward cohorts that match your thesis.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {INTEREST_CHIPS.map((tag) => {
              const active = interests.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleInterest(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-accent bg-accent text-background"
                      : "border-card-border bg-card-bg text-muted hover:border-accent/50 hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-card-border bg-card-bg p-5">
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Preferred filters</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Preference
              label="Districts"
              hint="Comma-separated. e.g. Al Reem Island, Saadiyat Island"
              value={preferredDistricts}
              onChange={setPreferredDistricts}
            />
            <Preference
              label="Property types"
              hint="e.g. Apartment, Villa"
              value={preferredPropertyTypes}
              onChange={setPreferredPropertyTypes}
            />
            <Preference
              label="Bedroom configs"
              hint="e.g. 0 (studio), 1, 2"
              value={preferredBedrooms}
              onChange={setPreferredBedrooms}
            />
          </div>
        </section>

        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved" : "Save changes"}
          </button>
          <span className="text-xs text-muted">
            Changes are stored locally for the demo. Migrating to a real DB in Phase 2.
          </span>
        </div>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AccountTile
            icon={<ListChecks className="h-4 w-4 text-accent" />}
            title="Watchlist"
            sub="Save projects + unit configs to track over time"
            disabled
            disabledNote="Scaffolded — wiring in Phase 2"
          />
          <AccountTile
            icon={<Bell className="h-4 w-4 text-accent" />}
            title="Alerts"
            sub="Get notified when new distress deals appear"
            disabled
            disabledNote="Scaffolded — wiring in Phase 2"
          />
          <AccountTile
            icon={<MessageSquare className="h-4 w-4 text-accent" />}
            title="Feedback history"
            sub="Your thumbs-up/down on recommendations"
            disabled
            disabledNote="Stored locally until the feedback API goes live"
          />
        </section>
      </main>
    </>
  );
}

function Preference({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        placeholder={hint}
      />
      <p className="mt-0.5 text-[11px] text-muted/80">{hint}</p>
    </div>
  );
}

function AccountTile({
  icon,
  title,
  sub,
  disabled,
  disabledNote,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  disabled?: boolean;
  disabledNote?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-card-bg p-4 ${
        disabled ? "border-card-border opacity-80" : "border-card-border hover:border-accent/50"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="text-xs text-muted">{sub}</p>
      {disabled && disabledNote && (
        <p className="mt-2 rounded-md bg-accent/5 px-2 py-1 text-[10px] text-accent">
          {disabledNote}
        </p>
      )}
    </div>
  );
}
