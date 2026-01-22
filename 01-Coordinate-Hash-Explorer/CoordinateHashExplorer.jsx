import React, { useState, useMemo, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// COORDINATE HASH EXPLORER
// Demonstrates the Position-as-Seed paradigm: O(1) access to any point in space
// No iteration. No state machine. Pure functions of spatial position.
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────────
// HASH FUNCTIONS: The foundation of deterministic procedural generation
// ─────────────────────────────────────────────────────────────────────────────────

// SplitMix64-inspired hash - bijective, excellent distribution
// Every input maps to a unique output with maximum entropy
const splitmix64 = (seed) => {
  let z = (seed + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
  return z ^ (z >> 31n);
};

// Coordinate hash: transforms (x, y, salt) into deterministic pseudo-random value
// This is the CORE INSIGHT: position itself becomes the seed
const coordHash = (x, y, salt = 0) => {
  // Pack coordinates into 64-bit space
  const packed = BigInt(x) * 0x1f1f1f1fn + BigInt(y) * 0x3d3d3d3dn + BigInt(salt) * 0x7f7f7f7fn;
  return splitmix64(packed & 0xffffffffffffffffn);
};

// Convert hash to normalized float [0, 1)
const hashToFloat = (hash) => {
  return Number(hash & 0xffffffn) / 0x1000000;
};

// Convert hash to integer in range [0, max)
const hashToInt = (hash, max) => {
  return Number(hash % BigInt(max));
};

// ─────────────────────────────────────────────────────────────────────────────────
// MULTI-LAYER PROPERTY EXTRACTION
// Different salts = statistically independent property streams
// ─────────────────────────────────────────────────────────────────────────────────

const LAYERS = {
  EXISTENCE: 0,      // Does anything exist here?
  TYPE: 1,           // What category?
  TEMPERATURE: 2,    // Thermal properties
  DENSITY: 3,        // Material density
  RESOURCES: 4,      // Resource richness
  DANGER: 5,         // Hazard level
  SPECIAL: 6,        // Rare phenomena
};

const CELL_TYPES = [
  { name: 'Void', color: '#0a0a12', symbol: '·', description: 'Empty space' },
  { name: 'Rocky', color: '#6b5344', symbol: '◆', description: 'Silicate body' },
  { name: 'Ice', color: '#a8d5e5', symbol: '❄', description: 'Frozen volatiles' },
  { name: 'Gas', color: '#e8b87a', symbol: '◎', description: 'Gas accumulation' },
  { name: 'Metallic', color: '#8a8a9a', symbol: '▣', description: 'Heavy elements' },
  { name: 'Oceanic', color: '#2563eb', symbol: '≋', description: 'Liquid surface' },
  { name: 'Volcanic', color: '#dc2626', symbol: '▲', description: 'Molten interior' },
  { name: 'Anomaly', color: '#a855f7', symbol: '✦', description: 'Unknown phenomena' },
];

const RESOURCES = ['None', 'Carbon', 'Silicon', 'Iron', 'Titanium', 'Platinum', 'Exotic'];
const DANGER_LEVELS = ['Safe', 'Low', 'Moderate', 'High', 'Extreme'];

// Generate all properties for a cell - O(1) complexity regardless of position
const generateCellProperties = (x, y, worldSeed, densityThreshold) => {
  // Layer 0: Existence check
  const existenceHash = coordHash(x, y, LAYERS.EXISTENCE + worldSeed);
  const existenceValue = hashToFloat(existenceHash);
  const exists = existenceValue > densityThreshold;
  
  if (!exists) {
    return {
      exists: false,
      type: CELL_TYPES[0],
      typeIndex: 0,
      temperature: 0,
      density: 0,
      resources: 'None',
      resourceIndex: 0,
      danger: 'Safe',
      dangerIndex: 0,
      special: false,
      rawHashes: {
        existence: existenceHash.toString(16).padStart(16, '0'),
      },
      coordinates: { x, y },
      existenceValue: existenceValue.toFixed(4),
    };
  }
  
  // Layer 1: Type determination
  const typeHash = coordHash(x, y, LAYERS.TYPE + worldSeed);
  const typeIndex = hashToInt(typeHash, CELL_TYPES.length - 1) + 1; // Skip void
  
  // Layer 2: Temperature (Kelvin, scaled 10-10000)
  const tempHash = coordHash(x, y, LAYERS.TEMPERATURE + worldSeed);
  const temperature = Math.floor(10 + hashToFloat(tempHash) * 9990);
  
  // Layer 3: Density (g/cm³, scaled 0.1-20)
  const densityHash = coordHash(x, y, LAYERS.DENSITY + worldSeed);
  const density = (0.1 + hashToFloat(densityHash) * 19.9).toFixed(2);
  
  // Layer 4: Resources
  const resourceHash = coordHash(x, y, LAYERS.RESOURCES + worldSeed);
  const resourceIndex = hashToInt(resourceHash, RESOURCES.length);
  
  // Layer 5: Danger
  const dangerHash = coordHash(x, y, LAYERS.DANGER + worldSeed);
  const dangerIndex = hashToInt(dangerHash, DANGER_LEVELS.length);
  
  // Layer 6: Special phenomena (rare)
  const specialHash = coordHash(x, y, LAYERS.SPECIAL + worldSeed);
  const special = hashToFloat(specialHash) > 0.95;
  
  return {
    exists: true,
    type: CELL_TYPES[typeIndex],
    typeIndex,
    temperature,
    density,
    resources: RESOURCES[resourceIndex],
    resourceIndex,
    danger: DANGER_LEVELS[dangerIndex],
    dangerIndex,
    special,
    rawHashes: {
      existence: existenceHash.toString(16).padStart(16, '0'),
      type: typeHash.toString(16).padStart(16, '0'),
      temperature: tempHash.toString(16).padStart(16, '0'),
      density: densityHash.toString(16).padStart(16, '0'),
      resources: resourceHash.toString(16).padStart(16, '0'),
      danger: dangerHash.toString(16).padStart(16, '0'),
      special: specialHash.toString(16).padStart(16, '0'),
    },
    coordinates: { x, y },
    existenceValue: existenceValue.toFixed(4),
  };
};

// ─────────────────────────────────────────────────────────────────────────────────
// REACT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export default function CoordinateHashExplorer() {
  // UI State
  const [worldSeed, setWorldSeed] = useState(42);
  const [gridSize, setGridSize] = useState(16);
  const [densityThreshold, setDensityThreshold] = useState(0.35);
  const [selectedCell, setSelectedCell] = useState(null);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [showHashes, setShowHashes] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  
  // Generate grid data - memoized for performance
  const gridData = useMemo(() => {
    const data = [];
    for (let y = 0; y < gridSize; y++) {
      const row = [];
      for (let x = 0; x < gridSize; x++) {
        const worldX = x + viewportOffset.x;
        const worldY = y + viewportOffset.y;
        row.push(generateCellProperties(worldX, worldY, worldSeed, densityThreshold));
      }
      data.push(row);
    }
    return data;
  }, [gridSize, worldSeed, densityThreshold, viewportOffset]);
  
  // Statistics
  const stats = useMemo(() => {
    let total = gridSize * gridSize;
    let populated = 0;
    let typeCounts = new Array(CELL_TYPES.length).fill(0);
    
    gridData.forEach(row => {
      row.forEach(cell => {
        if (cell.exists) {
          populated++;
          typeCounts[cell.typeIndex]++;
        } else {
          typeCounts[0]++;
        }
      });
    });
    
    return { total, populated, typeCounts };
  }, [gridData, gridSize]);
  
  // Handle cell click
  const handleCellClick = useCallback((cell) => {
    setSelectedCell(cell);
  }, []);
  
  // Pan viewport
  const pan = useCallback((dx, dy) => {
    setViewportOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);
  
  // Jump to coordinates
  const [jumpX, setJumpX] = useState('');
  const [jumpY, setJumpY] = useState('');
  
  const handleJump = () => {
    const x = parseInt(jumpX) || 0;
    const y = parseInt(jumpY) || 0;
    setViewportOffset({ x, y });
    // Select the center cell
    const centerCell = generateCellProperties(
      x + Math.floor(gridSize / 2),
      y + Math.floor(gridSize / 2),
      worldSeed,
      densityThreshold
    );
    setSelectedCell(centerCell);
  };
  
  // Randomize seed
  const randomizeSeed = () => {
    setWorldSeed(Math.floor(Math.random() * 1000000));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
      color: '#e0e0e0',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          background: 'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          Coordinate Hash Explorer
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          Position-as-Seed Paradigm • O(1) Access • No Iteration Required
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* Left Panel: Controls */}
        <div style={{
          width: '280px',
          background: 'rgba(30, 30, 50, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h3 style={{ color: '#60a5fa', marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Generation Parameters
          </h3>
          
          {/* World Seed */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#888' }}>
              World Seed
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={worldSeed}
                onChange={(e) => setWorldSeed(parseInt(e.target.value) || 0)}
                style={{
                  flex: 1,
                  background: '#1a1a2e',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={randomizeSeed}
                style={{
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                🎲
              </button>
            </div>
          </div>
          
          {/* Grid Size */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#888' }}>
              Grid Size: {gridSize}×{gridSize}
            </label>
            <input
              type="range"
              min="8"
              max="32"
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
          </div>
          
          {/* Density Threshold */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#888' }}>
              Void Threshold: {(densityThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="90"
              value={densityThreshold * 100}
              onChange={(e) => setDensityThreshold(parseInt(e.target.value) / 100)}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
          </div>
          
          {/* Jump to Coordinates */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#888' }}>
              Jump to Coordinates
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                placeholder="X"
                value={jumpX}
                onChange={(e) => setJumpX(e.target.value)}
                style={{
                  width: '70px',
                  background: '#1a1a2e',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  padding: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <input
                type="number"
                placeholder="Y"
                value={jumpY}
                onChange={(e) => setJumpY(e.target.value)}
                style={{
                  width: '70px',
                  background: '#1a1a2e',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  padding: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <button
                onClick={handleJump}
                style={{
                  flex: 1,
                  background: '#8b5cf6',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Jump
              </button>
            </div>
          </div>
          
          {/* Show Hashes Toggle */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showHashes}
                onChange={(e) => setShowHashes(e.target.checked)}
                style={{ accentColor: '#3b82f6' }}
              />
              Show Raw Hash Values
            </label>
          </div>
          
          {/* Statistics */}
          <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
          }}>
            <h4 style={{ color: '#60a5fa', marginBottom: '10px', fontSize: '12px' }}>
              Grid Statistics
            </h4>
            <div style={{ fontSize: '11px', lineHeight: '1.8' }}>
              <div>Total Cells: <span style={{ color: '#fff' }}>{stats.total}</span></div>
              <div>Populated: <span style={{ color: '#22c55e' }}>{stats.populated}</span> ({((stats.populated / stats.total) * 100).toFixed(1)}%)</div>
              <div>Void: <span style={{ color: '#666' }}>{stats.total - stats.populated}</span></div>
            </div>
          </div>
          
          {/* Type Legend */}
          <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            padding: '12px',
          }}>
            <h4 style={{ color: '#60a5fa', marginBottom: '10px', fontSize: '12px' }}>
              Cell Types
            </h4>
            <div style={{ display: 'grid', gap: '4px', fontSize: '11px' }}>
              {CELL_TYPES.slice(1).map((type, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    background: type.color,
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                  }}>
                    {type.symbol}
                  </div>
                  <span>{type.name}</span>
                  <span style={{ color: '#666', marginLeft: 'auto' }}>{stats.typeCounts[i + 1]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Center: Grid */}
        <div style={{
          background: 'rgba(30, 30, 50, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#888' }}>
              Viewport: ({viewportOffset.x}, {viewportOffset.y}) → ({viewportOffset.x + gridSize - 1}, {viewportOffset.y + gridSize - 1})
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => pan(-gridSize, 0)} style={navBtnStyle}>◀</button>
              <button onClick={() => pan(0, -gridSize)} style={navBtnStyle}>▲</button>
              <button onClick={() => pan(0, gridSize)} style={navBtnStyle}>▼</button>
              <button onClick={() => pan(gridSize, 0)} style={navBtnStyle}>▶</button>
            </div>
          </div>
          
          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, ${Math.max(20, Math.floor(480 / gridSize))}px)`,
            gap: '2px',
            background: '#0a0a12',
            padding: '4px',
            borderRadius: '8px',
          }}>
            {gridData.map((row, rowIdx) =>
              row.map((cell, colIdx) => {
                const isSelected = selectedCell?.coordinates.x === cell.coordinates.x && 
                                   selectedCell?.coordinates.y === cell.coordinates.y;
                const isHovered = hoveredCell?.coordinates.x === cell.coordinates.x &&
                                  hoveredCell?.coordinates.y === cell.coordinates.y;
                const cellSize = Math.max(20, Math.floor(480 / gridSize));
                
                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    onClick={() => handleCellClick(cell)}
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      background: cell.type.color,
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: `${Math.max(10, cellSize * 0.5)}px`,
                      transition: 'transform 0.1s, box-shadow 0.1s',
                      transform: isHovered ? 'scale(1.15)' : isSelected ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: isSelected 
                        ? '0 0 0 2px #60a5fa, 0 0 12px rgba(96, 165, 250, 0.5)' 
                        : cell.special 
                          ? '0 0 8px rgba(168, 85, 247, 0.6)' 
                          : 'none',
                      zIndex: isHovered || isSelected ? 10 : 1,
                      position: 'relative',
                    }}
                  >
                    {cell.exists && cell.type.symbol}
                    {cell.special && (
                      <div style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '6px',
                        height: '6px',
                        background: '#f472b6',
                        borderRadius: '50%',
                        animation: 'pulse 1.5s infinite',
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {/* Hover Info */}
          {hoveredCell && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: '#1a1a2e',
              borderRadius: '6px',
              fontSize: '11px',
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
            }}>
              <span>({hoveredCell.coordinates.x}, {hoveredCell.coordinates.y})</span>
              <span style={{ color: hoveredCell.type.color }}>{hoveredCell.type.name}</span>
              {hoveredCell.exists && (
                <>
                  <span>{hoveredCell.temperature}K</span>
                  <span>{hoveredCell.resources}</span>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Right Panel: Selected Cell Details */}
        <div style={{
          width: '320px',
          background: 'rgba(30, 30, 50, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h3 style={{ color: '#60a5fa', marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Cell Properties
          </h3>
          
          {selectedCell ? (
            <div>
              {/* Coordinates */}
              <div style={{
                background: '#1a1a2e',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                  ({selectedCell.coordinates.x}, {selectedCell.coordinates.y})
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                  World Coordinates
                </div>
              </div>
              
              {/* Type Badge */}
              <div style={{
                background: selectedCell.type.color,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{selectedCell.type.symbol}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedCell.type.name}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{selectedCell.type.description}</div>
              </div>
              
              {selectedCell.exists ? (
                <>
                  {/* Properties Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '12px',
                  }}>
                    <PropertyCard label="Temperature" value={`${selectedCell.temperature} K`} color="#f97316" />
                    <PropertyCard label="Density" value={`${selectedCell.density} g/cm³`} color="#06b6d4" />
                    <PropertyCard label="Resources" value={selectedCell.resources} color="#22c55e" />
                    <PropertyCard 
                      label="Danger" 
                      value={selectedCell.danger} 
                      color={['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'][selectedCell.dangerIndex]} 
                    />
                  </div>
                  
                  {selectedCell.special && (
                    <div style={{
                      background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '16px' }}>✦ ANOMALY DETECTED ✦</div>
                      <div style={{ fontSize: '11px', opacity: 0.8 }}>Rare phenomenon present</div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  background: '#1a1a2e',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '12px',
                  textAlign: 'center',
                  color: '#666',
                }}>
                  <div style={{ fontSize: '13px' }}>Empty space</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                    Existence value: {selectedCell.existenceValue} &lt; {densityThreshold.toFixed(2)}
                  </div>
                </div>
              )}
              
              {/* Raw Hashes */}
              {showHashes && (
                <div style={{
                  background: '#1a1a2e',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                }}>
                  <div style={{ color: '#60a5fa', marginBottom: '8px', fontSize: '11px' }}>
                    Raw Hash Values (64-bit)
                  </div>
                  {Object.entries(selectedCell.rawHashes).map(([layer, hash]) => (
                    <div key={layer} style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>{layer}:</span>
                      <span style={{ color: '#22c55e' }}>0x{hash}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* O(1) Proof */}
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(96, 165, 250, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                fontSize: '11px',
              }}>
                <div style={{ color: '#60a5fa', fontWeight: 'bold', marginBottom: '4px' }}>
                  O(1) Access Demonstrated
                </div>
                <div style={{ color: '#888' }}>
                  This cell at ({selectedCell.coordinates.x}, {selectedCell.coordinates.y}) was computed 
                  instantly from hash(x, y, seed)—no iteration through preceding coordinates required.
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#666',
              padding: '40px 20px',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>👆</div>
              <div>Click any cell to inspect its deterministic properties</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Info */}
      <div style={{
        marginTop: '24px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#666',
        maxWidth: '800px',
        margin: '24px auto 0',
      }}>
        <strong style={{ color: '#60a5fa' }}>Core Insight:</strong> Position itself is the seed. 
        Every coordinate instantly computes its properties through pure hash functions. 
        Same seed + coordinates = identical output across sessions. No state machine. No sequential iteration.
      </div>
      
      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}

// Helper component for property cards
const PropertyCard = ({ label, value, color }) => (
  <div style={{
    background: '#1a1a2e',
    borderRadius: '6px',
    padding: '10px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '14px', fontWeight: 'bold', color }}>{value}</div>
  </div>
);

// Navigation button style
const navBtnStyle = {
  background: '#1a1a2e',
  border: '1px solid #333',
  borderRadius: '4px',
  padding: '6px 10px',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '12px',
};
