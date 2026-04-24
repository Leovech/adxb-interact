import { Suspense } from "react";
import DashboardReportPage from "@/components/DashboardReportPage";

export default async function DashboardReportRoute(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.searchParams;
  const str = (k: string) => (typeof params[k] === "string" ? params[k] : "") as string;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
          <p className="text-sm text-muted">Building report…</p>
        </div>
      }
    >
      <DashboardReportPage
        district={str("district")}
        project={str("project")}
        propertyType={str("propertyType")}
        bedrooms={str("bedrooms")}
        status={str("status")}
        sequence={str("sequence")}
        assetClass={str("assetClass")}
        searchQuery={str("searchQuery")}
        datePreset={str("datePreset") || "all_time"}
        dateFrom={str("dateFrom")}
        dateTo={str("dateTo")}
        priceMin={str("priceMin")}
        priceMax={str("priceMax")}
        sizeMin={str("sizeMin")}
        sizeMax={str("sizeMax")}
        rateMin={str("rateMin")}
        rateMax={str("rateMax")}
        offerPrice={str("offerPrice")}
        offerBR={str("offerBR")}
        offerSize={str("offerSize")}
      />
    </Suspense>
  );
}
