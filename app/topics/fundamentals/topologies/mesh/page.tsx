import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/topologies/mesh"
      title="Mesh Topology"
      blurb="Every host wired to every other — 15 links for 6 hosts."
      operation="topoMesh"
    />
  );
}
