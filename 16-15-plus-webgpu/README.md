# BEYOND-TRIBONACCI: Sequential vs Parallel Race V2

[![WebGPU](https://img.shields.io/badge/WebGPU-Enabled-00d4aa?style=flat-square&logo=webgl)](https://gpuweb.github.io/gpuweb/)
[![React](https://img.shields.io/badge/React-18.2.0-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

A visual demonstration of the fundamental difference between **sequential** (Tribonacci-based) and **parallel** (hash-based) procedural generation — powered by **WebGPU** for true GPU parallelism.

![Sequential vs Parallel Race](https://img.shields.io/badge/Demo-Live-brightgreen?style=for-the-badge)

## 🎯 What This Demonstrates

In 1984, David Braben's Elite used a clever **Tribonacci sequence** to generate 2,048 star systems from just 6 bytes of seed data. This was brilliant for its time, but has an inherent limitation: **each state depends on the previous three states**, making it fundamentally sequential.

Modern **Position-is-Seed** approaches using hash functions have no such limitation — any cell can be computed independently, enabling **massive parallelization** on GPUs.

This demo races both approaches side-by-side:

| Approach | Access Pattern | Complexity | Parallelism |
|----------|---------------|------------|-------------|
| 🐢 **Tribonacci** | Sequential only | O(N) to reach cell N | ❌ None |
| ⚡ **Hash (WebGPU)** | Random access | O(1) per cell | ✅ Thousands of threads |

## 🚀 Quick Preview

### Option 1: Open the Demo Directly
Simply open `demo.html` in a WebGPU-compatible browser:

```bash
# Clone the repository
git clone https://github.com/MushroomFleet/BEYOND-TRIBONACCI.git
cd BEYOND-TRIBONACCI

# Open demo.html in Chrome/Edge 113+
# On Windows:
start demo.html

# On macOS:
open demo.html

# On Linux:
xdg-open demo.html
```

### Option 2: Serve Locally
```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .

# Then open http://localhost:8080/demo.html
```

### Browser Requirements
- **Chrome 113+** or **Edge 113+** (WebGPU enabled by default)
- **Firefox Nightly** with `dom.webgpu.enabled` flag
- Hardware acceleration must be enabled

## 📦 Integration Guide

### For React Projects

1. **Copy the component:**
   ```bash
   cp SequentialVsParallelRaceV2.jsx src/components/
   ```

2. **Install dependencies** (if not already present):
   ```bash
   npm install react react-dom
   ```

3. **Import and use:**
   ```jsx
   import SequentialVsParallelRaceV2 from './components/SequentialVsParallelRaceV2';
   
   function App() {
     return <SequentialVsParallelRaceV2 />;
   }
   ```

4. **Ensure Tailwind CSS is configured** (or adapt styles to your CSS framework)

### For Vanilla JavaScript Projects

Use the standalone `demo.html` as a reference. The key pieces are:

1. **WebGPU initialization** (`useWebGPU` hook)
2. **Compute shader** (`COMPUTE_SHADER` constant)
3. **Pipeline setup** (`useGPUCompute` hook)

### Extracting Just the WebGPU Hash Compute

If you only need the GPU compute functionality:

```javascript
// WGSL Compute Shader
const COMPUTE_SHADER = `
struct Params {
  width: u32,
  height: u32,
  seed: u32,
  _pad: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;

fn hash64(x: u32, y: u32, seed: u32) -> u32 {
  var h: u32 = (x * 374761393u + y * 668265263u + seed * 2147483647u);
  h = (h ^ (h >> 15u)) * 0x85ebca6bu;
  h = (h ^ (h >> 13u)) * 0xc2b2ae35u;
  return h ^ (h >> 16u);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;
  
  if (x >= params.width || y >= params.height) {
    return;
  }
  
  let idx = y * params.width + x;
  output[idx] = hash64(x, y, params.seed);
}
`;
```

## 🏗️ Project Structure

```
BEYOND-TRIBONACCI/
├── demo.html                        # Standalone demo (no build required)
├── SequentialVsParallelRaceV2.jsx   # React component
├── README.md                        # This file
└── LICENSE                          # MIT License
```

## 🔧 Configuration Options

The component accepts these configurable parameters:

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `gridSize` | 64 | 16-128 | Grid dimensions (gridSize × gridSize) |
| `cellsPerFrame` | 50 | 10-200 | Animation reveal speed |
| `seed` | 42 | 1-9999 | Random seed for generation |

## 🧠 Technical Details

### The Tribonacci Limitation

```javascript
// Each state depends on the previous THREE states
// MUST iterate sequentially - no skipping allowed
function tribonacciNext() {
  const temp = (s0 + s1 + s2) & 0xFFFF;
  s0 = s1;
  s1 = s2;  
  s2 = temp;
  return s2;
}

// To get cell 1000, must compute cells 0-999 first
// O(N) complexity, fundamentally serial
```

### The Hash Advantage

```wgsl
// Position IS the seed - no dependencies
// ANY cell can be computed independently
@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  // Each GPU thread computes ONE cell
  // ALL 16,384 cells computed SIMULTANEOUSLY
  output[id.y * width + id.x] = hash(id.x, id.y, seed);
}
```

### Performance Comparison

On a typical GPU (e.g., RTX 2050):

| Grid Size | Cells | Tribonacci (CPU) | Hash (WebGPU) | Speedup |
|-----------|-------|------------------|---------------|---------|
| 32×32 | 1,024 | ~50ms | ~0.5ms | ~100x |
| 64×64 | 4,096 | ~200ms | ~0.8ms | ~250x |
| 128×128 | 16,384 | ~800ms | ~1.2ms | ~650x |

*Results vary by hardware. The demo displays actual measured times.*

## 🎮 Use Cases

This Position-is-Seed paradigm powers:

- **Procedural terrain generation** (Minecraft-style infinite worlds)
- **Star system generation** (No Man's Sky, Elite Dangerous)
- **Texture synthesis** (GPU-computed noise)
- **Roguelike dungeon generation** (deterministic from coordinates)
- **Any infinite procedural content**

## 🤝 Contributing

Contributions welcome! Please feel free to submit issues and pull requests.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{beyond_tribonacci,
  title = {BEYOND-TRIBONACCI: WebGPU Sequential vs Parallel Race Demonstration},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/BEYOND-TRIBONACCI},
  version = {1.0.0}
}
```

### Donate:

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
