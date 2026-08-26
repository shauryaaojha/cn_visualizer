import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/switching/packet-switching"
      title="Packet Switching"
      blurb="Statistical multiplexing: message chunked into packets, dynamic hop-by-hop multi-path routing, and out-of-order reassembly."
      operation="switchPacket"
    />
  );
}
