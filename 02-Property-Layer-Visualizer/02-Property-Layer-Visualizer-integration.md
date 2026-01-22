# 02-Property-Layer-Visualizer Integration Guide

A comprehensive guide for integrating the Property Layer Visualizer component into your projects.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Hash Function Integration](#hash-function-integration)
4. [Layer Configuration](#layer-configuration)
5. [Customization Options](#customization-options)
6. [Performance Considerations](#performance-considerations)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- React 18+
- Modern browser with ES6+ support
- No external dependencies required

### Installation

**Option 1: Copy the JSX Component**

Copy `PropertyLayerVisualizer.jsx` directly into your React project's components directory:

```bash
cp PropertyLayerVisualizer.jsx src/components/
```

Import and use in your application:

```jsx
import PropertyLayerVisualizer from './components/PropertyLayerVisualizer';

function App() {
  return <PropertyLayerVisualizer />;
}
```

**Option 2: Standalone HTML Demo**

Open `demo.html` directly in a browser—no build step required. The demo uses React from CDN.

---

## Architecture Overview

### Core Concepts

The Property Layer Visualizer demonstrates **multi-layer hash composition with salt values**, a key technique from the "Beyond Tribonacci" methodology for procedural generation.

```
┌─────────────────────────────────────────────────────────────┐
│                    COORDINATE INPUT                         │
│                       (x, y)                                │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Salt A  │    │ Salt B  │    │ Salt C  │
    │ hash()  │    │ hash()  │    │ hash()  │
    └────┬────┘    └────┬────┘    └────┬────┘
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Layer 1 │    │ Layer 2 │    │ Layer 3 │
    │ Output  │    │ Output  │    │ Output  │
    └─────────┘    └─────────┘    └─────────┘
```

**Key Principle**: Same coordinates with different salts produce statistically independent outputs.

### File Structure

```
02-Property-Layer-Visualizer/
├── PropertyLayerVisualizer.jsx   # React component (ES6 modules)
├── demo.html                     # Standalone HTML demo
├── README.md                     # Project overview
└── 02-Property-Layer-Visualizer-integration.md  # This file
```

---

## Hash Function Integration

### PCG-Style Hash Implementation

The component uses a PCG (Permuted Congruential Generator) style hash function optimized for 2D coordinate hashing:

```javascript
const pcgHash = (x, y, salt, seed) => {
  // Combine inputs into initial state
  let state = ((x * 374761393) + (y * 668265263) + (salt * 2147483647) + seed) >>> 0;
  
  // Three-round permutation for quality mixing
  state = ((state ^ (state >> 16)) * 2246822519) >>> 0;
  state = ((state ^ (state >> 13)) * 3266489917) >>> 0;
  state = (state ^ (state >> 16)) >>> 0;
  
  // Normalize to [0, 1]
  return state / 4294967296;
};
```

### Using Your Own Hash Function

Replace `pcgHash` with any deterministic hash that:

1. Accepts numeric inputs (coordinates, salt, seed)
2. Returns a value in [0, 1] range
3. Produces uniform distribution
4. Has good avalanche properties

**Example: xxHash-style (higher quality)**

```javascript
const xxHashStyle = (x, y, salt, seed) => {
  const PRIME1 = 2654435761;
  const PRIME2 = 2246822519;
  const PRIME3 = 3266489917;
  const PRIME4 = 668265263;
  const PRIME5 = 374761393;
  
  let h = seed + PRIME5;
  h = ((h + x * PRIME3) >>> 0);
  h = (((h << 17) | (h >>> 15)) * PRIME4) >>> 0;
  h = ((h + y * PRIME3) >>> 0);
  h = (((h << 17) | (h >>> 15)) * PRIME4) >>> 0;
  h = ((h + salt * PRIME3) >>> 0);
  
  h ^= h >>> 15;
  h = (h * PRIME2) >>> 0;
  h ^= h >>> 13;
  h = (h * PRIME3) >>> 0;
  h ^= h >>> 16;
  
  return h / 4294967296;
};
```

---

## Layer Configuration

### Default Layers

The component defines four property layers with unique salt values:

```javascript
const LAYER_CONFIGS = {
  existence: {
    salt: 0x1A2B3C4D,      // Determines if feature exists
    name: 'Existence',
    color: 'rgba(0, 255, 136, VAR)',
    icon: '◆',
  },
  type: {
    salt: 0x5E6F7A8B,      // Classification (1-4)
    name: 'Type Class',
    color: 'rgba(255, 107, 107, VAR)',
    icon: '▲',
  },
  resource: {
    salt: 0x9C0D1E2F,      // Resource density
    name: 'Resource',
    color: 'rgba(78, 205, 255, VAR)',
    icon: '●',
  },
  danger: {
    salt: 0x3A4B5C6D,      // Threat level
    name: 'Danger Level',
    color: 'rgba(255, 193, 7, VAR)',
    icon: '★',
  },
};
```

### Adding Custom Layers

Extend `LAYER_CONFIGS` with your own layers:

```javascript
const LAYER_CONFIGS = {
  ...existingLayers,
  
  // Add new layer
  temperature: {
    salt: 0xDEADBEEF,      // Unique salt (must be different from others)
    name: 'Temperature',
    description: 'Thermal value at location',
    color: 'rgba(255, 100, 50, VAR)',
    icon: '🌡',
  },
  
  vegetation: {
    salt: 0xCAFEBABE,
    name: 'Vegetation',
    description: 'Flora density',
    color: 'rgba(50, 200, 50, VAR)',
    icon: '🌿',
  },
};
```

### Choosing Salt Values

**Guidelines for salt selection:**

1. **Use hex constants** for readability: `0x1A2B3C4D`
2. **Avoid simple values**: Don't use `0`, `1`, `1000`, etc.
3. **Ensure uniqueness**: Each layer needs a distinct salt
4. **Document your salts**: Maintain a registry to prevent collisions

**Salt generation utility:**

```javascript
// Generate a random salt for new layers
const generateSalt = () => {
  return '0x' + Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');
};

console.log(generateSalt()); // e.g., "0x7F3A9C12"
```

---

## Customization Options

### Visual Theming

Modify the color scheme by adjusting CSS variables in the component:

```javascript
// Dark theme (default)
const THEME = {
  background: 'linear-gradient(145deg, #0a0a0f 0%, #12121a 50%, #0d0d14 100%)',
  panelBg: 'rgba(20, 20, 30, 0.8)',
  text: '#e0e0e0',
  accent: '#00ff88',
};

// Light theme alternative
const LIGHT_THEME = {
  background: 'linear-gradient(145deg, #f5f5f5 0%, #e8e8e8 50%, #f0f0f0 100%)',
  panelBg: 'rgba(255, 255, 255, 0.9)',
  text: '#1a1a1a',
  accent: '#00aa55',
};
```

### Grid Parameters

Expose props for external control:

```jsx
function PropertyLayerVisualizer({
  initialSeed = 42,
  initialGridSize = 24,
  initialDensity = 0.65,
  initialCellSize = 28,
  showControls = true,
  showStats = true,
}) {
  const [seed, setSeed] = useState(initialSeed);
  const [gridSize, setGridSize] = useState(initialGridSize);
  // ...
}
```

### Layer Interpretation Functions

Customize how hash values map to properties:

```javascript
const generateCellLayers = (x, y, seed, densityThreshold) => {
  const layers = {};
  
  // Binary existence with threshold
  const existenceHash = pcgHash(x, y, LAYER_CONFIGS.existence.salt, seed);
  layers.existence = existenceHash < densityThreshold ? existenceHash / densityThreshold : 0;
  
  // Categorical type (4 classes)
  const typeHash = pcgHash(x, y, LAYER_CONFIGS.type.salt, seed);
  layers.type = typeHash;
  layers.typeClass = Math.floor(typeHash * 4) + 1;
  
  // Continuous resource value (0-1)
  layers.resource = pcgHash(x, y, LAYER_CONFIGS.resource.salt, seed);
  
  // Weighted danger (higher values more rare)
  const dangerRaw = pcgHash(x, y, LAYER_CONFIGS.danger.salt, seed);
  layers.danger = Math.pow(dangerRaw, 2); // Square for rarity curve
  
  return layers;
};
```

---

## Performance Considerations

### Grid Size Recommendations

| Grid Size | Cell Count | Performance | Use Case |
|-----------|-----------|-------------|----------|
| 8×8 | 64 | Instant | Thumbnails |
| 16×16 | 256 | Fast | Quick preview |
| 24×24 | 576 | Good | Default demo |
| 32×32 | 1024 | Moderate | Detailed view |
| 48×48 | 2304 | Slower | High-res analysis |

### Optimization Techniques

**1. Memoization (already implemented)**

```javascript
const gridData = useMemo(() => {
  // Only recompute when dependencies change
  return generateGrid(seed, gridSize, densityThreshold);
}, [seed, gridSize, densityThreshold]);
```

**2. Web Workers for large grids**

```javascript
// worker.js
self.onmessage = (e) => {
  const { gridSize, seed, densityThreshold } = e.data;
  const data = generateGrid(gridSize, seed, densityThreshold);
  self.postMessage(data);
};

// component
const worker = new Worker('worker.js');
worker.postMessage({ gridSize, seed, densityThreshold });
worker.onmessage = (e) => setGridData(e.data);
```

**3. Canvas rendering for 100×100+ grids**

```javascript
const renderToCanvas = (ctx, gridData, cellSize) => {
  gridData.forEach((row, y) => {
    row.forEach((cell, x) => {
      ctx.fillStyle = computeColor(cell);
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    });
  });
};
```

---

## Advanced Usage

### Exporting Hash Functions for Backend

The hash functions are pure JavaScript and can run anywhere:

```javascript
// Export for Node.js / backend use
module.exports = { pcgHash, mixHash, generateCellLayers };

// Usage in game server
const { generateCellLayers } = require('./hash-utils');
const worldTile = generateCellLayers(playerX, playerY, WORLD_SEED, 0.5);
```

### Integrating with 3D Worlds

Use layers to control terrain generation:

```javascript
const generateTerrainAt = (worldX, worldY, worldZ, seed) => {
  // 2D base layers
  const base = generateCellLayers(worldX, worldZ, seed, 0.8);
  
  // Use existence for landmass
  if (base.existence === 0) return { type: 'ocean', height: -10 };
  
  // Use resource for elevation
  const height = base.resource * 100;
  
  // Use type for biome
  const biomes = ['plains', 'forest', 'desert', 'mountains'];
  const biome = biomes[base.typeClass - 1];
  
  // Use danger for hazard zones
  const hazard = base.danger > 0.7;
  
  return { type: biome, height, hazard };
};
```

### Correlation Testing

Verify statistical independence programmatically:

```javascript
const testLayerIndependence = (sampleCount = 10000, seed = 42) => {
  const samples = [];
  
  for (let i = 0; i < sampleCount; i++) {
    const x = Math.floor(Math.random() * 1000);
    const y = Math.floor(Math.random() * 1000);
    samples.push(generateCellLayers(x, y, seed, 1.0));
  }
  
  const layers = Object.keys(LAYER_CONFIGS);
  console.log('Correlation Matrix:');
  
  layers.forEach(l1 => {
    const row = layers.map(l2 => {
      const d1 = samples.map(s => s[l1]);
      const d2 = samples.map(s => s[l2]);
      return calculateCorrelation(d1, d2).toFixed(3);
    });
    console.log(`${l1}: ${row.join(' | ')}`);
  });
};

// Expected output: All off-diagonal values near 0.00
```

---

## Troubleshooting

### Common Issues

**Issue: Layers appear correlated**

Cause: Using similar or related salt values.

Solution: Ensure salts are truly distinct (different bits throughout).

```javascript
// BAD: Sequential salts may share patterns
salt1 = 0x00000001;
salt2 = 0x00000002;

// GOOD: Random/diverse salts
salt1 = 0x1A2B3C4D;
salt2 = 0x5E6F7A8B;
```

**Issue: Grid renders slowly**

Cause: Large grid with real-time updates.

Solution: Debounce slider inputs or use lower grid sizes during interaction.

```javascript
const debouncedSetGridSize = useMemo(
  () => debounce((value) => setGridSize(value), 100),
  []
);
```

**Issue: Inconsistent results between sessions**

Cause: Non-deterministic seed initialization.

Solution: Always use explicit seeds, never `Math.random()` for reproducibility.

**Issue: Colors don't blend as expected**

Cause: `mixBlendMode` not supported in all contexts.

Solution: Use manual alpha compositing or pre-compute blended colors.

---

## API Reference

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialSeed` | number | 42 | Starting universe seed |
| `initialGridSize` | number | 24 | Grid dimensions (NxN) |
| `initialDensity` | number | 0.65 | Existence threshold |
| `initialCellSize` | number | 28 | Cell pixel size |

### Hash Function Signature

```typescript
pcgHash(x: number, y: number, salt: number, seed: number): number
// Returns: float in [0, 1]
```

### Layer Data Structure

```typescript
interface CellLayers {
  existence: number;    // [0, 1] or 0 if below threshold
  type: number;         // [0, 1] continuous
  typeClass: number;    // 1-4 categorical
  resource: number;     // [0, 1] continuous
  danger: number;       // [0, 1] continuous
}
```

---

## Further Reading

- [Beyond Tribonacci: A Contemporary Methodology for Endless World Generation](../BeyondTribonacci-EndlessWorlds.md)
- PCG Random Number Generators: [pcg-random.org](https://www.pcg-random.org/)
- Hash Function Quality Tests: [SMHasher](https://github.com/aappleby/smhasher)
