import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/introduction/what-is-a-network"
      title="What Is a Network?"
      blurb="Follow packets from creation, serialization onto the wire, switch buffering, to destination reassembly."
      operation="introNetwork"
    />
  );
}
