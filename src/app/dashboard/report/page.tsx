import { Suspense } from "react";
import DashboardReportPage from "@/components/DashboardReportPage";

export const metadata = {
  title: "Dashboard Report · ADXBInteract",
};

export default async function DashboardReportRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const str = (k: string) => (typeof params[k] === "string" ? params[k] : "") as string;

  return (
    <Suspense fallback={null}>
      <DashboardReportPage
        district={str("district")}
        project={str("project")}
        propertyType={str("propertyType")}
        bedrooms={str("bedrooms")}
        status={str("status")}
        sequence={str("sequence")}
        assetClass={str("assetClass")}
        datePreset={str("datePreset") || "all_time"}
      />
    </Suspense>
  );
}
