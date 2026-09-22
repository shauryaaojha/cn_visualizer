import { AddressVisualizerScreen } from "@/components/visualizer/AddressVisualizerScreen";

export default function Page() {
  return (
    <AddressVisualizerScreen
      path="/topics/addressing/ipv4/ipv4-addressing"
      title="IPv4 Addressing"
      blurb="192.168.1.25 as 32 bits."
      operation="ipv4Addressing"
    />
  );
}
