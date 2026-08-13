import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/topologies/bus"
      title="Bus Topology"
      blurb="One shared backbone — every host hears every frame."
      operation="topoBus"
    />
  );
}
