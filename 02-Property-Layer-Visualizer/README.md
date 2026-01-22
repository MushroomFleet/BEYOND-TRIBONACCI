# Property Layer Visualizer

**Multi-Layer Hash Composition Demonstration for Procedural Generation**

![Property Layer Visualizer](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/Status-Demo-blue?style=flat-square)

Part of the [Beyond Tribonacci](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) methodology for endless world generation.

---

## Overview

The Property Layer Visualizer demonstrates a fundamental technique in modern procedural generation: **multi-layer hash composition with salt values**. This approach enables statistically independent property layers derived from identical spatial coordinates.

### The Core Insight

```
properties(x, y) = hash(x, y, layer_salt)
```

By using different salt values with the same (x, y) coordinates, we generate multiple independent property streams:

| Layer | Salt | Purpose |
|-------|------|---------|
| Existence | `0x1A2B3C4D` | Binary presence at location |
| Type | `0x5E6F7A8B` | Categorical classification (1-4) |
| Resource | `0x9C0D1E2F` | Resource density value |
| Danger | `0x3A4B5C6D` | Threat intensity level |

Each layer produces statistically independent outputs—correlation values near zero demonstrate that knowing one property tells you nothing about the others.

---

## Quick Preview

### 🚀 [Open demo.html](./demo.html)

The standalone demo requires no build step—simply open `demo.html` in any modern browser. It loads React from CDN and renders the complete interactive visualization.

**Features demonstrated:**
- Toggle individual layers on/off
- Adjust universe seed for different worlds
- Modify grid size and cell dimensions
- Control existence density threshold
- Inspect individual cell values on hover
- View live correlation matrix proving statistical independence
- Real-time layer statistics (count, mean, min, max)

---

## Visual Design

The visualizer presents a scientific instrument aesthetic with:

- **Dark theme** optimized for data analysis
- **Color-coded layers** with translucent overlays:
  - 🟢 Green — Existence
  - 🔴 Red — Type Class
  - 🔵 Cyan — Resource
  - 🟡 Amber — Danger
- **Screen blend mode** for layer stacking
- **Monospace typography** for precise readability
- **Hover inspection** with coordinate and value display

---

## Files

```
02-Property-Layer-Visualizer/
├── PropertyLayerVisualizer.jsx              # React component (ES6 modules)
├── demo.html                                # Standalone browser demo
├── 02-Property-Layer-Visualizer-integration.md  # Integration guide
└── README.md                                # This file
```

---

## For Developers

### Integration Guide

📖 **[02-Property-Layer-Visualizer-integration.md](./02-Property-Layer-Visualizer-integration.md)**

The integration guide covers:

- Quick start installation
- Hash function internals and customization
- Adding custom property layers
- Performance optimization for large grids
- Backend/server integration patterns
- 3D world generation examples
- Correlation testing utilities
- Full API reference

### Basic Usage

```jsx
import PropertyLayerVisualizer from './PropertyLayerVisualizer';

function App() {
  return <PropertyLayerVisualizer />;
}
```

### Hash Function

The PCG-style hash is pure JavaScript with no dependencies:

```javascript
const pcgHash = (x, y, salt, seed) => {
  let state = ((x * 374761393) + (y * 668265263) + (salt * 2147483647) + seed) >>> 0;
  state = ((state ^ (state >> 16)) * 2246822519) >>> 0;
  state = ((state ^ (state >> 13)) * 3266489917) >>> 0;
  state = (state ^ (state >> 16)) >>> 0;
  return state / 4294967296;
};
```

---

## Why This Matters

Traditional procedural generation (like Braben's Tribonacci in Elite) uses sequential state mutation—you must compute every previous state to reach a given coordinate. The **position-is-seed paradigm** inverts this:

| Approach | Access Pattern | Parallelism | Spatial Coherence |
|----------|---------------|-------------|-------------------|
| Tribonacci | O(n) sequential | Single-threaded | None |
| Hash-based | O(1) random access | Massively parallel | Controllable |

This visualizer proves the statistical independence of hash-derived layers—the foundation for generating complex, deterministic worlds with zero stored state.

---

## Part of Beyond Tribonacci

This component is **Demo #02** in the Beyond Tribonacci series:

1. Basic Coordinate Hash Grid
2. **Property Layer Visualizer** ← You are here
3. Simplex Noise Terrain
4. Domain Warping Effects
5. Hierarchical Generation
6. ...and more

Each demo builds on the previous, culminating in a complete procedural universe generation system.

---

## License

MIT License. See [LICENSE](../LICENSE) for details.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{property_layer_visualizer,
  title = {Property Layer Visualizer: Multi-layer hash composition visualization for procedural generation},
  author = {[Drift Johnson]},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/02-Property-Layer-Visualizer},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
