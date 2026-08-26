import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/network-types/pan"
      title="Personal Area Network (PAN)"
      blurb="Personal area — a smartphone, smartwatch, and peripherals operating over ultra-short range BLE / Zigbee."
      operation="typePan"
    />
  );
}
