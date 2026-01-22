# 01-Coordinate-Hash-Explorer

> **Position-as-Seed Paradigm: O(1) Access to Infinite Procedural Space**

An interactive demonstration of coordinate-based hash functions for deterministic procedural generation. This component showcases the core principle of the Beyond Tribonacci methodology: **position itself is the seed**.

![Hash Explorer Preview](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Procedural](https://img.shields.io/badge/Procedural-Generation-purple?style=flat-square)

---

## 🎯 What It Does

The Coordinate Hash Explorer demonstrates how any point in infinite 2D space can be queried **instantly** using pure hash functions—no iteration through previous coordinates required.

### Core Concept

```
Traditional (Tribonacci):  To reach cell #1000, compute cells #0-999
Hash-Based (This Demo):    Cell #1000 computed directly: hash(1000, y, seed)
```

### Key Features

| Feature | Description |
|---------|-------------|
| **O(1) Random Access** | Jump to any coordinate instantly—try (999999, 999999)! |
| **Multi-Layer Properties** | 7 independent property streams from a single coordinate |
| **Deterministic Output** | Same seed + position = identical result, always |
| **Interactive Visualization** | Color-coded 2D grid with real-time property inspection |
| **Adjustable Parameters** | Modify seed, grid size, and void density on the fly |
| **Raw Hash Display** | Peek under the hood at 64-bit hash values |

---

## 🚀 Quick Start

### Instant Preview

**Open `demo.html` in any modern browser**—no installation, no build step required.

```bash
# Clone and open
git clone https://github.com/MushroomFleet/BEYOND-TRIBONACCI.git
cd BEYOND-TRIBONACCI/01-Coordinate-Hash-Explorer
open demo.html  # macOS
# or: start demo.html  # Windows
# or: xdg-open demo.html  # Linux
```

### React Integration

```jsx
import CoordinateHashExplorer from './CoordinateHashExplorer';

function App() {
  return <CoordinateHashExplorer />;
}
```

---

## 📁 Files

| File | Purpose |
|------|---------|
| `demo.html` | Standalone browser demo (no build required) |
| `CoordinateHashExplorer.jsx` | React component source |
| `01-Coordinate-Hash-Explorer-integration.md` | Developer integration guide |
| `README.md` | This documentation |

---

## 🎮 Interactive Controls

### Parameters Panel

- **World Seed**: Change the entire universe (0 to ∞)
- **Grid Size**: Adjust viewport from 8×8 to 24×24
- **Void Threshold**: Control density of populated cells (0-90%)
- **Jump to Coordinates**: Instantly teleport to any (x, y) position

### Navigation

- **Arrow Buttons**: Pan viewport in any direction
- **Cell Click**: Inspect full property breakdown
- **Hover**: Quick preview of cell properties

### Display Options

- **Show Raw Hashes**: Reveal underlying 64-bit hash values

---

## 🧬 Property Layers

Each cell derives 7 independent properties from its coordinates:

| Layer | Property | Range/Values |
|-------|----------|--------------|
| 0 | Existence | Boolean (density threshold) |
| 1 | Type | Rocky, Ice, Gas, Metallic, Oceanic, Volcanic, Anomaly |
| 2 | Temperature | 10 - 10,000 K |
| 3 | Density | 0.1 - 20.0 g/cm³ |
| 4 | Resources | None, Carbon, Silicon, Iron, Titanium, Platinum, Exotic |
| 5 | Danger Level | Safe, Low, Moderate, High, Extreme |
| 6 | Special | Rare anomaly flag (~5% chance) |

---

## 🔧 Technical Details

### Hash Function: SplitMix64

```javascript
const splitmix64 = (seed) => {
  let z = (seed + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
  return z ^ (z >> 31n);
};
```

**Properties:**
- Bijective (no collisions)
- Full 64-bit period
- Excellent avalanche characteristics
- ~2 GB/s throughput

### Coordinate Hashing

```javascript
const coordHash = (x, y, salt = 0) => {
  const packed = BigInt(x) * 0x1f1f1f1fn + 
                 BigInt(y) * 0x3d3d3d3dn + 
                 BigInt(salt) * 0x7f7f7f7fn;
  return splitmix64(packed & 0xffffffffffffffffn);
};
```

Different `salt` values produce statistically independent property streams from the same coordinates.

---

## 📖 Integration Guide

For detailed instructions on adapting this component to your projects, see:

**[01-Coordinate-Hash-Explorer-integration.md](./01-Coordinate-Hash-Explorer-integration.md)**

Covers:
- Custom cell types and properties
- 3D extension
- Game world integration patterns
- Performance optimization
- Web Worker parallelization
- Complete API reference

---

## 🌐 Part of Beyond Tribonacci

This component demonstrates **Demo 01** from the Beyond Tribonacci methodology:

> *"The universe doesn't iterate into existence. It springs complete from the coordinates themselves, waiting to be queried."*

### Other Demos in Series

| # | Demo | Focus |
|---|------|-------|
| **01** | **Coordinate Hash Explorer** | Position-as-Seed principle |
| 02 | Noise Layer Visualizer | Coherent noise stacking |
| 03 | Hierarchical System Generator | Constraint propagation |
| 04 | Infinite Terrain Renderer | Multi-scale LOD |
| 05 | Galaxy Cartographer | Full implementation |

---

## 🔗 Links

- **Repository**: [github.com/MushroomFleet/BEYOND-TRIBONACCI](https://github.com/MushroomFleet/BEYOND-TRIBONACCI)
- **This Component**: [01-Coordinate-Hash-Explorer](https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/01-Coordinate-Hash-Explorer)
- **Methodology Document**: [BeyondTribonacci-EndlessWorlds.md](../BeyondTribonacci-EndlessWorlds.md)

---

## 📄 License

MIT License - See repository root for details.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{coordinate_hash_explorer,
  title = {Coordinate Hash Explorer: Position-as-Seed Procedural Generation Demo},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/01-Coordinate-Hash-Explorer},
  version = {1.0.0}
}
```

### Donate

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
