import { LadderVisualizerScreen } from "@/components/visualizer/LadderVisualizerScreen";

export default function Page() {
  return <LadderVisualizerScreen path="/topics/capstone/end-to-end/packet-journey" title="Packet Journey" blurb="DNS → TCP handshake → HTTP → close: the whole course in one page load." operation="packetJourney" />;
}
