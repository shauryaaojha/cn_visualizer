import { runRoutingOperation, ROUTING_DEFAULTS, type RoutingParams } from "@/engines/routingEngine";
import { createPlayerStore } from "@/lib/createPlayerStore";
import type { RoutingStep } from "@/types/visualization";

export const useRoutingStore = createPlayerStore<RoutingStep, RoutingParams>(
  (params) => runRoutingOperation(params),
  ROUTING_DEFAULTS,
);
