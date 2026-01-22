import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// fBm OCTAVE STACKER
// Demonstrates Fractal Brownian Motion octave accumulation for terrain generation
// Pure-functional, deterministic noise with real-time parameter adjustment
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// HASH & NOISE PRIMITIVES
// Position-as-seed paradigm: coordinates deterministically produce values
// ─────────────────────────────────────────────────────────────────────────────

// SplitMix64-inspired hash for deterministic pseudo-random values
const hash = (x, y, seed = 0) => {
  let h = (x * 374761393 + y * 668265263 + seed * 1013904223) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  h = ((h ^ (h >>> 16)) * 2654435769) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

// Convert hash to float in range [0, 1]
const hashToFloat = (x, y, seed = 0) => {
  return (hash(x, y, seed) & 0x7FFFFFFF) / 0x7FFFFFFF;
};

// Smooth interpolation (quintic curve for C² continuity)
const smoothstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);

// Linear interpolation
const lerp = (a, b, t) => a + t * (b - a);

// ─────────────────────────────────────────────────────────────────────────────
// VALUE NOISE IMPLEMENTATION
// Gradient-free coherent noise suitable for real-time demonstration
// ─────────────────────────────────────────────────────────────────────────────

const valueNoise2D = (x, y, seed = 0) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  
  // Smoothed interpolation factors
  const u = smoothstep(xf);
  const v = smoothstep(yf);
  
  // Corner values (deterministic from position)
  const n00 = hashToFloat(xi, yi, seed) * 2 - 1;
  const n10 = hashToFloat(xi + 1, yi, seed) * 2 - 1;
  const n01 = hashToFloat(xi, yi + 1, seed) * 2 - 1;
  const n11 = hashToFloat(xi + 1, yi + 1, seed) * 2 - 1;
  
  // Bilinear interpolation
  const nx0 = lerp(n00, n10, u);
  const nx1 = lerp(n01, n11, u);
  
  return lerp(nx0, nx1, v);
};

// ─────────────────────────────────────────────────────────────────────────────
// FRACTAL BROWNIAN MOTION
// Octave stacking with persistence (amplitude decay) and lacunarity (frequency growth)
// ─────────────────────────────────────────────────────────────────────────────

const fbm = (x, y, octaves, persistence, lacunarity, seed = 42) => {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  const octaveContributions = [];
  
  for (let i = 0; i < octaves; i++) {
    const noiseValue = valueNoise2D(x * frequency, y * frequency, seed + i * 1337);
    const contribution = amplitude * noiseValue;
    
    octaveContributions.push({
      octave: i + 1,
      frequency,
      amplitude,
      rawNoise: noiseValue,
      contribution,
      runningTotal: value + contribution
    });
    
    value += contribution;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  
  return {
    value: value / maxValue, // Normalized to [-1, 1]
    maxValue,
    contributions: octaveContributions
  };
};

// Generate single octave for visualization
const singleOctave = (x, y, octaveIndex, lacunarity, seed = 42) => {
  const frequency = Math.pow(lacunarity, octaveIndex);
  return valueNoise2D(x * frequency, y * frequency, seed + octaveIndex * 1337);
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function FBMOctaveStacker() {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: UI controls only, generation is pure-functional
  // ─────────────────────────────────────────────────────────────────────────────
  
  const [octaves, setOctaves] = useState(6);
  const [persistence, setPersistence] = useState(0.5);
  const [lacunarity, setLacunarity] = useState(2.0);
  const [seed, setSeed] = useState(42);
  const [scale, setScale] = useState(4);
  const [highlightedOctave, setHighlightedOctave] = useState(null);
  const [showContributions, setShowContributions] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationOctave, setAnimationOctave] = useState(1);
  
  const mainCanvasRef = useRef(null);
  const stripCanvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TERRAIN RENDERING
  // ─────────────────────────────────────────────────────────────────────────────
  
  const heightToColor = useCallback((height, octaveHighlight = null) => {
    // Remap from [-1, 1] to [0, 1]
    const h = (height + 1) / 2;
    
    // Rich terrain gradient
    if (h < 0.35) {
      // Deep water to shallow water
      const t = h / 0.35;
      return {
        r: Math.floor(lerp(15, 45, t)),
        g: Math.floor(lerp(30, 85, t)),
        b: Math.floor(lerp(60, 130, t))
      };
    } else if (h < 0.45) {
      // Shallow water to beach
      const t = (h - 0.35) / 0.1;
      return {
        r: Math.floor(lerp(45, 194, t)),
        g: Math.floor(lerp(85, 178, t)),
        b: Math.floor(lerp(130, 128, t))
      };
    } else if (h < 0.55) {
      // Beach to lowlands
      const t = (h - 0.45) / 0.1;
      return {
        r: Math.floor(lerp(194, 86, t)),
        g: Math.floor(lerp(178, 125, t)),
        b: Math.floor(lerp(128, 70, t))
      };
    } else if (h < 0.7) {
      // Lowlands to highlands
      const t = (h - 0.55) / 0.15;
      return {
        r: Math.floor(lerp(86, 62, t)),
        g: Math.floor(lerp(125, 92, t)),
        b: Math.floor(lerp(70, 55, t))
      };
    } else if (h < 0.85) {
      // Highlands to mountains
      const t = (h - 0.7) / 0.15;
      return {
        r: Math.floor(lerp(62, 90, t)),
        g: Math.floor(lerp(92, 85, t)),
        b: Math.floor(lerp(55, 75, t))
      };
    } else {
      // Mountain peaks to snow
      const t = (h - 0.85) / 0.15;
      return {
        r: Math.floor(lerp(90, 245, t)),
        g: Math.floor(lerp(85, 245, t)),
        b: Math.floor(lerp(75, 250, t))
      };
    }
  }, []);
  
  const octaveToColor = useCallback((value, octaveIndex) => {
    // Distinct color per octave for the strip visualization
    const hues = [0, 30, 60, 120, 180, 210, 270, 300, 330, 15, 45, 150];
    const hue = hues[octaveIndex % hues.length];
    const lightness = ((value + 1) / 2) * 60 + 20;
    
    // HSL to RGB conversion
    const c = (1 - Math.abs(2 * lightness / 100 - 1)) * 0.7;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = lightness / 100 - c / 2;
    
    let r, g, b;
    if (hue < 60) { r = c; g = x; b = 0; }
    else if (hue < 120) { r = x; g = c; b = 0; }
    else if (hue < 180) { r = 0; g = c; b = x; }
    else if (hue < 240) { r = 0; g = x; b = c; }
    else if (hue < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
      r: Math.floor((r + m) * 255),
      g: Math.floor((g + m) * 255),
      b: Math.floor((b + m) * 255)
    };
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CANVAS RENDERING
  // ─────────────────────────────────────────────────────────────────────────────
  
  const renderTerrain = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    const effectiveOctaves = isAnimating ? animationOctave : octaves;
    
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const x = (px / width) * scale;
        const y = (py / height) * scale;
        
        const result = fbm(x, y, effectiveOctaves, persistence, lacunarity, seed);
        const color = heightToColor(result.value);
        
        const idx = (py * width + px) * 4;
        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, [octaves, persistence, lacunarity, seed, scale, heightToColor, isAnimating, animationOctave]);
  
  const renderOctaveStrip = useCallback(() => {
    const canvas = stripCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    const stripHeight = Math.floor(height / Math.max(octaves, 1));
    const effectiveOctaves = isAnimating ? animationOctave : octaves;
    
    for (let octaveIdx = 0; octaveIdx < effectiveOctaves; octaveIdx++) {
      const yStart = octaveIdx * stripHeight;
      const yEnd = Math.min((octaveIdx + 1) * stripHeight, height);
      
      for (let py = yStart; py < yEnd; py++) {
        for (let px = 0; px < width; px++) {
          const x = (px / width) * scale;
          const y = 0.5 * scale; // Fixed y for 1D slice
          
          const noiseValue = singleOctave(x, y, octaveIdx, lacunarity, seed);
          const color = octaveToColor(noiseValue, octaveIdx);
          
          // Dim non-highlighted octaves
          const dim = highlightedOctave !== null && highlightedOctave !== octaveIdx ? 0.3 : 1;
          
          const idx = (py * width + px) * 4;
          data[idx] = Math.floor(color.r * dim);
          data[idx + 1] = Math.floor(color.g * dim);
          data[idx + 2] = Math.floor(color.b * dim);
          data[idx + 3] = 255;
        }
      }
    }
    
    // Fill remaining space if fewer octaves
    for (let py = effectiveOctaves * stripHeight; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const idx = (py * width + px) * 4;
        data[idx] = 25;
        data[idx + 1] = 25;
        data[idx + 2] = 30;
        data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Draw octave labels
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < effectiveOctaves; i++) {
      const y = i * stripHeight + stripHeight / 2;
      const freq = Math.pow(lacunarity, i).toFixed(1);
      const amp = Math.pow(persistence, i).toFixed(3);
      
      ctx.fillStyle = highlightedOctave === i ? '#fff' : 'rgba(255,255,255,0.7)';
      ctx.fillText(`Oct ${i + 1}`, 8, y - 8);
      ctx.fillStyle = highlightedOctave === i ? '#aaa' : 'rgba(255,255,255,0.4)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`f×${freq} a×${amp}`, 8, y + 8);
      ctx.font = '11px "JetBrains Mono", monospace';
    }
  }, [octaves, persistence, lacunarity, seed, scale, highlightedOctave, octaveToColor, isAnimating, animationOctave]);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ANIMATION: Progressive octave reveal
  // ─────────────────────────────────────────────────────────────────────────────
  
  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    setAnimationOctave(1);
  }, []);
  
  useEffect(() => {
    if (isAnimating) {
      const timeout = setTimeout(() => {
        if (animationOctave < octaves) {
          setAnimationOctave(prev => prev + 1);
        } else {
          setIsAnimating(false);
        }
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [isAnimating, animationOctave, octaves]);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECT: Re-render on parameter change
  // ─────────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      renderTerrain();
      if (showContributions) renderOctaveStrip();
    });
    return () => cancelAnimationFrame(frame);
  }, [renderTerrain, renderOctaveStrip, showContributions]);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES FOR DISPLAY
  // ─────────────────────────────────────────────────────────────────────────────
  
  const computeOctaveStats = () => {
    const stats = [];
    let totalWeight = 0;
    for (let i = 0; i < octaves; i++) {
      const amp = Math.pow(persistence, i);
      totalWeight += amp;
    }
    for (let i = 0; i < octaves; i++) {
      const amp = Math.pow(persistence, i);
      const freq = Math.pow(lacunarity, i);
      stats.push({
        octave: i + 1,
        frequency: freq,
        amplitude: amp,
        contribution: (amp / totalWeight * 100).toFixed(1)
      });
    }
    return stats;
  };
  
  const octaveStats = computeOctaveStats();
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a0a0f 0%, #12121a 50%, #0d0d14 100%)',
      color: '#e8e6e3',
      fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <header style={{
        marginBottom: '32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '16px',
          marginBottom: '8px'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 600,
            margin: 0,
            letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, #e8e6e3 0%, #a8a6a3 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            fBm Octave Stacker
          </h1>
          <span style={{
            fontSize: '12px',
            color: '#666',
            fontFamily: '"JetBrains Mono", monospace',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Demo 04
          </span>
        </div>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#888',
          maxWidth: '600px',
          lineHeight: 1.5
        }}>
          Fractal Brownian Motion builds complex terrain by layering noise at increasing frequencies. 
          Each octave adds finer detail while contributing less to the overall shape.
        </p>
      </header>
      
      {/* Main Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showContributions ? '1fr 200px' : '1fr',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Main Terrain Canvas */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <span style={{
              fontSize: '11px',
              fontFamily: '"JetBrains Mono", monospace',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Combined Terrain
            </span>
            <span style={{
              fontSize: '11px',
              fontFamily: '"JetBrains Mono", monospace',
              color: '#4a9eff'
            }}>
              {isAnimating ? `${animationOctave}/${octaves}` : octaves} octaves active
            </span>
          </div>
          <canvas
            ref={mainCanvasRef}
            width={512}
            height={384}
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              display: 'block',
              imageRendering: 'pixelated'
            }}
          />
        </div>
        
        {/* Octave Strip */}
        {showContributions && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <span style={{
              display: 'block',
              fontSize: '11px',
              fontFamily: '"JetBrains Mono", monospace',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px'
            }}>
              Octave Breakdown
            </span>
            <canvas
              ref={stripCanvasRef}
              width={168}
              height={384}
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '8px',
                display: 'block'
              }}
            />
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Octaves Control */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '12px'
          }}>
            <label style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#ccc'
            }}>
              Octaves
            </label>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '14px',
              color: '#4a9eff',
              fontWeight: 600
            }}>
              {octaves}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="12"
            value={octaves}
            onChange={(e) => setOctaves(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, #4a9eff ${(octaves - 1) / 11 * 100}%, #2a2a35 ${(octaves - 1) / 11 * 100}%)`,
              appearance: 'none',
              cursor: 'pointer'
            }}
          />
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '11px',
            color: '#555',
            lineHeight: 1.4
          }}>
            Number of noise layers to stack. More octaves = more detail.
          </p>
        </div>
        
        {/* Persistence Control */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '12px'
          }}>
            <label style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#ccc'
            }}>
              Persistence
            </label>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '14px',
              color: '#ff9f4a',
              fontWeight: 600
            }}>
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
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, #ff9f4a ${(persistence - 0.1) / 0.8 * 100}%, #2a2a35 ${(persistence - 0.1) / 0.8 * 100}%)`,
              appearance: 'none',
              cursor: 'pointer'
            }}
          />
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '11px',
            color: '#555',
            lineHeight: 1.4
          }}>
            Amplitude multiplier per octave. Higher = rougher terrain.
          </p>
        </div>
        
        {/* Lacunarity Control */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '12px'
          }}>
            <label style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#ccc'
            }}>
              Lacunarity
            </label>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '14px',
              color: '#4aff9f',
              fontWeight: 600
            }}>
              {lacunarity.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="1.5"
            max="3.0"
            step="0.1"
            value={lacunarity}
            onChange={(e) => setLacunarity(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, #4aff9f ${(lacunarity - 1.5) / 1.5 * 100}%, #2a2a35 ${(lacunarity - 1.5) / 1.5 * 100}%)`,
              appearance: 'none',
              cursor: 'pointer'
            }}
          />
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '11px',
            color: '#555',
            lineHeight: 1.4
          }}>
            Frequency multiplier per octave. Higher = faster detail scaling.
          </p>
        </div>
        
        {/* Scale & Seed */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '8px'
            }}>
              <label style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#ccc'
              }}>
                View Scale
              </label>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '14px',
                color: '#888'
              }}>
                {scale}×
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              value={scale}
              onChange={(e) => setScale(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, #666 ${(scale - 1) / 11 * 100}%, #2a2a35 ${(scale - 1) / 11 * 100}%)`,
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '8px'
            }}>
              <label style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#ccc'
              }}>
                Seed
              </label>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '14px',
                color: '#888'
              }}>
                {seed}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="999"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, #666 ${seed / 999 * 100}%, #2a2a35 ${seed / 999 * 100}%)`,
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={startAnimation}
          disabled={isAnimating}
          style={{
            padding: '12px 24px',
            fontSize: '13px',
            fontWeight: 500,
            borderRadius: '8px',
            border: 'none',
            background: isAnimating 
              ? 'rgba(74, 158, 255, 0.2)' 
              : 'linear-gradient(135deg, #4a9eff 0%, #3a7edf 100%)',
            color: isAnimating ? '#4a9eff' : '#fff',
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
        >
          {isAnimating ? `Building... ${animationOctave}/${octaves}` : '▶ Animate Build-Up'}
        </button>
        
        <button
          onClick={() => setShowContributions(!showContributions)}
          style={{
            padding: '12px 24px',
            fontSize: '13px',
            fontWeight: 500,
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: showContributions 
              ? 'rgba(255,255,255,0.08)' 
              : 'transparent',
            color: '#ccc',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
        >
          {showContributions ? '✓ Octave Strip' : '○ Octave Strip'}
        </button>
        
        <button
          onClick={() => setSeed(Math.floor(Math.random() * 1000))}
          style={{
            padding: '12px 24px',
            fontSize: '13px',
            fontWeight: 500,
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: '#ccc',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
        >
          ⟳ Random Seed
        </button>
      </div>
      
      {/* Octave Statistics Table */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '13px',
          fontWeight: 500,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Octave Contribution Analysis
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '8px'
        }}>
          {octaveStats.map((stat, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHighlightedOctave(idx)}
              onMouseLeave={() => setHighlightedOctave(null)}
              style={{
                padding: '12px',
                background: highlightedOctave === idx 
                  ? 'rgba(74, 158, 255, 0.1)' 
                  : 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                border: highlightedOctave === idx 
                  ? '1px solid rgba(74, 158, 255, 0.3)' 
                  : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                fontSize: '11px',
                color: '#666',
                marginBottom: '4px',
                fontFamily: '"JetBrains Mono", monospace'
              }}>
                Octave {stat.octave}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: 600,
                color: highlightedOctave === idx ? '#4a9eff' : '#e8e6e3',
                marginBottom: '8px'
              }}>
                {stat.contribution}%
              </div>
              <div style={{
                fontSize: '10px',
                color: '#555',
                fontFamily: '"JetBrains Mono", monospace',
                lineHeight: 1.4
              }}>
                freq: {stat.frequency.toFixed(1)}×<br />
                amp: {stat.amplitude.toFixed(3)}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Formula Reference */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '13px',
          fontWeight: 500,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          fBm Formula
        </h3>
        <code style={{
          display: 'block',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '13px',
          color: '#aaa',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap'
        }}>
{`value = Σ (persistence^i × noise(position × lacunarity^i))
      i=0 to octaves-1

Current: Σ (${persistence}^i × noise(pos × ${lacunarity}^i))  for i ∈ [0, ${octaves - 1}]`}
        </code>
      </div>
      
      {/* Footer */}
      <footer style={{
        marginTop: '32px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: '#555'
      }}>
        <span>
          Position-as-Seed Paradigm • Deterministic Output • Pure Functional
        </span>
        <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          seed:{seed} → same coordinates = identical terrain
        </span>
      </footer>
      
      {/* Slider Thumb Styles */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: transform 0.1s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
