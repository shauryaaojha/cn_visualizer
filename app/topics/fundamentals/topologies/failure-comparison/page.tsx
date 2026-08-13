import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/topologies/failure-comparison"
      title="Failure Comparison"
      blurb="Cut one link in each of the five and watch three partition."
      operation="topoFailure"
    />
  );
}
