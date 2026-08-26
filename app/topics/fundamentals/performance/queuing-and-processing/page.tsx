import { SignalVisualizerScreen } from "@/components/visualizer/SignalVisualizerScreen";

export default function Page() {
  return (
    <SignalVisualizerScreen
      path="/topics/fundamentals/performance/queuing-and-processing"
      title="Queuing & Processing Delay"
      blurb="Time spent waiting in intermediate router FIFO buffers and CPU routing lookup inspection overhead."
      operation="queuingProcessing"
    />
  );
}
