import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/topologies/star"
      title="Star Topology"
      blurb="Every host owns its own link to a central switch."
      operation="topoStar"
    />
  );
}
