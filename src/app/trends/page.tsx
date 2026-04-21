import TrendsPage from "@/components/trends/TrendsPage";

export const metadata = {
  title: "Trends · ADXBInteract",
  description:
    "Abu Dhabi real estate momentum — transaction velocity across 10-day, 3/6/9/12-month windows with surging & cooling project cohorts.",
};

export default function TrendsRoute() {
  return <TrendsPage />;
}
