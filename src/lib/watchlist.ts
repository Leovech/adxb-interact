/**
 * Site-wide watchlist / saved searches.
 *
 * Global (not per-user) localStorage list of districts/projects the visitor
 * has starred, so it works the same whether signed in or not. Mirrors the
 * read/write/SSR-guard shape of portfolio.ts, but keyed globally under the
 * versioned key `adxb.watchlist.v1` rather than per-user.
 */

import { useCallback, useEffect, useState } from "react";

export type WatchlistEntityType = "district" | "project";

export interface WatchlistItem {
  id: string; // `${type}:${name}`
  type: WatchlistEntityType;
  name: string;
  district?: string; // parent district, when type === "project"
  savedAt: string; // ISO
  savedRateSqft: number; // median AED/sqft at the moment it was saved
}

const STORAGE_KEY = "adxb.watchlist.v1";
const CHANGE_EVENT = "adxb-watchlist-change";

export function makeWatchlistId(type: WatchlistEntityType, name: string): string {
  return `${type}:${name}`;
}

export function readWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WatchlistItem[]) : [];
  } catch {
    return [];
  }
}

function writeWatchlist(items: WatchlistItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function isWatched(
  items: WatchlistItem[],
  type: WatchlistEntityType,
  name: string
): boolean {
  return items.some((i) => i.id === makeWatchlistId(type, name));
}

export function toggleWatch(
  type: WatchlistEntityType,
  name: string,
  opts: { district?: string; savedRateSqft: number }
): WatchlistItem[] {
  const items = readWatchlist();
  const id = makeWatchlistId(type, name);
  const next = items.some((i) => i.id === id)
    ? items.filter((i) => i.id !== id)
    : [
        ...items,
        {
          id,
          type,
          name,
          district: opts.district,
          savedAt: new Date().toISOString(),
          savedRateSqft: opts.savedRateSqft,
        },
      ];
  writeWatchlist(next);
  return next;
}

export function removeFromWatchlist(id: string): WatchlistItem[] {
  const next = readWatchlist().filter((i) => i.id !== id);
  writeWatchlist(next);
  return next;
}

/** Reactive hook — stays in sync across every star button on the page and
 *  across tabs (via the storage event). */
export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    setItems(readWatchlist());
    const onChange = () => setItems(readWatchlist());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const toggle = useCallback(
    (type: WatchlistEntityType, name: string, opts: { district?: string; savedRateSqft: number }) => {
      setItems(toggleWatch(type, name, opts));
    },
    []
  );

  const remove = useCallback((id: string) => {
    setItems(removeFromWatchlist(id));
  }, []);

  const checkWatched = useCallback(
    (type: WatchlistEntityType, name: string) => isWatched(items, type, name),
    [items]
  );

  return { items, toggle, remove, isWatched: checkWatched };
}
