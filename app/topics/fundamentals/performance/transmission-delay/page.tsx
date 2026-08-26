import { SignalVisualizerScreen } from "@/components/visualizer/SignalVisualizerScreen";

export default function Page() {
  return (
    <SignalVisualizerScreen
      path="/topics/fundamentals/performance/transmission-delay"
      title="Transmission Delay (L / R)"
      blurb="How long it takes for the NIC serializer to push all packet bits onto the wire at link bandwidth rate R."
      operation="transmissionDelay"
    />
  );
}
