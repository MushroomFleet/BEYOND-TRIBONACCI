# ⚡ Throughput Benchmark Viz

**Live hash function performance visualization comparing modern coordinate-addressable hashing vs legacy sequential generation.**

Part of the [Beyond Tribonacci](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) methodology for endless world generation.

![Demo Preview](https://img.shields.io/badge/demo-live-00FFAA?style=for-the-badge) ![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react) ![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

---

## 🎯 What It Does

This component provides a **real-time animated bar race** comparing the throughput of four hash function implementations:

| Algorithm | Type | Access Pattern | Use Case |
|-----------|------|----------------|----------|
| **xxHash3** | Coordinate Hash | O(1) random | CPU generation, excellent quality |
| **PCG** | Permuted Congruential | O(1) random | GPU-optimized, branch-free |
| **MurmurHash3** | Coordinate Hash | O(1) random | Classic, good distribution |
| **Tribonacci** | Sequential LFSR | O(n) sequential | 1984 Elite method |

The visualization demonstrates the core insight of position-is-seed procedural generation: **modern hash functions enable instant random access to any coordinate**, while Tribonacci's sequential state mutation requires iterating through all previous states.

### Features

- 🏁 **Live bar race** with animated progress bars and glow effects
- 📊 **Real-time counters** showing operations/second for each function
- ⚙️ **Adjustable batch size** (1K-100K operations per frame)
- 📈 **Summary statistics**: total ops, leader, speed ratio, status
- 🔍 **Toggle details**: theoretical peaks, last hash samples, percentage shares
- 🎨 **Cyberpunk terminal aesthetic** with scanline overlay

---

## 🚀 Quick Preview

Open **`demo.html`** directly in your browser for an instant preview. No build step required.

```bash
# Clone and open
git clone https://github.com/MushroomFleet/BEYOND-TRIBONACCI.git
cd BEYOND-TRIBONACCI
open demo.html  # macOS
# or
xdg-open demo.html  # Linux
# or just double-click demo.html on Windows
```

The demo uses CDN-hosted React 18 and Babel for zero-configuration JSX transformation.

---

## 📦 Integration Guide

### Option 1: Standalone HTML (Quickest)

Use `demo.html` as-is. It's self-contained with all dependencies loaded from CDN:

- React 18 from `cdnjs.cloudflare.com`
- Babel Standalone for JSX transformation
- JetBrains Mono font from Google Fonts

### Option 2: React Project Integration

Copy `ThroughputBenchmarkViz.jsx` into your React project:

```bash
cp ThroughputBenchmarkViz.jsx your-project/src/components/
```

Import and use:

```jsx
import ThroughputBenchmarkViz from './components/ThroughputBenchmarkViz';

function App() {
  return (
    <div>
      <ThroughputBenchmarkViz />
    </div>
  );
}
```

### Option 3: Build for Production

For production use, compile the JSX:

```bash
# Using Vite
npm create vite@latest throughput-viz -- --template react
cd throughput-viz
cp ../ThroughputBenchmarkViz.jsx src/
npm install
npm run build
```

---

## 🔧 Customization

### Adding Custom Hash Functions

Edit the `HASH_FUNCTIONS` array in the component:

```javascript
const HASH_FUNCTIONS = [
  {
    id: 'custom',
    name: 'My Hash',
    fn: (seed) => { /* your implementation */ },
    color: '#9B59B6',
    glowColor: 'rgba(155, 89, 182, 0.6)',
    description: 'Custom implementation',
    theoreticalPeak: '??? GB/s',
  },
  // ... existing functions
];
```

### Adjusting Performance

The `batchSize` prop controls operations per animation frame:

- **Lower (1K-5K)**: Smoother animation, lower throughput numbers
- **Higher (50K-100K)**: More accurate throughput, may cause frame drops

### Styling

All styles are inline for portability. Key color variables:

```javascript
const colors = {
  xxHash: '#00FFAA',    // Cyan-green
  pcg: '#00AAFF',       // Blue
  murmur: '#FF6B00',    // Orange
  tribonacci: '#FF0066', // Magenta
  background: '#0a0a12', // Dark navy
};
```

---

## 📁 File Structure

```
.
├── demo.html                    # Standalone demo (open in browser)
├── ThroughputBenchmarkViz.jsx   # React component (import into projects)
├── README.md                    # This file
└── BeyondTribonacci-EndlessWorlds.md  # Full methodology document
```

---

## 🧠 The Position-is-Seed Paradigm

Traditional procedural generation (Tribonacci, LFSR) uses **sequential state mutation**:

```
state[n] = f(state[n-1], state[n-2], state[n-3])
```

This creates a dependency chain where reaching position N requires computing positions 0 through N-1.

The **position-is-seed** approach uses **coordinate hashing**:

```
properties(x, y, z) = hash(x, y, z, salt)
```

Any coordinate computes its properties instantly. No iteration. Perfect parallelization. This is why xxHash3 and PCG dominate in the benchmark—they're designed for this access pattern.

### Performance Implications

| Metric | Sequential (Tribonacci) | Coordinate (xxHash3) |
|--------|------------------------|----------------------|
| Random access | O(n) | O(1) |
| GPU parallelization | ❌ Impossible | ✅ Trivial |
| Memory footprint | State machine | Zero (pure function) |
| Multi-scale LOD | ❌ Full recompute | ✅ Independent layers |

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{beyond_tribonacci,
  title = {Beyond Tribonacci: A Contemporary Methodology for Endless World Generation},
  author = {[Drift Johnson]},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
