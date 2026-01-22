# fBm Octave Stacker

**Demo 04** from the [Beyond Tribonacci](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) series — an interactive visualization of Fractal Brownian Motion (fBm) octave accumulation for procedural terrain generation.

![fBm Octave Stacker](https://img.shields.io/badge/Demo-04-blue) ![React](https://img.shields.io/badge/React-18.x-61dafb) ![License](https://img.shields.io/badge/License-MIT-green)

## Overview

Fractal Brownian Motion is a fundamental technique in procedural generation that creates natural-looking terrain by stacking multiple layers ("octaves") of coherent noise. Each octave adds progressively finer detail at higher frequencies while contributing less amplitude to the final result.

This interactive demo lets you visualize and understand how fBm parameters affect terrain generation in real-time.

## Key Concepts

| Parameter | Description | Effect |
|-----------|-------------|--------|
| **Octaves** | Number of noise layers (1-12) | More octaves = more fine detail |
| **Persistence** | Amplitude multiplier per octave (0.1-0.9) | Higher = rougher, more detailed terrain |
| **Lacunarity** | Frequency multiplier per octave (1.5-3.0) | Higher = faster detail scaling |
| **Seed** | Deterministic random seed | Same seed = identical terrain |

### The fBm Formula

```
value = Σ (persistence^i × noise(position × lacunarity^i))
        i=0 to octaves-1
```

## Quick Preview

**Open `demo.html` in any modern browser** — no build step required!

The demo loads React and Babel from CDN, making it instantly runnable:

```bash
# Simply open in browser
open demo.html

# Or serve locally
python -m http.server 8000
# Then visit http://localhost:8000/demo.html
```

## Features

- **Real-time Terrain Preview**: 512×384 canvas with rich terrain color gradient (water → beach → lowlands → mountains → snow)
- **Octave Breakdown Strip**: Visualizes each octave's individual contribution with frequency/amplitude labels
- **Animated Build-Up**: Watch terrain progressively gain complexity as octaves stack
- **Interactive Statistics**: Hover over octave cards to highlight and see contribution percentages
- **Deterministic Output**: Same seed + coordinates = identical results across sessions
- **Pure Functional**: All generation is stateless — no hidden state machines

## Integration Guide

### Option 1: Standalone HTML (Quickest)

Use `demo.html` directly — includes everything via CDN:

```html
<!-- React 18 + Babel for JSX transformation -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
```

### Option 2: React Project Integration

Copy `fBmOctaveStacker.jsx` into your React project:

```bash
cp fBmOctaveStacker.jsx src/components/
```

Import and use:

```jsx
import FBMOctaveStacker from './components/fBmOctaveStacker';

function App() {
  return <FBMOctaveStacker />;
}
```

### Option 3: Extract Core Functions

The noise primitives are self-contained and can be extracted for your own projects:

```javascript
// Core hash function (SplitMix64-inspired)
const hash = (x, y, seed = 0) => {
  let h = (x * 374761393 + y * 668265263 + seed * 1013904223) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  h = ((h ^ (h >>> 16)) * 2654435769) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

// Value noise with quintic smoothstep
const valueNoise2D = (x, y, seed) => { /* ... */ };

// Fractal Brownian Motion
const fbm = (x, y, octaves, persistence, lacunarity, seed) => { /* ... */ };
```

## File Structure

```
04-fBm-Octave-Stacker/
├── README.md              # This file
├── demo.html              # Standalone demo (open in browser)
└── fBmOctaveStacker.jsx   # React component source
```

## Technical Details

### Noise Implementation

- **Hash Function**: SplitMix64-inspired coordinate hash for deterministic pseudo-random values
- **Interpolation**: Quintic smoothstep (`6t⁵ - 15t⁴ + 10t³`) for C² continuity
- **Noise Type**: Value noise (gradient-free) optimized for real-time rendering

### Rendering Pipeline

1. For each pixel, compute world coordinates based on scale
2. Evaluate fBm by stacking octaves with decay
3. Map height value to terrain color gradient
4. Update canvas via ImageData for performance

### Performance Considerations

- Uses `requestAnimationFrame` for smooth updates
- Canvas resolution (512×384) balances quality and speed
- All computation is pure JavaScript — no WebGL required

## Recommended Parameter Ranges

| Use Case | Octaves | Persistence | Lacunarity |
|----------|---------|-------------|------------|
| Smooth hills | 3-4 | 0.3-0.4 | 2.0 |
| Continental terrain | 5-6 | 0.5 | 2.0 |
| Rugged mountains | 8-10 | 0.5-0.6 | 2.0 |
| Fine detail | 10-12 | 0.4-0.5 | 2.5 |

## Part of Beyond Tribonacci

This demo is part of a series exploring modern procedural generation techniques that replace sequential state machines (like Tribonacci) with **position-as-seed** pure functions:

- **Demo 01**: Hash Fundamentals
- **Demo 02**: Coherent Noise
- **Demo 03**: Multi-Scale Composition
- **Demo 04**: fBm Octave Stacker ← *You are here*
- **Demo 05**: Domain Warping
- ...and more

## Browser Compatibility

Tested and working in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License — free for personal and commercial use.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{fbm_octave_stacker,
  title = {fBm Octave Stacker: Interactive Fractal Brownian Motion Visualization},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/04-fBm-Octave-Stacker},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
