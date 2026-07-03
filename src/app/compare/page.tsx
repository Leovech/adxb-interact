import { Suspense } from "react";
import CompareView from "@/components/CompareView";

export const metadata = {
  title: "Compare Areas · ADXBInteract",
};

// Next 16: searchParams is a Promise. The leaf page is a server component
// that resolves it and hands the raw string to the client comparison view.
export default async function CompareRoute({
  searchParams,
}: {
  searchParams: Promise<{ areas?: string }>;
}) {
  const params = await searchParams;
  const areas = params.areas ?? "";

  return (
    <Suspense fallback={null}>
      <CompareView initialAreas={areas} />
    </Suspense>
  );
}
