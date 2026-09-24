import { LadderVisualizerScreen } from "@/components/visualizer/LadderVisualizerScreen";

export default function Page() {
  return <LadderVisualizerScreen path="/topics/data-link/flow-control/stop-and-wait" title="Stop-and-Wait" blurb="One frame, one ACK, then the next — reliable and slow." operation="stopAndWait" />;
}
