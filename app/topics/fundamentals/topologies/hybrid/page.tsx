import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/topologies/hybrid"
      title="Hybrid Topology"
      blurb="Two stars joined by a trunk — how real sites are built."
      operation="topoHybrid"
    />
  );
}
