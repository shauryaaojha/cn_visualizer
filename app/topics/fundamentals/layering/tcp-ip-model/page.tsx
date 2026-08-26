import { LayerVisualizerScreen } from "@/components/visualizer/LayerVisualizerScreen";

export default function Page() {
  return (
    <LayerVisualizerScreen
      path="/topics/fundamentals/layering/tcp-ip-model"
      title="TCP/IP 4-Layer Model"
      blurb="The pragmatic 4-layer DoD internet architecture mapped side-by-side against the theoretical 7-layer OSI model."
      operation="tcpIpModel"
    />
  );
}
