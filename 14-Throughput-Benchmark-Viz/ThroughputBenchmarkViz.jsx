import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// HASH FUNCTION IMPLEMENTATIONS
// Pure JavaScript implementations for benchmarking
// ═══════════════════════════════════════════════════════════════════════════════

// xxHash-inspired fast hash (simplified for JS)
const xxHash = (seed) => {
  const PRIME1 = 0x9E3779B1;
  const PRIME2 = 0x85EBCA77;
  const PRIME3 = 0xC2B2AE3D;
  let h = seed + PRIME1;
  h = Math.imul(h ^ (h >>> 15), PRIME2);
  h = Math.imul(h ^ (h >>> 13), PRIME3);
  return (h ^ (h >>> 16)) >>> 0;
};

// PCG (Permuted Congruential Generator)
const pcg = (seed) => {
  let state = Math.imul(seed, 747796405) + 2891336453;
  state = state >>> 0;
  const word = Math.imul(((state >>> ((state >>> 28) + 4)) ^ state), 277803737);
  return ((word >>> 22) ^ word) >>> 0;
};

// MurmurHash3-inspired
const murmurHash = (seed) => {
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let h = seed;
  let k = seed * 0x12345;
  k = Math.imul(k, c1);
  k = (k << 15) | (k >>> 17);
  k = Math.imul(k, c2);
  h ^= k;
  h = (h << 13) | (h >>> 19);
  h = Math.imul(h, 5) + 0xe6546b64;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};

// Tribonacci (sequential, inherently slower)
const tribonacciStep = (state) => {
  const temp = (state.s0 + state.s1 + state.s2) & 0xFFFF;
  return { s0: state.s1, s1: state.s2, s2: temp };
};

const tribonacci = (seed) => {
  let state = { s0: seed & 0xFFFF, s1: (seed >> 16) & 0xFFFF, s2: (seed >> 8) & 0xFFFF };
  // Four twists per "generation" to simulate proper usage
  for (let i = 0; i < 4; i++) {
    state = tribonacciStep(state);
  }
  return (state.s0 << 16) | state.s1;
};

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const HASH_FUNCTIONS = [
  {
    id: 'xxhash',
    name: 'xxHash3',
    fn: xxHash,
    color: '#00FFAA',
    glowColor: 'rgba(0, 255, 170, 0.6)',
    description: 'Extremely fast, excellent quality',
    theoreticalPeak: '31.5 GB/s',
  },
  {
    id: 'pcg',
    name: 'PCG',
    fn: pcg,
    color: '#00AAFF',
    glowColor: 'rgba(0, 170, 255, 0.6)',
    description: 'GPU-optimized, branch-free',
    theoreticalPeak: '25+ GB/s',
  },
  {
    id: 'murmur',
    name: 'MurmurHash3',
    fn: murmurHash,
    color: '#FF6B00',
    glowColor: 'rgba(255, 107, 0, 0.6)',
    description: 'Classic, good distribution',
    theoreticalPeak: '5.2 GB/s',
  },
  {
    id: 'tribonacci',
    name: 'Tribonacci',
    fn: tribonacci,
    color: '#FF0066',
    glowColor: 'rgba(255, 0, 102, 0.6)',
    description: 'Sequential, 1984 Elite method',
    theoreticalPeak: '0.04 GB/s*',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ThroughputBenchmarkViz() {
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(
    HASH_FUNCTIONS.map(h => ({
      id: h.id,
      operations: 0,
      opsPerSecond: 0,
      lastSample: 0,
    }))
  );
  const [elapsedTime, setElapsedTime] = useState(0);
  const [batchSize, setBatchSize] = useState(10000);
  const [showDetails, setShowDetails] = useState(true);
  
  const animationRef = useRef(null);
  const startTimeRef = useRef(0);
  const countersRef = useRef(HASH_FUNCTIONS.map(() => ({ ops: 0, seed: 12345 })));
  const lastFrameTimeRef = useRef(0);
  
  // Format large numbers with SI suffixes
  const formatNumber = useCallback((num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  }, []);
  
  // Main benchmark loop
  const runBenchmark = useCallback((timestamp) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
      lastFrameTimeRef.current = timestamp;
    }
    
    const deltaTime = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;
    
    // Run batch operations for each hash function
    const newData = HASH_FUNCTIONS.map((hashFn, idx) => {
      const counter = countersRef.current[idx];
      
      // Execute batch
      for (let i = 0; i < batchSize; i++) {
        counter.seed = hashFn.fn(counter.seed);
        counter.ops++;
      }
      
      // Calculate ops/second based on delta time
      const opsThisFrame = batchSize;
      const opsPerSecond = deltaTime > 0 ? (opsThisFrame / deltaTime) * 1000 : 0;
      
      return {
        id: hashFn.id,
        operations: counter.ops,
        opsPerSecond: opsPerSecond,
        lastSample: counter.seed,
      };
    });
    
    setBenchmarkData(newData);
    setElapsedTime((timestamp - startTimeRef.current) / 1000);
    
    animationRef.current = requestAnimationFrame(runBenchmark);
  }, [batchSize]);
  
  // Start/Stop handlers
  const handleStart = useCallback(() => {
    setIsRunning(true);
    startTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(runBenchmark);
  }, [runBenchmark]);
  
  const handleStop = useCallback(() => {
    setIsRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);
  
  const handleReset = useCallback(() => {
    handleStop();
    countersRef.current = HASH_FUNCTIONS.map(() => ({ ops: 0, seed: 12345 }));
    setBenchmarkData(
      HASH_FUNCTIONS.map(h => ({
        id: h.id,
        operations: 0,
        opsPerSecond: 0,
        lastSample: 0,
      }))
    );
    setElapsedTime(0);
  }, [handleStop]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Calculate max ops for scaling bars
  const maxOps = Math.max(...benchmarkData.map(d => d.operations), 1);
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a0a12 0%, #12121f 50%, #0d0d18 100%)',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      color: '#e0e0e0',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      {/* Scanline overlay effect */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        pointerEvents: 'none',
        zIndex: 1000,
      }} />
      
      {/* Header */}
      <header style={{
        marginBottom: '32px',
        borderBottom: '1px solid rgba(0, 255, 170, 0.2)',
        paddingBottom: '20px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            margin: 0,
            background: 'linear-gradient(90deg, #00FFAA 0%, #00AAFF 50%, #FF6B00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>
            ⚡ THROUGHPUT BENCHMARK
          </h1>
          <span style={{
            fontSize: '12px',
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}>
            Hash Function Performance
          </span>
        </div>
        <p style={{
          margin: '12px 0 0',
          fontSize: '13px',
          color: '#888',
          maxWidth: '700px',
          lineHeight: 1.6,
        }}>
          Live comparison of hash function throughput. Position-is-seed paradigm enables O(1) access 
          vs Tribonacci's sequential O(n) limitation.
        </p>
      </header>
      
      {/* Controls Panel */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <button
          onClick={isRunning ? handleStop : handleStart}
          style={{
            padding: '12px 28px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'inherit',
            background: isRunning 
              ? 'linear-gradient(135deg, #FF0066 0%, #cc0052 100%)'
              : 'linear-gradient(135deg, #00FFAA 0%, #00cc88 100%)',
            border: 'none',
            borderRadius: '6px',
            color: isRunning ? '#fff' : '#000',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            boxShadow: isRunning 
              ? '0 0 20px rgba(255, 0, 102, 0.4)'
              : '0 0 20px rgba(0, 255, 170, 0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          {isRunning ? '■ STOP' : '▶ START'}
        </button>
        
        <button
          onClick={handleReset}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'inherit',
            background: 'transparent',
            border: '1px solid #444',
            borderRadius: '6px',
            color: '#888',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'all 0.2s ease',
          }}
        >
          ↺ RESET
        </button>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <label style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Batch Size
          </label>
          <input
            type="range"
            min="1000"
            max="100000"
            step="1000"
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            style={{
              width: '120px',
              accentColor: '#00FFAA',
            }}
          />
          <span style={{ fontSize: '13px', color: '#00FFAA', minWidth: '50px' }}>
            {formatNumber(batchSize)}
          </span>
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontFamily: 'inherit',
            background: showDetails ? 'rgba(0, 170, 255, 0.15)' : 'transparent',
            border: '1px solid rgba(0, 170, 255, 0.3)',
            borderRadius: '6px',
            color: '#00AAFF',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {showDetails ? '◉' : '○'} Details
        </button>
        
        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase' }}>Elapsed</span>
          <span style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#00FFAA',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {elapsedTime.toFixed(2)}s
          </span>
        </div>
      </div>
      
      {/* Main Benchmark Display */}
      <div style={{
        display: 'grid',
        gap: '16px',
      }}>
        {HASH_FUNCTIONS.map((hashFn, idx) => {
          const data = benchmarkData[idx];
          const barWidth = (data.operations / maxOps) * 100;
          
          return (
            <div
              key={hashFn.id}
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '20px 24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background glow effect */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${barWidth}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${hashFn.glowColor} 0%, transparent 100%)`,
                opacity: 0.1,
                transition: 'width 0.1s linear',
              }} />
              
              {/* Header row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
                position: 'relative',
                zIndex: 1,
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <span style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      background: hashFn.color,
                      boxShadow: `0 0 12px ${hashFn.glowColor}`,
                    }} />
                    <h3 style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 600,
                      color: hashFn.color,
                    }}>
                      {hashFn.name}
                    </h3>
                    {showDetails && (
                      <span style={{
                        fontSize: '11px',
                        color: '#666',
                        padding: '2px 8px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '4px',
                      }}>
                        {hashFn.description}
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#fff',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}>
                    {formatNumber(data.operations)}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginTop: '4px',
                  }}>
                    operations
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div style={{
                height: '32px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative',
                marginBottom: showDetails ? '12px' : 0,
              }}>
                {/* Animated bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${barWidth}%`,
                  background: `linear-gradient(90deg, ${hashFn.color} 0%, ${hashFn.color}88 100%)`,
                  borderRadius: '6px',
                  transition: 'width 0.1s linear',
                  boxShadow: `0 0 20px ${hashFn.glowColor}`,
                }}>
                  {/* Shimmer effect */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                    borderRadius: '6px 6px 0 0',
                  }} />
                </div>
                
                {/* Ops/sec indicator */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '16px',
                  transform: 'translateY(-50%)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: data.operations > maxOps * 0.3 ? '#000' : '#888',
                  zIndex: 2,
                }}>
                  {formatNumber(Math.round(data.opsPerSecond))} ops/s
                </div>
              </div>
              
              {/* Detail stats */}
              {showDetails && (
                <div style={{
                  display: 'flex',
                  gap: '24px',
                  fontSize: '11px',
                  color: '#555',
                }}>
                  <div>
                    <span style={{ color: '#444' }}>Peak Theoretical: </span>
                    <span style={{ color: '#888' }}>{hashFn.theoreticalPeak}</span>
                  </div>
                  <div>
                    <span style={{ color: '#444' }}>Last Sample: </span>
                    <span style={{ color: hashFn.color, opacity: 0.7 }}>
                      0x{data.lastSample.toString(16).toUpperCase().padStart(8, '0')}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#444' }}>Share: </span>
                    <span style={{ color: '#888' }}>
                      {((data.operations / benchmarkData.reduce((a, b) => a + b.operations, 0)) * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Summary Stats */}
      <div style={{
        marginTop: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        <div style={{
          background: 'rgba(0, 255, 170, 0.05)',
          border: '1px solid rgba(0, 255, 170, 0.15)',
          borderRadius: '10px',
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: '11px', color: '#00FFAA', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            Total Operations
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {formatNumber(benchmarkData.reduce((a, b) => a + b.operations, 0))}
          </div>
        </div>
        
        <div style={{
          background: 'rgba(0, 170, 255, 0.05)',
          border: '1px solid rgba(0, 170, 255, 0.15)',
          borderRadius: '10px',
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: '11px', color: '#00AAFF', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            Leader
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
            {HASH_FUNCTIONS[benchmarkData.findIndex(d => d.operations === maxOps)]?.name || '—'}
          </div>
        </div>
        
        <div style={{
          background: 'rgba(255, 107, 0, 0.05)',
          border: '1px solid rgba(255, 107, 0, 0.15)',
          borderRadius: '10px',
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: '11px', color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            Speed Ratio (Fast/Slow)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {(() => {
              const ops = benchmarkData.map(d => d.operations).filter(o => o > 0);
              if (ops.length < 2) return '—';
              return (Math.max(...ops) / Math.min(...ops)).toFixed(1) + '×';
            })()}
          </div>
        </div>
        
        <div style={{
          background: 'rgba(255, 0, 102, 0.05)',
          border: '1px solid rgba(255, 0, 102, 0.15)',
          borderRadius: '10px',
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: '11px', color: '#FF0066', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            Status
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 600,
            color: isRunning ? '#00FFAA' : '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isRunning ? '#00FFAA' : '#444',
              boxShadow: isRunning ? '0 0 8px #00FFAA' : 'none',
              animation: isRunning ? 'pulse 1s infinite' : 'none',
            }} />
            {isRunning ? 'RUNNING' : 'IDLE'}
          </div>
        </div>
      </div>
      
      {/* Footer info */}
      <div style={{
        marginTop: '32px',
        padding: '20px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <h4 style={{
          margin: '0 0 12px',
          fontSize: '13px',
          color: '#00AAFF',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          📊 Benchmark Notes
        </h4>
        <ul style={{
          margin: 0,
          padding: '0 0 0 20px',
          fontSize: '12px',
          color: '#666',
          lineHeight: 1.8,
        }}>
          <li>All hash functions run in JavaScript - native C/GPU implementations are significantly faster</li>
          <li>xxHash3 and PCG enable <span style={{ color: '#00FFAA' }}>O(1) random access</span> to any coordinate</li>
          <li>Tribonacci requires <span style={{ color: '#FF0066' }}>O(n) sequential iteration</span> - cannot parallelize</li>
          <li>Modern GPUs (RTX 4090) achieve <span style={{ color: '#00AAFF' }}>85B+ operations/second</span> with hash-based generation</li>
          <li>Position-is-seed paradigm: <code style={{ color: '#FF6B00', background: 'rgba(255,107,0,0.1)', padding: '2px 6px', borderRadius: '3px' }}>properties(x,y,z) = hash(x,y,z,salt)</code></li>
        </ul>
      </div>
      
      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        
        input[type="range"]::-webkit-slider-runnable-track {
          background: rgba(255,255,255,0.1);
          height: 4px;
          border-radius: 2px;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          margin-top: -6px;
          background: #00FFAA;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(0, 255, 170, 0.5);
        }
        
        button:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        
        button:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
