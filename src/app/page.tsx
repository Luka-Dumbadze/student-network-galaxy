import GalaxyApp from "@/components/network/GalaxyApp";

// Avoid heavy prerendering (graph rendering + analytics) during build.
export const dynamic = "force-dynamic";

export default function Home() {
  return <GalaxyApp />;
}
