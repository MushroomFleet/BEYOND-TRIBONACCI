# 🌍 Planetary Surface Renderer

**Multi-octave terrain heightfield generation with coordinate-addressable hashing**

Part of the [Beyond Tribonacci](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) procedural generation methodology.

---

## Overview

The Planetary Surface Renderer demonstrates modern procedural terrain generation using the **position-is-seed paradigm**. Unlike sequential state-machine approaches (like Braben's Tribonacci), this implementation provides O(1) random access to any point on a planetary surface through pure coordinate hashing.

Any latitude/longitude query instantly returns terrain height without iteration, enabling massive parallelization and perfect determinism.

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Multi-Octave Noise** | Four distinct noise layers combine to create geologically plausible terrain |
| **O(1) Coordinate Access** | Query any lat/lon instantly—no sequential iteration required |
| **Perfect Determinism** | Same seed + coordinates = identical output across all sessions |
| **Real-Time Visualization** | Rotating 3D sphere with diffuse lighting and atmospheric glow |
| **Layer Breakdown** | Visual contribution analysis for each noise octave |
| **Interactive Controls** | Adjust frequencies, weights, water level, and query coordinates |

### Noise Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  COMBINED OUTPUT (weighted sum of all layers)                │
├─────────────────────────────────────────────────────────────┤
│  Domain Warping    │ 5 octaves │ Organic flow patterns       │
├─────────────────────────────────────────────────────────────┤
│  Detail Noise      │ 4 octaves │ High-frequency variation    │
├─────────────────────────────────────────────────────────────┤
│  Mountain Noise    │ 6 octaves │ Mid-frequency features      │
├─────────────────────────────────────────────────────────────┤
│  Continental Noise │ 4 octaves │ Large landmass shapes       │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Option 1: Open the Demo

Simply open `demo.html` in any modern web browser. No build step required.

```bash
# Clone the repository
git clone https://github.com/MushroomFleet/BEYOND-TRIBONACCI.git
cd BEYOND-TRIBONACCI

# Open the demo
open demo.html
# or on Linux:
xdg-open demo.html
# or on Windows:
start demo.html
```

The demo loads React from CDN and runs entirely client-side.

### Option 2: Import the Component

For integration into existing React projects, use the JSX component directly.

```bash
# Copy the component to your project
cp PlanetarySurfaceRenderer.jsx your-project/src/components/
```

## 📦 Integration Guide

### Prerequisites

- React 18+
- No additional dependencies required

### Basic Usage

```jsx
import PlanetarySurfaceRenderer from './PlanetarySurfaceRenderer';

function App() {
  return (
    <div>
      <PlanetarySurfaceRenderer />
    </div>
  );
}
```

### Using the Terrain Functions Directly

The component exports pure functions for terrain generation that can be used independently:

```jsx
// Import the terrain generation utilities
import { getTerrainHeight, getTerrainComponents } from './PlanetarySurfaceRenderer';

// Define parameters
const params = {
  seed: 42,
  continentalScale: 2,
  mountainScale: 8,
  detailScale: 32,
  warpStrength: 0.5,
  continentalWeight: 0.5,
  mountainWeight: 0.3,
  detailWeight: 0.1,
  warpWeight: 0.1
};

// Query terrain at specific coordinates
const latitude = 45.0;   // degrees
const longitude = -122.0; // degrees

const { height, components } = getTerrainHeight(latitude, longitude, params);

console.log(`Height at (${latitude}, ${longitude}): ${height}`);
console.log('Component contributions:', components);
// {
//   continental: 0.234,
//   mountains: 0.156,
//   detail: 0.089,
//   warped: 0.112
// }
```

### Customizing Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `seed` | 42 | Any integer | Universe seed for determinism |
| `continentalScale` | 2 | 0.5 - 8 | Frequency of continental features |
| `mountainScale` | 8 | 2 - 24 | Frequency of mountain features |
| `detailScale` | 32 | 8 - 64 | Frequency of fine detail |
| `warpStrength` | 0.5 | 0 - 1 | Domain warping intensity |
| `continentalWeight` | 0.5 | 0 - 1 | Continental layer contribution |
| `mountainWeight` | 0.3 | 0 - 1 | Mountain layer contribution |
| `detailWeight` | 0.1 | 0 - 1 | Detail layer contribution |
| `warpWeight` | 0.1 | 0 - 1 | Warped layer contribution |
| `waterLevel` | 0 | -0.5 - 0.5 | Sea level threshold |

### Terrain Color Mapping

The default color map creates Earth-like terrain:

| Height Range | Color | Terrain Type |
|--------------|-------|--------------|
| < waterLevel - 0.3 | Deep Blue | Deep Ocean |
| < waterLevel - 0.1 | Blue | Ocean |
| < waterLevel | Light Blue | Shallow Water |
| < waterLevel + 0.05 | Tan | Beach |
| < 0.2 | Light Green | Lowland |
| < 0.4 | Green | Forest |
| < 0.6 | Brown | Highland |
| < 0.8 | Gray | Mountain |
| ≥ 0.8 | White | Snow Peak |

## 🔧 Technical Details

### Algorithm: Simplex Noise with fBm

The renderer uses **3D Simplex Noise** (superior to Perlin noise) combined with **fractal Brownian motion (fBm)** for multi-octave detail:

```
Simplex Noise Advantages:
├── O(n²) complexity vs O(2^n) for Perlin
├── C² gradient continuity (smoother than Perlin's C¹)
├── No visible grid artifacts
└── Pure math—no texture lookups required
```

### Hash Function: SplitMix64

Coordinates are hashed using **SplitMix64**, a bijective function ensuring every input maps to a unique output with excellent statistical distribution.

```javascript
const splitmix64 = (seed) => {
  let z = (seed += 0x9e3779b97f4a7c15n);
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  return z ^ (z >> 31n);
};
```

### Coordinate Transformation

Latitude/longitude are converted to 3D unit sphere coordinates for seamless spherical noise sampling:

```javascript
const latLonTo3D = (lat, lon) => {
  const theta = lat * Math.PI / 180;
  const phi = lon * Math.PI / 180;
  return {
    x: Math.cos(theta) * Math.cos(phi),
    y: Math.cos(theta) * Math.sin(phi),
    z: Math.sin(theta)
  };
};
```

## 📁 File Structure

```
BEYOND-TRIBONACCI/
├── demo.html                      # Standalone demo (open in browser)
├── PlanetarySurfaceRenderer.jsx   # React component (for integration)
├── README.md                      # This documentation
└── BeyondTribonacci-EndlessWorlds.md  # Full methodology paper
```

## 🎮 Demo Controls

| Control | Function |
|---------|----------|
| **ROTATING/PAUSED** | Toggle planet rotation |
| **Planet Seed** | Enter or randomize the seed value |
| **Noise Frequencies** | Adjust scale of each noise layer |
| **Layer Weights** | Control contribution of each layer |
| **Water Level** | Raise/lower sea level |
| **Coordinate Query** | Input lat/lon and query instant height |

## 🌐 Browser Compatibility

Tested and working in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires JavaScript BigInt support (all modern browsers).

## 📖 Related Reading

This component implements concepts from the **Beyond Tribonacci** methodology paper, which compares modern hash-based procedural generation with Braben's classic Tribonacci approach used in Elite (1984).

Key concepts demonstrated:
- Position-is-seed paradigm
- Coordinate-addressable hash functions
- Multi-octave coherent noise stacking
- Domain warping for organic patterns
- Hierarchical constraint propagation

## License

MIT License - See LICENSE file for details.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{beyond_tribonacci_planetary_renderer,
  title = {Beyond Tribonacci: Planetary Surface Renderer - Multi-octave terrain heightfield generation with coordinate-addressable hashing},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI},
  version = {1.0.0}
}
```

### Donate

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
