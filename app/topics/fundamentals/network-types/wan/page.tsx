import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/network-types/wan"
      title="Wide Area Network (WAN)"
      blurb="Continents, Tier 1 carriers, submarine optical cables, and BGP inter-autonomous routing."
      operation="typeWan"
    />
  );
}
