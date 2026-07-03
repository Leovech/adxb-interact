/** Shimmer placeholder in the theme palette (uses the `.skeleton` utility
 *  from globals.css) — swap in for spinner+text loading states. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-card-border bg-card-bg p-5 ${className}`}>
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="mb-2 h-7 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonPage({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
