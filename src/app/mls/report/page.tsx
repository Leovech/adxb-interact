import { Suspense } from "react";
import InvestorReportPage from "@/components/InvestorReportPage";

// Next 16: searchParams is a Promise. The leaf page is a server component
// that resolves the params and hands them to the client report renderer.
export default async function ReportRoute({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string;
    bedrooms?: string;
  }>;
}) {
  const params = await searchParams;
  const project = params.project ?? "";
  const bedrooms = Number(params.bedrooms ?? "0") || 0;

  return (
    <Suspense fallback={null}>
      <InvestorReportPage project={project} bedrooms={bedrooms} />
    </Suspense>
  );
}
