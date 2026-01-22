import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// WARP FIELD DEMONSTRATOR
// Focus: Domain warping for organic pattern generation
// Split view: Raw fBm vs Domain-warped fBm with adjustable intensity
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────────
// NOISE PRIMITIVES - Pure functions, deterministic, coordinate-addressable
// ─────────────────────────────────────────────────────────────────────────────────

// Permutation table for gradient selection (deterministic)
const PERM = new Uint8Array(512);
const GRAD3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];

// Initialize permutation table from seed
function initPerm(seed) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  
  // Fisher-Yates shuffle with seeded random
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
  }
}

// Fast floor for negative numbers
function fastFloor(x) {
  return x > 0 ? Math.floor(x) : Math.floor(x) - (x % 1 !== 0 ? 0 : 0);
}

// Dot product of gradient and distance vector
function dot3(g, x, y) {
  return g[0] * x + g[1] * y;
}

// 2D Simplex noise implementation
function simplex2D(x, y) {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  
  // Skew input space
  const s = (x + y) * F2;
  const i = fastFloor(x + s);
  const j = fastFloor(y + s);
  
  // Unskew back
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;
  
  // Determine simplex
  let i1, j1;
  if (x0 > y0) { i1 = 1; j1 = 0; }
  else { i1 = 0; j1 = 1; }
  
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  
  // Hash coordinates
  const ii = i & 255;
  const jj = j & 255;
  
  const gi0 = PERM[ii + PERM[jj]] % 12;
  const gi1 = PERM[ii + i1 + PERM[jj + j1]] % 12;
  const gi2 = PERM[ii + 1 + PERM[jj + 1]] % 12;
  
  // Calculate contributions
  let n0 = 0, n1 = 0, n2 = 0;
  
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    t0 *= t0;
    n0 = t0 * t0 * dot3(GRAD3[gi0], x0, y0);
  }
  
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    t1 *= t1;
    n1 = t1 * t1 * dot3(GRAD3[gi1], x1, y1);
  }
  
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    t2 *= t2;
    n2 = t2 * t2 * dot3(GRAD3[gi2], x2, y2);
  }
  
  // Scale to [-1, 1]
  return 70 * (n0 + n1 + n2);
}

// Fractal Brownian Motion - stacked octaves with persistence
function fbm(x, y, octaves, persistence, lacunarity) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * simplex2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  
  return value / maxValue;
}

// Domain-warped fBm - the key transformation
function warpedFbm(x, y, warpIntensity, octaves, persistence, lacunarity) {
  // First noise layer for warping
  const qx = fbm(x + 0.0, y + 0.0, 4, 0.5, 2.0);
  const qy = fbm(x + 5.2, y + 1.3, 4, 0.5, 2.0);
  
  // Second noise layer for additional warping (optional, controlled by intensity)
  const rx = fbm(x + 4.0 * qx + 1.7, y + 4.0 * qy + 9.2, 4, 0.5, 2.0);
  const ry = fbm(x + 4.0 * qx + 8.3, y + 4.0 * qy + 2.8, 4, 0.5, 2.0);
  
  // Blend between q-warp and r-warp based on intensity
  const blendedX = qx + (rx - qx) * Math.min(1, warpIntensity);
  const blendedY = qy + (ry - qy) * Math.min(1, warpIntensity);
  
  // Final warped sample
  return fbm(
    x + warpIntensity * blendedX,
    y + warpIntensity * blendedY,
    octaves,
    persistence,
    lacunarity
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// COLOR MAPPING
// ─────────────────────────────────────────────────────────────────────────────────

function valueToColor(value, palette) {
  const t = (value + 1) * 0.5; // Normalize [-1,1] to [0,1]
  
  const palettes = {
    cosmic: [
      { pos: 0.0, color: [8, 8, 24] },
      { pos: 0.2, color: [20, 12, 48] },
      { pos: 0.35, color: [48, 24, 96] },
      { pos: 0.5, color: [96, 48, 128] },
      { pos: 0.65, color: [180, 80, 120] },
      { pos: 0.8, color: [255, 140, 100] },
      { pos: 0.9, color: [255, 200, 160] },
      { pos: 1.0, color: [255, 245, 230] }
    ],
    terrain: [
      { pos: 0.0, color: [16, 24, 48] },
      { pos: 0.3, color: [24, 64, 96] },
      { pos: 0.45, color: [48, 128, 96] },
      { pos: 0.55, color: [96, 160, 64] },
      { pos: 0.7, color: [160, 144, 80] },
      { pos: 0.85, color: [180, 140, 120] },
      { pos: 0.95, color: [220, 220, 220] },
      { pos: 1.0, color: [255, 255, 255] }
    ],
    plasma: [
      { pos: 0.0, color: [12, 4, 32] },
      { pos: 0.2, color: [48, 8, 96] },
      { pos: 0.4, color: [128, 16, 128] },
      { pos: 0.5, color: [196, 32, 96] },
      { pos: 0.65, color: [255, 96, 48] },
      { pos: 0.8, color: [255, 180, 32] },
      { pos: 0.95, color: [255, 255, 128] },
      { pos: 1.0, color: [255, 255, 240] }
    ],
    monochrome: [
      { pos: 0.0, color: [0, 0, 0] },
      { pos: 0.5, color: [128, 128, 128] },
      { pos: 1.0, color: [255, 255, 255] }
    ]
  };
  
  const stops = palettes[palette] || palettes.cosmic;
  
  // Find surrounding stops
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  
  // Interpolate
  const range = upper.pos - lower.pos;
  const localT = range > 0 ? (t - lower.pos) / range : 0;
  const smoothT = localT * localT * (3 - 2 * localT); // Smoothstep
  
  return [
    Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * smoothT),
    Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * smoothT),
    Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * smoothT)
  ];
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export default function WarpFieldDemonstrator() {
  // UI State
  const [seed, setSeed] = useState(42);
  const [warpIntensity, setWarpIntensity] = useState(0);
  const [octaves, setOctaves] = useState(6);
  const [persistence, setPersistence] = useState(0.5);
  const [lacunarity, setLacunarity] = useState(2.0);
  const [scale, setScale] = useState(4);
  const [palette, setPalette] = useState('cosmic');
  const [animating, setAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState(1);
  
  // Canvas refs
  const rawCanvasRef = useRef(null);
  const warpedCanvasRef = useRef(null);
  const animationRef = useRef(null);
  
  const CANVAS_SIZE = 280;
  
  // Initialize permutation table when seed changes
  useEffect(() => {
    initPerm(seed);
  }, [seed]);
  
  // Render function
  const render = useCallback(() => {
    const rawCanvas = rawCanvasRef.current;
    const warpedCanvas = warpedCanvasRef.current;
    if (!rawCanvas || !warpedCanvas) return;
    
    const rawCtx = rawCanvas.getContext('2d');
    const warpedCtx = warpedCanvas.getContext('2d');
    
    const rawImageData = rawCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    const warpedImageData = warpedCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    
    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        const nx = (x / CANVAS_SIZE) * scale;
        const ny = (y / CANVAS_SIZE) * scale;
        
        // Raw fBm
        const rawValue = fbm(nx, ny, octaves, persistence, lacunarity);
        const rawColor = valueToColor(rawValue, palette);
        
        // Warped fBm
        const warpedValue = warpedFbm(nx, ny, warpIntensity, octaves, persistence, lacunarity);
        const warpedColor = valueToColor(warpedValue, palette);
        
        const idx = (y * CANVAS_SIZE + x) * 4;
        
        rawImageData.data[idx] = rawColor[0];
        rawImageData.data[idx + 1] = rawColor[1];
        rawImageData.data[idx + 2] = rawColor[2];
        rawImageData.data[idx + 3] = 255;
        
        warpedImageData.data[idx] = warpedColor[0];
        warpedImageData.data[idx + 1] = warpedColor[1];
        warpedImageData.data[idx + 2] = warpedColor[2];
        warpedImageData.data[idx + 3] = 255;
      }
    }
    
    rawCtx.putImageData(rawImageData, 0, 0);
    warpedCtx.putImageData(warpedImageData, 0, 0);
  }, [warpIntensity, octaves, persistence, lacunarity, scale, palette]);
  
  // Animation loop
  useEffect(() => {
    if (animating) {
      let currentWarp = warpIntensity;
      let direction = animationDirection;
      
      const animate = () => {
        currentWarp += direction * 0.03;
        
        if (currentWarp >= 4) {
          currentWarp = 4;
          direction = -1;
        } else if (currentWarp <= 0) {
          currentWarp = 0;
          direction = 1;
        }
        
        setWarpIntensity(currentWarp);
        setAnimationDirection(direction);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [animating]);
  
  // Render on parameter change
  useEffect(() => {
    render();
  }, [render, seed]);
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a0a12 0%, #12121f 50%, #0d0d18 100%)',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      color: '#e0e0e8',
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <header style={{
        textAlign: 'center',
        marginBottom: '32px',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #7b5cff, transparent)'
        }} />
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#c8c0ff',
          margin: 0,
          textShadow: '0 0 30px rgba(123, 92, 255, 0.5)'
        }}>
          Warp Field Demonstrator
        </h1>
        <p style={{
          fontSize: '0.75rem',
          color: '#6a6a80',
          marginTop: '8px',
          letterSpacing: '0.1em'
        }}>
          Domain Warping for Organic Pattern Generation
        </p>
      </header>
      
      {/* Main Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        {/* Canvas Container */}
        <div style={{
          display: 'flex',
          gap: '32px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {/* Raw fBm */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              color: '#888898',
              marginBottom: '12px',
              textTransform: 'uppercase'
            }}>
              Raw fBm · Geometric
            </div>
            <div style={{
              position: 'relative',
              padding: '3px',
              background: 'linear-gradient(135deg, #2a2a40, #1a1a28)',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}>
              <canvas
                ref={rawCanvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                style={{
                  display: 'block',
                  borderRadius: '6px'
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'monospace'
              }}>
                warp: 0.00
              </div>
            </div>
          </div>
          
          {/* Arrow */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#4a4a60'
          }}>
            <svg width="40" height="24" viewBox="0 0 40 24" style={{ marginBottom: '8px' }}>
              <defs>
                <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4a4a60" />
                  <stop offset="50%" stopColor="#7b5cff" />
                  <stop offset="100%" stopColor="#4a4a60" />
                </linearGradient>
              </defs>
              <path 
                d="M0 12 L30 12 M24 6 L32 12 L24 18" 
                stroke="url(#arrowGrad)" 
                strokeWidth="2" 
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em' }}>WARP</span>
          </div>
          
          {/* Warped fBm */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              color: '#888898',
              marginBottom: '12px',
              textTransform: 'uppercase'
            }}>
              Domain Warped · Organic
            </div>
            <div style={{
              position: 'relative',
              padding: '3px',
              background: 'linear-gradient(135deg, #2a2a40, #1a1a28)',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(123, 92, 255, 0.15)'
            }}>
              <canvas
                ref={warpedCanvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                style={{
                  display: 'block',
                  borderRadius: '6px'
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.6)',
                fontFamily: 'monospace'
              }}>
                warp: {warpIntensity.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Warp Intensity Slider - Primary Control */}
        <div style={{
          width: '100%',
          maxWidth: '620px',
          padding: '20px 24px',
          background: 'linear-gradient(180deg, rgba(123, 92, 255, 0.08), rgba(123, 92, 255, 0.02))',
          borderRadius: '12px',
          border: '1px solid rgba(123, 92, 255, 0.2)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <label style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#c8c0ff',
              letterSpacing: '0.1em'
            }}>
              WARP INTENSITY
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#e0d8ff',
                fontFamily: "'JetBrains Mono', monospace",
                minWidth: '60px',
                textAlign: 'right'
              }}>
                {warpIntensity.toFixed(2)}
              </span>
              <button
                onClick={() => setAnimating(!animating)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  background: animating 
                    ? 'linear-gradient(180deg, #ff6b6b, #cc5555)' 
                    : 'linear-gradient(180deg, #7b5cff, #5a40cc)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  boxShadow: animating 
                    ? '0 4px 12px rgba(255, 107, 107, 0.3)' 
                    : '0 4px 12px rgba(123, 92, 255, 0.3)'
                }}
              >
                {animating ? '■ Stop' : '▶ Animate'}
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="4"
            step="0.01"
            value={warpIntensity}
            onChange={(e) => setWarpIntensity(parseFloat(e.target.value))}
            disabled={animating}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              appearance: 'none',
              background: `linear-gradient(90deg, 
                #2a2a40 0%, 
                #4a3a80 ${(warpIntensity / 4) * 100}%, 
                #7b5cff ${(warpIntensity / 4) * 100}%, 
                #2a2a40 100%)`,
              cursor: animating ? 'not-allowed' : 'pointer',
              opacity: animating ? 0.6 : 1
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '6px',
            fontSize: '0.6rem',
            color: '#6a6a80'
          }}>
            <span>Geometric</span>
            <span>Organic</span>
          </div>
        </div>
        
        {/* Parameter Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          width: '100%',
          maxWidth: '620px'
        }}>
          {/* Seed */}
          <div style={{
            padding: '14px 16px',
            background: 'rgba(30, 30, 45, 0.6)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <label style={{ fontSize: '0.65rem', color: '#888898', letterSpacing: '0.08em' }}>
                SEED
              </label>
              <span style={{ fontSize: '0.8rem', color: '#b0b0c0', fontWeight: 600 }}>
                {seed}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="999"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                appearance: 'none',
                background: '#2a2a40',
                cursor: 'pointer'
              }}
            />
          </div>
          
          {/* Octaves */}
          <div style={{
            padding: '14px 16px',
            background: 'rgba(30, 30, 45, 0.6)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <label style={{ fontSize: '0.65rem', color: '#888898', letterSpacing: '0.08em' }}>
                OCTAVES
              </label>
              <span style={{ fontSize: '0.8rem', color: '#b0b0c0', fontWeight: 600 }}>
                {octaves}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={octaves}
              onChange={(e) => setOctaves(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                appearance: 'none',
                background: '#2a2a40',
                cursor: 'pointer'
              }}
            />
          </div>
          
          {/* Persistence */}
          <div style={{
            padding: '14px 16px',
            background: 'rgba(30, 30, 45, 0.6)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <label style={{ fontSize: '0.65rem', color: '#888898', letterSpacing: '0.08em' }}>
                PERSISTENCE
              </label>
              <span style={{ fontSize: '0.8rem', color: '#b0b0c0', fontWeight: 600 }}>
                {persistence.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={persistence}
              onChange={(e) => setPersistence(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                appearance: 'none',
                background: '#2a2a40',
                cursor: 'pointer'
              }}
            />
          </div>
          
          {/* Lacunarity */}
          <div style={{
            padding: '14px 16px',
            background: 'rgba(30, 30, 45, 0.6)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <label style={{ fontSize: '0.65rem', color: '#888898', letterSpacing: '0.08em' }}>
                LACUNARITY
              </label>
              <span style={{ fontSize: '0.8rem', color: '#b0b0c0', fontWeight: 600 }}>
                {lacunarity.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="1.5"
              max="3"
              step="0.1"
              value={lacunarity}
              onChange={(e) => setLacunarity(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                appearance: 'none',
                background: '#2a2a40',
                cursor: 'pointer'
              }}
            />
          </div>
          
          {/* Scale */}
          <div style={{
            padding: '14px 16px',
            background: 'rgba(30, 30, 45, 0.6)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <label style={{ fontSize: '0.65rem', color: '#888898', letterSpacing: '0.08em' }}>
                SCALE
              </label>
              <span style={{ fontSize: '0.8rem', color: '#b0b0c0', fontWeight: 600 }}>
                {scale}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={scale}
              onChange={(e) => setScale(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                appearance: 'none',
                background: '#2a2a40',
                cursor: 'pointer'
              }}
            />
          </div>
          
          {/* Palette */}
          <div style={{
            padding: '14px 16px',
            background: 'rgba(30, 30, 45, 0.6)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <label style={{
              display: 'block',
              fontSize: '0.65rem',
              color: '#888898',
              letterSpacing: '0.08em',
              marginBottom: '8px'
            }}>
              PALETTE
            </label>
            <select
              value={palette}
              onChange={(e) => setPalette(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: '#1a1a28',
                border: '1px solid #3a3a50',
                borderRadius: '4px',
                color: '#c0c0d0',
                fontSize: '0.75rem',
                cursor: 'pointer',
                appearance: 'none'
              }}
            >
              <option value="cosmic">Cosmic</option>
              <option value="terrain">Terrain</option>
              <option value="plasma">Plasma</option>
              <option value="monochrome">Monochrome</option>
            </select>
          </div>
        </div>
        
        {/* Info Panel */}
        <div style={{
          width: '100%',
          maxWidth: '620px',
          padding: '16px 20px',
          background: 'rgba(20, 20, 32, 0.8)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.03)',
          fontSize: '0.7rem',
          lineHeight: '1.6',
          color: '#707088'
        }}>
          <div style={{ fontWeight: 600, color: '#9090a8', marginBottom: '8px' }}>
            // Domain Warping Algorithm
          </div>
          <code style={{ 
            display: 'block', 
            whiteSpace: 'pre-wrap',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: '0.65rem'
          }}>
{`q = vec2( fbm(p + vec2(0.0, 0.0)),
          fbm(p + vec2(5.2, 1.3)) );

return fbm(p + ${warpIntensity.toFixed(2)} * q);`}
          </code>
          <div style={{ marginTop: '12px', fontSize: '0.65rem' }}>
            Domain warping feeds noise back into itself, creating organic turbulence 
            from geometric patterns. The warp intensity controls how much the input 
            coordinates are displaced by the initial noise field.
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer style={{
        marginTop: '32px',
        textAlign: 'center',
        fontSize: '0.6rem',
        color: '#4a4a60',
        letterSpacing: '0.1em'
      }}>
        Beyond Tribonacci · Position-is-Seed Paradigm · Deterministic Procedural Generation
      </footer>
      
      {/* Slider styling */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(180deg, #a090ff, #7b5cff);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(123, 92, 255, 0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(180deg, #a090ff, #7b5cff);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(123, 92, 255, 0.4);
        }
        select:focus {
          outline: none;
          border-color: #7b5cff;
        }
      `}</style>
    </div>
  );
}
