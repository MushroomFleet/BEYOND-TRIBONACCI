# 🌟 Stellar Forge Simulator

A React component demonstrating **position-is-seed procedural star generation** with physically accurate property derivation chains. Part of the "Beyond Tribonacci" methodology for endless world generation.

![Stellar Forge Banner](https://img.shields.io/badge/Procedural-Star_Generation-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## ✨ Features

- **Position-is-Seed Paradigm**: Any coordinate instantly computes its star properties — no iteration, no state
- **Physical Derivation Chain**: Visualizes the complete property cascade:
  - Coordinates → Hash Seed
  - Seed → Mass (via Salpeter IMF)
  - Mass → Luminosity (Mass-Luminosity relation)
  - Mass → Radius (Mass-Radius relation)  
  - L + R → Temperature (Stefan-Boltzmann)
  - Temperature → Spectral Class (OBAFGKM)
- **Animated Star Visualization**: Canvas-based rendering with corona effects, surface turbulence, and lens flares
- **Spectral Classification Bar**: Visual OBAFGKM spectrum with temperature ranges
- **Deterministic**: Same coordinates + universe seed = identical star, always
- **Interactive Controls**: Adjust coordinates, randomize, or explore via animated traversal

## 🚀 Quick Preview

Open `demo.html` directly in your browser for an instant preview — no build step required!

```bash
# Clone the repository
git clone https://github.com/MushroomFleet/BEYOND-TRIBONACCI.git

# Open the demo
open demo.html
# or on Linux
xdg-open demo.html
# or on Windows
start demo.html
```

The demo uses CDN-hosted React and Babel for zero-config operation.

## 📦 Installation

### Option 1: Direct Import (ES Modules)

```bash
npm install stellar-forge-simulator
# or
yarn add stellar-forge-simulator
```

```jsx
import StellarForgeSimulator from 'stellar-forge-simulator';

function App() {
  return <StellarForgeSimulator />;
}
```

### Option 2: Copy Component

Copy `StellarForgeSimulator.jsx` directly into your project:

```
your-project/
├── src/
│   └── components/
│       └── StellarForgeSimulator.jsx  ← Copy here
```

```jsx
import StellarForgeSimulator from './components/StellarForgeSimulator';
```

## 🔧 Integration Guide

### Basic Usage

```jsx
import React from 'react';
import StellarForgeSimulator from './StellarForgeSimulator';

export default function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <StellarForgeSimulator />
    </div>
  );
}
```

### Using the Core Generation Function

The star generation logic is pure-functional and can be used independently:

```jsx
import { generateStar } from './StellarForgeSimulator';

// Generate a star at coordinates (100, 50, 0) with universe seed 42
const star = generateStar(100, 50, 0, 42);

console.log(star.fullClass);      // e.g., "G2V" (Sun-like)
console.log(star.temperature);    // e.g., 5778 (Kelvin)
console.log(star.mass);           // Solar masses
console.log(star.luminosity);     // Solar luminosities
console.log(star.hzInner);        // Habitable zone inner edge (AU)
console.log(star.hzOuter);        // Habitable zone outer edge (AU)
```

### Star Object Properties

| Property | Type | Description |
|----------|------|-------------|
| `seed` | `number` | Deterministic hash from coordinates |
| `coords` | `{x, y, z}` | Input coordinates |
| `mass` | `number` | Stellar mass in solar masses (M☉) |
| `luminosity` | `number` | Luminosity in solar luminosities (L☉) |
| `radius` | `number` | Radius in solar radii (R☉) |
| `temperature` | `number` | Surface temperature in Kelvin |
| `spectralClass` | `string` | Single letter: O, B, A, F, G, K, or M |
| `spectralSubclass` | `number` | 0-9 subdivision within class |
| `fullClass` | `string` | Complete classification (e.g., "G2V") |
| `spectralData` | `object` | Color, glow, description, rarity |
| `age` | `number` | Estimated age in billions of years |
| `metallicity` | `number` | [Fe/H] in dex |
| `absoluteMagnitude` | `number` | Intrinsic brightness |
| `hzInner` | `number` | Habitable zone inner edge (AU) |
| `hzOuter` | `number` | Habitable zone outer edge (AU) |

### Customizing the Hash Function

The coordinate hash can be swapped for different distribution characteristics:

```jsx
// Custom hash for your universe
const customCoordHash = (x, y, z, salt = 0) => {
  // Your implementation here
  // Must return a 32-bit unsigned integer
};
```

### Styling

The component uses inline styles with a dark cosmic theme. Override by wrapping:

```jsx
<div style={{ 
  '--stellar-bg': '#000',
  '--stellar-accent': '#ff6600' 
}}>
  <StellarForgeSimulator />
</div>
```

## 🔬 Physical Models

### Mass Distribution (Salpeter IMF)
Stars are generated following the Initial Mass Function:
```
N(M) ∝ M^(-2.35)
```
This produces realistic distributions with many more red dwarfs than blue giants.

### Mass-Luminosity Relation
```
M < 0.43 M☉:  L = M^2.3
M < 2 M☉:    L = M^4.0  
M < 55 M☉:   L = 1.4 × M^3.5
M ≥ 55 M☉:   L = 32000 × M
```

### Temperature Derivation (Stefan-Boltzmann)
```
T = T☉ × L^0.25 / R^0.5
```
Where T☉ = 5778 K (solar effective temperature).

### Spectral Classification

| Class | Temperature Range | Color | Abundance |
|-------|-------------------|-------|-----------|
| O | 30,000 - 52,000 K | Blue | 0.00003% |
| B | 10,000 - 30,000 K | Blue-White | 0.13% |
| A | 7,500 - 10,000 K | White | 0.6% |
| F | 6,000 - 7,500 K | Yellow-White | 3% |
| G | 5,200 - 6,000 K | Yellow | 7.6% |
| K | 3,700 - 5,200 K | Orange | 12.1% |
| M | 2,400 - 3,700 K | Red | 76.5% |

## 🎮 Controls

| Control | Action |
|---------|--------|
| X, Y, Z inputs | Set exact galactic coordinates |
| UNIVERSE input | Change universe seed for alternate realities |
| RANDOM button | Jump to random coordinates |
| EXPLORE button | Animated traversal through space |

## 📁 File Structure

```
stellar-forge-simulator/
├── StellarForgeSimulator.jsx   # Main React component
├── demo.html                   # Standalone demo (no build required)
└── README.md                   # This file
```

## 🧪 Dependencies

**Production:**
- React 18+

**Demo only (CDN-loaded):**
- React 18.2.0
- ReactDOM 18.2.0
- Babel Standalone 7.23.5

## 📖 Based On

This component implements concepts from **"Beyond Tribonacci: A Contemporary Methodology for Endless World Generation"**, which describes:

- Position-is-seed paradigm replacing sequential state machines
- Hash-first architecture for O(1) random access
- Hierarchical constraint propagation for physical plausibility
- Multi-layer noise composition for spatial coherence

The methodology enables generating infinite, deterministic universes where any coordinate instantly materializes its contents through pure functions of spatial position.

## 🤝 Contributing

Contributions welcome! Areas of interest:

- Additional stellar evolution stages (giants, white dwarfs, neutron stars)
- Binary/multiple star systems
- Planetary system generation integration
- WebGL/Three.js visualization upgrades
- Performance optimizations for bulk generation

## 📄 License

MIT License - see LICENSE file for details.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{stellar_forge_simulator,
  title = {Stellar Forge Simulator: Position-is-Seed Procedural Star Generation},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
