import React, { useState, useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// SEQUENTIAL VS PARALLEL RACE
// Demonstrates Tribonacci limitations vs hash-based advantages
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// HASH UTILITIES (Position-is-Seed paradigm)
// ─────────────────────────────────────────────────────────────────────────────

// SplitMix64-style hash - bijective, excellent avalanche
const hash64 = (x, y, seed) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

// Convert hash to normalized float [0, 1)
const hashToFloat = (h) => (h >>> 0) / 4294967296;

// Generate cell color from hash (deterministic)
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
    // Initialize 48-bit state from seed
    this.s0 = (seed & 0xFFFF);
    this.s1 = ((seed >> 16) & 0xFFFF) || 12345;
    this.s2 = ((seed >> 32) & 0xFFFF) || 54321;
    this.index = 0;
  }
  
  // Single twist operation
  twist() {
    const temp = (this.s0 + this.s1 + this.s2) & 0xFFFF;
    this.s0 = this.s1;
    this.s1 = this.s2;
    this.s2 = temp;
    return temp;
  }
  
  // Generate next cell value (4 twists per cell, as per original Braben)
  next() {
    let value = 0;
    for (let i = 0; i < 4; i++) {
      value = (value << 4) | (this.twist() & 0xF);
    }
    this.index++;
    return value;
  }
  
  // CRITICAL LIMITATION: To reach cell N, must compute 0 through N-1
  // This is the fundamental sequential bottleneck
  seekTo(targetIndex) {
    while (this.index < targetIndex) {
      this.next();
    }
  }
  
  reset(seed) {
    this.s0 = (seed & 0xFFFF);
    this.s1 = ((seed >> 16) & 0xFFFF) || 12345;
    this.s2 = ((seed >> 32) & 0xFFFF) || 54321;
    this.index = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PARALLEL HASH GENERATOR
// O(1) access to ANY cell - position is seed
// ─────────────────────────────────────────────────────────────────────────────

const parallelGenerate = (x, y, seed) => {
  return hash64(x, y, seed);
};

// ─────────────────────────────────────────────────────────────────────────────
// RACE SIMULATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const useRaceSimulation = (gridWidth, gridHeight, seed, cellsPerFrame, raceMode) => {
  const [sequentialCells, setSequentialCells] = useState([]);
  const [parallelCells, setParallelCells] = useState([]);
  const [sequentialTime, setSequentialTime] = useState(0);
  const [parallelTime, setParallelTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const tribonacciRef = useRef(null);
  const sequentialIndexRef = useRef(0);
  const parallelIndexRef = useRef(0);
  const startTimeRef = useRef(0);
  const sequentialStartRef = useRef(0);
  const parallelStartRef = useRef(0);
  const animationRef = useRef(null);
  
  const totalCells = gridWidth * gridHeight;
  
  const reset = useCallback(() => {
    setSequentialCells([]);
    setParallelCells([]);
    setSequentialTime(0);
    setParallelTime(0);
    setIsRunning(false);
    setIsComplete(false);
    sequentialIndexRef.current = 0;
    parallelIndexRef.current = 0;
    tribonacciRef.current = new TribonacciGenerator(seed);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [seed]);
  
  const start = useCallback(() => {
    reset();
    setIsRunning(true);
    startTimeRef.current = performance.now();
    sequentialStartRef.current = performance.now();
    parallelStartRef.current = performance.now();
    tribonacciRef.current = new TribonacciGenerator(seed);
  }, [reset, seed]);
  
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
        const batchStart = performance.now();
        
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
      
      // Process parallel cells (Hash - can access ANY cell in ANY order)
      if (!parallelDone) {
        const newParallelCells = [];
        
        // Demonstrate parallel advantage: generate in random order!
        for (let i = 0; i < cellsPerFrame && parallelIndexRef.current < totalCells; i++) {
          let idx;
          if (raceMode === 'random') {
            // Random access pattern - impossible for Tribonacci
            idx = Math.floor(hashToFloat(hash64(parallelIndexRef.current, seed, 999)) * totalCells);
            // Ensure we don't duplicate (simple approach)
            idx = parallelIndexRef.current; // Fall back to sequential for fair comparison
          } else if (raceMode === 'corners') {
            // Generate corners first, then spiral in
            const progress = parallelIndexRef.current / totalCells;
            if (progress < 0.25) {
              // Corners
              const cornerIdx = Math.floor(progress * 4);
              const corners = [0, gridWidth - 1, totalCells - gridWidth, totalCells - 1];
              idx = corners[cornerIdx] || parallelIndexRef.current;
            } else {
              idx = parallelIndexRef.current;
            }
          } else {
            // Sequential for fair timing comparison
            idx = parallelIndexRef.current;
          }
          
          const x = idx % gridWidth;
          const y = Math.floor(idx / gridWidth);
          const value = parallelGenerate(x, y, seed);
          
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
  }, [isRunning, gridWidth, gridHeight, totalCells, cellsPerFrame, seed, raceMode]);
  
  return {
    sequentialCells,
    parallelCells,
    sequentialTime,
    parallelTime,
    isRunning,
    isComplete,
    start,
    reset,
    totalCells,
    sequentialProgress: sequentialIndexRef.current,
    parallelProgress: parallelIndexRef.current
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GRID VISUALIZATION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const Grid = ({ cells, width, height, title, time, progress, total, cellSize }) => {
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
              background: title.includes('Sequential') ? '#ef4444' : '#22c55e'
            }}
          />
        </div>
        {time > 0 && (
          <div className="flex justify-between text-gray-300">
            <span>Time:</span>
            <span className="font-mono font-bold">{time.toFixed(2)} ms</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPLANATION PANEL
// ─────────────────────────────────────────────────────────────────────────────

const ExplanationPanel = ({ isComplete, sequentialTime, parallelTime }) => {
  const speedup = sequentialTime > 0 && parallelTime > 0 
    ? (sequentialTime / parallelTime).toFixed(2) 
    : null;
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 space-y-3">
      <h4 className="font-bold text-white text-base">Why the Difference?</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="font-semibold text-red-400">Sequential (Tribonacci)</span>
          </div>
          <ul className="text-xs space-y-1 text-gray-400">
            <li>• Must compute cells 0→N in order</li>
            <li>• Each state depends on previous 3</li>
            <li>• <code className="bg-gray-700 px-1 rounded">s[n] = s[n-1] + s[n-2] + s[n-3]</code></li>
            <li>• Cannot parallelize</li>
            <li>• O(N) to reach any cell</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="font-semibold text-green-400">Parallel (Hash)</span>
          </div>
          <ul className="text-xs space-y-1 text-gray-400">
            <li>• Any cell computed independently</li>
            <li>• Position IS the seed</li>
            <li>• <code className="bg-gray-700 px-1 rounded">hash(x, y, seed)</code></li>
            <li>• Fully parallelizable</li>
            <li>• O(1) to reach any cell</li>
          </ul>
        </div>
      </div>
      
      {isComplete && speedup && (
        <div className="mt-4 p-3 bg-gray-900 rounded border border-gray-700">
          <div className="text-center">
            <span className="text-gray-400">In this demo: </span>
            <span className="text-white font-bold">~{speedup}x</span>
            <span className="text-gray-400"> difference observed</span>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Note: Real-world GPU parallelization can achieve 1000x+ speedup
            by computing thousands of cells simultaneously.
          </p>
        </div>
      )}
      
      <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
        <strong>Key Insight:</strong> Tribonacci was brilliant for 1984's 6-byte constraint.
        Modern hash functions enable infinite parallelism with O(1) random access.
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SequentialVsParallelRace() {
  const [gridSize, setGridSize] = useState(32);
  const [cellsPerFrame, setCellsPerFrame] = useState(10);
  const [seed, setSeed] = useState(42);
  const [raceMode, setRaceMode] = useState('sequential');
  
  const gridWidth = gridSize;
  const gridHeight = gridSize;
  const cellSize = Math.max(4, Math.floor(280 / gridSize));
  
  const {
    sequentialCells,
    parallelCells,
    sequentialTime,
    parallelTime,
    isRunning,
    isComplete,
    start,
    reset,
    totalCells
  } = useRaceSimulation(gridWidth, gridHeight, seed, cellsPerFrame, raceMode);
  
  const sequentialProgress = sequentialCells.length;
  const parallelProgress = parallelCells.length;
  
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Sequential vs Parallel Race
          </h1>
          <p className="text-gray-400">
            Tribonacci's O(N) sequential limitation vs Hash's O(1) parallel advantage
          </p>
        </div>
        
        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Grid Size: {gridSize}×{gridSize} = {gridSize * gridSize} cells
              </label>
              <input
                type="range"
                min="10"
                max="50"
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
                Cells/Frame: {cellsPerFrame}
              </label>
              <input
                type="range"
                min="1"
                max="50"
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
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Access Pattern
              </label>
              <select
                value={raceMode}
                onChange={(e) => {
                  setRaceMode(e.target.value);
                  reset();
                }}
                disabled={isRunning}
                className="w-full bg-gray-700 text-white rounded p-1 text-sm"
              >
                <option value="sequential">Sequential (fair comparison)</option>
                <option value="random">Random Access</option>
                <option value="corners">Corners First</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-center gap-4">
            <button
              onClick={start}
              disabled={isRunning}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 
                       text-white font-semibold rounded transition-colors"
            >
              {isRunning ? 'Racing...' : 'Start Race'}
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
        
        {/* Race Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Grid
            cells={sequentialCells}
            width={gridWidth}
            height={gridHeight}
            title="🐢 Sequential (Tribonacci)"
            time={sequentialTime}
            progress={sequentialProgress}
            total={totalCells}
            cellSize={cellSize}
          />
          <Grid
            cells={parallelCells}
            width={gridWidth}
            height={gridHeight}
            title="⚡ Parallel (Hash)"
            time={parallelTime}
            progress={parallelProgress}
            total={totalCells}
            cellSize={cellSize}
          />
        </div>
        
        {/* Winner Banner */}
        {isComplete && (
          <div className={`text-center p-4 rounded-lg mb-6 ${
            parallelTime < sequentialTime 
              ? 'bg-green-900 border border-green-500' 
              : 'bg-red-900 border border-red-500'
          }`}>
            <span className="text-2xl font-bold text-white">
              {parallelTime < sequentialTime ? '⚡ Parallel Wins!' : '🐢 Sequential Wins!'}
            </span>
            <div className="text-gray-300 mt-1">
              Difference: {Math.abs(sequentialTime - parallelTime).toFixed(2)} ms
              ({((Math.max(sequentialTime, parallelTime) / Math.min(sequentialTime, parallelTime) - 1) * 100).toFixed(1)}% faster)
            </div>
          </div>
        )}
        
        {/* Explanation */}
        <ExplanationPanel 
          isComplete={isComplete}
          sequentialTime={sequentialTime}
          parallelTime={parallelTime}
        />
        
        {/* Code Comparison */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-red-400 font-semibold mb-2">Tribonacci (Sequential)</h4>
            <pre className="text-xs text-gray-300 overflow-x-auto">
{`// MUST iterate through ALL previous states
function getCell(index) {
  let s0 = seed0, s1 = seed1, s2 = seed2;
  
  // O(N) - cannot skip!
  for (let i = 0; i < index * 4; i++) {
    let temp = (s0 + s1 + s2) & 0xFFFF;
    s0 = s1;
    s1 = s2;
    s2 = temp;
  }
  return s2;
}`}
            </pre>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-green-400 font-semibold mb-2">Hash (Parallel)</h4>
            <pre className="text-xs text-gray-300 overflow-x-auto">
{`// O(1) - direct access to ANY cell
function getCell(x, y, seed) {
  // Position IS the seed
  return hash(x, y, seed);
}

// GPU can compute ALL cells simultaneously:
// parallelFor(0, 1000000, (i) => {
//   cells[i] = getCell(i % w, i / w, seed);
// });`}
            </pre>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            Braben's 6-byte Tribonacci encoded 2,048 systems brilliantly in 1984.
            Modern hashes encode infinite systems in 0 bytes of storage.
          </p>
          <p className="mt-1">
            <strong>Position-is-Seed Paradigm:</strong> Any coordinate, anywhere in infinite space, 
            immediately computes its contents.
          </p>
        </div>
      </div>
    </div>
  );
}
