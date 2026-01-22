# 🗺️ Neighbor Relationship Map

**Demo 09 from the Beyond Tribonacci: Endless Worlds Methodology**

An interactive React component that visualizes the fundamental difference between **coherent noise** (Simplex fBm) and **Tribonacci-style white noise** — demonstrating why spatial coherence matters for procedural world generation.

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Preview-64dcb4?style=for-the-badge)](./demo.html)
[![React](https://img.shields.io/badge/React-18.x-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

---

## 🎯 What This Demonstrates

This component provides a **side-by-side visual comparison** of two procedural generation approaches:

| Coherent Noise (Simplex fBm) | Tribonacci-Style (White Noise) |
|------------------------------|--------------------------------|
| C² continuous gradients | No spatial relationship |
| Neighbors share mathematical kinship | Adjacent cells are statistically independent |
| Enables regional variation | Prevents meaningful clustering |
| Suitable for terrain, biomes, density | Only suitable for uncorrelated randomness |

### Key Visual

When you **click any cell**, the component displays:
- A **radiating similarity heatmap** showing relationship scores with all neighbors
- **Red glow** = low similarity (values differ significantly)
- **Green glow** = high similarity (values are close)
- **Statistical comparison** showing the coherence advantage percentage

---

## 🚀 Quick Preview

Open `demo.html` directly in your browser — no build step required!

```bash
# Clone the repository
git clone https://github.com/MushroomFleet/BEYOND-TRIBONACCI.git

# Navigate to this demo
cd BEYOND-TRIBONACCI/09-neighbor-relationship-map

# Open in browser
open demo.html
# or on Linux:
xdg-open demo.html
# or on Windows:
start demo.html
```

The demo uses CDN-hosted React and Babel for zero-configuration preview.

---

## 📦 Integration Guide

### Option 1: Direct JSX Import (Recommended)

For projects using a bundler (Vite, Webpack, Create React App, Next.js):

```bash
# Copy the component to your project
cp NeighborRelationshipMap.jsx src/components/
```

```jsx
// In your application
import NeighborRelationshipMap from './components/NeighborRelationshipMap';

function App() {
  return (
    <div>
      <NeighborRelationshipMap />
    </div>
  );
}
```

### Option 2: HTML Embed (No Build Required)

Copy `demo.html` and serve it directly. All dependencies are loaded from CDN:
- React 18.2.0
- ReactDOM 18.2.0
- Babel Standalone 7.23.5

### Option 3: Extract Core Functions

If you only need the noise algorithms without the UI:

```javascript
// ─── HASH FUNCTION ───────────────────────────────────────
const hash = (x, y, seed = 0) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 15), 1831565813);
  h = Math.imul(h ^ (h >>> 13), 1423966843);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
};

// ─── SIMPLEX 2D NOISE ────────────────────────────────────
// Full implementation in NeighborRelationshipMap.jsx

// ─── FRACTAL BROWNIAN MOTION ─────────────────────────────
const fbm = (x, y, perm, octaves = 4, persistence = 0.5, lacunarity = 2) => {
  let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * simplex2D(x * frequency, y * frequency, perm);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  
  return value / maxValue;
};
```

---

## ⚙️ Adjustable Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| **Seed** | 1-9999 | Deterministic seed for reproducible generation |
| **Grid Size** | 10-32 | Number of cells per axis (NxN grid) |
| **Noise Scale** | 0.05-0.50 | Frequency of coherent noise sampling |
| **Octaves** | 1-8 | Number of fBm layers (detail levels) |
| **Heatmap Radius** | 1-6 | How many neighbors to analyze |
| **Show Glow** | ON/OFF | Toggle similarity visualization overlay |

---

## 🧮 Technical Implementation

### Pure-Functional Generation

All noise generation is **deterministic** and **pure-functional**:
- Same `seed + coordinates` = identical output across sessions
- No external state or side effects
- Suitable for parallel computation

### Noise Stack

```
┌─────────────────────────────────────────────────┐
│  Fractal Brownian Motion (fBm)                  │
├─────────────────────────────────────────────────┤
│  Simplex 2D Noise (C² continuous)               │
├─────────────────────────────────────────────────┤
│  Permutation Table (seeded shuffle)             │
├─────────────────────────────────────────────────┤
│  PCG Hash (coordinate → permutation seed)       │
└─────────────────────────────────────────────────┘
```

### Similarity Calculation

```javascript
// Returns 0-1 where 1 = identical, 0 = maximally different
const calculateSimilarity = (value1, value2) => {
  return 1 - Math.abs(value1 - value2);
};
```

---

## 🎨 Color Mapping

### Terrain Gradient

| Value Range | Visual | Represents |
|-------------|--------|------------|
| 0.00 - 0.30 | Deep blue | Ocean depths |
| 0.30 - 0.45 | Cyan/teal | Shallow water |
| 0.45 - 0.55 | Sand/yellow | Beach/lowlands |
| 0.55 - 0.70 | Green | Grasslands |
| 0.70 - 0.85 | Dark green | Forests |
| 0.85 - 1.00 | White/gray | Mountains/snow |

### Similarity Heatmap

| Similarity | Glow Color | Meaning |
|------------|------------|---------|
| 0% | Red | Completely different |
| 50% | Yellow | Moderate difference |
| 100% | Green | Identical values |

---

## 📊 Expected Results

When analyzing any cell, you should observe:

**Coherent Noise (Simplex fBm):**
- Average neighbor similarity: **70-95%**
- Immediate neighbors (distance 1.0): **85-98%** similar
- Similarity decreases smoothly with distance

**Tribonacci-Style (White Noise):**
- Average neighbor similarity: **~50%** (random chance)
- No correlation between distance and similarity
- Values are statistically independent

---

## 🔗 Related Demos

This component is part of the **Beyond Tribonacci** methodology series:

| Demo | Focus |
|------|-------|
| 01 | Coordinate Hashing Basics |
| 02 | White Noise vs Coherent Noise |
| 03 | Fractal Brownian Motion |
| 04 | Domain Warping |
| 05 | Hierarchical Generation |
| 06 | Multi-Scale Consistency |
| 07 | GPU Parallelization |
| 08 | Infinite Zoom |
| **09** | **Neighbor Relationship Map** ← You are here |
| 10 | Full World Generator |

---

## 🛠️ Dependencies

**Runtime:** None beyond React 18.x

**Development:** Standard React toolchain (optional)

**CDN Preview:**
- `https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js`
- `https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js`
- `https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js`

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{beyond_tribonacci_neighbor_map,
  title = {Beyond Tribonacci: Neighbor Relationship Map - Spatial Coherence Visualization},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
