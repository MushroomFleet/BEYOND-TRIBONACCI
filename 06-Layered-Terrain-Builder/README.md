# 🏔️ Layered Terrain Builder

**Noise Stack Architecture Demonstrator**

A React component that visualizes the complete noise stack architecture for procedural terrain generation, based on the **Beyond Tribonacci** methodology. This interactive tool demonstrates how multiple coherent noise layers combine to create realistic terrain through the position-is-seed paradigm.

![Noise Stack](https://img.shields.io/badge/Noise_Stack-4_Layers-64d2ff)
![Blend Modes](https://img.shields.io/badge/Blend_Modes-6_Types-bf5af2)
![Deterministic](https://img.shields.io/badge/Generation-Deterministic-30d158)

## 🎯 Overview

This component demonstrates the core principle from **Part III: Coherent Noise for Spatial Meaning** of the Beyond Tribonacci methodology:

```
Noise Stack (bottom to top):
┌─────────────────────────────────────────────────┐
│  Application Noise (resources, biomes)           │
├─────────────────────────────────────────────────┤
│  Warping Noise (domain distortion)               │
├─────────────────────────────────────────────────┤
│  Detail Noise (high-frequency variation)         │
├─────────────────────────────────────────────────┤
│  Structure Noise (mid-frequency features)        │
├─────────────────────────────────────────────────┤
│  Foundation Noise (low-frequency gradients)      │
└─────────────────────────────────────────────────┘
```

## ✨ Features

### Noise Layer System
- **Foundation Layer** — Low-frequency continental shapes (default scale: 200)
- **Structure Layer** — Mid-frequency terrain features (default scale: 80)
- **Detail Layer** — High-frequency surface variation (default scale: 20)
- **Warp Layer** — Domain distortion for organic, flowing patterns (with adjustable warp strength)

### Interactive Controls
- **Per-layer visibility** — Toggle individual layers on/off
- **Blend modes** — Normal, Add, Multiply, Overlay, Screen, Subtract
- **Opacity control** — Fine-tune each layer's contribution
- **Scale adjustment** — Control noise frequency per layer
- **Weight system** — Balance layer influence on final output
- **Octave control** — fBm octave stacking (1-10)
- **Persistence** — Amplitude decay per octave (0.1-0.9)

### Visualization
- **Terrain Colors** — Biome-based gradient mapping (water → beach → grass → rock → snow)
- **Heightmap** — Grayscale elevation visualization
- **Step-through Animation** — Watch layers build sequentially
- **Live previews** — Per-layer thumbnail with color coding

### Technical Properties
- **Pure functional** — No side effects, position determines output
- **Deterministic** — Same seed + coordinates = identical output across sessions
- **O(1) access** — Any coordinate computes instantly without iteration
- **OpenSimplex-inspired** — Patent-safe 2D simplex noise implementation

## 🚀 Quick Preview

Open `demo.html` in any modern browser for an instant interactive demonstration:

```bash
# Simply open the file
open demo.html

# Or serve locally
python -m http.server 8000
# Then visit http://localhost:8000/demo.html
```

The demo uses CDN-hosted React and requires no build step or dependencies.

## 📦 Installation

### Option 1: Direct Usage (Recommended for Quick Start)

Copy `LayeredTerrainBuilder.jsx` into your React project:

```bash
cp LayeredTerrainBuilder.jsx src/components/
```

### Option 2: From Repository

```bash
git clone https://github.com/MushroomFleet/BEYOND-TRIBONACCI.git
cd BEYOND-TRIBONACCI/06-Layered-Terrain-Builder
```

## 🔧 Integration Guide

### Basic React Integration

```jsx
import LayeredTerrainBuilder from './LayeredTerrainBuilder';

function App() {
  return (
    <div className="app">
      <LayeredTerrainBuilder />
    </div>
  );
}

export default App;
```

### With Custom Initial Seed

The component accepts no props by default but you can modify the initial state:

```jsx
// Inside LayeredTerrainBuilder.jsx, modify the initial seed:
const [globalSeed, setGlobalSeed] = useState(12345); // Your custom seed
```

### Extracting Noise Functions

The noise generation functions are pure and can be extracted for use in other contexts:

```javascript
// Import the core functions
import { simplex2D, fbm, hash } from './LayeredTerrainBuilder';

// Generate terrain height at any coordinate
const height = fbm(x / 100, y / 100, 6, 0.5, 2.0, seed);

// Domain warping for organic shapes
const warpX = fbm(x / 60 + 5.2, y / 60 + 1.3, 3, 0.5, 2, seed + 30000);
const warpY = fbm(x / 60 + 9.1, y / 60 + 2.7, 3, 0.5, 2, seed + 40000);
const warped = fbm(x / 60 + warpX * 2, y / 60 + warpY * 2, 4, 0.5, 2, seed + 50000);
```

### Custom Blend Mode Implementation

```javascript
const blendModes = {
  normal: (base, layer, opacity) => base + layer * opacity,
  multiply: (base, layer, opacity) => base + (base * layer) * opacity,
  add: (base, layer, opacity) => base + layer * opacity,
  subtract: (base, layer, opacity) => base - layer * opacity,
  overlay: (base, layer, opacity) => {
    const overlay = base < 0 
      ? 2 * base * (layer + 1) / 2 
      : 1 - 2 * (1 - base) * (1 - (layer + 1) / 2);
    return base + (overlay - base) * opacity;
  },
  screen: (base, layer, opacity) => {
    const b = (base + 1) / 2;
    const l = (layer + 1) / 2;
    const result = 1 - (1 - b) * (1 - l);
    return base + ((result * 2 - 1) - base) * opacity;
  }
};
```

### Server-Side Generation (Node.js)

The noise functions are framework-agnostic and work in Node.js:

```javascript
// terrain-generator.js
const { simplex2D, fbm, hash } = require('./noise-utils');

function generateHeightmap(width, height, seed) {
  const data = new Float32Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Foundation
      let value = fbm(x / 200, y / 200, 4, 0.6, 2.0, seed) * 0.5;
      // Structure
      value += fbm(x / 80, y / 80, 5, 0.5, 2.0, seed + 10000) * 0.3;
      // Detail
      value += fbm(x / 20, y / 20, 6, 0.45, 2.5, seed + 20000) * 0.15;
      
      data[y * width + x] = Math.max(-1, Math.min(1, value));
    }
  }
  
  return data;
}
```

## 🎨 Layer Configuration Reference

| Layer | Default Scale | Octaves | Persistence | Weight | Blend Mode |
|-------|--------------|---------|-------------|--------|------------|
| Foundation | 200 | 4 | 0.60 | 0.50 | Normal |
| Structure | 80 | 5 | 0.50 | 0.30 | Add |
| Detail | 20 | 6 | 0.45 | 0.15 | Add |
| Warp | 60 | 4 | 0.50 | 0.10 | Overlay |

## 📁 File Structure

```
06-Layered-Terrain-Builder/
├── LayeredTerrainBuilder.jsx   # Main React component
├── demo.html                   # Standalone demo (CDN-based)
└── README.md                   # This file
```

## 🔬 Technical Details

### Hash Function (SplitMix64-style)
```javascript
const hash = (x, y, seed) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  h = ((h ^ (h >>> 16)) * 1911520717) | 0;
  return (h ^ (h >>> 13)) | 0;
};
```

### Simplex Noise Constants
- **F2** = 0.5 × (√3 - 1) ≈ 0.366
- **G2** = (3 - √3) / 6 ≈ 0.211

### fBm Parameters
- **Lacunarity**: Frequency multiplier per octave (default: 2.0)
- **Persistence**: Amplitude multiplier per octave (default: 0.5)
- **Octaves**: Number of noise layers to sum (1-10)

## 🌐 Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## 📖 Related Resources

- [Beyond Tribonacci Methodology](https://github.com/MushroomFleet/BEYOND-TRIBONACCI)
- [OpenSimplex2 Reference](https://github.com/KdotJPG/OpenSimplex2)
- [fBm Explained](https://iquilezles.org/articles/fbm/)

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{layered_terrain_builder,
  title = {Layered Terrain Builder: Noise Stack Architecture Demonstrator for Procedural Generation},
  author = {[Drift Johnson]},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/06-Layered-Terrain-Builder},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
