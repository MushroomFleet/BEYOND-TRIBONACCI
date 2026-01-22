import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// SEAMLESS ZOOM NAVIGATOR
// Demonstrates multi-scale consistency using position-is-seed paradigm
// Features: Continuous zoom from galactic view to surface detail without LOD discontinuities
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────────
// PURE MATH UTILITIES (No external dependencies)
// ─────────────────────────────────────────────────────────────────────────────────

// SplitMix64-style hash - bijective, excellent distribution
const hash = (x, y, z, seed = 0) => {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + seed * 1911520717) >>> 0;
  h = ((h ^ (h >>> 15)) * 2246822519) >>> 0;
  h = ((h ^ (h >>> 13)) * 3266489917) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// Multi-salt hash for independent layers
const layeredHash = (x, y, z, layer, seed) => {
  const salts = [0x9E3779B9, 0x85EBCA6B, 0xC2B2AE35, 0x27D4EB2F, 0x165667B1];
  return hash(x, y, z, seed + salts[layer % salts.length]);
};

// Smooth interpolation
const smoothstep = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// 2D gradient vectors for simplex-like noise
const grad2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]
];

// Value noise with smooth interpolation
const valueNoise = (x, y, seed) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  
  const sx = smoothstep(fx);
  const sy = smoothstep(fy);
  
  const n00 = hash(ix, iy, 0, seed);
  const n10 = hash(ix + 1, iy, 0, seed);
  const n01 = hash(ix, iy + 1, 0, seed);
  const n11 = hash(ix + 1, iy + 1, 0, seed);
  
  return lerp(
    lerp(n00, n10, sx),
    lerp(n01, n11, sx),
    sy
  );
};

// Gradient noise (Perlin-style) for smoother results
const gradientNoise = (x, y, seed) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  
  const sx = smoothstep(fx);
  const sy = smoothstep(fy);
  
  const getGrad = (gx, gy) => {
    const h = Math.floor(hash(gx, gy, 0, seed) * 12);
    return grad2[h];
  };
  
  const dot = (g, dx, dy) => g[0] * dx + g[1] * dy;
  
  const n00 = dot(getGrad(ix, iy), fx, fy);
  const n10 = dot(getGrad(ix + 1, iy), fx - 1, fy);
  const n01 = dot(getGrad(ix, iy + 1), fx, fy - 1);
  const n11 = dot(getGrad(ix + 1, iy + 1), fx - 1, fy - 1);
  
  return lerp(
    lerp(n00, n10, sx),
    lerp(n01, n11, sx),
    sy
  ) * 0.5 + 0.5;
};

// Fractal Brownian Motion - multi-octave coherent noise
const fbm = (x, y, octaves, persistence, lacunarity, seed) => {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * gradientNoise(x * frequency, y * frequency, seed + i * 1000);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  
  return value / maxValue;
};

// Domain warping for organic patterns
const warpedNoise = (x, y, seed, warpStrength = 0.5) => {
  const qx = fbm(x, y, 3, 0.5, 2, seed);
  const qy = fbm(x + 5.2, y + 1.3, 3, 0.5, 2, seed + 100);
  return fbm(x + warpStrength * qx, y + warpStrength * qy, 4, 0.5, 2, seed + 200);
};

// ─────────────────────────────────────────────────────────────────────────────────
// SCALE DEFINITIONS - Each zoom level has unique characteristics
// ─────────────────────────────────────────────────────────────────────────────────

const SCALES = [
  { name: 'Observable Universe', range: 1e26, unit: 'm', color: '#1a0a2e', accent: '#9d4edd' },
  { name: 'Galaxy Supercluster', range: 1e24, unit: 'm', color: '#16213e', accent: '#0f4c75' },
  { name: 'Galaxy Cluster', range: 1e23, unit: 'm', color: '#1a1a2e', accent: '#4a4e69' },
  { name: 'Galaxy', range: 1e21, unit: 'm', color: '#0d1321', accent: '#1d3557' },
  { name: 'Spiral Arm', range: 1e19, unit: 'm', color: '#0b132b', accent: '#3a506b' },
  { name: 'Star Cluster', range: 1e17, unit: 'm', color: '#1c2541', accent: '#5bc0be' },
  { name: 'Stellar Neighborhood', range: 1e15, unit: 'm', color: '#0f0e17', accent: '#ff8906' },
  { name: 'Planetary System', range: 1e13, unit: 'm', color: '#121420', accent: '#f25f4c' },
  { name: 'Planetary Orbit', range: 1e11, unit: 'm', color: '#161b33', accent: '#e53170' },
  { name: 'Planet', range: 1e7, unit: 'm', color: '#1e1e2f', accent: '#2cb67d' },
  { name: 'Continent', range: 1e6, unit: 'm', color: '#1f2833', accent: '#45a29e' },
  { name: 'Region', range: 1e5, unit: 'm', color: '#1d3557', accent: '#457b9d' },
  { name: 'Local Area', range: 1e4, unit: 'm', color: '#264653', accent: '#2a9d8f' },
  { name: 'Terrain', range: 1e3, unit: 'm', color: '#2d3436', accent: '#00b894' },
  { name: 'Surface Detail', range: 1e2, unit: 'm', color: '#2d4059', accent: '#ea5455' },
  { name: 'Rock/Object', range: 1e1, unit: 'm', color: '#3c3c3c', accent: '#f39c12' },
  { name: 'Grain', range: 1e0, unit: 'm', color: '#2c2c2c', accent: '#e17055' },
  { name: 'Microscopic', range: 1e-3, unit: 'mm', color: '#1a1a1a', accent: '#74b9ff' },
];

// ─────────────────────────────────────────────────────────────────────────────────
// FEATURE GENERATION - Hierarchical, scale-aware procedural content
// ─────────────────────────────────────────────────────────────────────────────────

// Generate features at a specific scale with persistence tracking
const generateFeatures = (centerX, centerY, zoom, seed, canvasWidth, canvasHeight) => {
  const features = [];
  const viewScale = Math.pow(2, zoom);
  const cellSize = 50 / viewScale;
  
  // Determine current scale index
  const currentRange = 1e26 / viewScale;
  const scaleIndex = SCALES.findIndex(s => s.range <= currentRange) || 0;
  const currentScale = SCALES[Math.max(0, scaleIndex)];
  
  // Grid-based feature placement ensures consistency
  const startCellX = Math.floor((centerX - canvasWidth / 2 / viewScale) / cellSize);
  const endCellX = Math.ceil((centerX + canvasWidth / 2 / viewScale) / cellSize);
  const startCellY = Math.floor((centerY - canvasHeight / 2 / viewScale) / cellSize);
  const endCellY = Math.ceil((centerY + canvasHeight / 2 / viewScale) / cellSize);
  
  for (let cx = startCellX; cx <= endCellX; cx++) {
    for (let cy = startCellY; cy <= endCellY; cy++) {
      // Existence check - does this cell contain a feature?
      const existsHash = layeredHash(cx, cy, 0, 0, seed);
      if (existsHash > 0.3) continue;
      
      // Feature position within cell (deterministic jitter)
      const jitterX = layeredHash(cx, cy, 1, 1, seed) * 0.8 + 0.1;
      const jitterY = layeredHash(cx, cy, 2, 1, seed) * 0.8 + 0.1;
      const worldX = (cx + jitterX) * cellSize;
      const worldY = (cy + jitterY) * cellSize;
      
      // Screen position
      const screenX = (worldX - centerX) * viewScale + canvasWidth / 2;
      const screenY = (worldY - centerY) * viewScale + canvasHeight / 2;
      
      // Skip if off-screen
      if (screenX < -50 || screenX > canvasWidth + 50 || 
          screenY < -50 || screenY > canvasHeight + 50) continue;
      
      // Feature properties from hash layers
      const sizeHash = layeredHash(cx, cy, 3, 2, seed);
      const typeHash = layeredHash(cx, cy, 4, 2, seed);
      const brightnessHash = layeredHash(cx, cy, 5, 3, seed);
      const persistenceHash = layeredHash(cx, cy, 6, 4, seed);
      
      // Base size that persists across zoom levels
      const baseSize = 3 + sizeHash * 15;
      const displaySize = Math.max(2, baseSize * Math.min(1, viewScale / 100));
      
      // Feature type determines visual style
      const type = typeHash < 0.2 ? 'major' : 
                   typeHash < 0.5 ? 'standard' : 
                   typeHash < 0.8 ? 'minor' : 'detail';
      
      // Persistence score - higher means feature visible across more scales
      const persistenceScore = persistenceHash * 100;
      const isPersistent = persistenceScore > (100 - zoom);
      
      // Color from current scale palette
      const hue = (typeHash * 60 + scaleIndex * 30) % 360;
      const saturation = 60 + brightnessHash * 30;
      const lightness = 50 + brightnessHash * 30;
      
      features.push({
        id: `${cx}_${cy}_${seed}`,
        x: screenX,
        y: screenY,
        worldX,
        worldY,
        size: displaySize,
        type,
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        glowColor: currentScale.accent,
        brightness: brightnessHash,
        isPersistent,
        persistenceScore,
        cellX: cx,
        cellY: cy
      });
    }
  }
  
  return { features, currentScale, scaleIndex };
};

// ─────────────────────────────────────────────────────────────────────────────────
// BACKGROUND GENERATION - Scale-appropriate cosmic backgrounds
// ─────────────────────────────────────────────────────────────────────────────────

const generateBackground = (ctx, width, height, zoom, centerX, centerY, seed) => {
  const viewScale = Math.pow(2, zoom);
  const currentRange = 1e26 / viewScale;
  const scaleIndex = SCALES.findIndex(s => s.range <= currentRange) || 0;
  const scale = SCALES[Math.max(0, scaleIndex)];
  const nextScale = SCALES[Math.min(SCALES.length - 1, scaleIndex + 1)];
  
  // Interpolation factor between scales
  const scaleProgress = scaleIndex > 0 
    ? (Math.log10(currentRange) - Math.log10(SCALES[scaleIndex].range)) / 
      (Math.log10(SCALES[scaleIndex - 1]?.range || SCALES[scaleIndex].range * 100) - Math.log10(SCALES[scaleIndex].range))
    : 0;
  
  // Create gradient background
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height)
  );
  
  gradient.addColorStop(0, scale.color);
  gradient.addColorStop(0.5, lerpColor(scale.color, nextScale.color, 0.3));
  gradient.addColorStop(1, '#000000');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add noise texture based on scale
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const worldX = (x - width / 2) / viewScale + centerX;
      const worldY = (y - height / 2) / viewScale + centerY;
      
      // Multi-scale noise for depth
      const noise1 = fbm(worldX * 0.001, worldY * 0.001, 4, 0.5, 2, seed);
      const noise2 = warpedNoise(worldX * 0.01, worldY * 0.01, seed + 500, 0.3);
      const noise3 = valueNoise(worldX * 0.1, worldY * 0.1, seed + 1000);
      
      const combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
      const brightness = Math.floor(combinedNoise * 30);
      
      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, data[idx] + brightness);
      data[idx + 1] = Math.min(255, data[idx + 1] + brightness);
      data[idx + 2] = Math.min(255, data[idx + 2] + brightness + 5);
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
};

// Color interpolation helper
const lerpColor = (color1, color2, t) => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b = Math.round(lerp(c1.b, c2.b, t));
  return `rgb(${r}, ${g}, ${b})`;
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export default function SeamlessZoomNavigator() {
  // Canvas refs
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // View state
  const [zoom, setZoom] = useState(0);
  const [targetZoom, setTargetZoom] = useState(0);
  const [centerX, setCenterX] = useState(0);
  const [centerY, setCenterY] = useState(0);
  
  // Controls
  const [seed, setSeed] = useState(42);
  const [showPersistence, setShowPersistence] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [zoomSpeed, setZoomSpeed] = useState(0.1);
  const [autoZoom, setAutoZoom] = useState(false);
  const [autoZoomDirection, setAutoZoomDirection] = useState(1);
  
  // Tracking state
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [trackedFeatures, setTrackedFeatures] = useState([]);
  const [currentScaleInfo, setCurrentScaleInfo] = useState(SCALES[0]);
  
  // Drag state
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Get canvas dimensions
  const getCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? { width: canvas.width, height: canvas.height } : { width: 800, height: 600 };
  }, []);
  
  // Format scale for display
  const formatScale = useCallback((range) => {
    if (range >= 1e24) return `${(range / 1e24).toFixed(1)} Ym`;
    if (range >= 1e21) return `${(range / 1e21).toFixed(1)} Zm`;
    if (range >= 1e18) return `${(range / 1e18).toFixed(1)} Em`;
    if (range >= 1e15) return `${(range / 1e15).toFixed(1)} Pm`;
    if (range >= 1e12) return `${(range / 1e12).toFixed(1)} Tm`;
    if (range >= 1e9) return `${(range / 1e9).toFixed(1)} Gm`;
    if (range >= 1e6) return `${(range / 1e6).toFixed(1)} Mm`;
    if (range >= 1e3) return `${(range / 1e3).toFixed(1)} km`;
    if (range >= 1) return `${range.toFixed(1)} m`;
    if (range >= 1e-3) return `${(range * 1e3).toFixed(1)} mm`;
    return `${(range * 1e6).toFixed(1)} μm`;
  }, []);
  
  // Main render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = getCanvasDimensions();
    
    // Smooth zoom interpolation
    const newZoom = lerp(zoom, targetZoom, 0.08);
    if (Math.abs(newZoom - zoom) > 0.001) {
      setZoom(newZoom);
    }
    
    // Auto-zoom handling
    if (autoZoom) {
      const newTargetZoom = targetZoom + autoZoomDirection * zoomSpeed * 0.5;
      if (newTargetZoom > 60) {
        setAutoZoomDirection(-1);
      } else if (newTargetZoom < 0) {
        setAutoZoomDirection(1);
      }
      setTargetZoom(newTargetZoom);
    }
    
    // Clear and draw background
    ctx.clearRect(0, 0, width, height);
    generateBackground(ctx, width, height, zoom, centerX, centerY, seed);
    
    // Generate and draw features
    const { features, currentScale, scaleIndex } = generateFeatures(
      centerX, centerY, zoom, seed, width, height
    );
    setCurrentScaleInfo(currentScale);
    
    // Draw grid if enabled
    if (showGrid) {
      const viewScale = Math.pow(2, zoom);
      const gridSize = 50 / viewScale;
      const startX = Math.floor((centerX - width / 2 / viewScale) / gridSize) * gridSize;
      const startY = Math.floor((centerY - height / 2 / viewScale) / gridSize) * gridSize;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 0.5;
      
      for (let gx = startX; gx < centerX + width / 2 / viewScale; gx += gridSize) {
        const screenX = (gx - centerX) * viewScale + width / 2;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, height);
        ctx.stroke();
      }
      
      for (let gy = startY; gy < centerY + height / 2 / viewScale; gy += gridSize) {
        const screenY = (gy - centerY) * viewScale + height / 2;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
        ctx.stroke();
      }
    }
    
    // Draw features
    features.forEach(feature => {
      ctx.save();
      
      // Glow effect for persistent features
      if (showPersistence && feature.isPersistent) {
        ctx.shadowColor = feature.glowColor;
        ctx.shadowBlur = 15 + feature.persistenceScore / 10;
      }
      
      // Feature shape based on type
      ctx.beginPath();
      if (feature.type === 'major') {
        // Star/galaxy shape
        const spikes = 4;
        const outerRadius = feature.size;
        const innerRadius = feature.size * 0.4;
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const px = feature.x + Math.cos(angle) * radius;
          const py = feature.y + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (feature.type === 'standard') {
        // Circle
        ctx.arc(feature.x, feature.y, feature.size, 0, Math.PI * 2);
      } else if (feature.type === 'minor') {
        // Diamond
        ctx.moveTo(feature.x, feature.y - feature.size);
        ctx.lineTo(feature.x + feature.size * 0.7, feature.y);
        ctx.lineTo(feature.x, feature.y + feature.size);
        ctx.lineTo(feature.x - feature.size * 0.7, feature.y);
        ctx.closePath();
      } else {
        // Small dot
        ctx.arc(feature.x, feature.y, feature.size * 0.5, 0, Math.PI * 2);
      }
      
      // Fill with color
      ctx.fillStyle = feature.color;
      ctx.fill();
      
      // Highlight tracked features
      if (trackedFeatures.includes(feature.id)) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.restore();
    });
    
    // Draw scale indicator
    drawScaleIndicator(ctx, width, height, zoom, currentScale);
    
    // Draw persistence meter
    if (showPersistence) {
      drawPersistenceMeter(ctx, width, height, features);
    }
    
    animationRef.current = requestAnimationFrame(render);
  }, [zoom, targetZoom, centerX, centerY, seed, showPersistence, showGrid, 
      zoomSpeed, autoZoom, autoZoomDirection, trackedFeatures, getCanvasDimensions]);
  
  // Scale indicator drawing
  const drawScaleIndicator = (ctx, width, height, currentZoom, scale) => {
    const viewScale = Math.pow(2, currentZoom);
    const currentRange = 1e26 / viewScale;
    
    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(15, height - 90, 200, 75, 8);
    ctx.fill();
    
    // Scale bar
    const barWidth = 100;
    const barX = 25;
    const barY = height - 30;
    
    ctx.strokeStyle = scale.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(barX, barY);
    ctx.lineTo(barX + barWidth, barY);
    ctx.stroke();
    
    // End caps
    ctx.beginPath();
    ctx.moveTo(barX, barY - 5);
    ctx.lineTo(barX, barY + 5);
    ctx.moveTo(barX + barWidth, barY - 5);
    ctx.lineTo(barX + barWidth, barY + 5);
    ctx.stroke();
    
    // Scale text
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 11px "SF Mono", "Fira Code", monospace';
    ctx.fillText(formatScale(currentRange / 10), barX + 35, barY + 15);
    
    // Scale name
    ctx.font = '700 14px "SF Pro Display", system-ui, sans-serif';
    ctx.fillStyle = scale.accent;
    ctx.fillText(scale.name, 25, height - 55);
    
    // Zoom level
    ctx.font = '500 11px "SF Mono", "Fira Code", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`Zoom: ${currentZoom.toFixed(2)}x`, 140, height - 55);
  };
  
  // Persistence meter drawing
  const drawPersistenceMeter = (ctx, width, height, features) => {
    const persistentCount = features.filter(f => f.isPersistent).length;
    const totalCount = features.length;
    const ratio = totalCount > 0 ? persistentCount / totalCount : 0;
    
    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(width - 180, 15, 165, 60, 8);
    ctx.fill();
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 11px "SF Pro Display", system-ui, sans-serif';
    ctx.fillText('Feature Persistence', width - 170, 35);
    
    // Progress bar background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.roundRect(width - 170, 45, 145, 8, 4);
    ctx.fill();
    
    // Progress bar fill
    const gradient = ctx.createLinearGradient(width - 170, 0, width - 25, 0);
    gradient.addColorStop(0, '#2cb67d');
    gradient.addColorStop(1, '#7f5af0');
    ctx.fillStyle = gradient;
    ctx.roundRect(width - 170, 45, 145 * ratio, 8, 4);
    ctx.fill();
    
    // Stats
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '500 10px "SF Mono", "Fira Code", monospace';
    ctx.fillText(`${persistentCount}/${totalCount} (${(ratio * 100).toFixed(0)}%)`, width - 170, 65);
  };
  
  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001 * zoomSpeed * 10;
    setTargetZoom(z => Math.max(0, Math.min(60, z + delta)));
  }, [zoomSpeed]);
  
  // Mouse drag for panning
  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    
    const viewScale = Math.pow(2, zoom);
    const dx = (e.clientX - lastMousePos.current.x) / viewScale;
    const dy = (e.clientY - lastMousePos.current.y) / viewScale;
    
    setCenterX(x => x - dx);
    setCenterY(y => y - dy);
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [zoom]);
  
  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);
  
  // Canvas resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);
  
  // Animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);
  
  // Format coordinate for display
  const formatCoord = (val) => {
    if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(2)}K`;
    return val.toFixed(2);
  };
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      color: '#ffffff'
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #7f5af0 0%, #2cb67d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Seamless Zoom Navigator
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: 500
          }}>
            Multi-scale consistency • Position-is-seed paradigm
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '12px',
          fontFamily: '"SF Mono", "Fira Code", monospace'
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Position: ({formatCoord(centerX)}, {formatCoord(centerY)})
          </span>
          <span style={{ 
            color: currentScaleInfo.accent,
            fontWeight: 600
          }}>
            {currentScaleInfo.name}
          </span>
        </div>
      </header>
      
      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas Container */}
        <div style={{
          flex: 1,
          position: 'relative',
          cursor: isDragging.current ? 'grabbing' : 'grab'
        }}>
          <canvas
            ref={canvasRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              width: '100%',
              height: '100%',
              display: 'block'
            }}
          />
          
          {/* Zoom Slider Overlay */}
          <div style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>ZOOM</span>
            <input
              type="range"
              min="0"
              max="60"
              step="0.1"
              value={targetZoom}
              onChange={(e) => setTargetZoom(parseFloat(e.target.value))}
              style={{
                writingMode: 'vertical-lr',
                direction: 'rtl',
                height: '200px',
                width: '8px',
                appearance: 'none',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
            <span style={{ 
              fontSize: '11px', 
              fontFamily: '"SF Mono", monospace',
              color: '#7f5af0' 
            }}>
              {targetZoom.toFixed(1)}x
            </span>
          </div>
          
          {/* Instructions */}
          <div style={{
            position: 'absolute',
            left: '20px',
            top: '20px',
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '8px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ marginBottom: '6px', fontWeight: 600, color: '#fff' }}>Controls</div>
            <div>🖱️ Scroll to zoom • Drag to pan</div>
          </div>
        </div>
        
        {/* Control Panel */}
        <aside style={{
          width: '280px',
          padding: '20px',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.3)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Seed Control */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '11px', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '8px'
            }}>
              Universe Seed
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: '"SF Mono", monospace'
                }}
              />
              <button
                onClick={() => setSeed(Math.floor(Math.random() * 100000))}
                style={{
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, #7f5af0 0%, #6246d8 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.1s'
                }}
              >
                🎲
              </button>
            </div>
          </div>
          
          {/* Zoom Speed */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '11px', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '8px'
            }}>
              Zoom Speed: {zoomSpeed.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={zoomSpeed}
              onChange={(e) => setZoomSpeed(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                appearance: 'none',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            />
          </div>
          
          {/* Toggle Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showPersistence}
                onChange={(e) => setShowPersistence(e.target.checked)}
                style={{ 
                  width: '18px', 
                  height: '18px',
                  accentColor: '#7f5af0'
                }}
              />
              <span style={{ fontSize: '13px' }}>Show Persistence Glow</span>
            </label>
            
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                style={{ 
                  width: '18px', 
                  height: '18px',
                  accentColor: '#7f5af0'
                }}
              />
              <span style={{ fontSize: '13px' }}>Show Generation Grid</span>
            </label>
            
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={autoZoom}
                onChange={(e) => setAutoZoom(e.target.checked)}
                style={{ 
                  width: '18px', 
                  height: '18px',
                  accentColor: '#7f5af0'
                }}
              />
              <span style={{ fontSize: '13px' }}>Auto Zoom (Demo Mode)</span>
            </label>
          </div>
          
          {/* Quick Navigation */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '11px', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '10px'
            }}>
              Quick Navigation
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SCALES.filter((_, i) => i % 3 === 0).map((scale, i) => (
                <button
                  key={scale.name}
                  onClick={() => setTargetZoom(i * 3 * 3.5)}
                  style={{
                    padding: '8px 12px',
                    background: currentScaleInfo.name === scale.name 
                      ? scale.accent 
                      : 'rgba(255, 255, 255, 0.1)',
                    border: `1px solid ${scale.accent}40`,
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {scale.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          
          {/* Reset Button */}
          <button
            onClick={() => {
              setTargetZoom(0);
              setCenterX(0);
              setCenterY(0);
            }}
            style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginTop: 'auto'
            }}
          >
            ↺ Reset View
          </button>
          
          {/* Info Panel */}
          <div style={{
            padding: '14px',
            background: 'rgba(127, 90, 240, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(127, 90, 240, 0.2)'
          }}>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '12px', 
              fontWeight: 600,
              color: '#7f5af0'
            }}>
              Position-is-Seed Paradigm
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '11px', 
              lineHeight: 1.5,
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              Every point in space computes its properties through pure functions of spatial position.
              Same seed + coordinates = identical output across all sessions.
              Features persist seamlessly across all zoom levels.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
