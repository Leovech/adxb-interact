import { MarketInsight } from "@/lib/analytics/insights";
import { TrendingUp, TrendingDown, Zap, Layers, Tag } from "lucide-react";

const ICONS: Record<MarketInsight["kind"], typeof TrendingUp> = {
  qoq_mover_up: TrendingUp,
  qoq_mover_down: TrendingDown,
  volume_spike: Zap,
  supply_outpacing: Layers,
  ask_gap: Tag,
};

export default function InsightChips({ insights, className = "" }: { insights: MarketInsight[]; className?: string }) {
  if (insights.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {insights.map((insight) => {
        const Icon = ICONS[insight.kind];
        return (
          <a
            key={`${insight.kind}-${insight.entityName}`}
            href={insight.href}
            title={insight.detail}
            className="group flex items-center gap-1.5 rounded-full border border-card-border bg-card-bg px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
            {insight.title}
          </a>
        );
      })}
    </div>
  );
}
