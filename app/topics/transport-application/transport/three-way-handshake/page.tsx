import { LadderVisualizerScreen } from "@/components/visualizer/LadderVisualizerScreen";

export default function Page() {
  return <LadderVisualizerScreen path="/topics/transport-application/transport/three-way-handshake" title="Three-Way Handshake" blurb="SYN, SYN-ACK, ACK — with real sequence numbers — and the four-message close." operation="handshake" />;
}
