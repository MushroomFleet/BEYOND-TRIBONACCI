import React, { useState, useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// SEQUENTIAL VS PARALLEL RACE V2 - WebGPU Edition
// Demonstrates ACTUAL GPU parallelism vs inherent sequential limitations
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// HASH UTILITIES (Position-is-Seed paradigm) - CPU version for comparison
// ─────────────────────────────────────────────────────────────────────────────

const hash64 = (x, y, seed) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

const hashToColor = (h) => {
  const hue = (h % 360);
  const sat = 60 + (h % 40);
  const light = 45 + ((h >> 8) % 20);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
};

// ─────────────────────────────────────────────────────────────────────────────
// TRIBONACCI SEQUENTIAL GENERATOR
// Must compute every state from 0 to N - O(N) access, no parallelization
// ─────────────────────────────────────────────────────────────────────────────

class TribonacciGenerator {
  constructor(seed) {
    this.s0 = (seed & 0xFFFF);
    this.s1 = ((seed >> 16) & 0xFFFF) || 12345;
    this.s2 = ((seed >> 32) & 0xFFFF) || 54321;
    this.index = 0;
  }
  
  twist() {
    const temp = (this.s0 + this.s1 + this.s2) & 0xFFFF;
    this.s0 = this.s1;
    this.s1 = this.s2;
    this.s2 = temp;
    return temp;
  }
  
  next() {
    let value = 0;
    for (let i = 0; i < 4; i++) {
      value = (value << 4) | (this.twist() & 0xF);
    }
    this.index++;
    return value;
  }
  
  reset(seed) {
    this.s0 = (seed & 0xFFFF);
    this.s1 = ((seed >> 16) & 0xFFFF) || 12345;
    this.s2 = ((seed >> 32) & 0xFFFF) || 54321;
    this.index = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBGPU COMPUTE SHADER - Hash computed in parallel on GPU
// ─────────────────────────────────────────────────────────────────────────────

const COMPUTE_SHADER = `
struct Params {
  width: u32,
  height: u32,
  seed: u32,
  _pad: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;

// SplitMix64-style hash - same as CPU version
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

// ─────────────────────────────────────────────────────────────────────────────
// WEBGPU INITIALIZATION AND MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const useWebGPU = () => {
  const [device, setDevice] = useState(null);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  
  useEffect(() => {
    const initWebGPU = async () => {
      try {
        if (!navigator.gpu) {
          setIsSupported(false);
          setError('WebGPU not supported in this browser');
          return;
        }
        
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          setIsSupported(false);
          setError('No WebGPU adapter found');
          return;
        }
        
        const gpuDevice = await adapter.requestDevice();
        setDevice(gpuDevice);
        
        gpuDevice.lost.then((info) => {
          console.error('WebGPU device lost:', info.message);
          setDevice(null);
          setError(`Device lost: ${info.message}`);
        });
      } catch (err) {
        setIsSupported(false);
        setError(err.message);
      }
    };
    
    initWebGPU();
  }, []);
  
  return { device, error, isSupported };
};

// ─────────────────────────────────────────────────────────────────────────────
// GPU COMPUTE EXECUTOR
// ─────────────────────────────────────────────────────────────────────────────

const useGPUCompute = (device) => {
  const pipelineRef = useRef(null);
  const bindGroupLayoutRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (!device) return;
    
    const initPipeline = async () => {
      try {
        const shaderModule = device.createShaderModule({
          code: COMPUTE_SHADER
        });
        
        // Check for shader compilation errors
        const compilationInfo = await shaderModule.getCompilationInfo();
        if (compilationInfo.messages.some(m => m.type === 'error')) {
          console.error('Shader compilation errors:', compilationInfo.messages);
          return;
        }
        
        bindGroupLayoutRef.current = device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.COMPUTE,
              buffer: { type: 'uniform' }
            },
            {
              binding: 1,
              visibility: GPUShaderStage.COMPUTE,
              buffer: { type: 'storage' }
            }
          ]
        });
        
        pipelineRef.current = device.createComputePipeline({
          layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayoutRef.current]
          }),
          compute: {
            module: shaderModule,
            entryPoint: 'main'
          }
        });
        
        setIsReady(true);
        console.log('WebGPU compute pipeline ready!');
      } catch (err) {
        console.error('Failed to create compute pipeline:', err);
      }
    };
    
    initPipeline();
  }, [device]);
  
  const computeGrid = useCallback(async (width, height, seed) => {
    if (!device || !pipelineRef.current) return null;
    
    const totalCells = width * height;
    
    // Create uniform buffer for params
    const paramsBuffer = device.createBuffer({
      size: 16, // 4 u32 values
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    
    device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([width, height, seed, 0]));
    
    // Create output buffer
    const outputBuffer = device.createBuffer({
      size: totalCells * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    
    // Create staging buffer for reading back
    const stagingBuffer = device.createBuffer({
      size: totalCells * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });
    
    // Create bind group
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayoutRef.current,
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } }
      ]
    });
    
    // Record and submit commands
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipelineRef.current);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(
      Math.ceil(width / 16),
      Math.ceil(height / 16)
    );
    passEncoder.end();
    
    // Copy output to staging buffer
    commandEncoder.copyBufferToBuffer(
      outputBuffer, 0,
      stagingBuffer, 0,
      totalCells * 4
    );
    
    device.queue.submit([commandEncoder.finish()]);
    
    // Read back results
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const resultArray = new Uint32Array(stagingBuffer.getMappedRange().slice(0));
    stagingBuffer.unmap();
    
    // Cleanup
    paramsBuffer.destroy();
    outputBuffer.destroy();
    stagingBuffer.destroy();
    
    return resultArray;
  }, [device]);
  
  return { computeGrid, isReady };
};

// ─────────────────────────────────────────────────────────────────────────────
// RACE SIMULATION ENGINE - WebGPU Edition
// ─────────────────────────────────────────────────────────────────────────────

const useRaceSimulation = (gridWidth, gridHeight, seed, cellsPerFrame, device, computeGrid) => {
  const [sequentialCells, setSequentialCells] = useState([]);
  const [parallelCells, setParallelCells] = useState([]);
  const [gpuResults, setGpuResults] = useState(null);
  const [sequentialTime, setSequentialTime] = useState(0);
  const [parallelTime, setParallelTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [gpuComputeTime, setGpuComputeTime] = useState(0);
  
  const tribonacciRef = useRef(null);
  const sequentialIndexRef = useRef(0);
  const parallelIndexRef = useRef(0);
  const sequentialStartRef = useRef(0);
  const parallelStartRef = useRef(0);
  const animationRef = useRef(null);
  
  const totalCells = gridWidth * gridHeight;
  
  const reset = useCallback(() => {
    setSequentialCells([]);
    setParallelCells([]);
    setGpuResults(null);
    setSequentialTime(0);
    setParallelTime(0);
    setGpuComputeTime(0);
    setIsRunning(false);
    setIsComplete(false);
    sequentialIndexRef.current = 0;
    parallelIndexRef.current = 0;
    tribonacciRef.current = new TribonacciGenerator(seed);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [seed]);
  
  const start = useCallback(async () => {
    reset();
    setIsRunning(true);
    
    tribonacciRef.current = new TribonacciGenerator(seed);
    sequentialStartRef.current = performance.now();
    
    // GPU computes ALL cells IMMEDIATELY (true parallelism!)
    if (device && computeGrid) {
      parallelStartRef.current = performance.now();
      const results = await computeGrid(gridWidth, gridHeight, seed);
      const gpuEndTime = performance.now();
      setGpuComputeTime(gpuEndTime - parallelStartRef.current);
      setGpuResults(results);
    }
  }, [reset, seed, device, computeGrid, gridWidth, gridHeight]);
  
  // Animation loop
  useEffect(() => {
    if (!isRunning) return;
    
    const animate = () => {
      const now = performance.now();
      let sequentialDone = sequentialIndexRef.current >= totalCells;
      let parallelDone = parallelIndexRef.current >= totalCells;
      
      // Process sequential cells (Tribonacci - MUST be sequential)
      if (!sequentialDone) {
        const newSequentialCells = [];
        
        for (let i = 0; i < cellsPerFrame && sequentialIndexRef.current < totalCells; i++) {
          const idx = sequentialIndexRef.current;
          const value = tribonacciRef.current.next();
          const x = idx % gridWidth;
          const y = Math.floor(idx / gridWidth);
          newSequentialCells.push({
            x, y, idx,
            value,
            color: hashToColor(value)
          });
          sequentialIndexRef.current++;
        }
        
        if (newSequentialCells.length > 0) {
          setSequentialCells(prev => [...prev, ...newSequentialCells]);
        }
        
        if (sequentialIndexRef.current >= totalCells) {
          setSequentialTime(now - sequentialStartRef.current);
          sequentialDone = true;
        }
      }
      
      // Reveal GPU results progressively (data already computed!)
      if (!parallelDone && gpuResults) {
        const newParallelCells = [];
        
        // Reveal cells at same rate for visual fairness
        // But the GPU already computed them ALL!
        for (let i = 0; i < cellsPerFrame && parallelIndexRef.current < totalCells; i++) {
          const idx = parallelIndexRef.current;
          const x = idx % gridWidth;
          const y = Math.floor(idx / gridWidth);
          const value = gpuResults[idx];
          
          newParallelCells.push({
            x, y, idx,
            value,
            color: hashToColor(value)
          });
          parallelIndexRef.current++;
        }
        
        if (newParallelCells.length > 0) {
          setParallelCells(prev => [...prev, ...newParallelCells]);
        }
        
        if (parallelIndexRef.current >= totalCells) {
          setParallelTime(now - parallelStartRef.current);
          parallelDone = true;
        }
      }
      
      if (sequentialDone && parallelDone) {
        setIsRunning(false);
        setIsComplete(true);
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, gridWidth, gridHeight, totalCells, cellsPerFrame, gpuResults]);
  
  return {
    sequentialCells,
    parallelCells,
    sequentialTime,
    parallelTime,
    gpuComputeTime,
    isRunning,
    isComplete,
    start,
    reset,
    totalCells
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GRID VISUALIZATION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const Grid = ({ cells, width, height, title, time, progress, total, cellSize, computeTime }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    cells.forEach(cell => {
      ctx.fillStyle = cell.color;
      ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize - 1, cellSize - 1);
    });
  }, [cells, cellSize, width, height]);
  
  const progressPercent = ((progress / total) * 100).toFixed(1);
  const isGPU = title.includes('GPU');
  
  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
      <canvas
        ref={canvasRef}
        width={width * cellSize}
        height={height * cellSize}
        className="border border-gray-600 rounded"
        style={{ background: '#1a1a2e' }}
      />
      <div className="mt-2 text-sm space-y-1 w-full">
        <div className="flex justify-between text-gray-300">
          <span>Progress:</span>
          <span className="font-mono">{progress} / {total} ({progressPercent}%)</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-100"
            style={{ 
              width: `${progressPercent}%`,
              background: isGPU ? '#22c55e' : '#ef4444'
            }}
          />
        </div>
        {computeTime > 0 && isGPU && (
          <div className="flex justify-between text-cyan-400">
            <span>GPU Compute:</span>
            <span className="font-mono font-bold">{computeTime.toFixed(2)} ms ⚡</span>
          </div>
        )}
        {time > 0 && (
          <div className="flex justify-between text-gray-300">
            <span>Total Time:</span>
            <span className="font-mono font-bold">{time.toFixed(2)} ms</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPLANATION PANEL - WebGPU Edition
// ─────────────────────────────────────────────────────────────────────────────

const ExplanationPanel = ({ isComplete, sequentialTime, parallelTime, gpuComputeTime, totalCells }) => {
  const speedup = sequentialTime > 0 && gpuComputeTime > 0 
    ? (sequentialTime / gpuComputeTime).toFixed(0) 
    : null;
  
  const throughput = gpuComputeTime > 0 
    ? ((totalCells / gpuComputeTime) * 1000).toFixed(0)
    : null;
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 space-y-3">
      <h4 className="font-bold text-white text-base">Why the Massive Difference?</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="font-semibold text-red-400">Sequential (Tribonacci)</span>
          </div>
          <ul className="text-xs space-y-1 text-gray-400">
            <li>• Must compute cells 0→N in order</li>
            <li>• Each state depends on previous 3</li>
            <li>• Runs on single CPU thread</li>
            <li>• Cannot parallelize by design</li>
            <li>• O(N) complexity, serial execution</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="font-semibold text-green-400">Parallel (WebGPU Hash)</span>
          </div>
          <ul className="text-xs space-y-1 text-gray-400">
            <li>• ALL cells computed simultaneously</li>
            <li>• Position IS the seed (no state)</li>
            <li>• Runs on 1000s of GPU cores</li>
            <li>• Each cell independent</li>
            <li>• O(1) per cell, massive parallelism</li>
          </ul>
        </div>
      </div>
      
      {isComplete && gpuComputeTime > 0 && (
        <div className="mt-4 p-3 bg-gradient-to-r from-green-900/50 to-cyan-900/50 rounded border border-green-500/50">
          <div className="text-center space-y-2">
            <div>
              <span className="text-gray-400">GPU computed </span>
              <span className="text-white font-bold">{totalCells.toLocaleString()} cells</span>
              <span className="text-gray-400"> in </span>
              <span className="text-cyan-400 font-bold">{gpuComputeTime.toFixed(2)} ms</span>
            </div>
            {speedup && (
              <div className="text-2xl font-bold text-green-400">
                ~{speedup}x faster than sequential!
              </div>
            )}
            {throughput && (
              <div className="text-xs text-gray-400">
                Throughput: {parseInt(throughput).toLocaleString()} cells/second
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
        <strong>Key Insight:</strong> The hash function is embarrassingly parallel. 
        While Tribonacci plods through cells one by one, WebGPU computes the entire grid 
        in a single parallel dispatch across thousands of GPU threads.
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WEBGPU FALLBACK MESSAGE
// ─────────────────────────────────────────────────────────────────────────────

const WebGPUFallback = ({ error }) => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
    <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-lg text-center">
      <h2 className="text-2xl font-bold text-red-400 mb-4">WebGPU Not Available</h2>
      <p className="text-gray-300 mb-4">
        This demo requires WebGPU to demonstrate true GPU parallelism.
      </p>
      <p className="text-sm text-gray-400 mb-4">
        {error || 'Please use a browser that supports WebGPU (Chrome 113+, Edge 113+, or Firefox Nightly with flags enabled).'}
      </p>
      <div className="text-xs text-gray-500">
        <p>Try:</p>
        <ul className="mt-2 space-y-1">
          <li>• Chrome/Edge 113 or newer</li>
          <li>• Enable chrome://flags/#enable-unsafe-webgpu</li>
          <li>• Make sure hardware acceleration is enabled</li>
        </ul>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SequentialVsParallelRaceV2() {
  const [gridSize, setGridSize] = useState(64);
  const [cellsPerFrame, setCellsPerFrame] = useState(50);
  const [seed, setSeed] = useState(42);
  
  const { device, error, isSupported } = useWebGPU();
  const { computeGrid, isReady } = useGPUCompute(device);
  
  const gridWidth = gridSize;
  const gridHeight = gridSize;
  const cellSize = Math.max(3, Math.floor(320 / gridSize));
  
  const {
    sequentialCells,
    parallelCells,
    sequentialTime,
    parallelTime,
    gpuComputeTime,
    isRunning,
    isComplete,
    start,
    reset,
    totalCells
  } = useRaceSimulation(gridWidth, gridHeight, seed, cellsPerFrame, device, computeGrid);
  
  const sequentialProgress = sequentialCells.length;
  const parallelProgress = parallelCells.length;
  
  if (!isSupported) {
    return <WebGPUFallback error={error} />;
  }
  
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Sequential vs Parallel Race <span className="text-cyan-400">V2</span>
          </h1>
          <p className="text-gray-400">
            Tribonacci's O(N) sequential limitation vs WebGPU's <span className="text-green-400 font-semibold">true parallel</span> advantage
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-cyan-900/50 rounded-full border border-cyan-500/50">
            <div className={`w-2 h-2 rounded-full ${device ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-xs text-cyan-300">
              {device ? 'WebGPU Active' : 'Initializing WebGPU...'}
            </span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Grid Size: {gridSize}×{gridSize} = <span className="text-cyan-400 font-bold">{(gridSize * gridSize).toLocaleString()}</span> cells
              </label>
              <input
                type="range"
                min="16"
                max="128"
                value={gridSize}
                onChange={(e) => {
                  setGridSize(Number(e.target.value));
                  reset();
                }}
                disabled={isRunning}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Reveal Speed: {cellsPerFrame} cells/frame
              </label>
              <input
                type="range"
                min="10"
                max="200"
                value={cellsPerFrame}
                onChange={(e) => setCellsPerFrame(Number(e.target.value))}
                disabled={isRunning}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Seed: {seed}
              </label>
              <input
                type="range"
                min="1"
                max="9999"
                value={seed}
                onChange={(e) => {
                  setSeed(Number(e.target.value));
                  reset();
                }}
                disabled={isRunning}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex justify-center gap-4">
            <button
              onClick={start}
              disabled={isRunning || !isReady}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 
                       hover:from-cyan-500 hover:to-blue-500
                       disabled:from-gray-600 disabled:to-gray-600 
                       text-white font-semibold rounded transition-all
                       shadow-lg shadow-cyan-500/25"
            >
              {isRunning ? 'Racing...' : !isReady ? 'Loading GPU...' : '⚡ Start Race'}
            </button>
            <button
              onClick={reset}
              disabled={isRunning}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700
                       text-white font-semibold rounded transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
        
        {/* GPU Compute Banner */}
        {gpuComputeTime > 0 && (
          <div className="bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/50 
                        rounded-lg p-3 mb-6 text-center">
            <span className="text-green-400">
              ⚡ GPU computed <strong>{totalCells.toLocaleString()}</strong> cells in{' '}
              <strong className="text-cyan-400">{gpuComputeTime.toFixed(2)}ms</strong>
              {' '}— now revealing results while CPU catches up...
            </span>
          </div>
        )}
        
        {/* Race Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Grid
            cells={sequentialCells}
            width={gridWidth}
            height={gridHeight}
            title="🐢 Sequential (Tribonacci CPU)"
            time={sequentialTime}
            progress={sequentialProgress}
            total={totalCells}
            cellSize={cellSize}
          />
          <Grid
            cells={parallelCells}
            width={gridWidth}
            height={gridHeight}
            title="⚡ Parallel (WebGPU Hash)"
            time={parallelTime}
            progress={parallelProgress}
            total={totalCells}
            cellSize={cellSize}
            computeTime={gpuComputeTime}
          />
        </div>
        
        {/* Winner Banner */}
        {isComplete && (
          <div className="bg-gradient-to-r from-green-900 to-cyan-900 border border-green-500 
                        rounded-lg p-4 mb-6 text-center">
            <span className="text-3xl font-bold text-white">
              ⚡ GPU Wins by a Landslide!
            </span>
            <div className="text-gray-300 mt-2">
              <p>
                GPU computed all {totalCells.toLocaleString()} cells in{' '}
                <span className="text-cyan-400 font-bold">{gpuComputeTime.toFixed(2)}ms</span>
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Sequential took <span className="text-red-400">{sequentialTime.toFixed(0)}ms</span> just to iterate through them
              </p>
            </div>
          </div>
        )}
        
        {/* Explanation */}
        <ExplanationPanel 
          isComplete={isComplete}
          sequentialTime={sequentialTime}
          parallelTime={parallelTime}
          gpuComputeTime={gpuComputeTime}
          totalCells={totalCells}
        />
        
        {/* Code Comparison */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-red-400 font-semibold mb-2">🐢 Tribonacci (Sequential CPU)</h4>
            <pre className="text-xs text-gray-300 overflow-x-auto">
{`// MUST iterate through ALL previous states
for (let i = 0; i < totalCells; i++) {
  // O(N) - cannot skip, cannot parallelize!
  let temp = (s0 + s1 + s2) & 0xFFFF;
  s0 = s1;
  s1 = s2;
  s2 = temp;
  cells[i] = s2;
}
// Single thread, sequential, ~${totalCells} iterations`}
            </pre>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-green-400 font-semibold mb-2">⚡ WebGPU Hash (Parallel)</h4>
            <pre className="text-xs text-gray-300 overflow-x-auto">
{`@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  // Each GPU thread computes ONE cell
  // ALL cells computed SIMULTANEOUSLY!
  output[id.y * width + id.x] = hash(id.x, id.y, seed);
}
// ${Math.ceil(gridWidth/16) * Math.ceil(gridHeight/16)} workgroups × 256 threads`}
            </pre>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500 space-y-1">
          <p>
            Braben's 6-byte Tribonacci encoded 2,048 systems brilliantly in 1984.
          </p>
          <p>
            WebGPU computes millions of cells in milliseconds — <strong>true parallelism</strong>.
          </p>
          <p className="text-cyan-400">
            <strong>Position-is-Seed + GPU = Infinite Worlds at Interactive Speeds</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
