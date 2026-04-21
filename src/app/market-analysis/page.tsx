import MarketAnalysisPage from "@/components/market/MarketAnalysisPage";

export const metadata = {
  title: "Market Analysis · ADXBInteract",
  description:
    "Ranked investment recommendations combining ADREC transactions with live Property Finder and Bayut supply — opportunity score, price discount, demand momentum, supply tightness.",
};

export default function MarketAnalysisRoute() {
  return <MarketAnalysisPage />;
}
