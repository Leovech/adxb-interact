"use client";

import { Star } from "lucide-react";
import { useWatchlist, WatchlistEntityType } from "@/lib/watchlist";

interface Props {
  type: WatchlistEntityType;
  name: string;
  district?: string;
  rateSqft: number;
  className?: string;
}

/** Star/bookmark toggle for a district or project row. Safe to nest inside
 *  a clickable row/link — stops the click from bubbling. */
export default function WatchStar({ type, name, district, rateSqft, className = "" }: Props) {
  const { toggle, isWatched } = useWatchlist();
  const watched = isWatched(type, name);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(type, name, { district, savedRateSqft: rateSqft });
      }}
      aria-label={watched ? `Remove ${name} from watchlist` : `Add ${name} to watchlist`}
      aria-pressed={watched}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
        watched ? "text-accent" : "text-muted hover:text-accent"
      } ${className}`}
    >
      <Star className={`h-4 w-4 ${watched ? "fill-accent" : ""}`} />
    </button>
  );
}
