# ⚡ Instant Coordinate Jumper

**O(1) Random Access to Infinite Procedural Space**

Part of the [Beyond Tribonacci](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) methodology for modern procedural world generation.

---

## Overview

The Instant Coordinate Jumper is an interactive demonstration of the **position-is-seed paradigm** — a fundamental shift from sequential state machines (like Braben's Tribonacci) to pure coordinate-addressable hash functions.

**The core insight:** Position itself should be the seed. No state machine. No sequential iteration. Any coordinate, anywhere in infinite space, immediately computes its contents through pure functions of spatial position.

### What This Demo Shows

| Traditional (Tribonacci) | Modern (Hash-Based) |
|--------------------------|---------------------|
| O(n) sequential iteration | O(1) constant time |
| Must compute all prior states | Direct coordinate access |
| Single-threaded only | Massively parallelizable |
| No random access | Jump anywhere instantly |

Enter coordinates up to 10^15 and beyond — the system generates instantly with **zero iterations**, while displaying exactly how many sequential iterations the legacy Tribonacci approach would require.

---

## 🎮 Quick Demo

### Option 1: Open Directly
Simply open `demo.html` in any modern browser. No build step required.

```bash
# Clone the repository
git clone https://github.com/MushroomFleet/BEYOND-TRIBONACCI.git
cd BEYOND-TRIBONACCI

# Open the demo
open demo.html  # macOS
start demo.html # Windows
xdg-open demo.html # Linux
```

### Option 2: Local Server
For development with hot-reload:

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .

# Then visit http://localhost:8080/demo.html
```

### Demo Features

- **Coordinate Input**: Enter any X, Y, Z coordinates (supports BigInt for extreme values)
- **Preset Jump Points**: Quick buttons for local stars, galaxy edge, and 10^15 coordinates
- **Star System Generation**: Weighted stellar classification, planets, moons, orbital mechanics
- **Performance Comparison**: Real-time display of iterations saved vs Tribonacci
- **Algorithm Details**: Toggle to see the code comparison

---

## 🔧 Integration Guide

### For React Projects

1. **Copy the Component**

```bash
cp InstantCoordinateJumper.jsx src/components/
```

2. **Import and Use**

```jsx
import InstantCoordinateJumper from './components/InstantCoordinateJumper';

function App() {
  return (
    <div className="App">
      <InstantCoordinateJumper />
    </div>
  );
}
```

3. **No External Dependencies**
   - Uses only React hooks (`useState`, `useEffect`, `useCallback`)
   - All styling is inline (no CSS imports needed)
   - Pure JavaScript math (no external libraries)

### Using the Core Hash Functions

The hash functions are pure and can be extracted for any use:

```javascript
// SplitMix64-inspired coordinate hash
function coordHash(x, y, z, salt = 0) {
  const bx = BigInt(Math.floor(x));
  const by = BigInt(Math.floor(y));
  const bz = BigInt(Math.floor(z));
  const bs = BigInt(salt);
  
  let h = bx * 0x9E3779B97F4A7C15n;
  h ^= by * 0x85EBCA6B2F40C2F5n;
  h ^= bz * 0xC2B2AE3D27D4EB4Fn;
  h ^= bs * 0x165667B19E3779F9n;
  
  h ^= h >> 30n;
  h *= 0xBF58476D1CE4E5B9n;
  h ^= h >> 27n;
  h *= 0x94D049BB133111EBn;
  h ^= h >> 31n;
  
  return Number(h & 0x1FFFFFFFFFFFFFn);
}

// Convert to float [0, 1)
function hashToFloat(hash) {
  return (hash % 0x1FFFFF) / 0x1FFFFF;
}

// Usage: Generate any property from coordinates
const starClass = hashToFloat(coordHash(x, y, z, 1));
const planetCount = Math.floor(hashToFloat(coordHash(x, y, z, 4)) * 13);
```

### Multi-Layer Generation Pattern

Use different salt values for statistically independent properties:

```javascript
// Layer 0: System existence
const exists = hashToFloat(coordHash(x, y, z, 0)) < densityThreshold;

// Layer 1: Star classification
const starClass = hashToFloat(coordHash(x, y, z, 1));

// Layer 2: Planet count
const planets = Math.floor(hashToFloat(coordHash(x, y, z, 2)) * 13);

// Layer 3+: Per-planet properties
const planetType = hashToFloat(coordHash(x, y, z, 100 + planetIndex));
```

### TypeScript Types

```typescript
interface Coordinates {
  x: bigint | number;
  y: bigint | number;
  z: bigint | number;
}

interface StarClass {
  name: string;
  color: string;
  temp: string;
  rarity: number;
}

interface Planet {
  type: PlanetType;
  orbitalRadius: string;
  moons: number;
}

interface StarSystem {
  seed: number;
  name: string;
  star: {
    class: StarClass;
    mass: string;
    luminosity: string;
    age: string;
  };
  planets: Planet[];
  coordinates: Coordinates;
}
```

---

## 🏗️ Architecture

### Component Structure

```
InstantCoordinateJumper/
├── Pure Functions (no side effects)
│   ├── coordHash()      - SplitMix64-based coordinate hash
│   ├── hashToFloat()    - Normalize to [0,1)
│   └── generateStarSystem() - Complete system from coordinates
│
├── Comparison Functions
│   ├── calculateTribonacciIterations() - O(n) cost calculator
│   └── formatBigNumber() - Human-readable large numbers
│
└── React Component
    ├── State: coords, system, iterationsSaved, generationTime
    ├── UI: Coordinate inputs, presets, results display
    └── Comparison: Side-by-side O(1) vs O(n) metrics
```

### Key Properties

| Property | Guarantee |
|----------|-----------|
| **Deterministic** | Same coordinates → identical output, always |
| **Stateless** | No iteration history, pure function of position |
| **Parallelizable** | Each coordinate independent, GPU-ready |
| **Infinite** | No bounds on coordinate values (BigInt support) |

---

## 📁 File Structure

```
BEYOND-TRIBONACCI/
├── demo.html                    # Standalone browser demo (no build)
├── InstantCoordinateJumper.jsx  # React component (for integration)
├── README.md                    # This file
└── BeyondTribonacci-EndlessWorlds.md  # Full methodology document
```

---

## 🌐 Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 67+ | ✅ Full support |
| Firefox | 68+ | ✅ Full support |
| Safari | 14+ | ✅ Full support |
| Edge | 79+ | ✅ Full support |

**Requirements:**
- BigInt support (all modern browsers)
- ES6+ JavaScript
- CSS Grid and Flexbox

---

## 🎯 Use Cases

- **Game Development**: Instant access to any star system without pre-generation
- **Educational**: Visualize O(1) vs O(n) algorithm complexity
- **Procedural Content**: Foundation for infinite world generators
- **Research**: Demonstrate hash-based deterministic generation

---

## 🔗 Related

- [Beyond Tribonacci: Full Methodology](./BeyondTribonacci-EndlessWorlds.md) — Complete technical documentation
- [Elite's Original Tribonacci](https://en.wikipedia.org/wiki/Fibonacci_sequence) — Historical context
- [xxHash](https://xxhash.com/) — Production hash function recommendation

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{beyond_tribonacci,
  title = {Beyond Tribonacci: O(1) Random Access for Infinite Procedural World Generation},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI},
  version = {1.0.0}
}
```

### Donate

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
