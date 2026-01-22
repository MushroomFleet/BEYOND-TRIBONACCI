# 🌀 Warp Field Demonstrator

**Part of the [Beyond Tribonacci](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) series — Modern Procedural Generation Techniques**

An interactive visualization demonstrating **domain warping** for organic pattern generation. This component shows the dramatic transformation from geometric fBm (Fractal Brownian Motion) noise to organic, flowing patterns through real-time domain distortion.

---

## 🎯 What It Does

Domain warping is a technique that feeds noise back into itself, using one noise field to distort the sampling coordinates of another. The result transforms rigid, geometric patterns into organic, turbulent structures reminiscent of marble, smoke, or flowing water.

**The Core Algorithm:**
```glsl
q = vec2( fbm(p + vec2(0.0, 0.0)),
          fbm(p + vec2(5.2, 1.3)) );

return fbm(p + warpIntensity * q);
```

This demonstrator provides a **split-view comparison**:
- **Left Panel**: Raw fBm noise (geometric, grid-aligned patterns)
- **Right Panel**: Domain-warped fBm (organic, flowing patterns)

An animated slider lets you see the transformation in real-time as warp intensity increases from 0 (pure geometric) to 4 (highly organic).

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Split View** | Side-by-side comparison of raw vs warped noise |
| **Animated Warp** | Auto-oscillating intensity for dramatic before/after |
| **Full Parameter Control** | Seed, octaves, persistence, lacunarity, scale |
| **Multiple Palettes** | Cosmic, Terrain, Plasma, Monochrome |
| **Pure Functional** | Deterministic output — same seed = same result |
| **Zero Dependencies** | Core React + vanilla JS math only |

---

## 🚀 Quick Preview

Open **[demo.html](demo.html)** directly in your browser for an instant preview. No build step required — it uses CDN-hosted React and Babel for in-browser JSX transformation.

```bash
# Clone and open
git clone https://github.com/MushroomFleet/BEYOND-TRIBONACCI.git
cd BEYOND-TRIBONACCI/05-Warp-Field-Demonstrator
open demo.html  # or: start demo.html (Windows)
```

---

## 📦 Integration Guide

### Option 1: Direct Import (React Projects)

Copy `WarpFieldDemonstrator.jsx` into your project:

```jsx
import WarpFieldDemonstrator from './WarpFieldDemonstrator';

function App() {
  return <WarpFieldDemonstrator />;
}
```

**Requirements:**
- React 18+
- No additional dependencies

### Option 2: Extract Noise Functions

The noise primitives are self-contained and can be extracted for use in any JavaScript project:

```javascript
// Copy these functions from the component:
// - initPerm(seed)      → Initialize permutation table
// - simplex2D(x, y)     → 2D Simplex noise [-1, 1]
// - fbm(x, y, ...)      → Fractal Brownian Motion
// - warpedFbm(x, y, ...)→ Domain-warped fBm

// Usage example:
initPerm(42);  // Set seed once

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const nx = x / width * 4;
    const ny = y / height * 4;
    
    // Raw geometric noise
    const raw = fbm(nx, ny, 6, 0.5, 2.0);
    
    // Organic warped noise
    const warped = warpedFbm(nx, ny, 2.0, 6, 0.5, 2.0);
  }
}
```

### Option 3: HTML Embed

Use the standalone `demo.html` which includes everything via CDN:

```html
<iframe 
  src="demo.html" 
  width="100%" 
  height="800" 
  frameborder="0">
</iframe>
```

---

## ⚙️ API Reference

### Noise Parameters

| Parameter | Range | Default | Effect |
|-----------|-------|---------|--------|
| `seed` | 1–999 | 42 | Deterministic random seed |
| `warpIntensity` | 0–4 | 0 | Domain distortion strength |
| `octaves` | 1–10 | 6 | Detail layers (more = finer detail) |
| `persistence` | 0.1–0.9 | 0.5 | Amplitude decay per octave |
| `lacunarity` | 1.5–3.0 | 2.0 | Frequency multiplier per octave |
| `scale` | 1–10 | 4 | Zoom level |

### Color Palettes

- **cosmic** — Deep space nebula (purples → oranges → white)
- **terrain** — Topographic map (blues → greens → browns → snow)
- **plasma** — Heat signature (purples → reds → yellows)
- **monochrome** — Classic grayscale

---

## 🧮 Technical Details

### Simplex Noise Implementation

Uses 2D Simplex noise (Ken Perlin, 2001) with:
- Skewed coordinate system for triangular grid
- Gradient-based contribution from 3 corners
- Smooth C² continuity (no visible grid artifacts)

### Fractal Brownian Motion (fBm)

Stacks multiple octaves of Simplex noise:
```
value = Σ amplitude[i] × noise(frequency[i] × position)
```

Where:
- `amplitude[i+1] = amplitude[i] × persistence`
- `frequency[i+1] = frequency[i] × lacunarity`

### Domain Warping

Two-layer warping for maximum organic effect:
1. **q-warp**: Initial displacement using offset noise samples
2. **r-warp**: Secondary displacement using q-distorted coordinates
3. **Blend**: Intensity controls interpolation between layers

---

## 🎨 Use Cases

- **Procedural Terrain** — Organic heightmaps for landscapes
- **Texture Generation** — Marble, clouds, smoke, fire
- **Game Development** — Biome boundaries, resource distribution
- **Generative Art** — Abstract flowing patterns
- **Educational** — Visualizing noise algorithms

---

## 📁 File Structure

```
05-Warp-Field-Demonstrator/
├── WarpFieldDemonstrator.jsx   # React component (production)
├── demo.html                   # Standalone preview (CDN-based)
└── README.md                   # This file
```

---

## 🔗 Related Demos

This is **Demo 05** in the Beyond Tribonacci series:

1. Hash Visualizer — Coordinate hashing fundamentals
2. Simplex Explorer — Raw noise characteristics  
3. fBm Composer — Octave stacking visualization
4. Noise Stack Builder — Multi-layer noise composition
5. **Warp Field Demonstrator** ← You are here
6. Hierarchical Generator — Constraint propagation

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{warp_field_demonstrator,
  title = {Warp Field Demonstrator: Domain Warping for Organic Pattern Generation},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI/tree/main/05-Warp-Field-Demonstrator},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
