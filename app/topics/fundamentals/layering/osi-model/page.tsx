import { LayerVisualizerScreen } from "@/components/visualizer/LayerVisualizerScreen";

export default function Page() {
  return (
    <LayerVisualizerScreen
      path="/topics/fundamentals/layering/osi-model"
      title="OSI Reference Model"
      blurb="Explore the 7 layers of the ISO/OSI model, layer duties, protocol data units (PDUs), and hardware mappings."
      operation="osiModel"
    />
  );
}
