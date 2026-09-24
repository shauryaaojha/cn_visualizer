import { LadderVisualizerScreen } from "@/components/visualizer/LadderVisualizerScreen";

export default function Page() {
  return <LadderVisualizerScreen path="/topics/data-link/flow-control/sliding-window" title="Sliding Window" blurb="Many frames in flight before any ACK returns — and what one lost frame costs Go-Back-N." operation="slidingWindow" />;
}
