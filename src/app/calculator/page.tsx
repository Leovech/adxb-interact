import { Suspense } from "react";
import CalculatorView from "@/components/CalculatorView";

export const metadata = {
  title: "ROI Calculator · ADXBInteract",
};

export default async function CalculatorRoute({
  searchParams,
}: {
  searchParams: Promise<{ district?: string }>;
}) {
  const params = await searchParams;
  const district = params.district ?? "";

  return (
    <Suspense fallback={null}>
      <CalculatorView initialDistrict={district} />
    </Suspense>
  );
}
