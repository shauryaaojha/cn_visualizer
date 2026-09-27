// ---------------------------------------------------------------------------
// Quiz question generators. Each takes a seeded random source and returns one
// multiple-choice question with fresh numbers. The right answer is computed
// with the engines' own maths (crcRemainder, stuff, ipToInt…), so a quiz can
// never disagree with the lesson that teaches it.
//
// Pure and deterministic: the same seed always rebuilds the same quiz, which
// is how the server grades without sending answers to the browser.
// ---------------------------------------------------------------------------

import { crcRemainder } from "../../engines/bitEngine.ts";
import { stuff } from "../../engines/frameEngine.ts";
import { computeUsableHosts, deriveClass, intToIp, ipToInt, maskFromPrefix } from "../../engines/addressEngine.ts";

export type Rng = () => number;

/** mulberry32: small, fast, good enough for picking numbers. */
export function rngFrom(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
export const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const bitsOf = (r: Rng, n: number) => Array.from({ length: n }, () => (r() < 0.5 ? "0" : "1")).join("");

export interface Question {
  /** Generator id, for stats and tests. */
  kind: string;
  prompt: string;
  /** Optional monospace block: bits, addresses, a table. */
  code?: string;
  options: string[];
  /** Index into options. */
  answer: number;
  why: string;
  /** Lesson to review if they get it wrong. */
  lesson: string;
}

/** Right answer + distractors → shuffled, de-duplicated options with the answer's index. */
function mc(r: Rng, right: string, wrong: string[], q: Omit<Question, "options" | "answer">): Question {
  const opts = [right];
  for (const w of wrong) if (w !== right && !opts.includes(w) && opts.length < 4) opts.push(w);
  // Top up if distractors collided, so every question has four options.
  let k = 1;
  while (opts.length < 4) {
    const filler = `${right} ‡${k++}`; // marker the tests look for: a real option never has it
    if (!opts.includes(filler)) opts.push(filler);
  }
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { ...q, options: opts, answer: opts.indexOf(right) };
}

const fmtMs = (ms: number) => (Number.isInteger(ms) ? `${ms} ms` : `${Number(ms.toFixed(3))} ms`);

// --- Unit 1 -----------------------------------------------------------------

function transmissionDelay(r: Rng): Question {
  const kb = pick(r, [1, 2, 4, 5, 8, 10, 12.5, 20, 25]);
  const mbps = pick(r, [1, 2, 4, 5, 8, 10, 100]);
  const bits = kb * 1000 * 8;
  const ms = bits / (mbps * 1000); // bits / (bits per ms)
  return mc(r, fmtMs(ms), [fmtMs(ms * 8), fmtMs(ms / 8), fmtMs(ms * 1000), fmtMs(ms / 2)], {
    kind: "transmission-delay",
    prompt: `A ${kb} KB packet (1 KB = 1000 bytes) goes onto a ${mbps} Mbps link. What is the transmission delay?`,
    why: `Transmission delay = L / R = ${bits.toLocaleString()} bits ÷ ${mbps}×10⁶ bps = ${fmtMs(ms)}. Remember bytes → bits (×8).`,
    lesson: "/topics/fundamentals/performance/transmission-delay",
  });
}

function propagationDelay(r: Rng): Question {
  const km = pick(r, [100, 200, 400, 500, 1000, 2000, 3000, 5000]);
  const ms = (km * 1000) / 2e8 * 1000;
  return mc(r, fmtMs(ms), [fmtMs(ms * 10), fmtMs(ms / 10), fmtMs(ms * 2), fmtMs((km * 1000) / 3e8 * 1000)], {
    kind: "propagation-delay",
    prompt: `A fibre link is ${km} km long. Signals travel at 2×10⁸ m/s. What is the propagation delay?`,
    why: `Propagation delay = d / s = ${(km * 1000).toLocaleString()} m ÷ 2×10⁸ m/s = ${fmtMs(ms)}. Bandwidth doesn't appear in it.`,
    lesson: "/topics/fundamentals/performance/propagation-delay",
  });
}

function meshLinks(r: Rng): Question {
  const n = int(r, 4, 12);
  const links = (n * (n - 1)) / 2;
  return mc(r, String(links), [String(n * (n - 1)), String(n - 1), String(n * n), String(links + n)], {
    kind: "mesh-links",
    prompt: `How many cables does a full mesh of ${n} devices need?`,
    why: `Every pair gets one link: n(n−1)/2 = ${n}×${n - 1}/2 = ${links}. Each device needs n−1 = ${n - 1} ports.`,
    lesson: "/topics/fundamentals/topologies/mesh",
  });
}

function osiLayer(r: Rng): Question {
  const facts = [
    ["routes packets between networks using IP addresses", "Network (3)"],
    ["frames bits and uses MAC addresses on one link", "Data link (2)"],
    ["gives end-to-end delivery between processes using port numbers", "Transport (4)"],
    ["sends raw bits as signals over the medium", "Physical (1)"],
    ["is where HTTP, DNS and SMTP live", "Application (7)"],
  ] as const;
  const [what, right] = pick(r, facts);
  const all = ["Physical (1)", "Data link (2)", "Network (3)", "Transport (4)", "Application (7)", "Session (5)"];
  return mc(r, right, all.filter((x) => x !== right).sort(() => r() - 0.5), {
    kind: "osi-layer",
    prompt: `Which OSI layer ${what}?`,
    why: `That's the ${right} layer's job.`,
    lesson: "/topics/fundamentals/layering/osi-model",
  });
}

// --- Unit 2 -----------------------------------------------------------------

function randomHost(r: Rng): string {
  const first = pick(r, [10, 172, 192, 150, 200, 45]);
  return `${first}.${int(r, 0, 255)}.${int(r, 0, 255)}.${int(r, 1, 254)}`;
}

function networkAddress(r: Rng): Question {
  const ip = randomHost(r);
  const prefix = pick(r, [20, 22, 24, 25, 26, 27, 28, 29]);
  const mask = maskFromPrefix(prefix) >>> 0;
  const net = intToIp((ipToInt(ip) & mask) >>> 0);
  const bcast = intToIp(((ipToInt(ip) & mask) | (~mask >>> 0)) >>> 0);
  const netOf = (p: number) => intToIp((ipToInt(ip) & (maskFromPrefix(p) >>> 0)) >>> 0);
  const size = 2 ** (32 - prefix);
  const netInt = ipToInt(net);
  const octets = ip.split(".");
  return mc(r, net, [bcast, netOf(prefix - 1), netOf(prefix + 1), intToIp(netInt + size), intToIp(Math.max(netInt - size, 0)), `${octets.slice(0, 3).join(".")}.0`, ip], {
    kind: "network-address",
    prompt: `What is the network address of ${ip}/${prefix}?`,
    why: `AND the address with the /${prefix} mask (${intToIp(mask)}) → ${net}. The broadcast address would be ${bcast}.`,
    lesson: "/topics/addressing/ipv4/ipv4-addressing",
  });
}

function broadcastAddress(r: Rng): Question {
  const ip = randomHost(r);
  const prefix = pick(r, [22, 24, 25, 26, 27, 28, 29, 30]);
  const mask = maskFromPrefix(prefix) >>> 0;
  const net = (ipToInt(ip) & mask) >>> 0;
  const bcast = intToIp((net | (~mask >>> 0)) >>> 0);
  const size = 2 ** (32 - prefix);
  return mc(r, bcast, [intToIp(net), intToIp((net | (~mask >>> 0)) - 1), intToIp((net | (~(maskFromPrefix(prefix + 1) >>> 0) >>> 0)) >>> 0), intToIp(net + 2 * size - 1), intToIp(net + size)], {
    kind: "broadcast-address",
    prompt: `What is the broadcast address of ${ip}/${prefix}?`,
    why: `Keep the first ${prefix} bits, set the other ${32 - prefix} host bits to 1 → ${bcast}.`,
    lesson: "/topics/addressing/ipv4/ipv4-addressing",
  });
}

function usableHosts(r: Rng): Question {
  const prefix = int(r, 20, 30);
  const hosts = computeUsableHosts(prefix);
  return mc(r, hosts.toLocaleString(), [(hosts + 2).toLocaleString(), (hosts * 2 + 2).toLocaleString(), ((hosts + 2) / 2 - 2).toLocaleString(), (32 - prefix).toString()], {
    kind: "usable-hosts",
    prompt: `How many usable host addresses are in a /${prefix} subnet?`,
    why: `2^(32−${prefix}) − 2 = ${(hosts + 2).toLocaleString()} − 2 = ${hosts.toLocaleString()}. The network and broadcast addresses can't be given to hosts.`,
    lesson: "/topics/addressing/ipv4/ipv4-addressing",
  });
}

function prefixForHosts(r: Rng): Question {
  const need = int(r, 5, 500);
  let bits = 1;
  while (2 ** bits - 2 < need) bits++;
  const p = 32 - bits;
  return mc(r, `/${p}`, [`/${p + 1}`, `/${p - 1}`, `/${p + 2}`, `/${bits}`], {
    kind: "prefix-for-hosts",
    prompt: `A department needs ${need} hosts. What is the longest prefix (smallest subnet) that fits them? (VLSM)`,
    why: `Need 2^h − 2 ≥ ${need}. h = ${bits} gives ${2 ** bits - 2}, h = ${bits - 1} only ${2 ** (bits - 1) - 2}. So /${32 - bits}.`,
    lesson: "/topics/addressing/allocation/vlsm",
  });
}

function addressClass(r: Rng): Question {
  const first = pick(r, [10, 45, 99, 126, 128, 150, 172, 191, 192, 200, 223, 224, 239]);
  const cls = deriveClass(first);
  return mc(r, `Class ${cls}`, ["Class A", "Class B", "Class C", "Class D"].filter((c) => c !== `Class ${cls}`), {
    kind: "address-class",
    prompt: `In classful addressing, which class is ${first}.${int(r, 0, 255)}.${int(r, 0, 255)}.${int(r, 1, 254)}?`,
    why: `First octet ${first}: A = 1–126, B = 128–191, C = 192–223, D = 224–239 (multicast). So Class ${cls}.`,
    lesson: "/topics/addressing/ipv4/ipv4-addressing",
  });
}

// --- Unit 3 -----------------------------------------------------------------

function distanceVector(r: Rng): Question {
  const cB = int(r, 1, 6);
  const cC = int(r, 1, 6);
  const bD = int(r, 1, 9);
  let cD = int(r, 1, 9);
  // A tie would make two options right.
  while (cC + cD === cB + bD) cD = int(r, 1, 9);
  const viaB = cB + bD;
  const viaC = cC + cD;
  const best = Math.min(viaB, viaC);
  const hop = viaB <= viaC ? "B" : "C";
  return mc(r, `${best} via ${hop}`, [`${Math.max(viaB, viaC)} via ${hop === "B" ? "C" : "B"}`, `${Math.min(bD, cD)} via ${bD <= cD ? "B" : "C"}`, `${best} via ${hop === "B" ? "C" : "B"}`, `${viaB + viaC} via ${hop}`], {
    kind: "distance-vector",
    prompt: `Router A has neighbours B (link cost ${cB}) and C (link cost ${cC}). B says its distance to D is ${bD}; C says ${cD}. What does A record for D?`,
    code: `D_A(D) = min( c(A,B) + D_B(D) , c(A,C) + D_C(D) )`,
    why: `Bellman-Ford: via B = ${cB}+${bD} = ${viaB}, via C = ${cC}+${cD} = ${viaC}. Keep the smaller: ${best} via ${hop}.`,
    lesson: "/topics/routing/algorithms/distance-vector",
  });
}

function longestPrefix(r: Rng): Question {
  const a = int(r, 10, 200);
  const b = int(r, 0, 255);
  const c = int(r, 0, 255);
  const dest = `${a}.${b}.${c}.${int(r, 1, 254)}`;
  const routes = [`${a}.0.0.0/8 → R1`, `${a}.${b}.0.0/16 → R2`, `${a}.${b}.${c}.0/24 → R3`, `0.0.0.0/0 → R4`];
  return mc(r, "R3", ["R1", "R2", "R4"], {
    kind: "longest-prefix",
    prompt: `A router's table has these routes. Where does it send a packet for ${dest}?`,
    code: routes.join("\n"),
    why: `All of /8, /16, /24 and the default match, and forwarding picks the longest (most specific) match: the /24 → R3.`,
    lesson: "/topics/routing/forwarding/ip-forwarding",
  });
}

// --- Unit 4 -----------------------------------------------------------------

function crcQuestion(r: Rng): Question {
  const gen = pick(r, ["1011", "1101", "10011", "11001", "1001"]);
  const data = "1" + bitsOf(r, int(r, 5, 8));
  const rem = crcRemainder(data, gen);
  const flip = (s: string, i: number) => s.slice(0, i) + (s[i] === "0" ? "1" : "0") + s.slice(i + 1);
  return mc(r, rem, [flip(rem, 0), flip(rem, rem.length - 1), "0".repeat(rem.length), crcRemainder(data + "0", gen), flip(rem, 1), "1".repeat(rem.length), [...rem].reverse().join("")], {
    kind: "crc",
    prompt: `Data ${data}, generator ${gen}. What CRC remainder is appended?`,
    code: `data      ${data}\ngenerator ${gen}  (degree ${gen.length - 1} → append ${gen.length - 1} zeros)`,
    why: `Append ${gen.length - 1} zeros, then divide by ${gen} with XOR (mod-2). The remainder is ${rem}; the sender transmits ${data}${rem}.`,
    lesson: "/topics/data-link/error-control/crc",
  });
}

function parityBit(r: Rng): Question {
  const data = bitsOf(r, 7);
  const ones = [...data].filter((b) => b === "1").length;
  const even = r() < 0.5;
  const bit = even ? ones % 2 : 1 - (ones % 2);
  return mc(r, String(bit), [String(1 - bit), "Either works", "No parity bit needed"], {
    kind: "parity",
    prompt: `What ${even ? "even" : "odd"} parity bit is added to ${data}?`,
    why: `${data} has ${ones} ones. ${even ? "Even" : "Odd"} parity makes the total ${even ? "even" : "odd"}, so the bit is ${bit}.`,
    lesson: "/topics/data-link/error-control/parity",
  });
}

function hammingBits(r: Rng): Question {
  const m = pick(r, [4, 5, 7, 8, 11, 16, 26, 32]);
  let k = 0;
  while (2 ** k < m + k + 1) k++;
  return mc(r, String(k), [String(k + 1), String(k - 1), String(Math.ceil(Math.log2(m))), String(m - k), String(k + 2), String(m)], {
    kind: "hamming-bits",
    prompt: `How many redundant (check) bits does a Hamming code need for ${m} data bits?`,
    why: `Smallest r with 2^r ≥ m + r + 1: 2^${k} = ${2 ** k} ≥ ${m}+${k}+1 = ${m + k + 1}. So r = ${k}.`,
    lesson: "/topics/data-link/error-control/hamming-codes",
  });
}

function bitStuffing(r: Rng): Question {
  // Build data that is guaranteed to contain a run of five 1s.
  const data = bitsOf(r, int(r, 1, 4)) + "0111111" + bitsOf(r, int(r, 2, 5));
  const out = stuff(data).out;
  const naive = data.replace(/11111/g, "111110");
  return mc(r, out, [data, naive === out ? data + "0" : naive, out.replace(/0(?=[01]*$)/, "")], {
    kind: "bit-stuffing",
    prompt: `HDLC bit stuffing: what is sent for this data?`,
    code: data,
    why: `After every five consecutive 1s the sender inserts a 0, so the data can never look like the flag 01111110. Result: ${out}.`,
    lesson: "/topics/data-link/wan-protocols/hdlc",
  });
}

function slidingWindow(r: Rng): Question {
  const m = int(r, 2, 5);
  const gbn = r() < 0.5;
  const right = gbn ? 2 ** m - 1 : 2 ** (m - 1);
  return mc(r, String(right), [String(2 ** m), String(gbn ? 2 ** (m - 1) : 2 ** m - 1), String(m), String(2 ** m - 2), String(2 ** (m + 1) - 1), String(2 ** m + 1)], {
    kind: "sliding-window",
    prompt: `With ${m}-bit sequence numbers, what is the largest sender window for ${gbn ? "Go-Back-N" : "Selective Repeat"}?`,
    why: gbn
      ? `Go-Back-N: 2^m − 1 = ${right}. A window of 2^m = ${2 ** m} could not tell a new frame from a resent one.`
      : `Selective Repeat: 2^(m−1) = ${right}, half the sequence space, so the two windows never overlap.`,
    lesson: "/topics/data-link/flow-control/sliding-window",
  });
}

function alohaThroughput(r: Rng): Question {
  const slotted = r() < 0.5;
  return mc(r, slotted ? "36.8%" : "18.4%", slotted ? ["18.4%", "50%", "100%"] : ["36.8%", "50%", "100%"], {
    kind: "aloha",
    prompt: `What is the maximum throughput of ${slotted ? "slotted" : "pure"} ALOHA?`,
    why: slotted
      ? `Slotted ALOHA: S = G·e^(−G), largest at G = 1 → 1/e ≈ 36.8%.`
      : `Pure ALOHA: S = G·e^(−2G), largest at G = 0.5 → 1/(2e) ≈ 18.4%. Its vulnerable time is two frame times.`,
    lesson: "/topics/data-link/medium-access/aloha",
  });
}

// --- Unit 5 -----------------------------------------------------------------

function wellKnownPort(r: Rng): Question {
  const ports = [["HTTP", 80], ["HTTPS", 443], ["DNS", 53], ["SMTP", 25], ["FTP (control)", 21], ["Telnet", 23], ["SSH", 22]] as const;
  const [name, port] = pick(r, ports);
  return mc(r, String(port), ports.filter(([, p]) => p !== port).map(([, p]) => String(p)).sort(() => r() - 0.5), {
    kind: "port",
    prompt: `Which well-known port does ${name} use?`,
    why: `${name} listens on port ${port}.`,
    lesson: "/topics/transport-application/transport/port-numbers",
  });
}

function handshake(r: Rng): Question {
  const x = int(r, 100, 9000);
  let y = int(r, 100, 9000);
  // Neighbouring numbers would make distractors collide with the answer.
  while (Math.abs(x - y) < 3) y = int(r, 100, 9000);
  return mc(r, `seq=${y}, ack=${x + 1}`, [`seq=${y}, ack=${x}`, `seq=${x + 1}, ack=${y}`, `seq=${y + 1}, ack=${x + 1}`], {
    kind: "handshake",
    prompt: `The client sends SYN with seq=${x}. The server picks its own ISN ${y}. What does the SYN-ACK carry?`,
    why: `The server sends its own seq (${y}) and acknowledges the SYN, which uses one sequence number: ack = ${x}+1 = ${x + 1}.`,
    lesson: "/topics/transport-application/transport/three-way-handshake",
  });
}

function udpVsTcp(r: Rng): Question {
  const facts = [
    ["has an 8-byte header and no connection set-up", "UDP"],
    ["retransmits lost segments and delivers bytes in order", "TCP"],
    ["is used by DNS queries for speed", "UDP"],
    ["uses a three-way handshake before data flows", "TCP"],
    ["has a 20-byte minimum header with a window field", "TCP"],
  ] as const;
  const [what, right] = pick(r, facts);
  return mc(r, right, [right === "TCP" ? "UDP" : "TCP", "Both", "Neither"], {
    kind: "tcp-udp",
    prompt: `Which transport protocol ${what}?`,
    why: `${right}. TCP is reliable and connection-oriented; UDP is a thin, connectionless wrapper over IP.`,
    lesson: "/topics/transport-application/transport/udp",
  });
}

function flowWindow(r: Rng): Question {
  const buf = pick(r, [4096, 8192, 16384, 32768]);
  const used = int(r, 1, 7) * 512;
  const rwnd = buf - used;
  return mc(r, `${rwnd} bytes`, [`${buf} bytes`, `${used} bytes`, `${buf + used} bytes`, `${rwnd - 512} bytes`, `${rwnd + 512} bytes`], {
    kind: "rwnd",
    prompt: `A TCP receiver has a ${buf}-byte buffer holding ${used} bytes the app hasn't read yet. What window (rwnd) does it advertise?`,
    why: `rwnd = free buffer space = ${buf} − ${used} = ${rwnd} bytes. The sender may have at most that much unacknowledged data in flight.`,
    lesson: "/topics/transport-application/transport/tcp-flow-control",
  });
}

// --- Quizzes ----------------------------------------------------------------

export type Generator = (r: Rng) => Question;

export const UNIT_GENERATORS: Record<string, { title: string; gens: Generator[] }> = {
  "1": { title: "Unit 1 · Network Fundamentals", gens: [transmissionDelay, propagationDelay, meshLinks, osiLayer] },
  "2": { title: "Unit 2 · Network Addressing", gens: [networkAddress, broadcastAddress, usableHosts, prefixForHosts, addressClass] },
  "3": { title: "Unit 3 · Routing", gens: [distanceVector, longestPrefix] },
  "4": { title: "Unit 4 · Data Link", gens: [crcQuestion, parityBit, hammingBits, bitStuffing, slidingWindow, alohaThroughput] },
  "5": { title: "Unit 5 · Transport & Application", gens: [wellKnownPort, handshake, udpVsTcp, flowWindow] },
};

export const QUIZ_IDS = ["1", "2", "3", "4", "5", "mixed"] as const;
export type QuizId = (typeof QUIZ_IDS)[number];

export function quizTitle(id: QuizId): string {
  return id === "mixed" ? "Mixed · all units" : UNIT_GENERATORS[id].title;
}

export function isQuizId(x: string): x is QuizId {
  return (QUIZ_IDS as readonly string[]).includes(x);
}

/**
 * The quiz for (id, seed). Walks the unit's generators in a shuffled order
 * so every kind appears before any repeats; "mixed" draws from all units.
 */
export function buildQuiz(id: QuizId, seed: number): Question[] {
  const r = rngFrom(seed);
  const gens = id === "mixed" ? Object.values(UNIT_GENERATORS).flatMap((u) => u.gens) : UNIT_GENERATORS[id].gens;
  const count = id === "mixed" ? 10 : 8;
  const order = [...gens].sort(() => r() - 0.5);
  return Array.from({ length: count }, (_, i) => order[i % order.length](r));
}
