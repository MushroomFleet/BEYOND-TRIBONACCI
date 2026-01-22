import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// PURE FUNCTIONAL NOISE GENERATION - Position is Seed
// ═══════════════════════════════════════════════════════════════════════════

// SplitMix64-style hash for deterministic seeding
const hash = (x, y, seed) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  h = ((h ^ (h >>> 16)) * 1911520717) | 0;
  h = (h ^ (h >>> 13)) | 0;
  return h;
};

const hashFloat = (x, y, seed) => {
  const h = hash(x, y, seed);
  return (h & 0x7FFFFFFF) / 0x7FFFFFFF;
};

// Gradient table for 2D simplex noise
const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1]
];

const dot2 = (g, x, y) => g[0] * x + g[1] * y;

// OpenSimplex2S-inspired 2D noise (patent-safe)
const simplex2D = (x, y, seed) => {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;
  
  let i1, j1;
  if (x0 > y0) { i1 = 1; j1 = 0; }
  else { i1 = 0; j1 = 1; }
  
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  
  const gi0 = (hash(i, j, seed) & 7);
  const gi1 = (hash(i + i1, j + j1, seed) & 7);
  const gi2 = (hash(i + 1, j + 1, seed) & 7);
  
  let n0, n1, n2;
  
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 < 0) n0 = 0;
  else { t0 *= t0; n0 = t0 * t0 * dot2(GRAD2[gi0], x0, y0); }
  
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 < 0) n1 = 0;
  else { t1 *= t1; n1 = t1 * t1 * dot2(GRAD2[gi1], x1, y1); }
  
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 < 0) n2 = 0;
  else { t2 *= t2; n2 = t2 * t2 * dot2(GRAD2[gi2], x2, y2); }
  
  return 70 * (n0 + n1 + n2);
};

// Fractal Brownian Motion
const fbm = (x, y, octaves, persistence, lacunarity, seed) => {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * simplex2D(x * frequency, y * frequency, seed + i * 1000);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  
  return value / maxValue;
};

// ═══════════════════════════════════════════════════════════════════════════
// NOISE LAYER GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

const noiseGenerators = {
  foundation: (x, y, params) => {
    const { seed, scale, octaves, persistence, lacunarity } = params;
    return fbm(x / scale, y / scale, octaves, persistence, lacunarity, seed);
  },
  
  structure: (x, y, params) => {
    const { seed, scale, octaves, persistence, lacunarity } = params;
    return fbm(x / scale, y / scale, octaves, persistence, lacunarity, seed + 10000);
  },
  
  detail: (x, y, params) => {
    const { seed, scale, octaves, persistence, lacunarity } = params;
    return fbm(x / scale, y / scale, octaves, persistence, lacunarity, seed + 20000);
  },
  
  warp: (x, y, params, baseX, baseY) => {
    const { seed, scale, warpStrength, octaves, persistence, lacunarity } = params;
    const warpX = fbm(x / scale + 5.2, y / scale + 1.3, 3, 0.5, 2, seed + 30000);
    const warpY = fbm(x / scale + 9.1, y / scale + 2.7, 3, 0.5, 2, seed + 40000);
    return fbm(
      (x / scale) + warpX * warpStrength,
      (y / scale) + warpY * warpStrength,
      octaves, persistence, lacunarity, seed + 50000
    );
  },
  
  application: (compositeValue, params) => {
    // Apply biome thresholds
    return compositeValue;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// BLEND MODES
// ═══════════════════════════════════════════════════════════════════════════

const blendModes = {
  normal: (base, layer, opacity) => base + layer * opacity,
  multiply: (base, layer, opacity) => base + (base * layer) * opacity,
  add: (base, layer, opacity) => base + layer * opacity,
  subtract: (base, layer, opacity) => base - layer * opacity,
  overlay: (base, layer, opacity) => {
    const overlay = base < 0 
      ? 2 * base * (layer + 1) / 2 
      : 1 - 2 * (1 - base) * (1 - (layer + 1) / 2);
    return base + (overlay - base) * opacity;
  },
  screen: (base, layer, opacity) => {
    const b = (base + 1) / 2;
    const l = (layer + 1) / 2;
    const result = 1 - (1 - b) * (1 - l);
    return base + ((result * 2 - 1) - base) * opacity;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// COLOR MAPPING
// ═══════════════════════════════════════════════════════════════════════════

const terrainColors = [
  { threshold: -1.0, color: [20, 35, 65] },    // Deep water
  { threshold: -0.5, color: [35, 65, 95] },    // Water
  { threshold: -0.2, color: [55, 90, 110] },   // Shallow water
  { threshold: 0.0, color: [195, 180, 140] },  // Beach
  { threshold: 0.1, color: [85, 140, 65] },    // Lowland grass
  { threshold: 0.3, color: [70, 115, 50] },    // Highland grass
  { threshold: 0.5, color: [100, 85, 70] },    // Rock
  { threshold: 0.7, color: [140, 130, 120] },  // Mountain
  { threshold: 0.85, color: [220, 220, 230] }, // Snow
  { threshold: 1.0, color: [255, 255, 255] }   // Peak snow
];

const heightmapGradient = (value) => {
  const v = Math.max(-1, Math.min(1, value));
  const t = (v + 1) / 2;
  const r = Math.floor(t * 255);
  const g = Math.floor(t * 255);
  const b = Math.floor(t * 255);
  return [r, g, b];
};

const terrainGradient = (value) => {
  const v = Math.max(-1, Math.min(1, value));
  for (let i = 0; i < terrainColors.length - 1; i++) {
    if (v <= terrainColors[i + 1].threshold) {
      const t = (v - terrainColors[i].threshold) / 
                (terrainColors[i + 1].threshold - terrainColors[i].threshold);
      const c1 = terrainColors[i].color;
      const c2 = terrainColors[i + 1].color;
      return [
        Math.floor(c1[0] + (c2[0] - c1[0]) * t),
        Math.floor(c1[1] + (c2[1] - c1[1]) * t),
        Math.floor(c1[2] + (c2[2] - c1[2]) * t)
      ];
    }
  }
  return terrainColors[terrainColors.length - 1].color;
};

const layerColors = {
  foundation: (v) => {
    const t = (v + 1) / 2;
    return [Math.floor(40 + t * 100), Math.floor(60 + t * 80), Math.floor(120 + t * 100)];
  },
  structure: (v) => {
    const t = (v + 1) / 2;
    return [Math.floor(120 + t * 100), Math.floor(80 + t * 80), Math.floor(40 + t * 60)];
  },
  detail: (v) => {
    const t = (v + 1) / 2;
    return [Math.floor(60 + t * 140), Math.floor(140 + t * 80), Math.floor(100 + t * 100)];
  },
  warp: (v) => {
    const t = (v + 1) / 2;
    return [Math.floor(140 + t * 100), Math.floor(60 + t * 100), Math.floor(140 + t * 80)];
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function LayeredTerrainBuilder() {
  const mainCanvasRef = useRef(null);
  const previewCanvasRefs = useRef({});
  const animationRef = useRef(null);
  
  const [globalSeed, setGlobalSeed] = useState(42);
  const [viewMode, setViewMode] = useState('terrain'); // 'terrain', 'heightmap', 'layers'
  const [animating, setAnimating] = useState(false);
  const [buildStep, setBuildStep] = useState(-1); // -1 = show all, 0-4 = step through
  
  const [layers, setLayers] = useState({
    foundation: {
      enabled: true,
      visible: true,
      opacity: 1.0,
      blendMode: 'normal',
      scale: 200,
      octaves: 4,
      persistence: 0.6,
      lacunarity: 2.0,
      weight: 0.5
    },
    structure: {
      enabled: true,
      visible: true,
      opacity: 0.8,
      blendMode: 'add',
      scale: 80,
      octaves: 5,
      persistence: 0.5,
      lacunarity: 2.0,
      weight: 0.3
    },
    detail: {
      enabled: true,
      visible: true,
      opacity: 0.5,
      blendMode: 'add',
      scale: 20,
      octaves: 6,
      persistence: 0.45,
      lacunarity: 2.5,
      weight: 0.15
    },
    warp: {
      enabled: true,
      visible: true,
      opacity: 0.4,
      blendMode: 'overlay',
      scale: 60,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2.0,
      weight: 0.1,
      warpStrength: 2.0
    }
  });
  
  const layerOrder = ['foundation', 'structure', 'detail', 'warp'];
  const layerNames = {
    foundation: 'Foundation',
    structure: 'Structure',
    detail: 'Detail',
    warp: 'Warp'
  };
  
  const layerDescriptions = {
    foundation: 'Low-frequency continental shapes',
    structure: 'Mid-frequency terrain features',
    detail: 'High-frequency surface variation',
    warp: 'Domain distortion for organic flow'
  };
  
  // Generate terrain for a single pixel
  const generatePixel = useCallback((x, y) => {
    const activeStep = buildStep >= 0 ? buildStep : layerOrder.length;
    let composite = 0;
    
    for (let i = 0; i < Math.min(activeStep, layerOrder.length); i++) {
      const layerName = layerOrder[i];
      const layer = layers[layerName];
      
      if (!layer.enabled || !layer.visible) continue;
      
      const params = { ...layer, seed: globalSeed };
      let value;
      
      if (layerName === 'warp') {
        value = noiseGenerators.warp(x, y, params);
      } else {
        value = noiseGenerators[layerName](x, y, params);
      }
      
      composite = blendModes[layer.blendMode](composite, value * layer.weight, layer.opacity);
    }
    
    return Math.max(-1, Math.min(1, composite));
  }, [layers, globalSeed, buildStep]);
  
  // Generate single layer preview
  const generateLayerPreview = useCallback((layerName, x, y) => {
    const layer = layers[layerName];
    const params = { ...layer, seed: globalSeed };
    
    if (layerName === 'warp') {
      return noiseGenerators.warp(x, y, params);
    }
    return noiseGenerators[layerName](x, y, params);
  }, [layers, globalSeed]);
  
  // Render main canvas
  const renderMainCanvas = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.createImageData(width, height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = generatePixel(x, y);
        let color;
        
        if (viewMode === 'terrain') {
          color = terrainGradient(value);
        } else if (viewMode === 'heightmap') {
          color = heightmapGradient(value);
        } else {
          color = heightmapGradient(value);
        }
        
        const idx = (y * width + x) * 4;
        imageData.data[idx] = color[0];
        imageData.data[idx + 1] = color[1];
        imageData.data[idx + 2] = color[2];
        imageData.data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, [generatePixel, viewMode]);
  
  // Render layer preview
  const renderLayerPreview = useCallback((layerName) => {
    const canvas = previewCanvasRefs.current[layerName];
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.createImageData(width, height);
    
    const colorFn = layerColors[layerName] || heightmapGradient;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const scaledX = x * (320 / width);
        const scaledY = y * (320 / height);
        const value = generateLayerPreview(layerName, scaledX, scaledY);
        const color = colorFn(value);
        
        const idx = (y * width + x) * 4;
        imageData.data[idx] = color[0];
        imageData.data[idx + 1] = color[1];
        imageData.data[idx + 2] = color[2];
        imageData.data[idx + 3] = layers[layerName].visible ? 255 : 100;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, [generateLayerPreview, layers]);
  
  // Update all previews
  useEffect(() => {
    renderMainCanvas();
    layerOrder.forEach(renderLayerPreview);
  }, [renderMainCanvas, renderLayerPreview]);
  
  // Animation for step-through
  useEffect(() => {
    if (animating) {
      let step = 0;
      const animate = () => {
        setBuildStep(step);
        step++;
        if (step <= layerOrder.length) {
          animationRef.current = setTimeout(animate, 800);
        } else {
          setAnimating(false);
          setBuildStep(-1);
        }
      };
      animate();
      
      return () => {
        if (animationRef.current) {
          clearTimeout(animationRef.current);
        }
      };
    }
  }, [animating]);
  
  const updateLayer = (layerName, property, value) => {
    setLayers(prev => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        [property]: value
      }
    }));
  };
  
  const randomizeSeed = () => {
    setGlobalSeed(Math.floor(Math.random() * 1000000));
  };
  
  const startAnimation = () => {
    setBuildStep(0);
    setAnimating(true);
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0c10 0%, #12161f 50%, #0d1015 100%)',
      color: '#e0e4ec',
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            background: 'linear-gradient(90deg, #64d2ff, #bf5af2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            LAYERED TERRAIN BUILDER
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '11px',
            color: '#6e7681',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            Noise Stack Architecture Demonstrator
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(100, 210, 255, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(100, 210, 255, 0.2)'
          }}>
            <span style={{ fontSize: '10px', color: '#64d2ff', textTransform: 'uppercase' }}>Seed</span>
            <input
              type="number"
              value={globalSeed}
              onChange={(e) => setGlobalSeed(parseInt(e.target.value) || 0)}
              style={{
                width: '80px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
            <button
              onClick={randomizeSeed}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '4px',
                color: '#64d2ff',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              ↻
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '24px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Layer Palette */}
        <aside style={{
          background: 'rgba(20, 24, 32, 0.8)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Layers
            </span>
            <button
              onClick={startAnimation}
              disabled={animating}
              style={{
                background: animating ? 'rgba(191, 90, 242, 0.3)' : 'linear-gradient(135deg, #bf5af2, #64d2ff)',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                padding: '6px 12px',
                cursor: animating ? 'not-allowed' : 'pointer',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {animating ? 'Building...' : '▶ Step Through'}
            </button>
          </div>
          
          {/* Layer Stack */}
          <div style={{ padding: '8px' }}>
            {[...layerOrder].reverse().map((layerName, index) => {
              const layer = layers[layerName];
              const isActive = buildStep === -1 || buildStep > (layerOrder.length - 1 - index);
              
              return (
                <div
                  key={layerName}
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    border: `1px solid ${isActive ? 'rgba(100, 210, 255, 0.2)' : 'rgba(255,255,255,0.04)'}`,
                    transition: 'all 0.3s ease',
                    opacity: isActive ? 1 : 0.5
                  }}
                >
                  {/* Layer Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    gap: '10px'
                  }}>
                    {/* Visibility Toggle */}
                    <button
                      onClick={() => updateLayer(layerName, 'visible', !layer.visible)}
                      style={{
                        width: '20px',
                        height: '20px',
                        background: layer.visible ? 'rgba(100, 210, 255, 0.2)' : 'transparent',
                        border: '1px solid rgba(100, 210, 255, 0.4)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: layer.visible ? '#64d2ff' : '#444'
                      }}
                    >
                      {layer.visible ? '👁' : ''}
                    </button>
                    
                    {/* Preview Thumbnail */}
                    <canvas
                      ref={el => previewCanvasRefs.current[layerName] = el}
                      width={48}
                      height={48}
                      style={{
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    />
                    
                    {/* Layer Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: layer.visible ? '#fff' : '#666'
                      }}>
                        {layerNames[layerName]}
                      </div>
                      <div style={{
                        fontSize: '9px',
                        color: '#6e7681',
                        marginTop: '2px'
                      }}>
                        {layerDescriptions[layerName]}
                      </div>
                    </div>
                  </div>
                  
                  {/* Layer Controls */}
                  {layer.visible && (
                    <div style={{
                      padding: '8px 12px',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                      background: 'rgba(0,0,0,0.2)'
                    }}>
                      {/* Blend Mode & Opacity */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '9px', color: '#6e7681', display: 'block', marginBottom: '4px' }}>
                            BLEND
                          </label>
                          <select
                            value={layer.blendMode}
                            onChange={(e) => updateLayer(layerName, 'blendMode', e.target.value)}
                            style={{
                              width: '100%',
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '4px',
                              color: '#fff',
                              padding: '4px 6px',
                              fontSize: '10px',
                              fontFamily: 'inherit'
                            }}
                          >
                            <option value="normal">Normal</option>
                            <option value="add">Add</option>
                            <option value="multiply">Multiply</option>
                            <option value="overlay">Overlay</option>
                            <option value="screen">Screen</option>
                            <option value="subtract">Subtract</option>
                          </select>
                        </div>
                        
                        <div style={{ width: '80px' }}>
                          <label style={{ fontSize: '9px', color: '#6e7681', display: 'block', marginBottom: '4px' }}>
                            OPACITY
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={layer.opacity}
                            onChange={(e) => updateLayer(layerName, 'opacity', parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#64d2ff' }}
                          />
                        </div>
                      </div>
                      
                      {/* Scale & Weight */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        fontSize: '10px'
                      }}>
                        <div>
                          <label style={{ fontSize: '9px', color: '#6e7681', display: 'block', marginBottom: '2px' }}>
                            SCALE: {layer.scale}
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="400"
                            value={layer.scale}
                            onChange={(e) => updateLayer(layerName, 'scale', parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: '#bf5af2' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '9px', color: '#6e7681', display: 'block', marginBottom: '2px' }}>
                            WEIGHT: {layer.weight.toFixed(2)}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={layer.weight}
                            onChange={(e) => updateLayer(layerName, 'weight', parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#bf5af2' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '9px', color: '#6e7681', display: 'block', marginBottom: '2px' }}>
                            OCTAVES: {layer.octaves}
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={layer.octaves}
                            onChange={(e) => updateLayer(layerName, 'octaves', parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: '#30d158' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '9px', color: '#6e7681', display: 'block', marginBottom: '2px' }}>
                            PERSIST: {layer.persistence.toFixed(2)}
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="0.9"
                            step="0.05"
                            value={layer.persistence}
                            onChange={(e) => updateLayer(layerName, 'persistence', parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#30d158' }}
                          />
                        </div>
                      </div>
                      
                      {/* Warp-specific control */}
                      {layerName === 'warp' && (
                        <div style={{ marginTop: '8px' }}>
                          <label style={{ fontSize: '9px', color: '#6e7681', display: 'block', marginBottom: '2px' }}>
                            WARP STRENGTH: {layer.warpStrength.toFixed(1)}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={layer.warpStrength}
                            onChange={(e) => updateLayer(layerName, 'warpStrength', parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#ff9f0a' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Current Step Indicator */}
          {buildStep >= 0 && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(100, 210, 255, 0.1)',
              borderTop: '1px solid rgba(100, 210, 255, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '10px', color: '#64d2ff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Building Layer {buildStep + 1} of {layerOrder.length}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
                {buildStep < layerOrder.length ? layerNames[layerOrder[buildStep]] : 'Complete'}
              </div>
            </div>
          )}
        </aside>
        
        {/* Main Preview */}
        <main>
          {/* View Mode Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px'
          }}>
            {[
              { id: 'terrain', label: 'Terrain Colors' },
              { id: 'heightmap', label: 'Heightmap' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                style={{
                  background: viewMode === mode.id 
                    ? 'linear-gradient(135deg, rgba(100, 210, 255, 0.2), rgba(191, 90, 242, 0.2))'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${viewMode === mode.id ? 'rgba(100, 210, 255, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '6px',
                  color: viewMode === mode.id ? '#fff' : '#6e7681',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.2s ease'
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
          
          {/* Canvas Container */}
          <div style={{
            position: 'relative',
            background: 'rgba(20, 24, 32, 0.8)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
            padding: '16px'
          }}>
            <canvas
              ref={mainCanvasRef}
              width={640}
              height={480}
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '8px',
                display: 'block'
              }}
            />
            
            {/* Composition Info Overlay */}
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '24px',
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: '8px',
              padding: '12px 16px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontSize: '9px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Active Composition
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {layerOrder.map((name, idx) => {
                  const layer = layers[name];
                  const isIncluded = buildStep === -1 || buildStep > idx;
                  return (
                    <div
                      key={name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: isIncluded && layer.visible ? 1 : 0.3
                      }}
                    >
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '2px',
                        background: name === 'foundation' ? '#64d2ff' :
                                   name === 'structure' ? '#ff9f0a' :
                                   name === 'detail' ? '#30d158' : '#bf5af2'
                      }} />
                      <span style={{ fontSize: '10px' }}>{layerNames[name][0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Resolution Badge */}
            <div style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '10px',
              color: '#6e7681'
            }}>
              640 × 480
            </div>
          </div>
          
          {/* Noise Stack Diagram */}
          <div style={{
            marginTop: '20px',
            background: 'rgba(20, 24, 32, 0.8)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
              color: '#6e7681'
            }}>
              Noise Stack Architecture
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              flexWrap: 'wrap'
            }}>
              {layerOrder.map((name, idx) => {
                const layer = layers[name];
                const isActive = buildStep === -1 || buildStep > idx;
                const colors = {
                  foundation: { bg: 'rgba(100, 210, 255, 0.15)', border: '#64d2ff' },
                  structure: { bg: 'rgba(255, 159, 10, 0.15)', border: '#ff9f0a' },
                  detail: { bg: 'rgba(48, 209, 88, 0.15)', border: '#30d158' },
                  warp: { bg: 'rgba(191, 90, 242, 0.15)', border: '#bf5af2' }
                };
                
                return (
                  <React.Fragment key={name}>
                    <div style={{
                      padding: '10px 16px',
                      background: isActive ? colors[name].bg : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isActive ? colors[name].border : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '6px',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      minWidth: '100px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: isActive ? '#fff' : '#444'
                      }}>
                        {layerNames[name]}
                      </div>
                      <div style={{
                        fontSize: '9px',
                        color: isActive ? colors[name].border : '#333',
                        marginTop: '2px'
                      }}>
                        {layer.blendMode} @ {(layer.opacity * 100).toFixed(0)}%
                      </div>
                    </div>
                    {idx < layerOrder.length - 1 && (
                      <div style={{
                        color: isActive ? '#64d2ff' : '#333',
                        fontSize: '16px'
                      }}>→</div>
                    )}
                  </React.Fragment>
                );
              })}
              <div style={{ color: '#64d2ff', fontSize: '16px' }}>→</div>
              <div style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, rgba(100, 210, 255, 0.2), rgba(191, 90, 242, 0.2))',
                border: '1px solid rgba(191, 90, 242, 0.5)',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>Output</div>
                <div style={{ fontSize: '9px', color: '#bf5af2', marginTop: '2px' }}>
                  Final Terrain
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Footer */}
      <footer style={{
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#6e7681',
        fontSize: '10px'
      }}>
        <div>
          Based on <span style={{ color: '#64d2ff' }}>Beyond Tribonacci</span> methodology • Position-is-Seed paradigm
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Pure Functional</span>
          <span>•</span>
          <span>Deterministic</span>
          <span>•</span>
          <span>O(1) Access</span>
        </div>
      </footer>
    </div>
  );
}
