import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/switching/circuit-vs-packet"
      title="Circuit vs Packet Switching"
      blurb="Direct side-by-side performance race: setup penalty vs zero startup delay, and dedicated capacity vs statistical multiplexing."
      operation="switchComparison"
    />
  );
}
