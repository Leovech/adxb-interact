import { Suspense } from "react";
import Dashboard from "@/components/Dashboard";

export const metadata = {
  title: "Dashboard · ADXBInteract",
};

// Next 16: searchParams is a Promise. Lets insight chips / watchlist / the
// comparison tool deep-link straight into a pre-filtered dashboard.
export default async function DashboardRoute({
  searchParams,
}: {
  searchParams: Promise<{ district?: string; project?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={null}>
      <Dashboard initialDistrict={params.district ?? ""} initialProject={params.project ?? ""} />
    </Suspense>
  );
}
