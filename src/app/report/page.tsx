import ReportPage from "@/components/ReportPage";

export default async function ReportRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const str = (k: string) => (typeof params[k] === "string" ? params[k] : "") as string;

  return (
    <ReportPage
      project={str("project")}
      district={str("district")}
      bedrooms={str("bedrooms")}
      propertyType={str("propertyType")}
      offerPrice={str("offerPrice")}
      offerSize={str("offerSize")}
    />
  );
}
