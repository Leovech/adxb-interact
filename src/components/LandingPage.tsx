"use client";

import { ReactNode } from "react";
import { motion, MotionConfig, Variants } from "framer-motion";
import Header from "@/components/Header";
import ContactSection from "@/components/ContactSection";
import { LanguageProvider } from "@/i18n/LanguageContext";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import SparkAreaChart from "@/components/ui/SparkAreaChart";
import FaqAccordion, { FaqItem } from "@/components/ui/FaqAccordion";
import {
  ArrowRight,
  BarChart3,
  TrendingUp,
  Building2,
  Sparkles,
  FileText,
  Search,
  ShieldCheck,
  Gauge,
  LineChart,
  MapPin,
  Zap,
  Bot,
  Handshake,
} from "lucide-react";

/** Headline stats — reflect the current ADREC dataset. */
const STATS = [
  { value: 116252, label: "Transactions analyzed", suffix: "+" },
  { value: 133, label: "Districts covered", suffix: "" },
  { value: 370, label: "Projects tracked", suffix: "" },
  { value: 2, label: "Live listing platforms", suffix: "" },
];

const FEATURES = [
  {
    icon: BarChart3,
    title: "Live transaction dashboard",
    body: "Filter every ADREC closed sale by district, project, type, bedrooms, price and date — KPIs, charts and a full table update instantly.",
    href: "/dashboard",
    cta: "Open dashboard",
  },
  {
    icon: TrendingUp,
    title: "Project momentum & trends",
    body: "See which projects are surging or cooling across 10-day to 12-month windows. Spot where capital is rotating before the crowd.",
    href: "/trends",
    cta: "View trends",
  },
  {
    icon: Sparkles,
    title: "AI market analysis",
    body: "Ranked Buy / Watch / Avoid recommendations with a transparent opportunity score and plain-English reasoning anchored in real numbers.",
    href: "/market-analysis",
    cta: "See recommendations",
  },
  {
    icon: Bot,
    title: "Ask the AI assistant",
    body: "Type a question in plain English — \"cheapest studio in Yas Island\" or \"2BR with yield above 7%\" — and get real numbers back instantly.",
    href: "/assistant",
    cta: "Start chatting",
  },
  {
    icon: Search,
    title: "Listings vs sales",
    body: "Compare what sellers ask on Property Finder & Bayut against what units actually closed at — and find genuine below-market deals.",
    href: "/mls",
    cta: "Compare now",
  },
  {
    icon: FileText,
    title: "Investor reports",
    body: "Generate a printable one-page brief for any project — price history, yield model, momentum and a clear investment verdict.",
    href: "/mls/report?project=Pixel&bedrooms=1",
    cta: "Sample report",
  },
  {
    icon: ShieldCheck,
    title: "Your account",
    body: "Save your investment thesis, tune recommendations to your style, and get the analysis tailored to the deals you care about.",
    href: "/sign-up",
    cta: "Create account",
  },
];

const STEPS = [
  { icon: Search, title: "Search the market", body: "Pick a district, project or unit type — or just describe what you want." },
  { icon: Gauge, title: "Read the signals", body: "Momentum, supply vs demand, price discount and yield, all in one view." },
  { icon: FileText, title: "Act with confidence", body: "Generate a report, compare your offer, and negotiate from real data." },
];

const PERSONAS = [
  {
    icon: TrendingUp,
    title: "Investor",
    body: "Compare yields, momentum and discount-to-median across every district to find the best risk-adjusted opportunity.",
    href: "/market-analysis",
    cta: "See recommendations",
  },
  {
    icon: Handshake,
    title: "Broker",
    body: "Walk into every negotiation with the real closed price, not just the asking price — and back it up with data.",
    href: "/mls",
    cta: "Compare listings",
  },
  {
    icon: BarChart3,
    title: "Analyst",
    body: "Query the raw transaction dataset directly — filter, chart and export without a scraper or a spreadsheet macro.",
    href: "/dashboard",
    cta: "Open dashboard",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Where does the data come from?",
    a: "Every transaction on ADXBInteract comes from ADREC (Abu Dhabi Real Estate Centre) — the government's official record of closed property sales. These are real, closed transactions, not estimates or scraped guesses.",
  },
  {
    q: "How often is the data updated?",
    a: "The transaction dataset refreshes regularly as new ADREC records become available. Check the \"Data updated\" stamp in the footer and dashboard header for the latest sync date.",
  },
  {
    q: "Is ADXBInteract free to use?",
    a: "Yes — browsing the dashboard, trends, market analysis and listings comparison is free. Create a free account to save your search preferences and personalize recommendations.",
  },
  {
    q: "How does the AI scoring work?",
    a: "Each recommendation is a transparent opportunity score built from real signals — discount to area median, momentum, supply vs demand and modelled yield. You can see the reasoning behind every Buy / Watch / Avoid call, not a black box.",
  },
  {
    q: "Who is this built for?",
    a: "Investors comparing opportunities, brokers who need to negotiate from real numbers, and analysts who want raw transaction data without the guesswork.",
  },
  {
    q: "Do I need to create an account?",
    a: "No — most of the platform is open to explore without signing up. An account lets you save projects to a watchlist and tailor recommendations to your investment style.",
  },
];

/** Representative Abu Dhabi avg rate/sqft trend for the landing preview. */
const PREVIEW_TREND = [
  { label: "2024 Q1", value: 1180 },
  { label: "Q2", value: 1240 },
  { label: "Q3", value: 1310 },
  { label: "Q4", value: 1395 },
  { label: "2025 Q1", value: 1480 },
  { label: "Q2", value: 1620 },
  { label: "Q3", value: 1755 },
  { label: "Q4", value: 1840 },
  { label: "2026 Q1", value: 1965 },
  { label: "Q2", value: 2040 },
];

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

/** Scroll-triggered fade + slide-up. Local to the landing page so the
 *  shared <Reveal> component (used by Dashboard.tsx) stays untouched. */
function FadeUp({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={fadeUpVariants}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

function LandingContent() {
  return (
    <MotionConfig reducedMotion="user">
      <Header />

      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden">
        {/* ambient glow */}
        <div className="glow-blob -left-20 -top-10 h-72 w-72 bg-accent/30" />
        <div className="glow-blob right-0 top-32 h-80 w-80 bg-positive/20" style={{ animationDelay: "2s" }} />

        <div className="relative mx-auto max-w-[1100px] px-4 pb-16 pt-16 text-center lg:pt-24">
          <div className="animate-fade-in-up mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by ADREC transaction data
          </div>

          <h1 className="animate-fade-in-up stagger-1 mx-auto max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            The clearest view of the{" "}
            <span className="text-gradient">Abu Dhabi</span> property market
          </h1>

          <p className="animate-fade-in-up stagger-2 mx-auto mt-5 max-w-2xl text-base text-muted sm:text-lg">
            Real transactions, live listings, and AI-ranked opportunities — so investors
            and brokers can decide with data, not guesswork.
          </p>

          <div className="animate-fade-in-up stagger-3 mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/30"
            >
              Explore the dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="/market-analysis"
              className="inline-flex items-center gap-2 rounded-full border border-card-border bg-card-bg px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent/50"
            >
              <Sparkles className="h-4 w-4 text-accent" />
              AI recommendations
            </a>
          </div>

          {/* Stat ticker */}
          <div className="animate-fade-in-up stagger-4 mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-card-border bg-card-bg/60 p-4 hover-lift">
                <p className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  <AnimatedCounter value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Mini price-trend chart — draws itself in on load */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: EASE_OUT }}
            className="relative mx-auto mt-10 max-w-3xl text-left"
          >
            <div
              className="pointer-events-none absolute -inset-16 -z-10"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 70%)",
              }}
            />
            <div className="rounded-2xl border border-card-border bg-card-bg p-5 sm:p-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">Market pulse</p>
                  <h3 className="mt-1 text-lg font-bold text-foreground">
                    Abu Dhabi median rate per sqft
                  </h3>
                </div>
                <span className="rounded-full bg-positive/15 px-3 py-1 text-xs font-bold text-positive">
                  Hover the line to explore
                </span>
              </div>
              <SparkAreaChart
                data={PREVIEW_TREND}
                height={240}
                animateNow
                formatValue={(n) => `${Math.round(n).toLocaleString()} AED`}
              />
              <p className="mt-3 text-center text-xs text-muted">
                Illustrative trend. Live, filterable charts live inside the{" "}
                <a href="/dashboard" className="text-accent link-underline">dashboard</a>.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section className="mx-auto max-w-[1280px] px-4 py-16 lg:px-8">
        <FadeUp className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Everything in one place</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            A full investor toolkit
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            From raw transactions to ranked recommendations — every tool talks to the same
            clean ADREC data underneath.
          </p>
        </FadeUp>

        <motion.div
          className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {FEATURES.map((f) => (
            <motion.a
              key={f.title}
              href={f.href}
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: { duration: 0.15, ease: "easeOut" } }}
              className="group flex h-full flex-col rounded-2xl border border-card-border bg-card-bg p-6 transition-colors duration-150 hover:border-accent/40"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/12 transition-colors group-hover:bg-accent/20">
                <f.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-base font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{f.body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                {f.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </motion.a>
          ))}
        </motion.div>
      </section>

      {/* ───────── How it works ───────── */}
      <section className="relative overflow-hidden border-y border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-[1100px] px-4 py-16 lg:px-8">
          <FadeUp className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">Three steps</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">From question to decision</h2>
          </FadeUp>
          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-[16%] right-[16%] top-[46px] hidden h-px origin-left bg-accent/25 md:block"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 }}
            />
            {STEPS.map((s, i) => (
              <FadeUp key={s.title} delay={i * 0.08}>
                <div className="relative rounded-2xl border border-card-border bg-card-bg p-6 hover-lift">
                  <span className="absolute right-5 top-4 text-5xl font-black text-accent/10">{i + 1}</span>
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/12">
                    <s.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Who it's for ───────── */}
      <section className="mx-auto max-w-[1280px] px-4 py-16 lg:px-8">
        <FadeUp className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Built for</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Whoever needs the real numbers</h2>
        </FadeUp>
        <motion.div
          className="grid grid-cols-1 gap-5 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {PERSONAS.map((p) => (
            <motion.a
              key={p.title}
              href={p.href}
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: { duration: 0.15, ease: "easeOut" } }}
              className="group flex flex-col rounded-2xl border border-card-border bg-card-bg p-6 transition-colors duration-150 hover:border-accent/40"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/12 transition-colors group-hover:bg-accent/20">
                <p.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-base font-bold text-foreground">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{p.body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                {p.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </motion.a>
          ))}
        </motion.div>
      </section>

      {/* ───────── Highlight band ───────── */}
      <section className="mx-auto max-w-[1280px] px-4 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FadeUp>
            <div className="flex h-full flex-col justify-center rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/12 via-card-bg to-card-bg p-8">
              <LineChart className="mb-4 h-7 w-7 text-accent" />
              <h3 className="text-2xl font-bold text-foreground">Listings vs actual sales</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Sellers ask one price — units close at another. We put the two side by side so
                you know the real number to negotiate toward, and we flag listings sitting
                below the recent market.
              </p>
              <a href="/mls" className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover">
                Compare prices <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="flex h-full flex-col justify-center rounded-2xl border border-card-border bg-card-bg p-8">
              <div className="mb-4 flex gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-positive/15 px-2.5 py-1 text-[11px] font-bold text-positive"><Zap className="h-3 w-3" /> High momentum</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent"><MapPin className="h-3 w-3" /> Undervalued</span>
              </div>
              <h3 className="text-2xl font-bold text-foreground">AI that explains itself</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Every recommendation shows its work: how far below area median the project trades,
                how fast demand is moving, how tight supply is, and the modelled yield. No black box.
              </p>
              <a href="/market-analysis" className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-5 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20">
                See the analysis <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="mx-auto max-w-[800px] px-4 py-16 lg:px-8">
        <FadeUp className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">FAQ</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Common questions</h2>
        </FadeUp>
        <FadeUp delay={0.05}>
          <FaqAccordion items={FAQS} />
        </FadeUp>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section className="relative overflow-hidden border-t border-card-border">
        <div className="glow-blob left-1/2 top-0 h-64 w-96 -translate-x-1/2 bg-accent/20" />
        <div className="relative mx-auto max-w-[800px] px-4 py-20 text-center">
          <FadeUp>
            <Building2 className="mx-auto mb-5 h-10 w-10 text-accent" />
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Start exploring the market today
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
              Free to explore. Create an account to save projects and personalize your analysis.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a href="/dashboard" className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/30">
                Open the dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a href="/sign-up" className="inline-flex items-center gap-2 rounded-full border border-card-border bg-card-bg px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent/50">
                Create free account
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-8">
        <ContactSection />
      </div>

      <footer className="border-t border-card-border py-8 text-center">
        <p className="text-xs font-semibold text-accent">DEMO</p>
        <p className="mt-2 text-xs text-foreground">
          Created by <span className="font-bold">Sand Square Group</span>
        </p>
        <p className="mt-1 text-xs text-muted">ADXBInteract — Abu Dhabi Real Estate Intelligence</p>
        <p className="mt-1 text-xs text-muted">Powered by ADREC data</p>
      </footer>
    </MotionConfig>
  );
}

export default function LandingPage() {
  return (
    <LanguageProvider>
      <LandingContent />
    </LanguageProvider>
  );
}
