# BEYOND TRIBONACCI

> **Procedural Deterministic Seed-Based World Generation — A React Component Showcase**

This repository contains 16 interactive demonstrations exploring modern procedural generation techniques that supersede Braben's 1984 Tribonacci algorithm. Each demo is a self-contained React JSX component illustrating a specific technique from the position-as-seed paradigm.

## Part of the BEYOND TRIBONACCI project
[BEYOND-TRIBONACCI](https://github.com/MushroomFleet/BEYOND-TRIBONACCI)
[Zerobytes-Skill](https://github.com/MushroomFleet/Zerobytes-Skill)
[Braben-Building-Principles-Skill](https://github.com/MushroomFleet/Braben-Building-Principles-Skill)

---

## The Core Insight

David Braben's original Elite encoded 2,048 star systems in just 6 bytes using Tribonacci sequences—a masterpiece of constraint-driven design. But modern hardware demands a fundamentally different approach:

**Position itself should be the seed.**

No state machine. No sequential iteration. Any coordinate, anywhere in infinite space, immediately computes its contents through pure functions of spatial position. These demonstrations make that paradigm tangible and interactive.

---

## Demo Collection

| # | Demo | Technique | Description |
|---|------|-----------|-------------|
| 01 | [Coordinate Hash Explorer](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/01-Coordinate-Hash-Explorer) | Position-as-Seed | Interactive grid demonstrating O(1) property lookup from coordinates |
| 02 | [Property Layer Visualizer](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/02-Property-Layer-Visualizer) | Multi-Layer Hashing | Toggle independent property layers derived from salt-varied hashes |
| 03 | [Noise Comparison Grid](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/03-Noise-Comparison-Grid) | Simplex vs Perlin | Side-by-side noise algorithm comparison with artifact highlighting |
| 04 | [fBm Octave Stacker](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/04-fBm-Octave-Stacker) | Fractal Brownian Motion | Slider-controlled octave accumulation with parameter adjustment |
| 05 | [Warp Field Demonstrator](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/05-Warp-Field-Demonstrator) | Domain Warping | Before/after visualization of domain distortion effects |
| 06 | [Layered Terrain Builder](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/06-Layered-Terrain-Builder) | Noise Stack | Step-through composition of foundation to application layers |
| 07 | [Galaxy-to-Grain Drill-Down](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/07-Galaxy-to-Grain-Drill-Down) | Hierarchical Constraints | Nested zoom showing parent-to-child constraint propagation |
| 08 | [Instant Coordinate Jumper](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/08-Instant-Coordinate-Jumper) | O(1) Random Access | Jump to arbitrary coordinates instantly vs sequential iteration |
| 09 | [Neighbor Relationship Map](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/09-Neighbor-Relationship-Map) | Spatial Coherence | Visualize mathematical kinship between adjacent cells |
| 10 | [Seamless Zoom Navigator](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/10-Seamless-Zoom-Navigator) | Multi-Scale Consistency | Continuous zoom without LOD discontinuities |
| 11 | [Stellar Forge Simulator](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/11-Stellar-Forge-Simulator) | Star Generation | Mass → luminosity → temperature derivation chains |
| 12 | [Orbital Mechanics Display](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/12-Orbital-Mechanics-Display) | Planet Derivation | Frost lines, habitable zones, and constrained planet generation |
| 13 | [Planetary Surface Renderer](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/13-Planetary-Surface-Renderer) | Terrain Heightfields | Multi-octave spherical terrain with noise contribution breakdown |
| 14 | [Throughput Benchmark Viz](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/14-Throughput-Benchmark-Viz) | Hash Performance | Live performance comparison of hash function throughput |
| 15 | [Sequential vs Parallel Race](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/15-Sequential-vs-Parallel-Race) | Tribonacci Comparison | Visual race between sequential and parallel generation |
| 16 | [15 + WebGPU](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/16-15-plus-webgpu) | GPU Parallelism | Demo 15 with WebGPU compute shaders — 400x speedup on 4GB GPU |

---

## Repository Structure

```
BEYOND-TRIBONACCI/
├── README.md                          # This file
├── research/                          # Source documentation and methodology
│   └── BeyondTribonacci-EndlessWorlds.md
├── 01-Coordinate-Hash-Explorer/
│   ├── README.md                      # Demo explanation
│   ├── CoordinateHashExplorer.jsx     # React component source
│   └── demo.html                      # Local preview (not hosted)
├── 02-Property-Layer-Visualizer/
│   ├── README.md
│   ├── PropertyLayerVisualizer.jsx
│   └── demo.html
...
└── 15-Sequential-vs-Parallel-Race/
    ├── README.md
    ├── SequentialVsParallelRace.jsx
    └── demo.html
└── 16-15-plus-webgpu/
    ├── README.md
    ├── SequentialVsParallelRaceV2.jsx
    └── demo.html
```

---

## Research Foundation

The `/research/` folder contains the complete methodology documentation that informed these demonstrations:

- **Part I:** Tribonacci's Limitations — why sequential generation fails modern requirements
- **Part II:** Hash-First Architecture — the position-as-seed paradigm
- **Part III:** Coherent Noise — Simplex, fBm, and domain warping techniques
- **Part IV:** Hierarchical Constraint Propagation — parent-child property inheritance
- **Part IX:** Reference Implementation — complete C code for star/planet/terrain generation
- **Part X:** Performance Benchmarks — throughput comparisons across hash functions

This documentation provides the theoretical foundation and implementation specifics for extending any demo.

---

## Quick Start

Each demo folder includes a `demo.html` for local preview:

```bash
git clone https://github.com/MushroomFleet/BEYOND-TRIBONACCI.git
cd BEYOND-TRIBONACCI/01-Coordinate-Hash-Explorer
# Open demo.html in your browser
```

For development, each `.jsx` component can be imported into any React project:

```jsx
import CoordinateHashExplorer from './01-Coordinate-Hash-Explorer/CoordinateHashExplorer';

function App() {
  return <CoordinateHashExplorer seed={12345} />;
}
```

---

## Design Principles

All demonstrations follow these constraints:

- **Pure Functional Generation** — identical inputs always produce identical outputs
- **Zero External State** — no databases, no caches, no persistence required
- **Interactive Parameters** — every technique exposes adjustable controls
- **Educational Focus** — clarity over optimization; understanding over performance
- **Self-Contained** — each demo works independently with no cross-dependencies

---

## Key Concepts Demonstrated

### Position-as-Seed (Demos 01, 08)
Replace sequential state mutation with pure coordinate hashing. Any point in space immediately computes its properties: `properties(x, y, z) = hash(x, y, z, layer_salt)`

### Coherent Noise (Demos 03, 04, 05, 06)
Raw hashes produce white noise. Layer Simplex noise with fBm octaves and domain warping to create spatially meaningful patterns with controllable frequency characteristics.

### Hierarchical Constraints (Demos 07, 11, 12)
Parent properties constrain child generation. Galaxy density affects star formation; stellar mass determines planetary composition; orbital radius influences atmospheric retention.

### Spatial Coherence (Demos 09, 10)
Unlike Tribonacci where adjacent systems share no mathematical kinship, hash-based generation with coherent noise ensures neighbors have related properties—enabling meaningful regional variation.

---

## Bonus: WebGPU Acceleration

Demo 16 extends the Sequential vs Parallel Race with **WebGPU compute shaders**, demonstrating the full potential of the position-as-seed paradigm on modern graphics hardware.

| Metric | CPU (Demo 15) | WebGPU (Demo 16) |
|--------|---------------|------------------|
| Hash computation | Single-threaded | Thousands of GPU cores |
| Typical speedup | 1x baseline | ~400x on 4GB GPU |
| Grid fill time | Seconds | Milliseconds |

This demonstrates why the hash-first architecture matters: Tribonacci's sequential dependency chain cannot parallelize regardless of hardware. Position-as-seed generation scales linearly with available compute cores—from 8 CPU threads to 4,000+ GPU shader units.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{beyond_tribonacci,
  title = {Beyond Tribonacci: Procedural Deterministic Seed-Based World Generation Showcase},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI},
  version = {1.0.0}
}
```

### Donate

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
