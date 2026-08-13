import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/topologies/ring"
      title="Ring Topology"
      blurb="A closed loop, so there are always two ways round."
      operation="topoRing"
    />
  );
}
