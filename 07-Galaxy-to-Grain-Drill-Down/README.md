# 🌌 Galaxy-to-Grain Drill-Down

**Hierarchical Constraint Propagation Across Cosmic Scales**

Part of the [Beyond Tribonacci: A Contemporary Methodology for Endless World Generation](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) series.

---

## Overview

This interactive demonstration showcases **hierarchical constraint propagation** - a core principle of modern procedural generation where each level of detail inherits and constrains properties from its parent. Starting from a galaxy-wide view, users can drill down through five distinct scales, watching how constraints flow from cosmic structures down to individual terrain biomes.

The implementation follows the **position-is-seed paradigm**: every property at every scale is deterministically derived from spatial coordinates through pure hash functions. No stored state. No iteration. Same seed + coordinates = identical output across sessions.

---

## 🚀 Quick Start

### Live Demo

Open `demo.html` in any modern browser - no build step required. The demo uses CDN-hosted React and Babel for instant preview.

```bash
# Simply open in browser
open demo.html
# or
firefox demo.html
```

### What You'll See

| Level | View | Constraints Inherited |
|-------|------|----------------------|
| **1. Galaxy** | 5×5 grid of galactic regions | Universe seed |
| **2. Region** | Star clusters within region | Density, metallicity, age, nebula density |
| **3. Cluster** | Individual stars | Local density, cluster age, star bias |
| **4. Star** | Planetary system with HZ/frost line | Habitable zone bounds, frost line, stellar mass/luminosity |
| **5. Planet** | Animated terrain heightmap | Temperature, composition, atmosphere, biome constraints |

---

## 🔬 Key Concepts Demonstrated

### Constraint Propagation

```
Galaxy Properties (seed 42)
    ├─ Region (-1, 0): density=0.72, metallicity=0.023, age=8.3 Gyr
    │   └─ Cluster 3: inherits + localDensity=0.89, clusterAge=7.1 Gyr
    │       └─ Star (G-class): inherits + hzInner=0.95 AU, hzOuter=1.37 AU
    │           └─ Planet 2 (Earthlike): inherits + temp=287K, inHabitableZone=true
    │               └─ Terrain (0.5, 0.5): inherits + biome=forest, elevation=0.34
```

Each child entity inherits **all** parent constraints and may add or modify properties based on its position within the parent's space.

### Position-is-Seed Architecture

```javascript
// Pure deterministic generation - no stored state
const hashCoord = (x, y, salt, seed) => {
  const combined = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791) ^ seed;
  return splitmix64(Math.abs(combined));
};

// Same coordinates always produce identical results
generateTerrain(0.5, 0.5, planet)  // → Always returns same biome
```

### Astrophysical Constraints

The demo implements simplified but physically-motivated constraints:

- **Stellar Classification**: O/B/A/F/G/K/M classes with realistic rarity distributions
- **Habitable Zones**: `HZ = √(L/flux)` where L is stellar luminosity
- **Frost Lines**: `FL = 2.7 × √L` - determines gas giant formation region
- **Titius-Bode Spacing**: `orbit = 0.4 + 0.3 × 2^n` AU with jitter
- **Atmospheric Retention**: Escape velocity vs thermal velocity calculation

---

## 💻 Integration Guide

### Option 1: Standalone JSX Component

Copy `GalaxyToGrain.jsx` into your React project:

```bash
cp GalaxyToGrain.jsx src/components/
```

```jsx
import GalaxyToGrain from './components/GalaxyToGrain';

function App() {
  return <GalaxyToGrain />;
}
```

**Requirements:**
- React 18+
- No external dependencies (all math utilities are self-contained)

### Option 2: Extract Generation Functions

The generation logic is pure-functional and framework-agnostic. Extract for use anywhere:

```javascript
// Core hash functions
import { hashCoord, hashToRange, splitmix64 } from './GalaxyToGrain';

// Noise functions
import { simplex2D, fbm } from './GalaxyToGrain';

// Generation functions (pure, no side effects)
import { 
  generateGalaxyRegion,
  generateStarCluster,
  generateStar,
  generatePlanet,
  generateTerrain 
} from './GalaxyToGrain';

// Generate any entity from coordinates alone
const region = generateGalaxyRegion(0, 0, 42);
const cluster = generateStarCluster(0, region);
const star = generateStar(0, cluster);
const planet = generatePlanet(0, star);
const terrain = generateTerrain(0.5, 0.5, planet);
```

### Option 3: Embed in HTML

Use the `demo.html` structure with CDN-hosted dependencies:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>

<script type="text/babel">
  // Paste component code here
</script>
```

---

## 🎮 Interactive Features

| Control | Function |
|---------|----------|
| **Universe Seed** | Change seed to generate entirely different universe |
| **Click Elements** | Drill down to next detail level |
| **Zoom Out Button** | Return to parent level |
| **Show Constraints** | Toggle constraint panel visibility |

### Visual Indicators

- 🟢 **Green dashed ring**: Habitable zone boundary
- 🔵 **Blue dashed ring**: Frost line (ice/gas giant formation)
- ✨ **Star glow intensity**: Proportional to luminosity
- 🌍 **Planet border**: Green border = in habitable zone
- 🚫 **Gas giants**: Cannot drill into (no solid surface)

---

## 📁 File Structure

```
07-Galaxy-to-Grain-Drill-Down/
├── README.md              # This file
├── demo.html              # Standalone demo (CDN dependencies)
├── GalaxyToGrain.jsx      # React component (for integration)
└── LICENSE                # MIT License
```

---

## 🧪 Technical Details

### Hash Functions Used

| Function | Purpose |
|----------|---------|
| `splitmix64` | Primary PRNG, bijective mapping |
| `hashCoord` | Spatial coordinate hashing with salt |
| `simplex2D` | Coherent 2D noise for spatial variation |
| `fbm` | Fractal Brownian Motion for multi-scale features |

### Performance Characteristics

- **O(1) Access**: Any coordinate computed directly, no iteration
- **Memory**: Zero storage (pure functions of coordinates)
- **Determinism**: Guaranteed identical output for same inputs
- **Parallelizable**: No sequential dependencies

### Constraint Categories (Color-Coded in UI)

- 🟢 **Green**: Habitable zone related
- 🟡 **Yellow**: Stellar properties
- 🔵 **Blue**: Planetary/local properties
- ⚪ **Gray**: General inherited constraints

---

## 🔗 Related Demos

This is Demo #7 in the Beyond Tribonacci series:

1. Infinite 1D Terrain
2. Chunk-Based 2D Terrain
3. Biome Distribution
4. Cave System Generation
5. City Layout Generation
6. Star System Generation
7. **Galaxy-to-Grain Drill-Down** ← You are here
8. Multi-Scale Coherent Noise
9. Procedural Texture Synthesis
10. Complete World Generator

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{galaxy_to_grain_drilldown,
  title = {Galaxy-to-Grain Drill-Down: Hierarchical Constraint Propagation Demo},
  author = {[Drift Johnson]},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/07-Galaxy-to-Grain-Drill-Down},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
