# 🏁 Sequential vs Parallel Race

**A visual demonstration of Tribonacci's O(N) sequential limitations versus Hash-based O(1) parallel computation advantages.**

Part of the [Beyond Tribonacci](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) methodology for modern procedural generation.

![Demo Preview](https://img.shields.io/badge/demo-live-brightgreen) ![React](https://img.shields.io/badge/React-18.x-61dafb) ![License](https://img.shields.io/badge/license-MIT-blue)

## 🎯 What This Component Does

This interactive React component demonstrates the fundamental architectural difference between two procedural generation approaches:

| Approach | Access Pattern | Complexity | Parallelizable |
|----------|---------------|------------|----------------|
| **Tribonacci** (1984) | Sequential only | O(N) | ❌ No |
| **Hash-based** (Modern) | Random access | O(1) | ✅ Yes |

### The Race

Watch in real-time as both methods generate the same grid of cells:

- **🐢 Sequential (Tribonacci)**: Must compute cells 0→N in strict order. Each state depends on the previous three states: `s[n] = s[n-1] + s[n-2] + s[n-3]`
  
- **⚡ Parallel (Hash)**: Can compute ANY cell independently using position-as-seed: `hash(x, y, seed)`. Perfect for GPU parallelization.

### Key Insight

> Braben's 6-byte Tribonacci was brilliant for 1984's constraints—encoding 2,048 star systems. But modern hash functions encode **infinite** systems in **zero** bytes of storage, with O(1) random access and massive parallelization potential.

## 🚀 Quick Preview

Open `demo.html` directly in your browser for an instant preview—no build tools required!

```bash
# Clone the repository
git clone https://github.com/MushroomFleet/BEYOND-TRIBONACCI.git

# Open the demo
open demo.html
# or on Linux:
xdg-open demo.html
# or on Windows:
start demo.html
```

The demo uses CDN-hosted React and Tailwind CSS, so it works offline after initial load.

## 📦 Installation & Integration

### Option 1: Standalone HTML (Quickest)

Simply copy `demo.html` to your project. It's self-contained with all dependencies loaded from CDN.

### Option 2: React Component Integration

1. Copy `SequentialVsParallelRace.jsx` to your components directory:

```bash
cp SequentialVsParallelRace.jsx src/components/
```

2. Import and use in your React application:

```jsx
import SequentialVsParallelRace from './components/SequentialVsParallelRace';

function App() {
  return (
    <div>
      <SequentialVsParallelRace />
    </div>
  );
}
```

3. Ensure Tailwind CSS is configured in your project, or adapt the styling to your preferred CSS framework.

### Option 3: Extract Core Logic Only

If you only need the generation algorithms without the visualization:

```javascript
// Tribonacci Generator (Sequential)
class TribonacciGenerator {
  constructor(seed) {
    this.s0 = (seed & 0xFFFF);
    this.s1 = ((seed >> 16) & 0xFFFF) || 12345;
    this.s2 = ((seed >> 32) & 0xFFFF) || 54321;
  }
  
  next() {
    const temp = (this.s0 + this.s1 + this.s2) & 0xFFFF;
    this.s0 = this.s1;
    this.s1 = this.s2;
    this.s2 = temp;
    return temp;
  }
}

// Hash Generator (Parallel - Position is Seed)
const hash64 = (x, y, seed) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};
```

## ⚙️ Configuration Options

The component exposes several adjustable parameters:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `gridSize` | 10-50 | 32 | Grid dimensions (gridSize × gridSize cells) |
| `cellsPerFrame` | 1-50 | 10 | Animation speed (cells generated per frame) |
| `seed` | 1-9999 | 42 | Random seed for deterministic generation |
| `raceMode` | sequential/random/corners | sequential | Access pattern demonstration |

## 🏗️ Architecture

```
SequentialVsParallelRace/
├── demo.html                      # Standalone demo (CDN dependencies)
├── SequentialVsParallelRace.jsx   # React component (for integration)
└── README.md                      # This file
```

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│  SequentialVsParallelRace (Main Component)                  │
├─────────────────────────────────────────────────────────────┤
│  ├── useRaceSimulation (Custom Hook)                        │
│  │   ├── TribonacciGenerator (Class)                        │
│  │   └── parallelGenerate (Pure Function)                   │
│  ├── Grid (Visualization Component)                         │
│  │   └── Canvas rendering with requestAnimationFrame        │
│  └── ExplanationPanel (Educational Component)               │
└─────────────────────────────────────────────────────────────┘
```

## 🔬 Technical Details

### Hash Function

Uses a SplitMix64-style hash with excellent avalanche properties:

```javascript
const hash64 = (x, y, seed) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};
```

### Tribonacci Implementation

Follows Braben's original 48-bit state machine with 4 twists per cell:

```javascript
twist() {
  const temp = (this.s0 + this.s1 + this.s2) & 0xFFFF;
  this.s0 = this.s1;
  this.s1 = this.s2;
  this.s2 = temp;
  return temp;
}
```

### Performance Characteristics

| Metric | Tribonacci | Hash |
|--------|------------|------|
| Access cell N | O(N) iterations | O(1) direct |
| GPU utilization | 1 core | 1000s of cores |
| Random access | Impossible | Native |
| Memory required | 6 bytes state | 0 bytes |

## 🎨 Customization

### Styling

The component uses Tailwind CSS classes. To customize:

1. **Colors**: Modify the `hashToColor()` function for different color schemes
2. **Layout**: Adjust Tailwind classes in the JSX
3. **Animations**: Modify `cellsPerFrame` or the `requestAnimationFrame` logic

### Adding New Race Modes

Extend the `raceMode` switch in `useRaceSimulation`:

```javascript
if (raceMode === 'spiral') {
  // Custom spiral access pattern
  idx = spiralIndex(parallelIndexRef.current, gridWidth, gridHeight);
}
```

## 🤝 Contributing

Contributions welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Related

- [Beyond Tribonacci Methodology](https://github.com/MushroomFleet/BEYOND-TRIBONACCI) - Full documentation
- [Elite (1984)](https://en.wikipedia.org/wiki/Elite_(video_game)) - Original Tribonacci implementation
- [Procedural Generation Wiki](https://pcg.fandom.com/) - Community resources

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{beyond_tribonacci_race,
  title = {Beyond Tribonacci: Sequential vs Parallel Race Demo},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
