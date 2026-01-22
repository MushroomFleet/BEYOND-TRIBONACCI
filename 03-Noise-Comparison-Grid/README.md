# 03 - Noise Comparison Grid

> **Part of the [Beyond Tribonacci](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) series**: A Contemporary Methodology for Endless World Generation

An interactive React component demonstrating the superiority of **Simplex noise** over white noise and classic Perlin noise for procedural generation. Features a three-panel side-by-side comparison with real-time artifact highlighting.

![Noise Comparison](https://img.shields.io/badge/Demo-03--Noise--Comparison--Grid-blue)
![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎯 Purpose

This demonstration visualizes why modern procedural generation systems prefer Simplex noise (2001) over the legacy Perlin noise algorithm (1985). The key insight: **Perlin noise exhibits visible axis-aligned artifacts** due to its square grid interpolation, while Simplex noise uses a triangular simplex grid that produces smooth, artifact-free results.

### What You'll See

| Panel | Noise Type | Key Characteristics |
|-------|------------|---------------------|
| **Left** | White Noise | Pure random hash, no spatial correlation, O(1) complexity |
| **Center** | Perlin Noise | Classic gradient noise with **visible axis artifacts** (highlighted in red) |
| **Right** | Simplex Noise | Modern gradient noise, artifact-free, optimal for procedural generation |

## 🚀 Quick Preview

**Open `demo.html` in any modern browser** — no build step required!

The demo uses CDN-hosted React and Babel for instant preview:

```
03-Noise-Comparison-Grid/
├── demo.html              ← Open this for instant preview
├── NoiseComparisonGrid.jsx  ← Component source for integration
└── README.md
```

Simply double-click `demo.html` or serve it locally:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Then open http://localhost:8000/demo.html
```

## ✨ Features

### Interactive Controls

- **Seed Value (0-999)**: Adjust the deterministic seed to explore different noise patterns
- **Resolution (64-512px)**: Control render resolution for performance vs. quality tradeoff
- **Color Modes**: Grayscale, Terrain (elevation map), or Plasma visualization
- **Artifact Highlighting**: Toggle red overlay showing axis-aligned patterns in Perlin noise
- **Animation**: Auto-animate through seed values to see noise evolution

### Technical Highlights

- **Pure-functional generation**: All noise is computed from pure functions of coordinates
- **Deterministic output**: Same seed + coordinates = identical results across sessions
- **O(1) access**: Any coordinate can be queried directly without iteration
- **Real-time rendering**: Uses `requestAnimationFrame` for smooth 60fps animation
- **Artifact detection**: Gradient analysis algorithm highlights Perlin's axis alignment

## 📦 Integration Guide

### Installation

Copy `NoiseComparisonGrid.jsx` into your React project:

```bash
# In your React project
cp NoiseComparisonGrid.jsx src/components/
```

### Basic Usage

```jsx
import NoiseComparisonGrid from './components/NoiseComparisonGrid';

function App() {
  return (
    <div className="app">
      <NoiseComparisonGrid />
    </div>
  );
}

export default App;
```

### Using Individual Noise Functions

The component exports reusable noise functions you can extract for your own procedural generation:

```jsx
// Extract from component or copy these implementations

// White Noise - Pure random, O(1)
const whiteNoise = (x, y, seed) => {
  return hash(Math.floor(x * 50), Math.floor(y * 50), seed) * 2 - 1;
};

// Perlin Noise - Classic gradient noise (has artifacts)
const perlinNoise = (x, y, seed) => {
  // ... implementation in component
};

// Simplex Noise - Modern, artifact-free (RECOMMENDED)
const simplexNoise = (x, y, seed) => {
  // ... implementation in component
};

// Usage: returns value in range [-1, 1]
const heightmap = simplexNoise(x / 100, y / 100, 42);
```

### Dependencies

The component is self-contained with **zero external dependencies** beyond React:

```json
{
  "peerDependencies": {
    "react": ">=16.8.0"
  }
}
```

### Customization Props

While the current implementation is self-contained, you can easily modify state defaults:

```jsx
// In NoiseComparisonGrid.jsx, modify initial state:
const [seed, setSeed] = useState(42);           // Default seed
const [resolution, setResolution] = useState(256); // Default resolution
const [colorMode, setColorMode] = useState('grayscale'); // Default color mode
```

## 🔬 Technical Comparison

| Property | White Noise | Perlin (1985) | Simplex (2001) |
|----------|-------------|---------------|----------------|
| **Spatial Coherence** | ✗ None | ◐ Moderate | ✓ Excellent |
| **Axis Artifacts** | N/A | ✗ Visible | ✓ Minimal |
| **Complexity (nD)** | O(1) | O(2ⁿ) | O(n²) |
| **Gradient Continuity** | None | C¹ | C² |
| **GPU Efficiency** | ✓ Excellent | ◐ Moderate | ✓ Excellent |

### Why Simplex Wins

1. **Triangular Grid**: Uses simplexes (triangles in 2D, tetrahedra in 3D) instead of hypercubes
2. **Fewer Vertices**: Evaluates fewer gradient contributions per sample
3. **No Axis Alignment**: Gradients are evenly distributed, eliminating directional bias
4. **Better Scaling**: O(n²) vs O(2ⁿ) means Simplex excels in higher dimensions

## 📁 Project Structure

```
03-Noise-Comparison-Grid/
├── demo.html                 # Standalone demo (CDN dependencies)
├── NoiseComparisonGrid.jsx   # React component source
├── README.md                 # This documentation
└── assets/                   # (Optional) Screenshots, diagrams
```

## 🔗 Related Demos

This is **Demo 03** in the Beyond Tribonacci series:

- 01 - Hash Visualization
- 02 - Coordinate-Based Generation
- **03 - Noise Comparison Grid** ← You are here
- 04 - Fractal Brownian Motion
- 05 - Domain Warping
- ...

## 🛠️ Browser Compatibility

| Browser | Supported |
|---------|-----------|
| Chrome 80+ | ✓ |
| Firefox 75+ | ✓ |
| Safari 13.1+ | ✓ |
| Edge 80+ | ✓ |

Requires Canvas 2D API and ES6+ JavaScript support.

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{noise_comparison_grid,
  title = {Noise Comparison Grid: Interactive Simplex vs Perlin Visualization},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/03-Noise-Comparison-Grid},
  version = {1.0.0}
}
```

### Donate

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
