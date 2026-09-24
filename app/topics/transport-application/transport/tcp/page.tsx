import { FrameVisualizerScreen } from "@/components/visualizer/FrameVisualizerScreen";

export default function Page() {
  return <FrameVisualizerScreen path="/topics/transport-application/transport/tcp" title="TCP Segment" blurb="Every field of the TCP header, with your own seq number." operation="tcp" />;
}
