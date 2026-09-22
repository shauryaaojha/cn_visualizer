"use client";

// ---------------------------------------------------------------------------
// AddressCanvas — dumb visualizer canvas for addressEngine.
//
// Renders the 32-bit binary grid with its sliding network/host divider,
// and the proportional address-space bar for VLSM / FLSM allocations.
// Zero logic, zero calculation — reads only the current frame from useAddressStore.
// ---------------------------------------------------------------------------

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { useAddressStore } from "@/lib/addressStore";
import type {
  AddrBlock,
  AddrGridRow,
  AddrOctet,
  AddrSpaceBar,
  CellState,
  DataTable,
} from "@/types/visualization";

const STAGE_W = 680;
const SPRING = { type: "spring", stiffness: 190, damping: 24 } as const;

const BIT_STYLE: Record<CellState, string> = {
  idle: "border-outline-variant/60 bg-surface-container-low/70 text-on-surface-variant/70",
  active: "border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(240,210,100,0.5)] font-bold",
  visited: "border-mint/60 bg-mint/15 text-mint",
  new: "border-mint bg-mint/25 text-mint font-bold animate-ok-pulse",
  removing: "border-amber bg-amber/20 text-amber",
  target: "border-primary bg-primary/30 text-primary",
  found: "border-mint bg-mint text-surface shadow-[0_0_14px_rgba(185,227,154,0.6)] font-bold",
  failed: "border-coral bg-coral/25 text-coral shadow-[0_0_14px_rgba(227,154,166,0.6)] font-bold animate-fail-pulse",
};

export function AddressCanvas() {
  const step = useAddressStore((s) => s.currentStep());
  if (!step) return null;

  return (
    <FitStage>
      <div className="flex flex-col items-center gap-4 py-2" style={{ width: STAGE_W }}>
        {/* 32-bit grid rows (IPv4 addressing, masks, supernetting) */}
        {step.gridRows && step.gridRows.length > 0 && (
          <div className="flex w-full flex-col gap-3">
            {step.gridRows.map((row) => (
              <BitGridRow key={row.id} row={row} />
            ))}
          </div>
        )}

        {/* Address Space Bar (VLSM, FLSM) */}
        {step.spaceBar && (
          <SpaceBarSection spaceBar={step.spaceBar} title={step.spaceBar.title} />
        )}

        {/* Secondary comparison bar (e.g. VLSM vs FLSM) */}
        {step.comparisonBar && (
          <SpaceBarSection spaceBar={step.comparisonBar} title={step.comparisonBar.title} isComparison />
        )}

        {/* Facts strip */}
        {step.facts && step.facts.length > 0 && (
          <div className="flex w-full flex-wrap justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-outline-variant bg-surface-container-low/50 p-2.5 backdrop-blur-sm">
            {step.facts.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded border border-outline-variant/60 bg-surface-container-low/80 px-2.5 py-1"
              >
                <span className="font-hand text-[12px] font-bold text-on-surface-variant/80">
                  {f.label}:
                </span>
                <span
                  className={`font-mono text-[12px] font-bold ${
                    f.tone === "mint"
                      ? "text-mint"
                      : f.tone === "amber"
                        ? "text-amber"
                        : f.tone === "coral"
                          ? "text-coral"
                          : f.tone === "signal"
                            ? "text-primary"
                            : "text-on-surface"
                  }`}
                >
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Optional Data Table */}
        {step.table && <TableView table={step.table} />}

        {/* Message Banner */}
        <AnimatePresence mode="wait">
          {step.message && (
            <motion.div
              key={step.message.text}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center justify-center rounded-full border-[1.5px] border-dashed px-5 py-1.5 font-hand text-[15px] font-bold backdrop-blur-sm ${
                step.message.tone === "error"
                  ? "border-coral/70 bg-coral/10 text-coral"
                  : step.message.tone === "ok"
                    ? "border-mint/70 bg-mint/10 text-mint"
                    : step.message.tone === "warn"
                      ? "border-amber/70 bg-amber/10 text-amber"
                      : "border-outline-variant bg-surface-container/80 text-on-surface-variant"
              }`}
            >
              {step.message.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FitStage>
  );
}

// --- 32-Bit Grid Row --------------------------------------------------------

function BitGridRow({ row }: { row: AddrGridRow }) {
  const boundary = row.boundaryAfterBit;

  return (
    <div className="relative flex w-full flex-col rounded-xl border-[1.5px] border-dashed border-outline-variant bg-surface-container-low/40 p-3.5 backdrop-blur-sm">
      {/* Row Header */}
      <div className="mb-2.5 flex items-center justify-between border-b-[1.5px] border-dashed border-outline-variant/40 pb-1.5">
        <span className="font-hand text-[16px] font-bold text-primary">{row.label}</span>
        {boundary !== undefined && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-mint">
              Network: {boundary} bits
            </span>
            <span className="text-[10px] text-outline">|</span>
            <span className="font-mono text-[11px] font-bold text-primary">
              Host: {32 - boundary} bits
            </span>
          </div>
        )}
      </div>

      {/* Octets Container */}
      <div className="relative flex items-center justify-between gap-1.5">
        {row.octets.map((octet, octetIdx) => (
          <div key={octetIdx} className="flex items-center gap-1.5">
            <OctetBlock
              octet={octet}
              octetIdx={octetIdx}
              rowId={row.id}
              boundaryAfterBit={boundary}
            />
            {octetIdx < 3 && (
              <span className="select-none font-mono text-[20px] font-extrabold text-primary/60">
                ·
              </span>
            )}
          </div>
        ))}

        {/* Sliding Network/Host Boundary Divider */}
        {boundary !== undefined && (
          <BoundaryDivider boundary={boundary} />
        )}
      </div>
    </div>
  );
}

function OctetBlock({
  octet,
  octetIdx,
  rowId,
  boundaryAfterBit,
}: {
  octet: AddrOctet;
  octetIdx: number;
  rowId: string;
  boundaryAfterBit?: number;
}) {
  return (
    <div className="flex flex-col items-center">
      {/* Octet Decimal Readout */}
      <div className="mb-1 flex items-baseline gap-1">
        <span className="font-mono text-[17px] font-bold text-on-surface">
          {octet.decimal}
        </span>
        <span className="font-hand text-[10px] text-on-surface-variant/60">
          .{octetIdx + 1}
        </span>
      </div>

      {/* 8 Bits Grid */}
      <div className="grid grid-cols-8 gap-0.5">
        {octet.bits.map((bit, bitIdx) => {
          const globalIdx = octetIdx * 8 + bitIdx;
          const isNetwork = boundaryAfterBit !== undefined && globalIdx < boundaryAfterBit;
          const roleBorder = isNetwork ? "border-mint/50" : "border-primary/40";

          return (
            <div key={bitIdx} className="flex flex-col items-center">
              {/* Place Value Header */}
              <span className="select-none font-mono text-[7.5px] leading-tight text-on-surface-variant/50">
                {bit.placeValue}
              </span>

              {/* Bit Cell */}
              <motion.div
                layout
                transition={SPRING}
                key={`bit-${rowId}-${globalIdx}`}
                className={`flex h-6 w-4 items-center justify-center rounded-[2px] border font-mono text-[11px] transition-colors ${roleBorder} ${BIT_STYLE[bit.state]}`}
              >
                {bit.val}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Animated vertical divider line that smoothly slides across the 32 bits
 * as the prefix length changes.
 */
function BoundaryDivider({ boundary }: { boundary: number }) {
  // Compute approximate percentage across the 32 bits, taking octet dot gaps into account.
  // 32 bits + 3 dot gaps.
  // Each octet has 8 bits.
  const octetIndex = Math.min(3, Math.floor(boundary / 8));
  const bitInOctet = boundary % 8;

  // Approximate relative position:
  // Each octet takes ~23% of container width, gaps ~2.5% each.
  const octetWidthPct = 23.2;
  const gapWidthPct = 2.4;
  const posPct =
    octetIndex * (octetWidthPct + gapWidthPct) +
    (bitInOctet / 8) * octetWidthPct;

  return (
    <motion.div
      layout
      transition={SPRING}
      className="pointer-events-none absolute -bottom-2 -top-2 z-20 flex flex-col items-center"
      style={{ left: `${Math.min(99.5, Math.max(0.5, posPct))}%` }}
    >
      {/* Top Tag */}
      <div className="-translate-x-1/2 rounded bg-mint px-1 py-0.5 font-mono text-[9px] font-bold text-surface shadow-md">
        /{boundary}
      </div>

      {/* Neon Line */}
      <div className="w-[2px] flex-1 bg-mint shadow-[0_0_8px_rgba(185,227,154,0.8)]" />

      {/* Bottom Tag */}
      <div className="-translate-x-1/2 rounded bg-mint/90 px-1 py-0.2 font-label-caps text-[7.5px] font-bold uppercase text-surface">
        div
      </div>
    </motion.div>
  );
}

// --- Address Space Bar (VLSM / FLSM) ----------------------------------------

function SpaceBarSection({
  spaceBar,
  title,
  isComparison,
}: {
  spaceBar: AddrSpaceBar;
  title?: string;
  isComparison?: boolean;
}) {
  return (
    <div
      className={`relative w-full rounded-xl border-[1.5px] border-dashed p-3.5 backdrop-blur-sm ${
        isComparison
          ? "border-outline-variant/60 bg-surface-container-low/30"
          : "border-outline-variant bg-surface-container-low/50"
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-hand text-[15px] font-bold text-primary">
            {title ?? (isComparison ? "Comparison Block" : "Address Space Bar")}
          </span>
          <span className="font-mono text-[11px] text-on-surface-variant/70">
            Base: {spaceBar.baseBlock} ({spaceBar.totalAddresses} addresses)
          </span>
        </div>
      </div>

      {/* The Proportional Bar */}
      <div className="relative h-14 w-full overflow-hidden rounded-lg border-[1.5px] border-dashed border-outline-variant bg-black/30">
        {spaceBar.blocks.map((b) => (
          <BlockSlice key={b.id} block={b} />
        ))}
      </div>

      {/* Optional Nested Children Row */}
      {spaceBar.blocks.some((b) => b.children && b.children.length > 0) && (
        <div className="relative mt-2 h-10 w-full overflow-hidden rounded-md border border-dashed border-outline-variant/50 bg-black/20">
          {spaceBar.blocks.flatMap((b) =>
            (b.children ?? []).map((c) => (
              <BlockSlice key={`child-${c.id}`} block={c} isSub />
            )),
          )}
        </div>
      )}
    </div>
  );
}

function BlockSlice({ block, isSub }: { block: AddrBlock; isSub?: boolean }) {
  const isWasted = block.hostsWasted !== undefined && block.hostsWasted > 0;

  return (
    <motion.div
      layout
      transition={SPRING}
      className={`group absolute top-0 bottom-0 flex flex-col justify-between overflow-hidden border-r-[1.5px] border-surface p-1 transition-all hover:z-30 hover:shadow-lg ${
        block.state === "failed" ? "animate-fail-pulse" : ""
      }`}
      style={{
        left: `${block.offsetPct}%`,
        width: `${block.widthPct}%`,
        backgroundColor: block.color,
      }}
    >
      <div className="flex items-center justify-between overflow-hidden text-surface">
        <span
          className={`truncate font-hand font-bold leading-none ${
            isSub ? "text-[11px]" : "text-[12px]"
          }`}
        >
          {block.label}
        </span>
      </div>

      <div className="flex items-baseline justify-between overflow-hidden font-mono text-[9px] text-surface/90">
        <span className="truncate">{block.startIp}</span>
        {block.widthPct > 8 && (
          <span className="truncate font-semibold">/{block.prefix}</span>
        )}
      </div>

      {/* Hover tooltip */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/75 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
        <div className="px-1 text-center font-mono text-[9px] text-chalk">
          <div>{block.label}</div>
          <div>
            {block.startIp} – {block.endIp}
          </div>
          <div>{block.usableHosts} usable hosts</div>
          {isWasted && (
            <div className="text-amber">({block.hostsWasted} wasted)</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// --- Data Table View --------------------------------------------------------

function TableView({ table }: { table: DataTable }) {
  return (
    <div className="w-full overflow-hidden rounded-lg border-[1.5px] border-dashed border-outline-variant bg-surface-container-low/40 p-2.5 backdrop-blur-sm">
      <div className="mb-2 font-hand text-[14px] font-bold text-primary">
        {table.title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left font-mono text-[11px]">
          <thead>
            <tr className="border-b border-outline-variant/60 text-on-surface-variant">
              {table.columns.map((c, i) => (
                <th key={i} className="px-2 py-1 font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, rIdx) => (
              <tr
                key={rIdx}
                className="border-b border-outline-variant/20 hover:bg-surface-container/30"
              >
                {r.cells.map((cell, cIdx) => (
                  <td key={cIdx} className="px-2 py-1 text-on-surface">
                    {cell.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
