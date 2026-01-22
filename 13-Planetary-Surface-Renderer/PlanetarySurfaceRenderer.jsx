import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// PLANETARY SURFACE RENDERER
// Multi-octave terrain heightfield generation with coordinate-addressable hashing
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Hash Functions: Position-is-seed paradigm
// ─────────────────────────────────────────────────────────────────────────────

const splitmix64 = (seed) => {
  let z = (seed += 0x9e3779b97f4a7c15n);
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  return z ^ (z >> 31n);
};

const hash3D = (x, y, z, seed) => {
  const bx = BigInt(Math.floor(x * 1000000));
  const by = BigInt(Math.floor(y * 1000000));
  const bz = BigInt(Math.floor(z * 1000000));
  const bs = BigInt(seed);
  const combined = bx ^ (by * 31n) ^ (bz * 997n) ^ (bs * 65537n);
  const h = splitmix64(combined & 0xffffffffffffffffn);
  return Number(h & 0xffffffffn) / 0xffffffff;
};

// ─────────────────────────────────────────────────────────────────────────────
// Simplex Noise Implementation (3D)
// Superior to Perlin: O(n²) complexity, C² gradient continuity, no grid artifacts
// ─────────────────────────────────────────────────────────────────────────────

const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;

const grad3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];

const permutation = (() => {
  const p = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates shuffle with fixed seed for determinism
  let seed = 12345;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  return [...p, ...p]; // Double for overflow protection
})();

const simplex3D = (x, y, z, seed = 0) => {
  // Apply seed offset for different noise instances
  x += (seed % 1000) * 17.31;
  y += (seed % 777) * 23.47;
  z += (seed % 523) * 29.53;
  
  // Skew input to simplex cell
  const s = (x + y + z) * F3;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const k = Math.floor(z + s);
  
  // Unskew back to (x,y,z) space
  const t = (i + j + k) * G3;
  const X0 = i - t;
  const Y0 = j - t;
  const Z0 = k - t;
  const x0 = x - X0;
  const y0 = y - Y0;
  const z0 = z - Z0;
  
  // Determine simplex traversal order
  let i1, j1, k1, i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
    else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
    else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
  } else {
    if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
    else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
    else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
  }
  
  // Offsets for remaining corners
  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2.0 * G3;
  const y2 = y0 - j2 + 2.0 * G3;
  const z2 = z0 - k2 + 2.0 * G3;
  const x3 = x0 - 1.0 + 3.0 * G3;
  const y3 = y0 - 1.0 + 3.0 * G3;
  const z3 = z0 - 1.0 + 3.0 * G3;
  
  // Hash coordinates
  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;
  
  // Calculate contributions from four corners
  let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
  
  let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
  if (t0 > 0) {
    t0 *= t0;
    const gi0 = permutation[ii + permutation[jj + permutation[kk]]] % 12;
    n0 = t0 * t0 * (grad3[gi0][0]*x0 + grad3[gi0][1]*y0 + grad3[gi0][2]*z0);
  }
  
  let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
  if (t1 > 0) {
    t1 *= t1;
    const gi1 = permutation[ii+i1 + permutation[jj+j1 + permutation[kk+k1]]] % 12;
    n1 = t1 * t1 * (grad3[gi1][0]*x1 + grad3[gi1][1]*y1 + grad3[gi1][2]*z1);
  }
  
  let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
  if (t2 > 0) {
    t2 *= t2;
    const gi2 = permutation[ii+i2 + permutation[jj+j2 + permutation[kk+k2]]] % 12;
    n2 = t2 * t2 * (grad3[gi2][0]*x2 + grad3[gi2][1]*y2 + grad3[gi2][2]*z2);
  }
  
  let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
  if (t3 > 0) {
    t3 *= t3;
    const gi3 = permutation[ii+1 + permutation[jj+1 + permutation[kk+1]]] % 12;
    n3 = t3 * t3 * (grad3[gi3][0]*x3 + grad3[gi3][1]*y3 + grad3[gi3][2]*z3);
  }
  
  return 32.0 * (n0 + n1 + n2 + n3); // Scale to [-1, 1]
};

// ─────────────────────────────────────────────────────────────────────────────
// Fractal Brownian Motion (fBm)
// Stack octaves with controlled persistence and lacunarity
// ─────────────────────────────────────────────────────────────────────────────

const fbm3D = (x, y, z, octaves, persistence, lacunarity, seed) => {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * simplex3D(x * frequency, y * frequency, z * frequency, seed + i * 1000);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  
  return value / maxValue; // Normalize to [-1, 1]
};

// ─────────────────────────────────────────────────────────────────────────────
// Terrain Height Generation
// Multi-octave with continental, mountain, and detail contributions
// ─────────────────────────────────────────────────────────────────────────────

const latLonTo3D = (lat, lon) => {
  const theta = lat * Math.PI / 180;
  const phi = lon * Math.PI / 180;
  return {
    x: Math.cos(theta) * Math.cos(phi),
    y: Math.cos(theta) * Math.sin(phi),
    z: Math.sin(theta)
  };
};

const getTerrainComponents = (lat, lon, params) => {
  const { x, y, z } = latLonTo3D(lat, lon);
  const { seed, continentalScale, mountainScale, detailScale, warpStrength } = params;
  
  // Continental scale: large landmasses (4 octaves, low frequency)
  const continental = fbm3D(
    x * continentalScale,
    y * continentalScale,
    z * continentalScale,
    4, 0.5, 2.0, seed
  );
  
  // Mountain scale: mid-frequency features (6 octaves)
  const mountains = fbm3D(
    x * mountainScale,
    y * mountainScale,
    z * mountainScale,
    6, 0.5, 2.0, seed + 1000
  );
  
  // Detail scale: high-frequency variation (4 octaves)
  const detail = fbm3D(
    x * detailScale,
    y * detailScale,
    z * detailScale,
    4, 0.4, 2.5, seed + 2000
  );
  
  // Domain warping for organic feel
  const warpX = fbm3D(x * 4 + 5.2, y * 4 + 1.3, z * 4, 3, 0.5, 2.0, seed + 3000);
  const warpY = fbm3D(x * 4, y * 4 + 9.1, z * 4, 3, 0.5, 2.0, seed + 4000);
  const warped = fbm3D(
    x * 4 + warpX * warpStrength,
    y * 4 + warpY * warpStrength,
    z * 4,
    5, 0.5, 2.0, seed + 5000
  );
  
  return { continental, mountains, detail, warped };
};

const getTerrainHeight = (lat, lon, params) => {
  const components = getTerrainComponents(lat, lon, params);
  const { continentalWeight, mountainWeight, detailWeight, warpWeight } = params;
  
  // Combine scales with weighted contributions
  // Mountains only appear on land (where continental > 0)
  const mountainContribution = components.mountains * Math.max(0, components.continental);
  
  const height = 
    components.continental * continentalWeight +
    mountainContribution * mountainWeight +
    components.detail * detailWeight +
    components.warped * warpWeight;
  
  return { height, components };
};

// ─────────────────────────────────────────────────────────────────────────────
// Color Mapping for Terrain Visualization
// ─────────────────────────────────────────────────────────────────────────────

const terrainColorMap = (height, waterLevel) => {
  if (height < waterLevel - 0.3) return { r: 10, g: 30, b: 80 };   // Deep ocean
  if (height < waterLevel - 0.1) return { r: 20, g: 50, b: 120 };  // Ocean
  if (height < waterLevel) return { r: 40, g: 80, b: 150 };        // Shallow water
  if (height < waterLevel + 0.05) return { r: 210, g: 190, b: 140 }; // Beach
  if (height < 0.2) return { r: 80, g: 140, b: 60 };               // Lowland
  if (height < 0.4) return { r: 60, g: 110, b: 50 };               // Forest
  if (height < 0.6) return { r: 100, g: 90, b: 70 };               // Highland
  if (height < 0.8) return { r: 140, g: 130, b: 120 };             // Mountain
  return { r: 240, g: 240, b: 250 };                                // Snow peak
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PlanetarySurfaceRenderer() {
  // Planet parameters
  const [seed, setSeed] = useState(42);
  const [rotation, setRotation] = useState(0);
  const [isRotating, setIsRotating] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.3);
  
  // Noise parameters
  const [continentalScale, setContinentalScale] = useState(2);
  const [mountainScale, setMountainScale] = useState(8);
  const [detailScale, setDetailScale] = useState(32);
  const [warpStrength, setWarpStrength] = useState(0.5);
  
  // Weight parameters
  const [continentalWeight, setContinentalWeight] = useState(0.5);
  const [mountainWeight, setMountainWeight] = useState(0.3);
  const [detailWeight, setDetailWeight] = useState(0.1);
  const [warpWeight, setWarpWeight] = useState(0.1);
  const [waterLevel, setWaterLevel] = useState(0);
  
  // Query state
  const [queryLat, setQueryLat] = useState(0);
  const [queryLon, setQueryLon] = useState(0);
  const [queryResult, setQueryResult] = useState(null);
  
  // Canvas refs
  const mainCanvasRef = useRef(null);
  const breakdownCanvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Memoize params
  const params = useMemo(() => ({
    seed, continentalScale, mountainScale, detailScale, warpStrength,
    continentalWeight, mountainWeight, detailWeight, warpWeight
  }), [seed, continentalScale, mountainScale, detailScale, warpStrength,
      continentalWeight, mountainWeight, detailWeight, warpWeight]);
  
  // Query terrain at coordinates
  const queryTerrain = useCallback(() => {
    const result = getTerrainHeight(queryLat, queryLon, params);
    setQueryResult({
      lat: queryLat,
      lon: queryLon,
      ...result
    });
  }, [queryLat, queryLon, params]);
  
  // Render main sphere
  const renderSphere = useCallback((ctx, width, height, rotAngle) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const dx = (px - centerX) / radius;
        const dy = (py - centerY) / radius;
        const dist2 = dx * dx + dy * dy;
        
        if (dist2 <= 1) {
          // Point on sphere
          const dz = Math.sqrt(1 - dist2);
          
          // Apply rotation around Y axis
          const cosR = Math.cos(rotAngle);
          const sinR = Math.sin(rotAngle);
          const rx = dx * cosR + dz * sinR;
          const rz = -dx * sinR + dz * cosR;
          
          // Convert to lat/lon
          const lat = Math.asin(dy) * 180 / Math.PI;
          const lon = Math.atan2(rx, rz) * 180 / Math.PI;
          
          // Get terrain height
          const { height: terrainHeight } = getTerrainHeight(lat, lon, params);
          
          // Apply lighting (simple diffuse)
          const lightDir = { x: 0.5, y: -0.5, z: 0.7 };
          const lightLen = Math.sqrt(lightDir.x**2 + lightDir.y**2 + lightDir.z**2);
          const nx = rx, ny = dy, nz = rz;
          const light = Math.max(0.2, (nx * lightDir.x + ny * lightDir.y + nz * lightDir.z) / lightLen);
          
          // Get color
          const color = terrainColorMap(terrainHeight, waterLevel);
          
          const idx = (py * width + px) * 4;
          data[idx] = Math.min(255, color.r * light);
          data[idx + 1] = Math.min(255, color.g * light);
          data[idx + 2] = Math.min(255, color.b * light);
          data[idx + 3] = 255;
        } else {
          // Space background with stars
          const idx = (py * width + px) * 4;
          const starNoise = hash3D(px * 0.01, py * 0.01, 0, seed);
          if (starNoise > 0.997) {
            const brightness = 150 + Math.floor(starNoise * 100);
            data[idx] = brightness;
            data[idx + 1] = brightness;
            data[idx + 2] = brightness + 20;
            data[idx + 3] = 255;
          } else {
            data[idx] = 5;
            data[idx + 1] = 8;
            data[idx + 2] = 15;
            data[idx + 3] = 255;
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Draw atmosphere glow
    const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.95, centerX, centerY, radius * 1.15);
    gradient.addColorStop(0, 'rgba(100, 180, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(100, 180, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, [params, waterLevel, seed]);
  
  // Render breakdown mini-spheres
  const renderBreakdown = useCallback((ctx, width, height, rotAngle) => {
    const layers = [
      { name: 'Continental', key: 'continental', color: [60, 140, 80] },
      { name: 'Mountains', key: 'mountains', color: [140, 100, 60] },
      { name: 'Detail', key: 'detail', color: [100, 100, 120] },
      { name: 'Warped', key: 'warped', color: [120, 80, 140] }
    ];
    
    const miniRadius = height * 0.35;
    const spacing = width / 4;
    
    ctx.fillStyle = '#0a0e18';
    ctx.fillRect(0, 0, width, height);
    
    layers.forEach((layer, idx) => {
      const centerX = spacing * (idx + 0.5);
      const centerY = height / 2;
      
      // Render mini sphere for this layer
      for (let py = Math.floor(centerY - miniRadius); py < Math.ceil(centerY + miniRadius); py++) {
        for (let px = Math.floor(centerX - miniRadius); px < Math.ceil(centerX + miniRadius); px++) {
          const dx = (px - centerX) / miniRadius;
          const dy = (py - centerY) / miniRadius;
          const dist2 = dx * dx + dy * dy;
          
          if (dist2 <= 1) {
            const dz = Math.sqrt(1 - dist2);
            const cosR = Math.cos(rotAngle);
            const sinR = Math.sin(rotAngle);
            const rx = dx * cosR + dz * sinR;
            const rz = -dx * sinR + dz * cosR;
            
            const lat = Math.asin(dy) * 180 / Math.PI;
            const lon = Math.atan2(rx, rz) * 180 / Math.PI;
            
            const components = getTerrainComponents(lat, lon, params);
            const value = components[layer.key];
            
            // Map to color intensity
            const intensity = (value + 1) / 2; // Normalize to 0-1
            const light = 0.3 + dz * 0.7;
            
            ctx.fillStyle = `rgb(${Math.floor(layer.color[0] * intensity * light)}, ${Math.floor(layer.color[1] * intensity * light)}, ${Math.floor(layer.color[2] * intensity * light)})`;
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }
      
      // Label
      ctx.fillStyle = '#8af';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(layer.name, centerX, centerY + miniRadius + 16);
    });
  }, [params]);
  
  // Animation loop
  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    const breakdownCanvas = breakdownCanvasRef.current;
    if (!mainCanvas || !breakdownCanvas) return;
    
    const mainCtx = mainCanvas.getContext('2d');
    const breakdownCtx = breakdownCanvas.getContext('2d');
    
    let lastTime = 0;
    let currentRotation = rotation;
    
    const animate = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      
      if (isRotating) {
        currentRotation += delta * rotationSpeed;
        setRotation(currentRotation);
      }
      
      renderSphere(mainCtx, mainCanvas.width, mainCanvas.height, currentRotation);
      renderBreakdown(breakdownCtx, breakdownCanvas.width, breakdownCanvas.height, currentRotation);
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRotating, rotationSpeed, renderSphere, renderBreakdown]);
  
  // Initial query
  useEffect(() => {
    queryTerrain();
  }, []);
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e18 0%, #1a1e28 50%, #0a1020 100%)',
      color: '#e0e8f0',
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px',
        borderBottom: '1px solid rgba(100, 180, 255, 0.2)',
        paddingBottom: '16px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '400',
          letterSpacing: '4px',
          color: '#8af',
          textTransform: 'uppercase',
          margin: 0,
          textShadow: '0 0 20px rgba(136, 170, 255, 0.5)'
        }}>
          ◈ PLANETARY SURFACE RENDERER ◈
        </h1>
        <p style={{
          fontSize: '11px',
          color: '#6a8',
          letterSpacing: '2px',
          marginTop: '8px'
        }}>
          MULTI-OCTAVE TERRAIN HEIGHTFIELD GENERATION • POSITION-IS-SEED PARADIGM
        </p>
      </div>
      
      {/* Main Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: '24px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Left: Visualizations */}
        <div>
          {/* Main Sphere */}
          <div style={{
            background: 'rgba(20, 30, 50, 0.6)',
            border: '1px solid rgba(100, 180, 255, 0.2)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '12px', color: '#8af', letterSpacing: '1px' }}>
                ▸ PLANETARY VIEW
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setIsRotating(!isRotating)}
                  style={{
                    background: isRotating ? 'rgba(100, 255, 150, 0.2)' : 'rgba(255, 100, 100, 0.2)',
                    border: `1px solid ${isRotating ? '#6a8' : '#f66'}`,
                    color: isRotating ? '#6a8' : '#f66',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    letterSpacing: '1px'
                  }}
                >
                  {isRotating ? '◉ ROTATING' : '○ PAUSED'}
                </button>
              </div>
            </div>
            <canvas
              ref={mainCanvasRef}
              width={500}
              height={500}
              style={{
                width: '100%',
                maxWidth: '500px',
                height: 'auto',
                display: 'block',
                margin: '0 auto',
                borderRadius: '4px',
                boxShadow: '0 0 40px rgba(100, 180, 255, 0.1)'
              }}
            />
          </div>
          
          {/* Breakdown Spheres */}
          <div style={{
            background: 'rgba(20, 30, 50, 0.6)',
            border: '1px solid rgba(100, 180, 255, 0.2)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <span style={{ fontSize: '12px', color: '#8af', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
              ▸ NOISE LAYER CONTRIBUTIONS
            </span>
            <canvas
              ref={breakdownCanvasRef}
              width={500}
              height={120}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
        
        {/* Right: Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Seed Control */}
          <div style={{
            background: 'rgba(20, 30, 50, 0.6)',
            border: '1px solid rgba(100, 180, 255, 0.2)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <span style={{ fontSize: '12px', color: '#8af', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
              ▸ PLANET SEED
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                style={{
                  flex: 1,
                  background: 'rgba(0, 20, 40, 0.8)',
                  border: '1px solid rgba(100, 180, 255, 0.3)',
                  color: '#8af',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
              />
              <button
                onClick={() => setSeed(Math.floor(Math.random() * 100000))}
                style={{
                  background: 'rgba(100, 180, 255, 0.2)',
                  border: '1px solid #8af',
                  color: '#8af',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                RANDOM
              </button>
            </div>
          </div>
          
          {/* Noise Scales */}
          <div style={{
            background: 'rgba(20, 30, 50, 0.6)',
            border: '1px solid rgba(100, 180, 255, 0.2)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <span style={{ fontSize: '12px', color: '#8af', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
              ▸ NOISE FREQUENCIES
            </span>
            {[
              { label: 'Continental Scale', value: continentalScale, set: setContinentalScale, min: 0.5, max: 8 },
              { label: 'Mountain Scale', value: mountainScale, set: setMountainScale, min: 2, max: 24 },
              { label: 'Detail Scale', value: detailScale, set: setDetailScale, min: 8, max: 64 },
              { label: 'Warp Strength', value: warpStrength, set: setWarpStrength, min: 0, max: 1, step: 0.1 }
            ].map((param, i) => (
              <div key={i} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6a8', marginBottom: '4px' }}>
                  <span>{param.label}</span>
                  <span>{param.value.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step || 0.5}
                  value={param.value}
                  onChange={(e) => param.set(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#8af' }}
                />
              </div>
            ))}
          </div>
          
          {/* Layer Weights */}
          <div style={{
            background: 'rgba(20, 30, 50, 0.6)',
            border: '1px solid rgba(100, 180, 255, 0.2)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <span style={{ fontSize: '12px', color: '#8af', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
              ▸ LAYER WEIGHTS
            </span>
            {[
              { label: 'Continental', value: continentalWeight, set: setContinentalWeight, color: '#4a8' },
              { label: 'Mountains', value: mountainWeight, set: setMountainWeight, color: '#a84' },
              { label: 'Detail', value: detailWeight, set: setDetailWeight, color: '#88a' },
              { label: 'Warped', value: warpWeight, set: setWarpWeight, color: '#a6c' }
            ].map((param, i) => (
              <div key={i} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: param.color, marginBottom: '4px' }}>
                  <span>● {param.label}</span>
                  <span>{(param.value * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={param.value}
                  onChange={(e) => param.set(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: param.color }}
                />
              </div>
            ))}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(100, 180, 255, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#4af', marginBottom: '4px' }}>
                <span>≈ Water Level</span>
                <span>{waterLevel.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-0.5}
                max={0.5}
                step={0.02}
                value={waterLevel}
                onChange={(e) => setWaterLevel(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#4af' }}
              />
            </div>
          </div>
          
          {/* Coordinate Query */}
          <div style={{
            background: 'rgba(20, 30, 50, 0.6)',
            border: '1px solid rgba(100, 180, 255, 0.2)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <span style={{ fontSize: '12px', color: '#8af', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
              ▸ COORDINATE QUERY
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '10px', color: '#6a8', display: 'block', marginBottom: '4px' }}>Latitude (°)</label>
                <input
                  type="number"
                  value={queryLat}
                  onChange={(e) => setQueryLat(parseFloat(e.target.value) || 0)}
                  min={-90}
                  max={90}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 20, 40, 0.8)',
                    border: '1px solid rgba(100, 180, 255, 0.3)',
                    color: '#8af',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: '#6a8', display: 'block', marginBottom: '4px' }}>Longitude (°)</label>
                <input
                  type="number"
                  value={queryLon}
                  onChange={(e) => setQueryLon(parseFloat(e.target.value) || 0)}
                  min={-180}
                  max={180}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 20, 40, 0.8)',
                    border: '1px solid rgba(100, 180, 255, 0.3)',
                    color: '#8af',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            <button
              onClick={queryTerrain}
              style={{
                width: '100%',
                background: 'linear-gradient(180deg, rgba(100, 180, 255, 0.3) 0%, rgba(100, 180, 255, 0.1) 100%)',
                border: '1px solid #8af',
                color: '#8af',
                padding: '10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                letterSpacing: '2px',
                fontFamily: 'inherit'
              }}
            >
              ◉ QUERY HEIGHT
            </button>
            
            {queryResult && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(0, 40, 60, 0.5)',
                borderRadius: '4px',
                border: '1px solid rgba(100, 255, 150, 0.2)'
              }}>
                <div style={{ fontSize: '10px', color: '#6a8', marginBottom: '8px', letterSpacing: '1px' }}>
                  RESULT @ ({queryResult.lat.toFixed(2)}°, {queryResult.lon.toFixed(2)}°)
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  fontSize: '10px'
                }}>
                  <div style={{ color: '#4a8' }}>
                    Continental: <span style={{ color: '#fff' }}>{queryResult.components.continental.toFixed(4)}</span>
                  </div>
                  <div style={{ color: '#a84' }}>
                    Mountains: <span style={{ color: '#fff' }}>{queryResult.components.mountains.toFixed(4)}</span>
                  </div>
                  <div style={{ color: '#88a' }}>
                    Detail: <span style={{ color: '#fff' }}>{queryResult.components.detail.toFixed(4)}</span>
                  </div>
                  <div style={{ color: '#a6c' }}>
                    Warped: <span style={{ color: '#fff' }}>{queryResult.components.warped.toFixed(4)}</span>
                  </div>
                </div>
                <div style={{
                  marginTop: '12px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(100, 180, 255, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '11px', color: '#8af' }}>TOTAL HEIGHT:</span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: queryResult.height > waterLevel ? '#6f8' : '#4af',
                    textShadow: queryResult.height > waterLevel ? '0 0 10px rgba(100, 255, 150, 0.5)' : '0 0 10px rgba(70, 170, 255, 0.5)'
                  }}>
                    {queryResult.height.toFixed(4)}
                  </span>
                </div>
                <div style={{
                  fontSize: '9px',
                  color: '#888',
                  textAlign: 'right',
                  marginTop: '4px'
                }}>
                  {queryResult.height > waterLevel ? '◆ LAND' : '◇ WATER'}
                </div>
              </div>
            )}
          </div>
          
          {/* Info */}
          <div style={{
            background: 'rgba(20, 30, 50, 0.4)',
            border: '1px solid rgba(100, 180, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '9px',
            color: '#668',
            lineHeight: '1.6'
          }}>
            <div style={{ color: '#8af', marginBottom: '4px', letterSpacing: '1px' }}>◈ ALGORITHM</div>
            Pure-functional terrain generation using Simplex noise with fractal Brownian motion (fBm). 
            Continental (4 oct), Mountain (6 oct), Detail (4 oct), and Domain Warping layers combine 
            to create geologically plausible heightfields. O(1) coordinate access—no iteration required.
          </div>
        </div>
      </div>
      
      {/* Footer Stats */}
      <div style={{
        marginTop: '24px',
        padding: '12px 16px',
        background: 'rgba(20, 30, 50, 0.4)',
        border: '1px solid rgba(100, 180, 255, 0.1)',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'center',
        gap: '48px',
        fontSize: '10px',
        color: '#668'
      }}>
        <span>SEED: <span style={{ color: '#8af' }}>{seed}</span></span>
        <span>ROTATION: <span style={{ color: '#6a8' }}>{(rotation * 180 / Math.PI % 360).toFixed(1)}°</span></span>
        <span>PARADIGM: <span style={{ color: '#fa8' }}>POSITION-IS-SEED</span></span>
        <span>ACCESS: <span style={{ color: '#8fa' }}>O(1)</span></span>
      </div>
    </div>
  );
}
