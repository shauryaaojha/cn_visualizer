import { MediaVisualizerScreen } from "@/components/visualizer/MediaVisualizerScreen";

export default function Page() {
  return (
    <MediaVisualizerScreen
      path="/topics/fundamentals/transmission-media/unguided/microwaves"
      title="Terrestrial & Satellite Microwaves"
      blurb="Directional line-of-sight parabolic beams, earth curvature relay tower limits, and rain fade attenuation."
      operation="unguidedMicrowave"
    />
  );
}
