import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/network-types/scale-comparison"
      title="Scale Comparison"
      blurb="Zoom from person to planet and watch coverage radius, hop counts, and latency scale across 6 orders of magnitude."
      operation="typeComparison"
    />
  );
}
