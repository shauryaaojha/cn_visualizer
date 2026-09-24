import { LadderVisualizerScreen } from "@/components/visualizer/LadderVisualizerScreen";

export default function Page() {
  return <LadderVisualizerScreen path="/topics/transport-application/transport/tcp-flow-control" title="TCP Flow Control" blurb="The receiver's window decides how fast you may send." operation="tcpFlowControl" />;
}
