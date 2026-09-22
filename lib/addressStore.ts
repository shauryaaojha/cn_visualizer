import { createPlayerStore } from "@/lib/createPlayerStore";
import {
  ADDRESS_DEFAULTS,
  runAddressOperation,
  type Ipv4AddressingParams,
  type VlsmParams,
} from "@/engines/addressEngine";
import type { AddrOperationId, AddrStep, Fault } from "@/types/visualization";

export type AddressOp = AddrOperationId;

export interface AddressParams {
  op: AddressOp;
  ipv4: Ipv4AddressingParams;
  vlsm: VlsmParams;
  faults: Fault[];
}

export const ADDRESS_STORE_DEFAULTS: AddressParams = {
  op: "ipv4Addressing",
  ipv4: {
    ip: ADDRESS_DEFAULTS.ipv4Addressing.ip,
    prefix: ADDRESS_DEFAULTS.ipv4Addressing.prefix,
    faults: [],
  },
  vlsm: {
    baseBlock: ADDRESS_DEFAULTS.vlsm.baseBlock,
    departments: [...ADDRESS_DEFAULTS.vlsm.departments],
    faults: [],
  },
  faults: [],
};

function compileAddress(p: AddressParams) {
  const faults = p.faults;
  if (p.op === "ipv4Addressing") {
    return runAddressOperation({
      op: "ipv4Addressing",
      ...p.ipv4,
      faults,
    });
  }
  return runAddressOperation({
    op: "vlsm",
    ...p.vlsm,
    faults,
  });
}

export const useAddressStore = createPlayerStore<AddrStep, AddressParams>(
  compileAddress,
  ADDRESS_STORE_DEFAULTS,
);
