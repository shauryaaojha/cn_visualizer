// ---------------------------------------------------------------------------
// ladderFacts — Inspector cards for the ladder canvas: what a participant is,
// what a message means, and what the sender's window is doing. The message
// fields themselves come from the engine (the run's real seq/ack numbers).
// ---------------------------------------------------------------------------

import type { FactSpec } from "./lessonKit.ts";
import type { LadderLane, LadderMsg, WindowStrip } from "../types/visualization.ts";

const LANE: Record<LadderLane["kind"], { lead: string; remember: string }> = {
  host: { lead: "An end host. It runs the application and the whole protocol stack, and it is where reliability is actually enforced.", remember: "Transport-layer protocols run only at the ends, never in routers." },
  server: { lead: "A host that listens on a well-known port and answers whoever connects.", remember: "Server port: fixed and well known. Client port: temporary (ephemeral)." },
  router: { lead: "Forwards packets towards their destination; it never looks at TCP or the application data.", remember: "Routers work at layer 3." },
  dns: { lead: "A name server. Each level of the DNS tree knows only its own part of the namespace and who to ask next.", remember: "Root → TLD → authoritative; the resolver does the walking." },
  mail: { lead: "A mail server: it accepts mail by SMTP and keeps a mailbox for each of its users.", remember: "Mail servers talk SMTP to each other." },
  app: { lead: "An application process.", remember: "Processes are found by port number." },
};

export function laneFact(l: LadderLane, msgs: LadderMsg[]): FactSpec {
  const sent = msgs.filter((m) => m.from === l.id).length;
  const got = msgs.filter((m) => m.to === l.id && m.state === "done").length;
  return {
    lead: LANE[l.kind].lead,
    rows: [
      ["Role", l.sub ?? l.kind],
      ["Sent so far", String(sent)],
      ["Received so far", String(got)],
    ],
    remember: LANE[l.kind].remember,
  };
}

/** Plain-words meaning for the common message names. */
const GLOSSARY: [RegExp, string][] = [
  [/^SYN-ACK|^SYN, ACK/, "The server's half of the handshake: it acknowledges the client's SYN and sends its own starting sequence number."],
  [/^SYN/, "Synchronise: 'I want to open a connection; my bytes start at this sequence number.'"],
  [/^FIN/, "Finish: 'I have nothing more to send.' Each direction is closed separately."],
  [/^ACK|dup ACK/, "An acknowledgement. The number is the next byte (or frame) the receiver expects — everything before it has arrived."],
  [/^F\d/, "A data frame. Its sequence number lets the receiver tell a new frame from a repeated one."],
  [/^seq/, "A TCP segment. Its seq is the number of its first byte."],
  [/^GET/, "An HTTP request: method, path, then headers such as Host."],
  [/^200/, "An HTTP response: status line, headers, then the body."],
  [/^A\?|DNS A\?/, "A DNS query for an A record — the IPv4 address of a name."],
  [/^ask /, "A DNS referral: 'I don't know, but these servers do.'"],
  [/^datagram/, "A UDP datagram: 8-byte header, then data. No numbering, no acknowledgement."],
  [/^probe/, "A window probe: one byte, sent when rwnd is 0, to learn when space opens up."],
  [/^update/, "A window update: the receiver has freed buffer space and says how much."],
  [/USER|PASS|RETR|PORT|PASV/, "An FTP command on the control connection — plain text."],
  [/^\d{3} /, "An FTP reply code on the control connection."],
  [/HELO|MAIL FROM|RCPT|DATA|SMTP/, "An SMTP exchange: pushing mail towards the recipient's server."],
  [/FETCH|message/, "IMAP: the recipient's app pulling mail from its server."],
  [/^'|echo/, "One keystroke — Telnet sends each character as you type it, and the remote host echoes it back."],
];

export function msgFact(m: LadderMsg): FactSpec {
  const lead = GLOSSARY.find(([re]) => re.test(m.label))?.[1] ?? "One message in the conversation.";
  return {
    lead,
    rows: [["From → to", `${m.from} → ${m.to}`], ["Sent at", `tick ${m.t0}`], [m.state === "lost" ? "Would arrive" : "Arrives", `tick ${m.t1}`], ...(m.fields ?? [])],
    more: m.state === "lost" ? "This one never arrived. Whatever recovers from it has to be done by the ends — the network does not." : undefined,
    remember: m.kind === "ack" ? "ACK numbers are 'next expected', not 'last received'." : undefined,
  };
}

export function windowFact(w: WindowStrip): FactSpec {
  const inFlight = w.next - w.base;
  return {
    lead: "The sender's view of the frames: confirmed, sent but not yet acknowledged, allowed but not sent, and not yet allowed.",
    rows: [
      ["Window size N", String(w.size)],
      ["Base (oldest unACKed)", `F${w.base}`],
      ["Next to send", w.next < w.total ? `F${w.next}` : "—"],
      ["In flight", String(inFlight)],
      ["Confirmed", `${w.acked} of ${w.total}`],
    ],
    remember: "The window slides forward as ACKs arrive; with sequence numbers of m bits, Go-Back-N's window must be ≤ 2^m − 1.",
  };
}
