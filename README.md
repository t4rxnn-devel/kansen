```
  _  __       _  _  ____  _____ _   _    ____ ___ _     ___ ____ ___  _   _   _  _   ___  
 | |/ /      / \| ||  _ \| ____| \ | |  / ___|_ _| |   |_ C/ ___/ _ \| \ | | | || | / _ \ 
 | ' /      / _ \ || |_) |  _| |  \| |  \___ \| || |    | / |  | | | |  \| | | || || | | |
 | . \     / ___ \ ||  _ /| |___| |\  |   ___) | || |___| \ |__| |_| | |\  | |__   _| |_| |
 |_|\_\   /_/   \_\_|_| \_\_____|_| \_|  |____/___|_____|__\____\___/|_| \_|    |_|  \___/ 
                                                                                           
   K A N S E N   S I L I C O N   N E T   V 4 . 0   //   3 N M   G A A   E D A   &   F A B
```

[![Build Status](https://img.shields.io/badge/BUILD-SUCCESS-emerald?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/)
[![Node Version](https://img.shields.io/badge/NODE-v18%2B%20%2F%20v20%2B-blue?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Technology Node](https://img.shields.io/badge/SILICON-3nm%20GAAFET%20FinFET-red?style=for-the-badge&logo=cpu&logoColor=white)](#)
[![ISO Cleanroom](https://img.shields.io/badge/ISO%2014644--1-CLASS--3%20CLEANROOM-amber?style=for-the-badge)](#)
[![ASML Metrology](https://img.shields.io/badge/ASML-HIGH--NA%20EUV%200.55-purple?style=for-the-badge)](#)

> **KANSEN SILICON NET V4.0** is an enterprise-grade, browser-native Electronic Design Automation (EDA) and Semiconductor Cleanroom Certification platform. Designed for principal hardware architects, micro-architects, and process engineers, it integrates live IEEE-1364 Verilog synthesis, netlist schematics, 3D logic waveforms, PVT variation stress testing, ASML EUV photolithography metrology, and binary GDSII tape-out stream generation.

---

## ⚡ Key Highlights & Core Capabilities

| Feature | Description | Architecture / Tech |
| :--- | :--- | :--- |
| 🧠 **SHINZU Autonomous AI Peer** | Floating multi-threaded copilot with Student & Scientist personas, live VFS file writing, and Monaco buffer injection. | Gemini AI Engine + WASM SIMD |
| ⚡ **Quadrant I: Schematic Netlist** | Interactive gate-level netlists with dynamic hover overlays detailing transistor count, propagation delay, and pinouts. | SVG Vector Engine |
| 📝 **Quadrant II: Monaco Code Editor** | Live IEEE-1364 Verilog editor with Yosys WASM synthesis and real-time syntax checking. | Monaco Editor + WebAssembly |
| 📊 **Quadrant III: Waveform Analyzer** | Dual 2D Canvas & 3D Three.js extruded logic waveform ribbons with interactive time-skew inspection. | Three.js WebGL + Canvas2D |
| 🔬 **Quadrant IV: Telemetry & Wafer** | Interactive 3D silicon wafer, ASML TWINSCAN High-NA EUV lithography scanner, and GDSII stream matrix. | Three.js + GDSII Binary Writer |
| 🪪 **Enterprise Auth & Certification** | Multi-provider authentication (Google, GitHub, ORCID, LinkedIn), ISO Class-3 exam modal, and LinkedIn sharing. | Firebase Auth + Web Crypto |

---

## 📐 System Architecture: The Four Quadrants

Kansen Silicon Net V4.0 splits the workstation into four synchronized live quadrants:

```
+------------------------------------------+------------------------------------------+
|  QUADRANT I: INTERACTIVE SCHEMATIC NETLIST|  QUADRANT II: MONACO VERILOG RTL EDITOR  |
|  - Logic Gate Visualizer & Toggle Nodes  |  - IEEE-1364 Source Code Buffer          |
|  - Transistor Count & Delay Overlay      |  - Yosys WASM AST Synthesis Engine      |
+------------------------------------------+------------------------------------------+
|  QUADRANT III: 3D LOGIC WAVEFORM ANALYZER|  QUADRANT IV: TELEMETRY & 3D WAFER STAGE  |
|  - 2D Signal Traces & 3D Extruded Ribbons|  - ASML High-NA EUV Stepper Simulator    |
|  - Real-time Clock Skew & Glitch Detection|  - Raw Binary GDSII Stream Matrix & Export|
+------------------------------------------+------------------------------------------+
```

---

## 🤖 SHINZU Autonomous AI Peer Engine

SHINZU is your sovereign silicon engineering peer inside the platform.

### Dynamic Persona Modes
1. **Basic Student Mode**: Simplified cleanroom math, gentle RTL tutorial explanations, and foundational transistor mechanics.
2. **Principal Scientist Mode**: Deep PDK library discussions, 3nm Gate-All-Around (GAA) Nanosheet parasitics, and PVT corner timing closure strategies.

### Live VFS & Monaco Control
Ask Shinzu to write RTL:
> *"Shinzu, generate a pipelined 8-bit multiplier in Verilog and update my editor buffer."*

Shinzu will automatically update the active Monaco text buffer, write the module to the virtual file system, and execute the synthesis check in the background.

---

## 🔬 ASML High-NA EUV Photolithography Research & Scanner

The platform features a dedicated research workstation detailing **ASML Holding N.V.** baseline photolithography innovations:

- **EUV Stepper Scanner**: Simulates 13.5nm wavelength Extreme Ultraviolet laser-produced plasma (LPP) tin droplet light sources.
- **Anamorphic Projection Optics (POB)**: Switchable between **0.33 Standard EUV** and **0.55 High-NA EUV**.
- **Rayleigh Resolution Solver**: Real-time evaluation of Critical Dimension ($CD = k_1 \cdot \frac{\lambda}{NA}$) and Depth of Focus ($DOF = k_2 \cdot \frac{\lambda}{NA^2}$).

---

## 📦 Binary GDSII Stream Formatter (`KansenGdsFormatter`)

Convert synthesized RTL directly into true, standard binary GDSII files (`.gds`) packed into zipped tape-out bundles:

- **Hexadecimal Record Precision**:
  - `HEADER` (`0x00060002`)
  - `BGNLIB` (`0x001A0102` with 2026 UTC timestamp)
  - `LIBNAME` (`0x000C0206` ASCII string)
  - `UNITS` (`0x00140305` database scale in nm)
  - `BOUNDARY` polygons for Layers 1..4 (Polysilicon, Diffusion, Metal-1, Vias)
  - `ENDSTR` and `ENDLIB`
- **ZIP Export**: Download compressed tape-out bundles containing `.gds`, `.v` source, and `MANIFEST.txt`.

---

## 🛠️ Quick Start & Local Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kansen-silicon/kansen-silicon-net.git
   cd kansen-silicon-net
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

4. **Verify application compilation**:
   ```bash
   npm run build
   ```

---

## 💻 Terminal CLI Commands

The bottom log console includes an interactive terminal command parser (`KANSEN>`):

| Command | Action |
| :--- | :--- |
| `help` | Lists all available system terminal commands. |
| `compile` / `synth` | Triggers Yosys WASM RTL synthesis pass on the active buffer. |
| `test` | Executes automated Verilator testbench suite & PRBS-31 bitstream check. |
| `tapeout` | Launches the air-gap hardened crypto GDSII tape-out generator. |
| `status` | Reports progress across Fab Certification and EDA RTL labs. |
| `cert` | Launches the ISO Class-3 Certification Modal. |
| `theme` | Toggles the retro CRT scanline overlay effect. |
| `clear` | Wipes the console log buffer. |
| `info` | Prints system kernel build and security clearance level. |

---

## 🎨 Sovereign Industrial Palette

- **Viewport Canvas**: Absolute Pitch Black (`#000000`)
- **Internal Modules**: Obsidian Charcoal (`#050505`)
- **Module Boundaries**: Steel Zinc (`#18181b`)
- **Active Traces / Neon Triggers**: Surgical Neon Red (`#dc2626` / `#ff003c`)
- **Typography**: High-Contrast Data White & Clinical Bone White

---

## 📄 Academic Attribution & Disclaimers

- Photolithography architectural reference and metrology system concepts are attributed to **ASML Holding N.V.** (Veldhoven, Netherlands).
- Kansen Silicon Net V4.0 is an educational and enterprise simulation platform.

---

### 🛡️ License

Distributed under the **MIT License**. See `LICENSE` for more information.

*(C) 2026 Kansen Silicon Net Systems. All Rights Reserved.*
