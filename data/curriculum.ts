// ---------------------------------------------------------------------------
// Curriculum metadata for 21CSC302J — Computer Networks.
//
// The *folder tree* under app/topics is the canonical route map; this file adds
// the human-facing metadata (titles, blurbs, icons, build status) that the
// landing page and every hub page render. Slugs must match folder names exactly
// so hrefs are real routes. See ARCHITECTURE.md.
//
// Unit 1 is being built first. Later units already have their full leaf lists
// here so the hubs are honest about where the course is going — they just
// carry status "soon" until their engine's turn.
// ---------------------------------------------------------------------------

export type TopicStatus = "available" | "soon";

export interface LeafMeta {
  slug: string;
  title: string;
  blurb: string;
  icon: string;
  status?: TopicStatus;
  /** Badges on the card — CN's answer to DSA's Big-O chips. */
  stats?: string[];
  /** If present this card is an intermediate hub listing these children. */
  children?: LeafMeta[];
}

export interface CategoryMeta {
  slug: string;
  title: string;
  blurb: string;
  icon: string;
  status: TopicStatus;
  leaves: LeafMeta[];
}

export interface SectionMeta {
  slug: string;
  unit: number;
  title: string;
  /** Compact label for the navbar. */
  short: string;
  blurb: string;
  icon: string;
  status: TopicStatus;
  categories: CategoryMeta[];
}

const soon = (leaves: Omit<LeafMeta, "status">[]): LeafMeta[] =>
  leaves.map((l) => ({ ...l, status: "soon" as const }));

// --- UNIT 1 — Network Fundamentals (building now) ---------------------------

const fundamentals: SectionMeta = {
  slug: "fundamentals",
  unit: 1,
  title: "Network Fundamentals",
  short: "Fundamentals",
  blurb:
    "What a network is made of, how it is wired, how a message is packaged, and what actually limits its speed.",
  icon: "lan",
  status: "available",
  categories: [
    {
      slug: "introduction",
      title: "Introduction to Networks",
      blurb: "Nodes, links, and what really moves between them.",
      icon: "cell_tower",
      status: "soon",
      leaves: soon([
        {
          slug: "what-is-a-network",
          title: "What Is a Network?",
          blurb: "Follow one packet from a sender, across a link, to a receiver.",
          icon: "share",
        },
      ]),
    },
    {
      slug: "network-types",
      title: "Network Types",
      blurb: "The same idea at four scales — PAN, LAN, MAN, WAN.",
      icon: "travel_explore",
      status: "soon",
      leaves: soon([
        { slug: "pan", title: "PAN", blurb: "Personal area — a phone and the things around it.", icon: "watch" },
        { slug: "lan", title: "LAN", blurb: "One building, one switch, one broadcast domain.", icon: "home_work" },
        { slug: "man", title: "MAN", blurb: "A campus or city, several sites joined.", icon: "location_city" },
        { slug: "wan", title: "WAN", blurb: "Continents, carriers and leased links.", icon: "public" },
        {
          slug: "scale-comparison",
          title: "Scale Comparison",
          blurb: "Zoom from person to planet and watch device count and complexity climb.",
          icon: "zoom_out_map",
        },
      ]),
    },
    {
      slug: "topologies",
      title: "Network Topologies",
      blurb: "Six hosts, five wirings. Then cut a link and see which survive.",
      icon: "hub",
      status: "available",
      leaves: [
        {
          slug: "bus",
          title: "Bus",
          blurb: "One shared backbone — everybody hears everything.",
          icon: "horizontal_rule",
          stats: ["11 links", "6 hops"],
        },
        {
          slug: "star",
          title: "Star",
          blurb: "Every host gets its own link to a central switch.",
          icon: "star",
          stats: ["6 links", "2 hops"],
        },
        {
          slug: "ring",
          title: "Ring",
          blurb: "A closed loop with two directions to travel.",
          icon: "radio_button_unchecked",
          stats: ["6 links", "2 hops"],
        },
        {
          slug: "mesh",
          title: "Mesh",
          blurb: "Every host wired to every other. Expensive, unbreakable.",
          icon: "hub",
          stats: ["15 links", "1 hop"],
        },
        {
          slug: "hybrid",
          title: "Hybrid",
          blurb: "Two stars joined by a trunk — how real sites are actually built.",
          icon: "account_tree",
          stats: ["7 links", "3 hops"],
        },
        {
          slug: "failure-comparison",
          title: "Failure Comparison",
          blurb: "All five side by side. Cut one link in each and watch three of them partition.",
          icon: "link_off",
          stats: ["5 topologies", "2 survive"],
        },
      ],
    },
    {
      slug: "switching",
      title: "Switching",
      blurb: "Reserve a path, or chop the message up and let the pieces find their own way.",
      icon: "call_split",
      status: "soon",
      leaves: soon([
        {
          slug: "circuit-switching",
          title: "Circuit Switching",
          blurb: "Reserve an end-to-end path first, then send.",
          icon: "settings_input_component",
        },
        {
          slug: "packet-switching",
          title: "Packet Switching",
          blurb: "Split, scatter across different routes, reassemble.",
          icon: "grid_view",
        },
        {
          slug: "circuit-vs-packet",
          title: "Circuit vs Packet",
          blurb: "Same message, two completely different journeys.",
          icon: "compare_arrows",
        },
      ]),
    },
    {
      slug: "layering",
      title: "Layered Architecture",
      blurb: "Why seven layers, and what each one actually clamps onto your data.",
      icon: "layers",
      status: "available",
      leaves: [
        {
          slug: "osi-model",
          title: "OSI Model",
          blurb: "The seven layers and the one job each of them owns.",
          icon: "view_agenda",
          status: "soon",
        },
        {
          slug: "encapsulation",
          title: "Encapsulation",
          blurb: "Watch HELLO become a segment, a packet, a frame, then bits — and back again.",
          icon: "inventory_2",
          stats: ["7 layers", "58 B overhead"],
        },
        {
          slug: "tcp-ip-model",
          title: "TCP/IP Model",
          blurb: "The four layers the internet actually runs on, mapped against OSI.",
          icon: "dns",
          status: "soon",
        },
      ],
    },
    {
      slug: "performance",
      title: "Latency, Bandwidth & Delay",
      blurb: "The four delays that add up to the number you actually feel.",
      icon: "speed",
      status: "available",
      leaves: [
        {
          slug: "transmission-delay",
          title: "Transmission Delay",
          blurb: "How long it takes to push the bits out of the interface.",
          icon: "upload",
          status: "soon",
        },
        {
          slug: "propagation-delay",
          title: "Propagation Delay",
          blurb: "How long the signal takes to physically cross the distance.",
          icon: "trending_flat",
          status: "soon",
        },
        {
          slug: "queuing-and-processing",
          title: "Queuing & Processing",
          blurb: "Time lost waiting in a router's buffer and being examined.",
          icon: "pending",
          status: "soon",
        },
        {
          slug: "bandwidth-vs-latency",
          title: "Bandwidth vs Latency",
          blurb: "Same file, same 100 Mbps, two pipes. Why a fast connection can feel slow.",
          icon: "compare",
          stats: ["real numbers", "68× gap"],
        },
      ],
    },
    {
      slug: "transmission-media",
      title: "Transmission Media",
      blurb: "What a 1 and a 0 physically are on copper, glass and air.",
      icon: "cable",
      status: "soon",
      leaves: soon([
        {
          slug: "signal-basics",
          title: "Signal Basics",
          blurb: "Bits become voltage, light pulses or a modulated wave.",
          icon: "graphic_eq",
        },
        {
          slug: "guided",
          title: "Guided Media",
          blurb: "Twisted pair, coaxial and fibre.",
          icon: "settings_ethernet",
          children: soon([
            { slug: "twisted-pair", title: "Twisted Pair", blurb: "Why the twist cancels interference.", icon: "cable" },
            { slug: "coaxial", title: "Coaxial", blurb: "Conductor, insulator, shield.", icon: "adjust" },
            { slug: "fiber-optic", title: "Fibre Optic", blurb: "Total internal reflection carrying light.", icon: "flare" },
          ]),
        },
        {
          slug: "unguided",
          title: "Unguided Media",
          blurb: "Radio, microwave and infrared through free space.",
          icon: "wifi",
          children: soon([
            { slug: "radio-waves", title: "Radio Waves", blurb: "Omnidirectional, wall-penetrating, shared.", icon: "cell_tower" },
            { slug: "microwaves", title: "Microwaves", blurb: "Tight line-of-sight beams between dishes.", icon: "satellite_alt" },
            { slug: "infrared", title: "Infrared", blurb: "Short range, blocked by anything opaque.", icon: "settings_remote" },
          ]),
        },
        {
          slug: "media-comparison",
          title: "Media Comparison",
          blurb: "Distance, speed, interference and cost side by side.",
          icon: "table_rows",
        },
      ]),
    },
  ],
};

// --- UNIT 2 — Addressing ----------------------------------------------------

const addressing: SectionMeta = {
  slug: "addressing",
  unit: 2,
  title: "Network Addressing",
  short: "Addressing",
  blurb: "32 bits, split into a network part and a host part — and every consequence of where you put the line.",
  icon: "pin",
  status: "soon",
  categories: [
    {
      slug: "ipv4",
      title: "IPv4 Addressing",
      blurb: "Dotted decimal, binary, classes and masks.",
      icon: "tag",
      status: "soon",
      leaves: soon([
        { slug: "introduction-to-addressing", title: "MAC vs IP vs Port", blurb: "Three addresses, three different jobs.", icon: "alt_route" },
        { slug: "ipv4-addressing", title: "IPv4 Addressing", blurb: "192.168.1.25 as 32 bits.", icon: "numbers" },
        { slug: "classful-addressing", title: "Classful Addressing", blurb: "Why A, B and C existed at all.", icon: "category" },
        { slug: "subnet-mask", title: "Subnet Mask", blurb: "What /24 actually means, bit by bit.", icon: "filter_alt" },
      ]),
    },
    {
      slug: "allocation",
      title: "Subnet Allocation",
      blurb: "Carving an address block into usable networks.",
      icon: "content_cut",
      status: "soon",
      leaves: soon([
        { slug: "flsm", title: "FLSM", blurb: "Split one network into equal blocks.", icon: "view_column" },
        { slug: "classless-addressing", title: "Classless / CIDR", blurb: "Slide the prefix and watch the split move.", icon: "linear_scale" },
        { slug: "vlsm", title: "VLSM", blurb: "Largest-first carving with no wasted addresses.", icon: "dashboard_customize" },
      ]),
    },
    {
      slug: "translation",
      title: "NAT & Supernetting",
      blurb: "Sharing one public address, and merging many routes into one.",
      icon: "swap_horiz",
      status: "soon",
      leaves: soon([
        { slug: "nat", title: "NAT", blurb: "How 20 devices share a single public IP.", icon: "swap_calls" },
        { slug: "supernetting", title: "Supernetting", blurb: "Four networks collapse into one routing entry.", icon: "merge" },
      ]),
    },
    {
      slug: "devices",
      title: "Network Devices",
      blurb: "Give five devices the same packet and watch them disagree.",
      icon: "router",
      status: "soon",
      leaves: soon([
        { slug: "hub", title: "Hub", blurb: "Repeats to every port, collisions included.", icon: "device_hub" },
        { slug: "repeater", title: "Repeater", blurb: "Regenerates a fading signal.", icon: "settings_input_antenna" },
        { slug: "bridge", title: "Bridge", blurb: "Joins two segments and learns which side is which.", icon: "compare_arrows" },
        { slug: "switch", title: "Switch", blurb: "Forwards by MAC, one collision domain per port.", icon: "lan" },
        { slug: "router", title: "Router", blurb: "Forwards between IP networks, hop by hop.", icon: "router" },
      ]),
    },
  ],
};

// --- UNIT 3 — Routing -------------------------------------------------------

const routing: SectionMeta = {
  slug: "routing",
  unit: 3,
  title: "Routing",
  short: "Routing",
  blurb: "How a router that knows almost nothing about the internet still gets your packet to the right place.",
  icon: "route",
  status: "soon",
  categories: [
    {
      slug: "forwarding",
      title: "Forwarding & Static Routes",
      blurb: "Hop-by-hop decisions from a table you wrote by hand.",
      icon: "alt_route",
      status: "soon",
      leaves: soon([
        { slug: "ip-forwarding", title: "IP Forwarding", blurb: "One packet, one routing table lookup per hop.", icon: "east" },
        { slug: "static-routing", title: "Static Routing", blurb: "The router only knows what you told it.", icon: "edit_road" },
        { slug: "default-routing", title: "Default Routing", blurb: "What 0.0.0.0/0 really means.", icon: "call_missed_outgoing" },
      ]),
    },
    {
      slug: "algorithms",
      title: "Routing Algorithms",
      blurb: "Three fundamentally different ways to learn a network.",
      icon: "account_tree",
      status: "soon",
      leaves: soon([
        { slug: "distance-vector", title: "Distance Vector", blurb: "Routers slowly gossip their way to convergence.", icon: "sync" },
        { slug: "link-state", title: "Link State", blurb: "Flood the map, then run Dijkstra on it.", icon: "map" },
        { slug: "path-vector", title: "Path Vector", blurb: "Carry the whole AS path to kill loops.", icon: "timeline" },
      ]),
    },
    {
      slug: "protocols",
      title: "Routing Protocols",
      blurb: "RIP, OSPF, BGP and EIGRP on the same network.",
      icon: "settings_ethernet",
      status: "soon",
      leaves: soon([
        { slug: "rip-v1", title: "RIP v1", blurb: "Hop count, classful, 30-second updates.", icon: "counter_1" },
        { slug: "rip-v2", title: "RIP v2", blurb: "Classless, with masks in the update.", icon: "counter_2" },
        { slug: "ospf-single-area", title: "OSPF — Single Area", blurb: "LSAs, topology database, shortest path.", icon: "workspaces" },
        { slug: "ospf-multi-area", title: "OSPF — Multi Area", blurb: "Why big networks get split into areas.", icon: "grid_view" },
        { slug: "bgp", title: "BGP", blurb: "The protocol that glues autonomous systems together.", icon: "public" },
        { slug: "eigrp", title: "EIGRP", blurb: "Feasible successors and fast reconvergence.", icon: "bolt" },
      ]),
    },
    {
      slug: "advanced",
      title: "Multicast & IPv6",
      blurb: "One packet to many, and life after 32 bits.",
      icon: "hub",
      status: "soon",
      leaves: soon([
        { slug: "multicasting", title: "Multicasting", blurb: "One sender, a distribution tree, many receivers.", icon: "podcasts" },
        { slug: "ipv6-basics", title: "IPv6 Basics", blurb: "128 bits, and why compression notation exists.", icon: "expand" },
      ]),
    },
  ],
};

// --- UNIT 4 — Data Link & Error Control -------------------------------------

const dataLink: SectionMeta = {
  slug: "data-link",
  unit: 4,
  title: "Data Link & Error Control",
  short: "Data Link",
  blurb: "Sharing one wire without shouting over each other, and noticing when a bit flips.",
  icon: "swap_calls",
  status: "soon",
  categories: [
    {
      slug: "medium-access",
      title: "Medium Access Control",
      blurb: "Who gets to transmit when everyone shares one channel.",
      icon: "groups",
      status: "soon",
      leaves: soon([
        { slug: "mac", title: "The MAC Problem", blurb: "What happens when 100 stations talk at once.", icon: "record_voice_over" },
        { slug: "aloha", title: "ALOHA", blurb: "Transmit whenever. Collide often.", icon: "waves" },
        { slug: "csma-cd", title: "CSMA/CD", blurb: "Listen, send, detect the collision, back off.", icon: "hearing" },
        { slug: "csma-ca", title: "CSMA/CA", blurb: "Why Wi-Fi avoids collisions instead of detecting them.", icon: "wifi" },
        { slug: "ethernet", title: "Ethernet", blurb: "The frame, field by field.", icon: "settings_ethernet" },
        { slug: "token-ring", title: "Token Ring", blurb: "You do not ask permission — you wait for the token.", icon: "toll" },
      ]),
    },
    {
      slug: "flow-control",
      title: "Flow Control",
      blurb: "Keeping a fast sender from drowning a slow receiver.",
      icon: "water_drop",
      status: "soon",
      leaves: soon([
        { slug: "stop-and-wait", title: "Stop-and-Wait", blurb: "Reliable, simple, and painfully slow.", icon: "pause_circle" },
        { slug: "arq", title: "ARQ", blurb: "Timeout, retransmit, acknowledge.", icon: "replay" },
        { slug: "sliding-window", title: "Sliding Window", blurb: "Many frames in flight before any ACK returns.", icon: "view_carousel" },
      ]),
    },
    {
      slug: "error-control",
      title: "Error Detection & Correction",
      blurb: "Bit-level arithmetic you can watch execute.",
      icon: "rule",
      status: "soon",
      leaves: soon([
        { slug: "parity", title: "Parity Check", blurb: "One extra bit, one detectable error.", icon: "looks_one" },
        { slug: "checksum", title: "Checksum", blurb: "Add the words, complement the sum, verify.", icon: "functions" },
        { slug: "crc", title: "CRC", blurb: "One long binary division, step by step.", icon: "calculate" },
        { slug: "hamming-codes", title: "Hamming Codes", blurb: "Find the broken bit — and fix it.", icon: "healing" },
      ]),
    },
    {
      slug: "wan-protocols",
      title: "HDLC & PPP",
      blurb: "Framing on a point-to-point serial link.",
      icon: "linear_scale",
      status: "soon",
      leaves: soon([
        { slug: "hdlc", title: "HDLC", blurb: "Flag, address, control, information, FCS, flag.", icon: "flag" },
        { slug: "ppp", title: "PPP", blurb: "How two routers negotiate a direct link.", icon: "compare_arrows" },
      ]),
    },
  ],
};

// --- UNIT 5 — Transport & Application ---------------------------------------

const transportApplication: SectionMeta = {
  slug: "transport-application",
  unit: 5,
  title: "Transport & Application",
  short: "Transport & App",
  blurb: "Ports, TCP's promises, UDP's lack of them, and the protocols you use every day.",
  icon: "swap_vert",
  status: "soon",
  categories: [
    {
      slug: "transport",
      title: "Transport Layer",
      blurb: "TCP and UDP on the same lossy network.",
      icon: "sync_alt",
      status: "soon",
      leaves: soon([
        { slug: "port-numbers", title: "Port Numbers", blurb: "How one machine runs thousands of conversations.", icon: "door_front" },
        { slug: "udp", title: "UDP", blurb: "Four fields, no promises.", icon: "bolt" },
        { slug: "tcp", title: "TCP Segment", blurb: "Every field, and what it is for.", icon: "receipt_long" },
        { slug: "three-way-handshake", title: "Three-Way Handshake", blurb: "SYN, SYN-ACK, ACK — with real sequence numbers.", icon: "handshake" },
        { slug: "tcp-reliability", title: "TCP Reliability", blurb: "Lose a segment and watch it come back.", icon: "verified" },
        { slug: "tcp-flow-control", title: "TCP Flow Control", blurb: "The receiver decides how fast you may send.", icon: "tune" },
      ]),
    },
    {
      slug: "application",
      title: "Application Layer",
      blurb: "The protocols you actually type into a browser.",
      icon: "apps",
      status: "soon",
      leaves: soon([
        { slug: "http", title: "WWW & HTTP", blurb: "Request, process, response.", icon: "language" },
        { slug: "ftp", title: "FTP", blurb: "Two connections: one to talk, one to carry.", icon: "folder_shared" },
        { slug: "email", title: "Email", blurb: "Your mail does not go straight to your friend.", icon: "mail" },
        { slug: "telnet", title: "Telnet", blurb: "A remote terminal over a TCP connection.", icon: "terminal" },
        { slug: "dns", title: "DNS", blurb: "Turning a name into an address, one server at a time.", icon: "travel_explore" },
      ]),
    },
  ],
};

// --- Capstone ---------------------------------------------------------------

const capstone: SectionMeta = {
  slug: "capstone",
  unit: 6,
  title: "Capstone",
  short: "Capstone",
  blurb: "Every unit in one network — type a URL and watch all five layers cooperate.",
  icon: "auto_awesome",
  status: "soon",
  categories: [
    {
      slug: "end-to-end",
      title: "End to End",
      blurb: "The whole course as a single story.",
      icon: "timeline",
      status: "soon",
      leaves: soon([
        {
          slug: "packet-journey",
          title: "Packet Journey",
          blurb: "DNS → TCP handshake → HTTP → routing → Ethernet → signal → and back.",
          icon: "conversion_path",
        },
        {
          slug: "master-simulation",
          title: "Master Simulation",
          blurb: "One network you can address, route, break and inspect at every layer.",
          icon: "developer_board",
        },
      ]),
    },
  ],
};

export const SECTIONS: SectionMeta[] = [
  fundamentals,
  addressing,
  routing,
  dataLink,
  transportApplication,
  capstone,
];

export function getSection(slug: string): SectionMeta | undefined {
  return SECTIONS.find((s) => s.slug === slug);
}

export function getCategory(sectionSlug: string, categorySlug: string): CategoryMeta | undefined {
  return getSection(sectionSlug)?.categories.find((c) => c.slug === categorySlug);
}

// --- leaf ordering ----------------------------------------------------------
//
// A visualizer page needs to know where it sits in the syllabus so it can
// offer prev/next and sibling tabs. Without this a leaf is a dead end: the only
// way onward is the breadcrumb, which is two page loads to reach the topic
// immediately after the one you are reading.

export interface LeafRef {
  section: string;
  category: string;
  slug: string;
  title: string;
  blurb: string;
  icon: string;
  status: TopicStatus;
  href: string;
  stats?: string[];
}

/** Flattens a category's leaves, walking sub-hub children in place. */
export function leavesOf(sectionSlug: string, categorySlug: string): LeafRef[] {
  const cat = getCategory(sectionSlug, categorySlug);
  if (!cat) return [];
  const out: LeafRef[] = [];
  const walk = (leaves: LeafMeta[], prefix: string) => {
    for (const l of leaves) {
      if (l.children) {
        walk(l.children, `${prefix}${l.slug}/`);
        continue;
      }
      out.push({
        section: sectionSlug,
        category: categorySlug,
        slug: `${prefix}${l.slug}`,
        title: l.title,
        blurb: l.blurb,
        icon: l.icon,
        status: l.status ?? "available",
        stats: l.stats,
        href: `/topics/${sectionSlug}/${categorySlug}/${prefix}${l.slug}`,
      });
    }
  };
  walk(cat.leaves, "");
  return out;
}

/** Every leaf in a unit, in syllabus order, across all its categories. */
export function leavesOfSection(sectionSlug: string): LeafRef[] {
  const s = getSection(sectionSlug);
  if (!s) return [];
  return s.categories.flatMap((c) => leavesOf(sectionSlug, c.slug));
}

export interface LeafNeighbours {
  current?: LeafRef;
  /** Siblings within the same category — what the sidebar tabs show. */
  siblings: LeafRef[];
  /** Previous/next across the whole unit, skipping unbuilt leaves. */
  prev?: LeafRef;
  next?: LeafRef;
  indexInUnit: number;
  builtInUnit: number;
}

/** Resolves "/topics/fundamentals/topologies/bus" into its place in the unit. */
export function leafNeighbours(path: string): LeafNeighbours {
  const parts = path.split("/").filter(Boolean); // topics, section, category, ...leaf
  const [, section, category] = parts;
  const slug = parts.slice(3).join("/");
  if (!section || !category || !slug) return { siblings: [], indexInUnit: 0, builtInUnit: 0 };

  const siblings = leavesOf(section, category);
  const unit = leavesOfSection(section);
  // Navigation only ever lands on leaves that actually run.
  const built = unit.filter((l) => l.status !== "soon");
  const i = built.findIndex((l) => l.href === path);

  return {
    current: unit.find((l) => l.href === path),
    siblings,
    prev: i > 0 ? built[i - 1] : undefined,
    next: i >= 0 && i < built.length - 1 ? built[i + 1] : undefined,
    indexInUnit: i,
    builtInUnit: built.length,
  };
}

/** "failure-comparison" → "Failure Comparison". Used by the breadcrumb. */
export function humanize(slug: string): string {
  const special: Record<string, string> = {
    osi: "OSI",
    ip: "IP",
    ipv4: "IPv4",
    ipv6: "IPv6",
    tcp: "TCP",
    udp: "UDP",
    http: "HTTP",
    ftp: "FTP",
    dns: "DNS",
    nat: "NAT",
    mac: "MAC",
    crc: "CRC",
    arq: "ARQ",
    vlsm: "VLSM",
    flsm: "FLSM",
    rip: "RIP",
    ospf: "OSPF",
    bgp: "BGP",
    eigrp: "EIGRP",
    hdlc: "HDLC",
    ppp: "PPP",
    pan: "PAN",
    lan: "LAN",
    man: "MAN",
    wan: "WAN",
    kb: "KB",
    vs: "vs",
    csma: "CSMA",
    cd: "CD",
    ca: "CA",
  };
  return slug
    .split("-")
    .map((w) => special[w.toLowerCase()] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
