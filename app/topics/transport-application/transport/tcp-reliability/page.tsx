import { LadderVisualizerScreen } from "@/components/visualizer/LadderVisualizerScreen";

export default function Page() {
  return <LadderVisualizerScreen path="/topics/transport-application/transport/tcp-reliability" title="TCP Reliability" blurb="Lose a segment: duplicate ACKs, fast retransmit, cumulative ACK." operation="tcpReliability" />;
}
