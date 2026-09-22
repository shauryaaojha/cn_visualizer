"use client";

// ---------------------------------------------------------------------------
// AddressSidebar — left rail controls for addressEngine.
//
// Live parametric inputs for IPv4 addressing (IP and prefix length) and
// VLSM (base block and editable department host requirements). Includes fault
// injection for bit-flip tests.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Chips, Field, NumberInput, Select, TextInput } from "@/components/ui/Field";
import { SidebarTabs } from "@/components/visualizer/SidebarTabs";
import {
  clampPrefix,
  isValidIp,
  parseCidr,
  type VlsmDept,
} from "@/engines/addressEngine";
import { useAddressStore } from "@/lib/addressStore";
import type { Fault } from "@/types/visualization";

const PREFIX_OPTIONS = [
  { value: 8, label: "/8" },
  { value: 16, label: "/16" },
  { value: 24, label: "/24" },
  { value: 25, label: "/25" },
  { value: 26, label: "/26" },
  { value: 27, label: "/27" },
  { value: 28, label: "/28" },
  { value: 30, label: "/30" },
  { value: 31, label: "/31" },
  { value: 32, label: "/32" },
];

export function AddressSidebar() {
  const params = useAddressStore((s) => s.params);
  const run = useAddressStore((s) => s.run);

  const isIpv4 = params.op === "ipv4Addressing";
  const categoryTitle = isIpv4 ? "IPv4 Addressing" : "Subnet Allocation";
  const categoryIcon = isIpv4 ? "numbers" : "content_cut";

  // Bit flip fault state
  const currentBitFlip = params.faults.find((f) => f.kind === "bitFlip") as
    | { kind: "bitFlip"; index: number }
    | undefined;
  const currentBitFlipIndex = currentBitFlip !== undefined ? String(currentBitFlip.index) : "";

  const setBitFlip = (idxStr: string) => {
    if (!idxStr) {
      run({ faults: [] });
      return;
    }
    const index = parseInt(idxStr, 10);
    const faults: Fault[] = [{ kind: "bitFlip", index }];
    run({ faults });
  };

  // --- IPv4 Handlers ---
  const [ipDraft, setIpDraft] = useState(params.ipv4.ip);
  const isIpValid = isValidIp(ipDraft);

  const setIpv4Ip = (val: string) => {
    setIpDraft(val);
    if (isValidIp(val)) {
      run({
        ipv4: {
          ...params.ipv4,
          ip: val.trim(),
        },
      });
    }
  };

  const setIpv4Prefix = (prefix: number) => {
    run({
      ipv4: {
        ...params.ipv4,
        prefix: clampPrefix(prefix),
      },
    });
  };

  // --- VLSM Handlers ---
  const [baseBlockDraft, setBaseBlockDraft] = useState(params.vlsm.baseBlock);
  const isBaseBlockValid = parseCidr(baseBlockDraft) !== null;

  const setBaseBlock = (val: string) => {
    setBaseBlockDraft(val);
    if (parseCidr(val) !== null) {
      run({
        vlsm: {
          ...params.vlsm,
          baseBlock: val.trim(),
        },
      });
    }
  };

  const updateDept = (id: string, patch: Partial<VlsmDept>) => {
    const updated = params.vlsm.departments.map((d) =>
      d.id === id ? { ...d, ...patch } : d,
    );
    run({
      vlsm: {
        ...params.vlsm,
        departments: updated,
      },
    });
  };

  const removeDept = (id: string) => {
    if (params.vlsm.departments.length <= 1) return;
    const filtered = params.vlsm.departments.filter((d) => d.id !== id);
    run({
      vlsm: {
        ...params.vlsm,
        departments: filtered,
      },
    });
  };

  const addDept = () => {
    const nextIdx = params.vlsm.departments.length + 1;
    const newDept: VlsmDept = {
      id: `dept-${nextIdx}-${Date.now().toString().slice(-4)}`,
      name: `Subnet ${nextIdx}`,
      hostsNeeded: 14,
    };
    run({
      vlsm: {
        ...params.vlsm,
        departments: [...params.vlsm.departments, newDept],
      },
    });
  };

  // Key bit-flip options with educational explanations
  const bitFlipOptions = isIpv4
    ? [
        { value: "", label: "— healthy (no bit flip) —" },
        { value: "0", label: "Bit 0 (MSB of Octet 1, Network)" },
        { value: "7", label: "Bit 7 (LSB of Octet 1, Network)" },
        { value: "15", label: "Bit 15 (LSB of Octet 2, Network)" },
        { value: "23", label: "Bit 23 (LSB of Octet 3, Network boundary)" },
        { value: "24", label: "Bit 24 (MSB of Octet 4, Host boundary)" },
        { value: "31", label: "Bit 31 (LSB of Octet 4, Host)" },
      ]
    : [
        { value: "", label: "— healthy (no bit flip) —" },
        { value: "23", label: "Bit 23 (Flips base octet 3)" },
        { value: "16", label: "Bit 16 (Flips base octet 3 MSB)" },
        { value: "15", label: "Bit 15 (Flips base octet 2 LSB)" },
      ];

  return (
    <aside className="scroll-thin z-40 flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r-[1.5px] border-dashed border-outline-variant bg-surface-container-low/95 backdrop-blur-xl md:bg-surface-container-low/80">
      <div className="flex flex-1 flex-col gap-md p-md">
        {/* Header */}
        <div className="flex items-center gap-2 border-b-[1.5px] border-dashed border-outline-variant pb-md">
          <Icon name={categoryIcon} className="text-[16px] text-primary" />
          <h2 className="font-hand text-[17px] font-bold text-primary">{categoryTitle}</h2>
        </div>

        <SidebarTabs />

        {/* IPv4 Addressing Live Parameters */}
        {isIpv4 && (
          <>
            <Field
              label="IPv4 Address"
              hint={isIpValid ? "Dotted decimal format (0.0.0.0 – 255.255.255.255)" : "Invalid IPv4 address format"}
            >
              <TextInput
                value={ipDraft}
                onCommit={setIpv4Ip}
                placeholder="192.168.1.25"
                invalid={!isIpValid}
              />
            </Field>

            <Field label="Prefix Length" hint="Slide the boundary dividing network and host bits.">
              <Chips
                value={params.ipv4.prefix}
                onChange={setIpv4Prefix}
                columns={5}
                options={PREFIX_OPTIONS}
              />
            </Field>

            <Field label="Custom Prefix (0–32)">
              <NumberInput
                value={params.ipv4.prefix}
                onCommit={setIpv4Prefix}
                min={0}
                max={32}
                step={1}
                suffix="bits"
              />
            </Field>
          </>
        )}

        {/* VLSM Live Parameters */}
        {!isIpv4 && (
          <>
            <Field
              label="Base Network Block"
              hint={isBaseBlockValid ? "CIDR block to carve (e.g., 192.168.1.0/24)" : "Invalid CIDR format"}
            >
              <TextInput
                value={baseBlockDraft}
                onCommit={setBaseBlock}
                placeholder="192.168.1.0/24"
                invalid={!isBaseBlockValid}
              />
            </Field>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-label-caps text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/70">
                  Departments ({params.vlsm.departments.length})
                </label>
                <button
                  type="button"
                  onClick={addDept}
                  className="flex items-center gap-1 font-hand text-[12px] font-bold text-mint hover:underline"
                >
                  <Icon name="add" className="text-[14px]" /> Add
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {params.vlsm.departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center gap-1.5 rounded border border-dashed border-outline-variant/60 bg-black/20 p-1.5"
                  >
                    <div className="flex-1">
                      <TextInput
                        value={dept.name}
                        onCommit={(val) => updateDept(dept.id, { name: val || "Dept" })}
                        placeholder="Name"
                      />
                    </div>
                    <div className="w-20">
                      <NumberInput
                        value={dept.hostsNeeded}
                        onCommit={(val) => updateDept(dept.id, { hostsNeeded: Math.max(1, val) })}
                        min={1}
                        max={10000}
                        step={1}
                        suffix="h"
                      />
                    </div>
                    {params.vlsm.departments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDept(dept.id)}
                        className="p-1 text-on-surface-variant/50 hover:text-coral"
                        title="Remove department"
                      >
                        <Icon name="close" className="text-[14px]" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Fault Injection: Bit Flip */}
        <div className="flex flex-col gap-1 border-t border-dashed border-outline-variant/40 pt-3">
          <label className="flex items-center gap-1.5 font-label-caps text-[9px] uppercase tracking-[0.08em] text-coral">
            <Icon name="warning" className="text-[13px]" /> Flip an address bit
          </label>
          <Select
            value={currentBitFlipIndex}
            onChange={setBitFlip}
            options={bitFlipOptions}
          />
          <p className="font-body-sm text-[11px] leading-snug text-on-surface-variant/60">
            {currentBitFlipIndex !== ""
              ? isIpv4
                ? parseInt(currentBitFlipIndex, 10) < params.ipv4.prefix
                  ? "Network bit flipped: moves host to another subnet entirely!"
                  : "Host bit flipped: alters local host address."
                : "Base bit flipped: shifts the root network address of all carves."
              : "Flip a bit to simulate transmission corruption or bit-drift."}
          </p>
        </div>
      </div>
    </aside>
  );
}
