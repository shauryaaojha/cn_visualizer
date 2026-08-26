import { MediaVisualizerScreen } from "@/components/visualizer/MediaVisualizerScreen";

export default function Page() {
  return (
    <MediaVisualizerScreen
      path="/topics/fundamentals/transmission-media/guided/coaxial"
      title="Coaxial Cable"
      blurb="Concentric core conductor, foam dielectric insulator, and continuous braided Faraday shield against EMI."
      operation="guidedCoaxial"
    />
  );
}
