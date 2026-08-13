# CN Visualizer — Complete Build Plan

This plan is based on the **21CSC302J – Computer Networks course plan for July–December 2026**. The official plan has **5 units, 45 session topics**, a practical component using Cisco Packet Tracer, and labs covering topology, router configuration, addressing/subnetting, NAT, routing protocols, PPP, HDLC, BGP, EIGRP and Telnet.  

The goal should not be to make a collection of definitions and diagrams. The CN Visualizer should turn concepts into **dynamic processes**: packets moving, headers being added, address space being divided, routing tables converging, collisions occurring, errors being detected, windows moving, and protocols exchanging messages.

---

# 1. Overall Scope

## Core syllabus coverage

| Unit   | Scope                     | Main visualization style                                              |
| ------ | ------------------------- | --------------------------------------------------------------------- |
| Unit 1 | Network fundamentals      | Animated network diagrams, packet movement, layering                  |
| Unit 2 | Addressing                | Binary visualization, address-space carving, subnet simulation        |
| Unit 3 | Routing                   | Graph algorithms, routing tables, convergence simulation              |
| Unit 4 | Data Link & Error Control | Frames, collisions, windows, retransmission, bit-level algorithms     |
| Unit 5 | Transport & Application   | Protocol exchanges, packet/segment flow, request-response simulations |

The course also specifies practical work using **Cisco Packet Tracer**, so the visualizer should conceptually connect theory with network configuration and simulation. 

---

# 2. UNIT 1 — NETWORK FUNDAMENTALS

Official Unit 1 contains topics 1–9: introduction to networks, network types, topology, switching, OSI, TCP/IP physical layer, latency/bandwidth/delay, guided media and unguided media. 

---

## 2.1 Introduction to Networks

### Concept

A computer network allows devices to communicate and exchange data over communication links.

### Visualization

Create a basic network where the user can conceptually follow:

```text
Device A
   ↓
Data
   ↓
Network
   ↓
Device B
```

Expand it into:

```text
Host → Link → Switch/Router → Link → Host
```

A packet should physically move from sender to receiver.

The visualization should answer:

* What is a node?
* What is a link?
* What is being transmitted?
* What happens between sender and receiver?
* Why is a network required?

### Reel

**“What actually happens when one computer sends data to another?”**

Start with:

```text
You click SEND
      ↓
Data becomes packets
      ↓
Packets travel through network devices
      ↓
Receiver reconstructs the data
```

---

# 3. Network Types

The syllabus explicitly includes **PAN, LAN, MAN and WAN**. 

## Visualization

Show the same concept at four geographic scales.

### PAN

```text
Smartphone
 /   |   \
Watch Earbuds Laptop
```

Show a tiny coverage region.

### LAN

```text
PC ── Switch ── PC
      │
    Printer
```

Represent a home, lab, office or building.

### MAN

```text
Building A ───── Building B
       \          /
        University Network
```

Represent multiple locations around a city.

### WAN

```text
Chennai ── Mumbai ── Singapore ── USA
```

Show large-scale interconnection.

### Useful dynamic comparison

As the user moves from:

```text
PAN → LAN → MAN → WAN
```

animate:

* geographic coverage increasing
* number of devices increasing
* network complexity increasing
* intermediate devices increasing

### Reel

**“PAN vs LAN vs MAN vs WAN in 30 seconds.”**

Use the same camera viewpoint while progressively zooming:

```text
Person → Building → City → World
```

---

# 4. Network Topologies

Official syllabus:

* BUS
* STAR
* RING
* MESH
* HYBRID 

## Visualization

Use the same set of 6 nodes and change only the topology.

### Bus

```text
A ─ B ─ C ─ D ─ E
```

Visualize one shared backbone.

### Star

```text
      A
      |
B ─ Switch ─ C
      |
      D
```

### Ring

```text
A ─ B
|   |
D ─ C
```

### Mesh

```text
A────B
|\  /|
| \/ |
| /\ |
|/  \|
C────D
```

### Hybrid

Combine topologies.

## Important dynamic demonstrations

### Failure simulation

Remove one connection.

Observe:

* Bus: backbone problem affects communication.
* Star: central device becomes critical.
* Ring: link failure disrupts the path.
* Mesh: alternate connections can still exist.

### Packet transmission

Send a packet through each topology and visualize how it travels.

### Reel

**“Which topology survives a link failure?”**

Start with all five topologies and break one link in each.

---

# 5. Switching

Syllabus:

* Circuit Switching
* Packet Switching 

## Circuit Switching

Visualize establishment of a dedicated path:

```text
A ─ R1 ─ R2 ─ R3 ─ B
  ═════════════════
   Dedicated path
```

Then transmit data only through that path.

## Packet Switching

Break the message into packets:

```text
Message
 ↓
P1 P2 P3 P4
```

Then allow packets to travel through different paths.

Example:

```text
P1 → R1 → R2
P2 → R1 → R3
P3 → R4 → R3
P4 → R2 → R3
```

At destination:

```text
P1 P2 P3 P4
     ↓
Original message
```

## Visualization concepts

Show:

* path reservation
* packetization
* different paths
* congestion
* arrival order
* reassembly

### Reel

**“Circuit Switching vs Packet Switching — same message, two completely different journeys.”**

---

# 6. OSI Layered Architecture

The course explicitly includes OSI architecture. 

This should be one of the flagship visualizations.

## Seven layers

```text
7 Application
6 Presentation
5 Session
4 Transport
3 Network
2 Data Link
1 Physical
```

## Core animation: encapsulation

Start with:

```text
HELLO
```

Then move downward:

```text
Application
HELLO

↓
Transport
[TCP][HELLO]

↓
Network
[IP][TCP][HELLO]

↓
Data Link
[MAC][IP][TCP][HELLO][FCS]

↓
Physical
101010101010...
```

Then reverse the process at the receiver.

## Important concepts to visualize

* encapsulation
* decapsulation
* headers
* payload
* layer-to-layer processing
* sender vs receiver

### Reel

**“What happens to ‘Hello’ before it reaches another computer?”**

Animate one word becoming:

```text
Message
→ Segment
→ Packet
→ Frame
→ Bits
```

---

# 7. TCP/IP Model — Physical Layer

The course plan specifically lists the TCP/IP model's Physical Layer in Unit 1. 

## Visualization

Show:

```text
Data
 ↓
Electrical signal
OR
Light pulse
OR
Radio transmission
```

Demonstrate how binary data becomes a physical signal.

### Reel

**“A 1 and a 0 aren't actually traveling through the cable.”**

Show how bits are represented physically.

---

# 8. Latency, Bandwidth and Delay

Official syllabus explicitly includes these. 

## Visualization

Create a transmission path:

```text
Sender ───── Router ───── Receiver
```

Then separately visualize:

### Transmission delay

Time required to put bits onto the link.

### Propagation delay

Time required for the signal to physically travel.

### Processing delay

Time spent processing the packet.

### Queuing delay

Time the packet spends waiting.

### Total delay

Visualize the delays as separate timeline segments.

## Bandwidth

Show:

```text
Low bandwidth
████

High bandwidth
████████████████████
```

Then transmit the same data through both.

### Reel

**“Why can a 1 GB file feel slower on a fast network?”**

Use bandwidth vs delay to demonstrate the difference.

---

# 9. Guided Media

Officially:

* Twisted pair
* Coaxial cable
* Fiber optic cable 

## Visualization

### Twisted pair

Animate electrical signals through twisted wires.

### Coaxial

Show conductor, insulation and shielding layers.

### Fiber

Show light pulses traveling inside the fiber.

## Comparison

Visualize:

```text
Distance
Speed
Interference
Signal type
```

### Reel

**“How do three cables carry the same data differently?”**

---

# 10. Unguided Media

Officially:

* Radio waves
* Microwaves
* Infrared 

## Visualization

Show signal propagation through free space.

### Radio

Wide-area wave propagation.

### Microwave

Directional communication between antennas.

### Infrared

Short-range directional communication.

### Reel

**“Your data can travel through air without Wi-Fi being magic.”**

---

# 11. UNIT 2 — NETWORK ADDRESSING

Unit 2 contains topics 10–18: addressing, IPv4, classful addressing, subnet masks, FLSM, classless addressing, VLSM, NAT, supernetting and network devices. 

This unit should be one of the most algorithmically interactive parts of the entire project.

---

# 12. Introduction to Addressing

## Visualization

Start with a network:

```text
PC1
PC2
Router
Server
```

Assign addresses.

Show:

```text
MAC address
IP address
Port number
```

Explain their different purposes by following the same packet.

### Reel

**“MAC vs IP vs Port — three addresses, three jobs.”**

---

# 13. IPv4 Addressing

## Visualization

Input:

```text
192.168.1.25
```

Break it into:

```text
192 | 168 | 1 | 25
```

Then binary:

```text
11000000
10101000
00000001
00011001
```

Visualize the 32-bit structure.

---

# 14. Classful Addressing

The syllabus explicitly includes address space, classful addressing and subnet masks. 

## Visualization

Show:

```text
Class A
0...
```

```text
Class B
10...
```

```text
Class C
110...
```

and conceptually show network/host boundaries.

Let an IP address fall into the appropriate class and visualize its default subnet mask.

### Reel

**“Why did IPv4 originally have Classes A, B and C?”**

---

# 15. Subnet Mask

## Visualization

Input:

```text
192.168.1.20
255.255.255.0
```

Convert to:

```text
IP
11000000.10101000.00000001.00010100

Mask
11111111.11111111.11111111.00000000
```

Highlight:

```text
NETWORK | HOST
```

Then compute:

* network address
* broadcast address
* host range

### Reel

**“What does /24 actually mean?”**

---

# 16. FLSM

Official syllabus includes FLSM. 

## Visualization

Start:

```text
192.168.1.0/24
```

Split equally:

```text
/24
 ↓
/26 /26 /26 /26
```

Animate the address space dividing into equal blocks.

For every block show:

```text
Network
Host range
Broadcast
```

### Reel

**“Take one network and split it into four equal networks.”**

---

# 17. Classless Addressing

## Visualization

Show CIDR notation dynamically:

```text
192.168.1.0/24
```

Move the prefix length:

```text
/16
/20
/24
/26
/28
```

Show how the division between network and host bits changes.

### Reel

**“What happens when /24 becomes /26?”**

---

# 18. VLSM

The course specifically marks VLSM as a **simulation** topic. 

This should become one of the major modules.

## Example

```text
Base: 192.168.1.0/24

Engineering → 100 hosts
Sales       → 50 hosts
Support     → 20 hosts
Ops         → 10 hosts
```

Sort requirements largest-first.

Then visually carve:

```text
/24
│
├── Engineering /25
│
├── Sales /26
│
├── Support /27
│
└── Ops /28
```

Show unused space.

## Important visualization

Represent the complete 256-address space as a horizontal address bar.

Then watch it get divided.

### Reel

**“How VLSM saves IP addresses.”**

Compare:

```text
Equal allocation
vs
Variable allocation
```

---

# 19. NAT

## Visualization

Create:

```text
Private Network
192.168.1.10
192.168.1.11
192.168.1.12
       ↓
     NAT Router
       ↓
Internet
```

Then visualize translation.

Example:

```text
192.168.1.10:5000
        ↓
Public-IP:6001
```

Build a NAT translation table dynamically.

### Reel

**“How 20 devices share one public IP.”**

---

# 20. Supernetting

## Visualization

Start with multiple contiguous networks:

```text
192.168.0.0/24
192.168.1.0/24
192.168.2.0/24
192.168.3.0/24
```

Combine them:

```text
192.168.0.0/22
```

Visually merge the four blocks into one larger address range.

### Reel

**“Four networks become one routing entry.”**

---

# 21. Network Devices

Syllabus:

* Hub
* Repeater
* Switch
* Bridge
* Router 

## Visualization

Give each device the exact same packet.

Observe the difference.

### Hub

Broadcasts to all ports.

### Repeater

Regenerates the signal.

### Bridge

Forwards frames between network segments.

### Switch

Forwards based on MAC information.

### Router

Forwards between IP networks.

## Reel

**“Hub vs Switch: watch what happens to one packet.”**

This should be a highly visual reel.

---

# 22. UNIT 3 — ROUTING

Unit 3 topics include IP forwarding, static/default routing, Distance Vector, Link State, Path Vector, RIP, OSPF, BGP, EIGRP, multicasting and IPv6 basics. 

This should be the **largest algorithmic part** of the project.

---

# 23. Forwarding of IP Packets

## Visualization

Create a network graph:

```text
PC
 ↓
R1
 ↓
R2
 ↓
R3
 ↓
Server
```

Follow one packet at each hop.

At every router show:

```text
Destination IP
TTL
Next Hop
Outgoing Interface
```

Demonstrate that a router makes forwarding decisions hop-by-hop.

### Reel

**“Your router doesn't know the entire Internet.”**

---

# 24. Static Routing

## Visualization

Create:

```text
Network A ─ Router 1 ─ Router 2 ─ Network B
```

Configure routes manually.

Show routing tables changing:

```text
Destination | Next Hop | Interface
```

Then send the packet.

### Failure scenario

Remove a link.

Show the static route fail because no automatic adaptation occurs.

### Reel

**“Static routing: the router only knows what you tell it.”**

---

# 25. Default Routing

## Visualization

Show a router receiving an unknown destination.

```text
Specific route?
     ↓ no
Default route
     ↓
0.0.0.0/0
```

Then forward the packet.

### Reel

**“What does 0.0.0.0/0 actually mean?”**

---

# 26. Distance Vector Routing

## Visualization

This should be an actual iterative simulation.

Start:

```text
A
B
C
D
```

Each router initially knows only:

```text
self = 0
neighbors = known
others = ∞
```

Then show routing vectors exchanged.

Example:

```text
A receives B's vector
```

Update:

```text
A → C = 2
```

Continue until convergence.

## Core concepts to show

* routing table
* distance
* neighbor information
* iterative updates
* convergence
* shortest path

### Reel

**“How routers slowly learn the network.”**

---

# 27. Link State Routing

## Visualization

Show:

```text
1. Discover neighbors
2. Measure link costs
3. Generate state information
4. Flood it
5. Build topology database
6. Run shortest path
```

Then animate Dijkstra's algorithm.

Highlight:

```text
Current shortest node
Known nodes
Unvisited nodes
Current costs
```

### Reel

**“How a router builds a map of the network.”**

---

# 28. Path Vector Routing

## Visualization

Represent autonomous systems:

```text
AS100
  |
AS200
  |
AS300
  |
AS400
```

A route contains the path:

```text
[400,300,200,100]
```

As the route propagates, append AS identifiers.

Use path repetition to demonstrate loop prevention.

### Reel

**“How BGP remembers where a route has been.”**

---

# 29. RIP V1 and RIP V2

The practical syllabus explicitly includes both RIP versions. 

## Visualization

Use a small network.

Show routing updates being exchanged.

Compare:

```text
RIP v1
vs
RIP v2
```

Show:

* route updates
* metrics
* convergence
* routing table changes

### Reel

**“How RIP chooses a route.”**

---

# 30. OSPF

The lab plan includes:

* Single Area OSPF
* Multi Area OSPF 

## Visualization

### Single area

```text
Area 0
 ├── R1
 ├── R2
 └── R3
```

### Multi-area

```text
Area 1 ─┐
        ├── Area 0 ── Area 2
Area 3 ─┘
```

Visualize:

* LSAs
* topology discovery
* shortest path computation
* areas
* route propagation

### Reel

**“Why does OSPF divide the network into areas?”**

---

# 31. BGP

The course includes BGP in both theory and lab work.  

## Visualization

Use autonomous systems:

```text
ISP A ─ ISP B ─ ISP C
  \              /
   ─── ISP D ───
```

Show routes and paths.

Allow route selection based on path information.

### Reel

**“The protocol that helps connect the Internet.”**

---

# 32. EIGRP

The lab includes EIGRP. 

## Visualization

Show:

```text
Neighbor discovery
      ↓
Route information
      ↓
Candidate routes
      ↓
Best route
```

Compare route selection against other routing approaches.

### Reel

**“Why is EIGRP different from simple distance-vector routing?”**

---

# 33. Multicasting

The syllabus includes basic multicasting. 

## Visualization

One sender:

```text
          Receiver A
         /
Sender ─ Router
         \
          Receiver B
```

Then:

```text
Sender
   ↓
Multicast tree
   ↓
Multiple receivers
```

Compare with unicast:

```text
1 sender → each receiver separately
```

### Reel

**“How one packet can reach many receivers efficiently.”**

---

# 34. IPv6 Addressing Basics

The course includes IPv6 basics. 

## Visualization

Input:

```text
2001:db8:abcd:0012::1
```

Expand it into the full hexadecimal structure.

Highlight:

```text
128 bits
```

Explain compression and address components through visual segmentation.

### Reel

**“Why IPv6 needed 128 bits.”**

---

# 35. UNIT 4 — DATA LINK, MAC AND ERROR CONTROL

Unit 4 covers MAC, ALOHA, CSMA/CD, CSMA/CA, Ethernet, Token Ring, Stop-and-Wait, ARQ, Sliding Window ARQ, parity, checksum, CRC, Hamming codes, HDLC and PPP. 

This unit is especially suitable for animations.

---

# 36. Medium Access Control

## Visualization

Create a shared channel:

```text
A ─┐
B ─┼──── Shared Medium
C ─┘
```

Show multiple devices wanting to transmit simultaneously.

The visualizer should demonstrate the problem:

```text
Who gets access?
```

Then demonstrate the different protocols.

### Reel

**“What happens when 100 computers talk at once?”**

---

# 37. ALOHA

## Visualization

Nodes transmit whenever they have data.

```text
A ─────────→
B ──────→
C ───────────→
```

Collision:

```text
      X
──────╳──────
```

Then random retransmission.

Show:

* attempts
* collisions
* successful transmissions
* retransmissions

### Reel

**“The simplest—and messiest—way to share a channel.”**

---

# 38. CSMA/CD

## Visualization

Flow:

```text
Sense
 ↓
Channel free?
 ↓
Transmit
 ↓
Detect collision
 ↓
Stop
 ↓
Backoff
 ↓
Retry
```

Animate two computers beginning at almost the same time.

### Reel

**“Ethernet collisions, visualized.”**

---

# 39. CSMA/CA

## Visualization

Show the process:

```text
Sense
 ↓
Wait
 ↓
Random backoff
 ↓
Transmit
 ↓
ACK
```

Compare it with CSMA/CD.

### Reel

**“Why Wi-Fi avoids collisions instead of detecting them like old Ethernet.”**

---

# 40. Ethernet

## Visualization

Show an Ethernet frame:

```text
Preamble
Destination MAC
Source MAC
Type/Length
Data
FCS
```

Animate frame formation, transmission and checking.

---

# 41. Token Ring

The syllabus includes Token Ring. 

## Visualization

```text
A → B → C → D → A
```

A token circulates.

Only the device holding the token can transmit.

### Reel

**“A packet doesn't ask permission. It waits for the token.”**

---

# 42. Stop-and-Wait Flow Control

## Visualization

```text
Frame 0 ─────────→
          ←──── ACK 0

Frame 1 ─────────→
          ←──── ACK 1
```

Only one frame is outstanding.

Show sender waiting for the acknowledgement.

### Reel

**“Why Stop-and-Wait is reliable but slow.”**

---

# 43. ARQ

## Visualization

Introduce errors:

```text
Frame 1 ─── X
```

Then:

```text
Timeout
 ↓
Retransmit
 ↓
ACK
```

Demonstrate the basic ARQ principle.

---

# 44. Sliding Window ARQ

## Visualization

Show sequence numbers:

```text
0 1 2 3 4 5 6 7 8
|-------|
Window
```

Transmit multiple frames before waiting.

ACKs cause the window to move.

### Reel

**“How TCP sends many packets without waiting after every packet.”**

---

# 45. Error Detection — Parity Check

Syllabus explicitly includes parity, checksum and CRC. 

## Visualization

Input:

```text
1011001
```

Calculate parity.

Then flip a bit:

```text
1010001
   ↑
```

Show detection.

### Reel

**“How one extra bit can detect an error.”**

---

# 46. Checksum

## Visualization

Split data into words.

Perform the addition step-by-step.

Then complement the result.

At receiver:

```text
Received data + checksum
        ↓
Validation
```

Introduce corrupted data and show failure.

### Reel

**“How the Internet checks whether data was damaged.”**

---

# 47. CRC

This should be a dedicated algorithmic visualizer.

## Visualization

Input:

```text
Data = 1011001
Generator = 1101
```

Perform XOR division visually, step-by-step.

Show:

```text
Remainder
```

Then append CRC to the transmitted frame.

Introduce a bit error and repeat the check.

### Reel

**“CRC explained using one binary division.”**

---

# 48. Hamming Codes

The syllabus includes Hamming-code error correction. 

## Visualization

Input:

```text
1011
```

Insert parity bits:

```text
P1 P2 D1 P4 D2 D3 D4
```

Calculate each parity bit.

Then introduce a single-bit error.

Calculate syndrome:

```text
P4 P2 P1
 ↓  ↓  ↓
Error position
```

Highlight the incorrect bit.

Then correct it.

### Reel

**“How computers find exactly which bit is wrong.”**

---

# 49. HDLC

The syllabus includes HDLC. 

## Visualization

Build the frame:

```text
Flag
Address
Control
Information
FCS
Flag
```

Animate:

```text
Frame creation
→ transmission
→ response
→ validation
```

The lab explicitly includes HDLC configuration. 

---

# 50. PPP

## Visualization

Show point-to-point connection:

```text
Router A ───────── Router B
```

Build the PPP exchange conceptually.

Highlight frame structure and the point-to-point nature of the connection.

### Reel

**“How two routers establish a direct link.”**

---

# 51. UNIT 5 — TRANSPORT AND APPLICATION

Unit 5 topics 37–45 are transport/application protocols, port numbers, UDP, TCP, WWW/HTTP, FTP, email, Telnet and DNS. 

---

# 52. Transport and Application Layer Protocols

## Visualization

Show the complete chain:

```text
Application
     ↓
Transport
     ↓
Network
     ↓
Data Link
```

Then let one application generate data and follow it through the layers.

---

# 53. Port Numbers

## Visualization

Show one machine running multiple services:

```text
Server
├── HTTP   : 80
├── HTTPS  : 443
├── DNS    : 53
└── FTP    : 21
```

A packet enters with a destination port.

Visualize which application receives it.

### Reel

**“How one computer can run thousands of network connections at once.”**

---

# 54. UDP

## Visualization

Build a UDP datagram:

```text
Source Port
Destination Port
Length
Checksum
Data
```

Show transmission without connection establishment.

Then deliberately drop a packet.

The application does not automatically get transport-level retransmission from UDP.

### Reel

**“UDP doesn't care if the packet disappears.”**

---

# 55. TCP

This should be one of the major visualizers.

## TCP segment

Show:

```text
Source Port
Destination Port
Sequence Number
Acknowledgement Number
Flags
Window
Checksum
Data
```

Follow multiple segments.

---

# 56. TCP Three-Way Handshake

## Visualization

```text
Client                  Server

SYN ─────────────────→

     ←──────── SYN + ACK

ACK ─────────────────→

     CONNECTION ESTABLISHED
```

Make sequence numbers visible.

### Reel

**“What really happens before a website opens?”**

---

# 57. TCP Reliability

## Visualization

Show:

```text
Segment 1 ✓
Segment 2 ✓
Segment 3 X
Segment 4 ✓
```

Then demonstrate acknowledgement and retransmission.

Connect this visually to:

* sequence numbers
* ACKs
* timers
* retransmission

---

# 58. TCP Flow Control

Connect directly to the sliding window concept.

Visualize:

```text
Sender Window
████████
Receiver Window
████
```

Then show the receiver influencing how much the sender can send.

---

# 59. TCP Congestion Behaviour

Even though the syllabus lists TCP rather than a separate congestion-control session, this is a natural expansion of the TCP visualization.

Show the sending rate evolving over time:

```text
Rate
│       /\
│      /  \
│     /    \__
│____/___________
      time
```

Packet loss causes the sending window to change.

This can be a bonus module rather than a required syllabus module.

---

# 60. WWW and HTTP

## Visualization

Follow a browser request:

```text
Browser
 ↓
Server
```

Show:

```http
GET /index.html
Host: example.com
```

Then response:

```http
HTTP/1.1 200 OK
```

Visualize:

```text
Request
→ server processing
→ response
```

### Reel

**“What happens when you type a URL and press Enter?”**

---

# 61. FTP

The syllabus explicitly includes FTP. 

## Visualization

Show:

```text
Client
  │
  ├── Control connection
  │
  └── Data transfer
          │
        Server
```

Visualize file upload and download.

### Reel

**“How file transfer is different from opening a webpage.”**

---

# 62. Email

## Visualization

Follow an email:

```text
Sender
 ↓
Mail Server
 ↓
Internet
 ↓
Recipient Mail Server
 ↓
Recipient
```

Show protocol roles conceptually:

```text
Sending
Receiving
Mailbox
```

The key goal is to turn “email” from a single concept into a multi-hop network process.

### Reel

**“Your email doesn't travel directly to your friend.”**

---

# 63. Telnet

The course explicitly includes Telnet, and Telnet configuration is also a lab experiment.  

## Visualization

Show:

```text
Client
 ↓ TCP connection
Remote machine
 ↓
Terminal session
```

Simulate:

```text
login:
password:
command:
response:
```

Then connect it back to port-based communication.

### Reel

**“Before modern remote administration tools, this is how remote terminals worked.”**

---

# 64. DNS

DNS is the last official session topic. 

This should be one of the most polished visualizations.

## Recursive lookup

Show:

```text
Client
   ↓
DNS Resolver
   ↓
Root Server
   ↓
.com Server
   ↓
Authoritative Server
   ↓
IP Address
```

For:

```text
example.com
```

show the lookup progressing step-by-step.

### Reel

**“How your computer turns google.com into an IP address.”**

---

# 65. PRACTICAL / PACKET TRACER COVERAGE

The course plan's practical work includes specific experiments. These should not be treated as separate theory topics; instead, they can act as **applied versions of the theory modules**.

The official FJ1 experiments include:

1. Packet Tracer introduction
2. Peer-to-peer communication
3. Cables and colour codes
4. Network topologies
5. Router configuration
6. IP addressing and VLSM
7. Static and default routing
8. NAT configuration 

The later practical work includes:

9. RIP v1
10. RIP v2
11. Single-area OSPF
12. Multi-area OSPF
13. PPP
14. HDLC
15. BGP
16. EIGRP
17. Telnet 

These should become **scenario visualizations**.

For example:

```text
Theory:
VLSM
   ↓
Visualizer:
Address-space carving
   ↓
Practical:
Configure VLSM in a network
```

Likewise:

```text
Theory:
OSPF
   ↓
Visualizer:
LSA + shortest path
   ↓
Practical:
Configure OSPF
```

The actual course plan describes Packet Tracer as the platform for practical sessions. 

---

# 66. MASTER NETWORK SIMULATION

This is the **capstone** of the entire visualizer.

Instead of teaching every concept independently, combine them into one network.

For example:

```text
PC A
 │
Switch
 │
Router 1
 │
Router 2
 │
Router 3
 │
Server
```

Now the system can demonstrate:

### Addressing

```text
IP assignment
Subnet mask
Gateway
```

### Switching

```text
MAC forwarding
```

### Routing

```text
Static
RIP
OSPF
```

### Transport

```text
TCP
UDP
```

### Application

```text
HTTP
DNS
FTP
```

The packet can be inspected at every stage.

---

# 67. Packet Journey Mode

A particularly strong cross-topic visualization is:

```text
User enters:
https://example.com
```

Then the visualizer reconstructs the journey:

```text
DNS lookup
   ↓
TCP handshake
   ↓
HTTP request
   ↓
IP routing
   ↓
Ethernet frame
   ↓
Physical transmission
   ↓
Server
   ↓
HTTP response
```

This connects **Units 1, 2, 3, 4 and 5** into a single story.

---

# 68. Failure / What-If Simulations

A major part of the project should be deliberately **breaking networks**.

Examples:

### Topology

Remove a link.

### Routing

Remove the shortest path.

### VLSM

Demand too many hosts.

### ARQ

Drop a frame.

### CRC

Flip a bit.

### Hamming

Corrupt exactly one bit.

### TCP

Lose a segment.

### DNS

Make a DNS path unavailable.

### NAT

Remove the translation mapping.

This changes the visualizer from:

> “Watch an animation”

into:

> “Observe what happens when the network behaves incorrectly.”

---

# 69. Algorithm Visualizations

The following should use true step-by-step algorithm execution rather than simply diagrams.

### Addressing

* FLSM allocation
* VLSM allocation
* CIDR calculation
* Supernetting

### Routing

* Distance Vector
* Dijkstra / Link State
* Path Vector

### Error Control

* Parity
* Checksum
* CRC
* Hamming code

### Flow / Error Control

* Stop-and-Wait
* ARQ
* Sliding Window

Each should expose intermediate states.

---

# 70. Comparison Visualizations

Some concepts are better understood side-by-side.

Build comparison experiments such as:

```text
Circuit Switching
        VS
Packet Switching
```

```text
Hub
 VS
Switch
```

```text
Static Routing
 VS
Distance Vector
 VS
Link State
```

```text
RIP
 VS
OSPF
 VS
BGP
```

```text
Stop-and-Wait
 VS
Go-Back-N
 VS
Selective Repeat
```

```text
TCP
 VS
UDP
```

```text
IPv4
 VS
IPv6
```

```text
CSMA/CD
 VS
CSMA/CA
```

The comparison should always use the **same scenario**, so the difference is observable rather than just textual.

---

# 71. Recommended Reel Library

The project can generate a very strong short-form educational series.

## Fundamentals

1. What is a network?
2. PAN vs LAN vs MAN vs WAN
3. Bus vs Star vs Ring vs Mesh
4. Circuit vs Packet Switching
5. OSI in 30 seconds
6. What actually travels through a cable?
7. Latency vs bandwidth
8. Fiber vs copper vs wireless

## Addressing

9. What is an IPv4 address?
10. What does /24 mean?
11. Network vs host bits
12. Class A/B/C
13. FLSM explained
14. VLSM explained
15. Why VLSM saves IPs
16. How NAT works
17. How supernetting works

## Routing

18. What does a router actually do?
19. Static routing
20. Default route
21. Distance Vector
22. Link State
23. Dijkstra in networking
24. Path Vector
25. RIP
26. OSPF
27. BGP
28. EIGRP
29. Multicasting
30. Why IPv6 exists

## Data Link

31. What happens when two devices transmit together?
32. ALOHA
33. CSMA/CD
34. CSMA/CA
35. Token Ring
36. Stop-and-Wait
37. ARQ
38. Sliding Window
39. Parity
40. Checksum
41. CRC
42. Hamming Code
43. HDLC
44. PPP

## Transport & Application

45. TCP vs UDP
46. TCP three-way handshake
47. TCP sequence numbers
48. TCP retransmission
49. TCP flow control
50. Port numbers
51. HTTP request-response
52. FTP
53. How email travels
54. Telnet
55. DNS lookup

## Capstone reels

56. What happens when you open a website?
57. One packet's journey across the Internet
58. From keyboard input to HTTP request
59. What happens when a router fails?
60. What happens when a packet is lost?
61. What happens when one bit flips?
62. How DNS + TCP + HTTP work together
63. How a home network connects to the Internet

---

# 72. Suggested Visualization Categories

Every topic should be classified internally as one of these types:

### A. Process visualization

Used for:

* OSI encapsulation
* DNS
* TCP handshake
* HTTP
* Email
* NAT

### B. Algorithm visualization

Used for:

* VLSM
* FLSM
* Distance Vector
* Dijkstra
* CRC
* Hamming
* ARQ

### C. Network simulation

Used for:

* Topologies
* Routing
* Switching
* NAT
* RIP
* OSPF
* BGP
* EIGRP

### D. Signal visualization

Used for:

* physical layer
* transmission media
* latency
* bandwidth
* delay

### E. Comparison visualization

Used for:

* TCP vs UDP
* Hub vs Switch
* Circuit vs Packet Switching
* IPv4 vs IPv6
* RIP vs OSPF
* CSMA/CD vs CSMA/CA

### F. Failure visualization

Used for:

* link failure
* packet loss
* collisions
* corrupted packets
* routing failure
* retransmission

---

# 73. The Complete Syllabus Map

```text
UNIT 1 — NETWORK FUNDAMENTALS
│
├── Introduction to Networks
├── PAN / LAN / MAN / WAN
├── BUS / STAR / RING / MESH / HYBRID
├── Circuit Switching
├── Packet Switching
├── OSI Layered Architecture
├── TCP/IP Physical Layer
├── Latency / Bandwidth / Delay
├── Guided Media
│   ├── Twisted Pair
│   ├── Coaxial
│   └── Fiber Optic
└── Unguided Media
    ├── Radio
    ├── Microwave
    └── Infrared


UNIT 2 — ADDRESSING
│
├── Introduction to Addressing
├── IPv4 Addressing
├── Classful Addressing
├── Subnet Mask
├── FLSM
├── Classless Addressing
├── VLSM
├── NAT
├── Supernetting
└── Network Devices
    ├── Hub
    ├── Repeater
    ├── Switch
    ├── Bridge
    └── Router


UNIT 3 — ROUTING
│
├── IP Packet Forwarding
├── Static Routing
├── Default Routing
├── Distance Vector
├── Link State
├── Path Vector
├── RIP v1
├── RIP v2
├── OSPF
│   ├── Single Area
│   └── Multi Area
├── BGP
├── EIGRP
├── Multicasting
└── IPv6 Addressing Basics


UNIT 4 — DATA LINK / ERROR CONTROL
│
├── Medium Access Control
├── ALOHA
├── CSMA/CD
├── CSMA/CA
├── Ethernet
├── Token Ring
├── Stop-and-Wait Flow Control
├── ARQ
├── Sliding Window ARQ
├── Parity Check
├── Checksum
├── CRC
├── Hamming Codes
├── HDLC
└── PPP


UNIT 5 — TRANSPORT / APPLICATION
│
├── Transport & Application Protocols
├── Port Numbers
├── UDP
├── TCP
├── WWW / HTTP
├── FTP
├── Email
├── Telnet
└── DNS
```

This corresponds to the full detailed session plan in the course document. 

---

# 74. Capstone Learning Flow

The best final experience is not five disconnected units. It should ultimately connect them into:

```text
              USER DATA
                  ↓
           APPLICATION
                  ↓
              TCP/UDP
                  ↓
                 IP
                  ↓
         ROUTING DECISION
                  ↓
              ETHERNET
                  ↓
         MEDIUM / SIGNAL
                  ↓
               NETWORK
                  ↓
         ROUTER → ROUTER
                  ↓
              SERVER
```

And when something goes wrong:

```text
PACKET LOSS
    ↓
ARQ / TCP RETRANSMISSION

BIT ERROR
    ↓
CRC / CHECKSUM / HAMMING

ROUTE FAILURE
    ↓
ROUTING PROTOCOL

ADDRESSING PROBLEM
    ↓
SUBNET / NAT / ROUTING

COLLISION
    ↓
MAC PROTOCOL
```

That gives the entire project one coherent intellectual model.

---

# 75. What the Final CN Visualizer Should Cover

By the end, the project should provide:

**45 official theory/session topics**, **all listed practical experiments**, algorithmic visualizations for subnetting/routing/error control, protocol-flow visualizations for TCP/UDP/HTTP/DNS/etc., and an integrated end-to-end packet journey. The official assessment plan also explicitly expects practical experimentation and course-project work, so this breadth matches the intended nature of the course rather than treating CN as a purely theoretical subject.  

The core philosophy should be:

> **Every concept that describes a process should move. Every concept that involves an algorithm should execute step-by-step. Every protocol should show its messages. Every network should be breakable. Every calculation should expose its intermediate state.**

That is what would make this a **Computer Networks Visualizer**, rather than a Computer Networks notes website.
