# 🌌 Orbital Mechanics Display

**Parent-Constrained Procedural Generation for Planetary Systems**

A React component demonstrating the **Beyond Tribonacci** methodology for infinite world generation. This component shows how stellar properties deterministically constrain and derive planetary system characteristics through pure functional computation.

[![Demo](https://img.shields.io/badge/Demo-Live%20Preview-blue?style=for-the-badge)](demo.html)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## ✨ What It Does

The Orbital Mechanics Display generates complete, scientifically-grounded planetary systems from a single seed value. It demonstrates **hierarchical constraint propagation**—the core principle that parent entity properties (stars) determine child entity properties (planets) through deterministic derivation.

### Key Concepts Demonstrated

| Concept | Implementation |
|---------|----------------|
| **Position-is-Seed** | Any seed instantly computes a complete system—no iteration required |
| **O(1) Random Access** | Jump to any system without computing predecessors |
| **Deterministic Reproducibility** | Same seed = identical output, always |
| **Constraint Propagation** | Star → Zones → Planet Types → Atmospheres |
| **Physical Plausibility** | Real astrophysical formulas drive generation |

### Generation Pipeline

```
Seed
 └── Star Generation
      ├── Spectral Class (O/B/A/F/G/K/M)
      ├── Temperature, Mass, Luminosity
      ├── Radius, Metallicity, Age
      │
      └── Zone Derivation
           ├── Frost Line: 2.7 × √L AU
           ├── Habitable Zone: √(L/1.1) to √(L/0.53) AU
           ├── Venus Zone: √(L/1.77) AU
           │
           └── Planet Generation (per orbital slot)
                ├── Orbital Radius (Titius-Bode + jitter)
                ├── Type (position-dependent)
                ├── Temperature: 278 × L^0.25 / √r
                ├── Mass & Radius
                ├── Atmosphere Retention
                └── Moon Count
```

---

## 🚀 Quick Start

### Demo Preview

Open `demo.html` in any modern browser for an instant preview—no build step required. The demo uses CDN-hosted React and Babel for zero-configuration viewing.

```bash
# Simply open in browser
open demo.html
# or
firefox demo.html
# or drag-and-drop into your browser
```

### Interactive Controls

- **System Seed**: Enter any number to generate a unique planetary system
- **Randomize**: Generate a random seed for exploration
- **View Scale**: Zoom in/out on the orbital diagram
- **Show Zones**: Toggle visibility of habitable zone, frost line, etc.
- **Animate**: Enable/disable orbital motion animation
- **Click Planets**: View detailed property cards

---

## 📦 Integration Guide

### For React Projects

1. Copy `OrbitalMechanicsDisplay.jsx` to your components directory
2. Import and use:

```jsx
import OrbitalMechanicsDisplay from './OrbitalMechanicsDisplay';

function App() {
  return <OrbitalMechanicsDisplay />;
}
```

### Dependencies

The component is self-contained with **zero external dependencies** beyond React itself:

```json
{
  "peerDependencies": {
    "react": ">=17.0.0"
  }
}
```

### Extracting Generation Functions

The hash utilities and generation functions can be extracted for use in other contexts:

```javascript
// Import just the generation logic
import { generateStar, generatePlanetarySystem, hashCoord } from './OrbitalMechanicsDisplay';

// Generate a system programmatically
const seed = 12345;
const star = generateStar(seed);
const { zones, planets } = generatePlanetarySystem(star, seed);

console.log(star);     // { spectralClass: 'K', temperature: 4521, ... }
console.log(planets);  // [{ type: 'ROCKY', orbitalRadius: 0.4, ... }, ...]
```

### Customization Points

| Property | Location | Purpose |
|----------|----------|---------|
| `SPECTRAL_CLASSES` | Line ~45 | Star type definitions and rarities |
| `PLANET_TYPES` | Line ~105 | Planet classification and styling |
| `calculateZones()` | Line ~85 | Zone boundary formulas |
| `generatePlanet()` | Line ~125 | Planet derivation logic |

### Styling

The component uses inline styles for portability. To customize:

```jsx
// Wrap with your own styling container
<div className="my-custom-theme">
  <OrbitalMechanicsDisplay />
</div>

// Or fork and modify the inline styles directly
```

---

## 🔬 Technical Details

### Hash Function

Uses **SplitMix64** for high-quality deterministic hashing:

```javascript
const splitmix64 = (seed) => {
  let z = (seed += 0x9e3779b97f4a7c15n);
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  return z ^ (z >> 31n);
};
```

### Coordinate Hashing

Spatial coordinates combine with salt values for layer independence:

```javascript
const hashCoord = (x, y, z, salt = 0n) => {
  const combined = BigInt(x) * 73856093n ^ 
                   BigInt(y) * 19349663n ^ 
                   BigInt(z) * 83492791n ^ 
                   BigInt(salt);
  return splitmix64(combined & 0xFFFFFFFFFFFFFFFFn);
};
```

### Physical Formulas

| Property | Formula | Source |
|----------|---------|--------|
| Frost Line | `2.7 × √L` AU | Ice stability threshold |
| Habitable Zone Inner | `√(L/1.1)` AU | Conservative estimate |
| Habitable Zone Outer | `√(L/0.53)` AU | Conservative estimate |
| Planet Temperature | `278 × L^0.25 / √r` K | Stefan-Boltzmann derivation |
| Escape Velocity | `11.2 × √(M/R)` km/s | Earth-referenced |
| Atmosphere Retention | `v_esc > 6 × v_thermal` | Jeans escape criterion |

---

## 📁 File Structure

```
├── OrbitalMechanicsDisplay.jsx   # Main React component
├── demo.html                      # Standalone browser demo
└── README.md                      # This file
```

---

## 🎮 Example Seeds

Try these seeds for interesting systems:

| Seed | Notable Features |
|------|------------------|
| `42` | Balanced G-type system with Earth-like candidate |
| `1984` | M-type red dwarf with compact habitable zone |
| `2001` | Multi-giant system beyond frost line |
| `7777` | High-metallicity system with many terrestrial worlds |
| `31415` | Blue giant with extreme zone distances |

---

## 🔗 Related

This component is part of the **Beyond Tribonacci** methodology for procedural generation:

- [Beyond Tribonacci: Endless Worlds Methodology](BeyondTribonacci-EndlessWorlds.md)
- [GitHub Repository](https://github.com/MushroomFleet/BEYOND-TRIBONACCI)

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{beyond_tribonacci_orbital,
  title = {Beyond Tribonacci Orbital Mechanics Display: Parent-Constrained Procedural Generation for Planetary Systems},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI},
  version = {1.0.0}
}
```

### Donate

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
