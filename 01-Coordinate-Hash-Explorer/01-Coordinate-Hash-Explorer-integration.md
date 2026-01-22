# 01-Coordinate-Hash-Explorer Integration Guide

A comprehensive guide for integrating the Coordinate Hash Explorer component into your projects, adapting its hash-based procedural generation system for your specific needs.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Core Hash Functions](#core-hash-functions)
4. [Customization Guide](#customization-guide)
5. [Integration Patterns](#integration-patterns)
6. [Performance Optimization](#performance-optimization)
7. [API Reference](#api-reference)
8. [Examples](#examples)

---

## Quick Start

### Prerequisites

- React 18+ (or vanilla JavaScript with modifications)
- Modern browser with BigInt support
- Basic understanding of procedural generation concepts

### Installation Options

#### Option 1: Direct Import (React Projects)

```bash
# Copy the component file to your project
cp CoordinateHashExplorer.jsx src/components/
```

```jsx
import CoordinateHashExplorer from './components/CoordinateHashExplorer';

function App() {
  return <CoordinateHashExplorer />;
}
```

#### Option 2: Standalone HTML

Open `demo.html` directly in a browser—no build step required.

#### Option 3: Extract Core Functions

For non-React projects, extract the hash functions:

```javascript
// core-hash.js
export const splitmix64 = (seed) => {
  let z = (seed + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
  return z ^ (z >> 31n);
};

export const coordHash = (x, y, salt = 0) => {
  const packed = BigInt(x) * 0x1f1f1f1fn + BigInt(y) * 0x3d3d3d3dn + BigInt(salt) * 0x7f7f7f7fn;
  return splitmix64(packed & 0xffffffffffffffffn);
};

export const hashToFloat = (hash) => Number(hash & 0xffffffn) / 0x1000000;
export const hashToInt = (hash, max) => Number(hash % BigInt(max));
```

---

## Architecture Overview

### The Position-as-Seed Paradigm

```
┌─────────────────────────────────────────────────────────────┐
│                    COORDINATE INPUT                          │
│                      (x, y, seed)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    COORDINATE PACKING                        │
│         packed = x * A + y * B + salt * C                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SPLITMIX64 HASH                           │
│         Bijective transformation with avalanche              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 MULTI-LAYER EXTRACTION                       │
│    Layer 0: Existence   │  Layer 1: Type   │  Layer 2: ...  │
│    (different salts produce independent streams)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PROPERTY GENERATION                         │
│         Deterministic, reproducible, O(1) access            │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

| Principle | Implementation |
|-----------|----------------|
| **O(1) Access** | Any coordinate computed instantly via hash |
| **Determinism** | Same inputs always produce identical outputs |
| **Independence** | Different salts = uncorrelated property streams |
| **Statelessness** | No iteration, no state machine, pure functions |

---

## Core Hash Functions

### SplitMix64

The foundation hash function with excellent statistical properties:

```javascript
const splitmix64 = (seed) => {
  // Golden ratio constant for mixing
  let z = (seed + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
  
  // First mixing round
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
  
  // Second mixing round  
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
  
  // Final XOR
  return z ^ (z >> 31n);
};
```

**Properties:**
- Bijective (reversible, no collisions)
- Full 64-bit period
- Excellent avalanche (small input changes → large output changes)
- ~2 GB/s throughput

### Coordinate Hash

Combines spatial position with salt for independent layers:

```javascript
const coordHash = (x, y, salt = 0) => {
  // Prime-like multipliers to avoid correlation
  const packed = BigInt(x) * 0x1f1f1f1fn + 
                 BigInt(y) * 0x3d3d3d3dn + 
                 BigInt(salt) * 0x7f7f7f7fn;
  return splitmix64(packed & 0xffffffffffffffffn);
};
```

### Conversion Utilities

```javascript
// Float in range [0, 1)
const hashToFloat = (hash) => Number(hash & 0xffffffn) / 0x1000000;

// Integer in range [0, max)
const hashToInt = (hash, max) => Number(hash % BigInt(max));

// Boolean with probability p
const hashToBool = (hash, p = 0.5) => hashToFloat(hash) < p;

// Pick from array
const hashPick = (hash, array) => array[hashToInt(hash, array.length)];
```

---

## Customization Guide

### Adding Custom Cell Types

```javascript
const CUSTOM_CELL_TYPES = [
  { name: 'Void', color: '#0a0a12', symbol: '·', description: 'Empty space' },
  { name: 'Forest', color: '#228B22', symbol: '🌲', description: 'Dense woodland' },
  { name: 'Desert', color: '#EDC9Af', symbol: '🏜️', description: 'Arid wasteland' },
  { name: 'Ocean', color: '#006994', symbol: '🌊', description: 'Deep waters' },
  { name: 'Mountain', color: '#808080', symbol: '⛰️', description: 'Rocky peaks' },
  { name: 'City', color: '#4a4a4a', symbol: '🏙️', description: 'Urban center' },
];
```

### Adding Custom Properties

```javascript
const LAYERS = {
  EXISTENCE: 0,
  TERRAIN: 1,
  ELEVATION: 2,
  MOISTURE: 3,
  TEMPERATURE: 4,
  CIVILIZATION: 5,
  RESOURCES: 6,
  DANGER: 7,
  // Add your custom layers
  MAGIC_LEVEL: 8,
  FACTION: 9,
};

// Custom property generation
const generateMagicLevel = (x, y, seed) => {
  const hash = coordHash(x, y, LAYERS.MAGIC_LEVEL + seed);
  return hashToFloat(hash) * 100; // 0-100 magic intensity
};

const generateFaction = (x, y, seed) => {
  const FACTIONS = ['Neutral', 'Empire', 'Rebels', 'Merchants', 'Nomads'];
  const hash = coordHash(x, y, LAYERS.FACTION + seed);
  return FACTIONS[hashToInt(hash, FACTIONS.length)];
};
```

### 3D Extension

```javascript
const coordHash3D = (x, y, z, salt = 0) => {
  const packed = BigInt(x) * 0x1f1f1f1fn + 
                 BigInt(y) * 0x3d3d3d3dn + 
                 BigInt(z) * 0x5b5b5b5bn +
                 BigInt(salt) * 0x7f7f7f7fn;
  return splitmix64(packed & 0xffffffffffffffffn);
};
```

### Hierarchical Generation

For multi-scale systems (galaxy → system → planet → terrain):

```javascript
const generateSystem = (galaxyX, galaxyY, systemIndex, universeSeed) => {
  // Galaxy-level seed
  const galaxySeed = coordHash(galaxyX, galaxyY, universeSeed);
  
  // System-level seed (child of galaxy)
  const systemSeed = coordHash(systemIndex, 0, Number(galaxySeed & 0xffffffffn));
  
  return {
    seed: systemSeed,
    starClass: hashPick(systemSeed, STAR_CLASSES),
    planetCount: hashToInt(coordHash(0, 0, Number(systemSeed) + 1), 12),
    // ... more properties
  };
};
```

---

## Integration Patterns

### Pattern 1: Game World Generation

```jsx
function GameWorld({ worldSeed, viewportX, viewportY, viewportSize }) {
  const tiles = useMemo(() => {
    const result = [];
    for (let y = 0; y < viewportSize; y++) {
      for (let x = 0; x < viewportSize; x++) {
        const worldX = viewportX + x;
        const worldY = viewportY + y;
        result.push(generateTile(worldX, worldY, worldSeed));
      }
    }
    return result;
  }, [worldSeed, viewportX, viewportY, viewportSize]);
  
  return (
    <div className="game-grid">
      {tiles.map((tile, i) => <Tile key={i} {...tile} />)}
    </div>
  );
}
```

### Pattern 2: Infinite Scrolling Map

```jsx
function InfiniteMap({ seed }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  
  const handlePan = (dx, dy) => {
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };
  
  const visibleTiles = useMemo(() => {
    const tilesPerScreen = Math.ceil(window.innerWidth / (TILE_SIZE * zoom));
    // Generate only visible tiles
    return generateVisibleArea(offset.x, offset.y, tilesPerScreen, seed);
  }, [offset, zoom, seed]);
  
  return (
    <div onWheel={handleZoom} onMouseDrag={handlePan}>
      {visibleTiles.map(tile => <Tile key={`${tile.x},${tile.y}`} {...tile} />)}
    </div>
  );
}
```

### Pattern 3: Lazy Loading Chunks

```javascript
class ChunkManager {
  constructor(seed, chunkSize = 16) {
    this.seed = seed;
    this.chunkSize = chunkSize;
    this.loadedChunks = new Map();
  }
  
  getChunkKey(chunkX, chunkY) {
    return `${chunkX},${chunkY}`;
  }
  
  loadChunk(chunkX, chunkY) {
    const key = this.getChunkKey(chunkX, chunkY);
    if (this.loadedChunks.has(key)) return this.loadedChunks.get(key);
    
    const chunk = [];
    const baseX = chunkX * this.chunkSize;
    const baseY = chunkY * this.chunkSize;
    
    for (let y = 0; y < this.chunkSize; y++) {
      for (let x = 0; x < this.chunkSize; x++) {
        chunk.push(generateCell(baseX + x, baseY + y, this.seed));
      }
    }
    
    this.loadedChunks.set(key, chunk);
    return chunk;
  }
  
  getCell(worldX, worldY) {
    // O(1) access - generate on demand without loading chunk
    return generateCell(worldX, worldY, this.seed);
  }
}
```

### Pattern 4: Web Worker Generation

```javascript
// worker.js
self.onmessage = function(e) {
  const { startX, startY, width, height, seed } = e.data;
  const cells = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push(generateCell(startX + x, startY + y, seed));
    }
  }
  
  self.postMessage({ cells, startX, startY });
};

// main.js
const worker = new Worker('worker.js');
worker.postMessage({ startX: 0, startY: 0, width: 32, height: 32, seed: 42 });
worker.onmessage = (e) => updateGrid(e.data.cells);
```

---

## Performance Optimization

### Memoization Strategy

```javascript
// React memoization
const gridData = useMemo(() => {
  return generateGrid(viewportX, viewportY, gridSize, seed);
}, [viewportX, viewportY, gridSize, seed]);

// Manual cache for non-React
const cellCache = new Map();
const getCachedCell = (x, y, seed) => {
  const key = `${x},${y},${seed}`;
  if (!cellCache.has(key)) {
    cellCache.set(key, generateCell(x, y, seed));
  }
  return cellCache.get(key);
};
```

### Batch Generation

```javascript
// Generate multiple cells efficiently
const generateBatch = (coords, seed) => {
  return coords.map(([x, y]) => ({
    x, y,
    ...generateCell(x, y, seed)
  }));
};
```

### Typed Arrays for Large Grids

```javascript
const generateLargeGrid = (width, height, seed) => {
  // Use typed arrays for better memory efficiency
  const types = new Uint8Array(width * height);
  const temperatures = new Float32Array(width * height);
  
  for (let i = 0; i < width * height; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    const hash = coordHash(x, y, seed);
    
    types[i] = hashToInt(hash, 8);
    temperatures[i] = hashToFloat(coordHash(x, y, seed + 1)) * 10000;
  }
  
  return { types, temperatures, width, height };
};
```

---

## API Reference

### Core Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `splitmix64` | `(seed: bigint) → bigint` | Base hash function |
| `coordHash` | `(x: number, y: number, salt?: number) → bigint` | 2D coordinate hash |
| `hashToFloat` | `(hash: bigint) → number` | Convert to [0, 1) |
| `hashToInt` | `(hash: bigint, max: number) → number` | Convert to [0, max) |

### Generation Functions

| Function | Parameters | Returns |
|----------|------------|---------|
| `generateCellProperties` | `(x, y, worldSeed, densityThreshold)` | Full cell object |
| `generateGrid` | `(offsetX, offsetY, size, seed)` | 2D array of cells |

### Cell Object Structure

```typescript
interface CellProperties {
  exists: boolean;
  type: { name: string; color: string; symbol: string; description: string };
  typeIndex: number;
  temperature: number;      // Kelvin (10-10000)
  density: number;          // g/cm³ (0.1-20)
  resources: string;
  resourceIndex: number;
  danger: string;
  dangerIndex: number;
  special: boolean;
  rawHashes: Record<string, string>;
  coordinates: { x: number; y: number };
  existenceValue: string;
}
```

---

## Examples

### Example 1: Procedural Planet Generator

```javascript
const BIOMES = ['Ocean', 'Desert', 'Forest', 'Tundra', 'Jungle', 'Mountains'];

const generatePlanetTile = (lat, lon, planetSeed) => {
  // Convert spherical to hash-friendly coordinates
  const x = Math.floor((lon + 180) * 100);
  const y = Math.floor((lat + 90) * 100);
  
  const elevationHash = coordHash(x, y, planetSeed);
  const moistureHash = coordHash(x, y, planetSeed + 1);
  const tempHash = coordHash(x, y, planetSeed + 2);
  
  const elevation = hashToFloat(elevationHash);
  const moisture = hashToFloat(moistureHash);
  const baseTemp = hashToFloat(tempHash);
  
  // Temperature affected by latitude
  const latitudeFactor = 1 - Math.abs(lat) / 90;
  const temperature = baseTemp * 0.3 + latitudeFactor * 0.7;
  
  // Determine biome
  let biome;
  if (elevation < 0.3) biome = 'Ocean';
  else if (temperature < 0.2) biome = 'Tundra';
  else if (moisture < 0.2) biome = 'Desert';
  else if (elevation > 0.8) biome = 'Mountains';
  else if (temperature > 0.7 && moisture > 0.6) biome = 'Jungle';
  else biome = 'Forest';
  
  return { lat, lon, elevation, moisture, temperature, biome };
};
```

### Example 2: Dungeon Room Generator

```javascript
const generateDungeonRoom = (roomX, roomY, floorSeed) => {
  const roomSeed = coordHash(roomX, roomY, floorSeed);
  
  const ROOM_TYPES = ['Empty', 'Treasure', 'Monster', 'Trap', 'Shrine', 'Boss'];
  const typeHash = coordHash(0, 0, Number(roomSeed));
  const type = ROOM_TYPES[hashToInt(typeHash, ROOM_TYPES.length)];
  
  const sizeHash = coordHash(0, 1, Number(roomSeed));
  const width = 5 + hashToInt(sizeHash, 10);
  const height = 5 + hashToInt(coordHash(0, 2, Number(roomSeed)), 10);
  
  const exits = {
    north: hashToFloat(coordHash(1, 0, Number(roomSeed))) > 0.3,
    south: hashToFloat(coordHash(2, 0, Number(roomSeed))) > 0.3,
    east: hashToFloat(coordHash(3, 0, Number(roomSeed))) > 0.3,
    west: hashToFloat(coordHash(4, 0, Number(roomSeed))) > 0.3,
  };
  
  return { roomX, roomY, type, width, height, exits, seed: roomSeed };
};
```

### Example 3: Star System Generator

```javascript
const STAR_CLASSES = ['M', 'K', 'G', 'F', 'A', 'B', 'O'];
const STAR_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#fff9db', '#a5d8ff', '#91a7ff', '#845ef7'];

const generateStarSystem = (sectorX, sectorY, galaxySeed) => {
  const systemSeed = coordHash(sectorX, sectorY, galaxySeed);
  
  // Does a star exist here?
  const exists = hashToFloat(systemSeed) > 0.7;
  if (!exists) return { exists: false, sectorX, sectorY };
  
  const classIndex = hashToInt(coordHash(0, 0, Number(systemSeed)), STAR_CLASSES.length);
  const starClass = STAR_CLASSES[classIndex];
  const starColor = STAR_COLORS[classIndex];
  
  // Luminosity based on class
  const baseLuminosity = [0.01, 0.1, 1, 2, 10, 100, 1000][classIndex];
  const luminosity = baseLuminosity * (0.5 + hashToFloat(coordHash(0, 1, Number(systemSeed))));
  
  // Planet count (hotter stars = fewer planets)
  const maxPlanets = Math.max(1, 10 - classIndex);
  const planetCount = hashToInt(coordHash(0, 2, Number(systemSeed)), maxPlanets);
  
  const planets = [];
  for (let i = 0; i < planetCount; i++) {
    planets.push(generatePlanet(systemSeed, i, luminosity));
  }
  
  return {
    exists: true,
    sectorX, sectorY,
    starClass, starColor, luminosity,
    planets,
    seed: systemSeed
  };
};
```

---

## Troubleshooting

### Common Issues

**Issue: Different results on different machines**
- Ensure BigInt support (all modern browsers)
- Check for floating-point precision issues
- Use consistent seed types (always number or always BigInt)

**Issue: Performance degradation with large grids**
- Implement viewport culling (only generate visible cells)
- Use Web Workers for background generation
- Consider chunk-based loading

**Issue: Patterns appearing in output**
- Increase coordinate multipliers in `coordHash`
- Add more mixing rounds to hash function
- Verify salt values are sufficiently different

---

## Further Reading

- [Beyond Tribonacci Methodology](../BeyondTribonacci-EndlessWorlds.md)
- [Hash Function Theory](https://en.wikipedia.org/wiki/Hash_function)
- [Procedural Generation in Games](https://www.procjam.com/)

---

*Part of the [Beyond Tribonacci](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) project*
