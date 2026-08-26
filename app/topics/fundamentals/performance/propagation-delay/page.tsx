import { SignalVisualizerScreen } from "@/components/visualizer/SignalVisualizerScreen";

export default function Page() {
  return (
    <SignalVisualizerScreen
      path="/topics/fundamentals/performance/propagation-delay"
      title="Propagation Delay (d / s)"
      blurb="The physical transit time of electromagnetic waves traveling across distance d at the speed of light in the medium."
      operation="propagationDelay"
    />
  );
}
