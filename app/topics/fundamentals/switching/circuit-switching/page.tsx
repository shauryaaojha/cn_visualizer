import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/switching/circuit-switching"
      title="Circuit Switching"
      blurb="3-phase connection: setup probe locks dedicated physical bandwidth, continuous stream data flow, and teardown release."
      operation="switchCircuit"
    />
  );
}
