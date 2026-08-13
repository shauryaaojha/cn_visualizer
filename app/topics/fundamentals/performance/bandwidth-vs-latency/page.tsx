import { SignalVisualizerScreen } from "@/components/visualizer/SignalVisualizerScreen";

export default function Page() {
  return (
    <SignalVisualizerScreen
      path="/topics/fundamentals/performance/bandwidth-vs-latency"
      title="Bandwidth vs Latency"
      blurb="Same file, same 100 Mbps, two pipes. Why a fast connection can feel slow."
      operation="bandwidthVsLatency"
    />
  );
}
