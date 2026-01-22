# 🌌 Seamless Zoom Navigator

**Multi-scale procedural universe navigation using the position-is-seed paradigm**

[![Demo](https://img.shields.io/badge/Demo-Live%20Preview-7f5af0?style=for-the-badge)](./demo.html)
[![React](https://img.shields.io/badge/React-18+-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-2cb67d?style=for-the-badge)](./LICENSE)

---

## 🎯 Overview

The **Seamless Zoom Navigator** is a React component demonstrating continuous multi-scale navigation through procedurally generated space—from the Observable Universe (10²⁶ meters) down to microscopic detail (10⁻³ meters)—without level-of-detail discontinuities.

This implementation is part of the [Beyond Tribonacci](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) methodology, replacing sequential state mutation with **coordinate-addressable hash functions** for O(1) access to any point in infinite space.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| **18 Scale Levels** | Observable Universe → Microscopic, each with unique visual treatment |
| **Zero LOD Popping** | Smooth transitions between all zoom levels |
| **Deterministic Generation** | Same seed + coordinates = identical output across sessions |
| **Feature Persistence** | Track which features remain visible across zoom levels |
| **Pure-Functional Math** | All noise functions are stateless with no external dependencies |
| **60fps Rendering** | requestAnimationFrame-based smooth rendering |

---

## 🚀 Quick Preview

Open **`demo.html`** directly in your browser for an instant preview—no build step required!

```bash
# Simply open in your default browser
open demo.html

# Or serve locally
npx serve .
```

### Controls

| Action | Input |
|--------|-------|
| **Zoom** | Mouse scroll wheel or vertical slider |
| **Pan** | Click and drag |
| **Random Universe** | Click 🎲 button |
| **Auto Demo** | Toggle "Auto Zoom" checkbox |

---

## 📦 Installation

### Option 1: Direct Copy

Copy `SeamlessZoomNavigator.jsx` into your React project:

```bash
cp SeamlessZoomNavigator.jsx src/components/
```

### Option 2: Download from GitHub

```bash
curl -O https://raw.githubusercontent.com/MushroomFleet/BEYOND-TRIBONACCI/main/SeamlessZoomNavigator.jsx
```

---

## 🔧 Integration Guide

### Basic Usage

```jsx
import SeamlessZoomNavigator from './SeamlessZoomNavigator';

function App() {
  return <SeamlessZoomNavigator />;
}

export default App;
```

### With Custom Initial State

The component manages its own state, but you can fork and modify the initial values:

```jsx
// Inside SeamlessZoomNavigator.jsx, modify these defaults:
const [seed, setSeed] = useState(42);           // Universe seed
const [zoom, setZoom] = useState(0);            // Initial zoom level (0-60)
const [centerX, setCenterX] = useState(0);      // Initial X position
const [centerY, setCenterY] = useState(0);      // Initial Y position
```

### Extracting the Noise Functions

The component includes pure-functional implementations of:

```javascript
// SplitMix64-style coordinate hash
hash(x, y, z, seed) → [0, 1)

// Independent layers with different salts
layeredHash(x, y, z, layer, seed) → [0, 1)

// Gradient noise (Perlin-style)
gradientNoise(x, y, seed) → [0, 1)

// Fractal Brownian Motion
fbm(x, y, octaves, persistence, lacunarity, seed) → [0, 1)

// Domain-warped noise for organic patterns
warpedNoise(x, y, seed, warpStrength) → [0, 1)
```

These can be extracted and used independently in your own procedural generation systems.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SeamlessZoomNavigator                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Pure Math  │  │   Feature   │  │    Background       │ │
│  │  Utilities  │→ │  Generator  │→ │    Renderer         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │                │                    │             │
│         ▼                ▼                    ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Canvas Render Loop (60fps)              │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           React UI Controls & State                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Position-is-Seed Paradigm

Every point computes its properties through pure functions:

```javascript
properties(x, y, z) = hash(x, y, z, layer_salt)
```

No iteration. No state machine. Perfect determinism.

---

## 🎨 Scale Definitions

| Scale | Range | Visual Theme |
|-------|-------|--------------|
| Observable Universe | 10²⁶ m | Deep violet cosmic web |
| Galaxy Supercluster | 10²⁴ m | Dark blue void structure |
| Galaxy Cluster | 10²³ m | Purple-gray gravitational clusters |
| Galaxy | 10²¹ m | Navy spiral arms |
| Spiral Arm | 10¹⁹ m | Blue-gray stellar streams |
| Star Cluster | 10¹⁷ m | Teal stellar nurseries |
| Stellar Neighborhood | 10¹⁵ m | Orange local stars |
| Planetary System | 10¹³ m | Red-orange orbital mechanics |
| Planetary Orbit | 10¹¹ m | Pink orbital paths |
| Planet | 10⁷ m | Green terrestrial view |
| Continent | 10⁶ m | Teal landmasses |
| Region | 10⁵ m | Blue geographic features |
| Local Area | 10⁴ m | Cyan terrain overview |
| Terrain | 10³ m | Green landscape |
| Surface Detail | 10² m | Red surface features |
| Rock/Object | 10¹ m | Gold material detail |
| Grain | 10⁰ m | Orange fine detail |
| Microscopic | 10⁻³ m | Light blue micro-structure |

---

## ⚡ Performance Notes

- **Rendering**: Uses `requestAnimationFrame` for smooth 60fps updates
- **Memory**: Zero storage—all content regenerated on-demand from coordinates
- **Complexity**: O(1) access to any coordinate (no sequential iteration)
- **Parallelization**: Pure functions enable future GPU/Web Worker offloading

---

## 🗂️ File Structure

```
BEYOND-TRIBONACCI/
├── SeamlessZoomNavigator.jsx   # Main React component (ES modules)
├── demo.html                   # Standalone demo (no build required)
├── README.md                   # This file
└── BeyondTribonacci-EndlessWorlds.md  # Methodology documentation
```

---

## 🔬 Technical Details

### Hash Function

Uses a SplitMix64-style bijective hash for excellent distribution:

```javascript
const hash = (x, y, z, seed = 0) => {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + seed * 1911520717) >>> 0;
  h = ((h ^ (h >>> 15)) * 2246822519) >>> 0;
  h = ((h ^ (h >>> 13)) * 3266489917) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
```

### Feature Persistence

Features use a persistence score derived from their coordinate hash. Higher scores remain visible across more zoom levels, creating visual continuity:

```javascript
const persistenceScore = persistenceHash * 100;
const isPersistent = persistenceScore > (100 - zoom);
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{beyond_tribonacci,
  title = {Beyond Tribonacci: Seamless Zoom Navigator for Multi-Scale Procedural Generation},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI},
  version = {1.0.0}
}
```

### Donate

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
