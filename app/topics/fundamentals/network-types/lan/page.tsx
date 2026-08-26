import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/network-types/lan"
      title="Local Area Network (LAN)"
      blurb="One building, one switch, dedicated high-speed bandwidth, and a single broadcast domain."
      operation="typeLan"
    />
  );
}
