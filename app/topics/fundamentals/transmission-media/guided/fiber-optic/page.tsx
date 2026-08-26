import { MediaVisualizerScreen } from "@/components/visualizer/MediaVisualizerScreen";

export default function Page() {
  return (
    <MediaVisualizerScreen
      path="/topics/fundamentals/transmission-media/guided/fiber-optic"
      title="Optical Fiber (Total Internal Reflection)"
      blurb="Snell's Law, critical angle theta_c = arcsin(n2/n1), and 100% loss-free Total Internal Reflection in silica glass."
      operation="guidedFiber"
    />
  );
}
