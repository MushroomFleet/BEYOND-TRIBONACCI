import React, { useState, useMemo, useCallback } from 'react';

// PCG-style hash function - deterministic, high quality
const pcgHash = (x, y, salt, seed) => {
  let state = ((x * 374761393) + (y * 668265263) + (salt * 2147483647) + seed) >>> 0;
  state = ((state ^ (state >> 16)) * 2246822519) >>> 0;
  state = ((state ^ (state >> 13)) * 3266489917) >>> 0;
  state = (state ^ (state >> 16)) >>> 0;
  return state / 4294967296; // normalize to 0-1
};

// Secondary hash for more entropy
const mixHash = (x, y, salt, seed) => {
  const h1 = pcgHash(x, y, salt, seed);
  const h2 = pcgHash(y * 31, x * 17, salt + 12345, seed);
  return (h1 + h2) / 2;
};

// Layer configurations with distinct salts
const LAYER_CONFIGS = {
  existence: {
    salt: 0x1A2B3C4D,
    name: 'Existence',
    description: 'Whether a feature exists at this location',
    color: 'rgba(0, 255, 136, VAR)',
    icon: '◆',
  },
  type: {
    salt: 0x5E6F7A8B,
    name: 'Type Class',
    description: 'Classification category (1-4)',
    color: 'rgba(255, 107, 107, VAR)',
    icon: '▲',
  },
  resource: {
    salt: 0x9C0D1E2F,
    name: 'Resource',
    description: 'Resource density value',
    color: 'rgba(78, 205, 255, VAR)',
    icon: '●',
  },
  danger: {
    salt: 0x3A4B5C6D,
    name: 'Danger Level',
    description: 'Threat intensity',
    color: 'rgba(255, 193, 7, VAR)',
    icon: '★',
  },
};

// Generate a single cell's layer values
const generateCellLayers = (x, y, seed, densityThreshold) => {
  const layers = {};
  
  // Existence layer - binary (exists or not)
  const existenceHash = pcgHash(x, y, LAYER_CONFIGS.existence.salt, seed);
  layers.existence = existenceHash < densityThreshold ? existenceHash / densityThreshold : 0;
  
  // Type layer - categorical (4 types)
  const typeHash = mixHash(x, y, LAYER_CONFIGS.type.salt, seed);
  layers.type = typeHash;
  layers.typeClass = Math.floor(typeHash * 4) + 1;
  
  // Resource layer - continuous value
  const resourceHash = pcgHash(x, y, LAYER_CONFIGS.resource.salt, seed);
  layers.resource = resourceHash;
  
  // Danger layer - continuous value
  const dangerHash = mixHash(x, y, LAYER_CONFIGS.danger.salt, seed);
  layers.danger = dangerHash;
  
  return layers;
};

// Statistics calculation for correlation analysis
const calculateCorrelation = (data1, data2) => {
  const n = data1.length;
  if (n === 0) return 0;
  
  const mean1 = data1.reduce((a, b) => a + b, 0) / n;
  const mean2 = data2.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = data1[i] - mean1;
    const diff2 = data2[i] - mean2;
    numerator += diff1 * diff2;
    denom1 += diff1 * diff1;
    denom2 += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(denom1 * denom2);
  return denominator === 0 ? 0 : numerator / denominator;
};

export default function PropertyLayerVisualizer() {
  const [seed, setSeed] = useState(42);
  const [gridSize, setGridSize] = useState(24);
  const [densityThreshold, setDensityThreshold] = useState(0.65);
  const [cellSize, setCellSize] = useState(28);
  const [visibleLayers, setVisibleLayers] = useState({
    existence: true,
    type: true,
    resource: true,
    danger: true,
  });
  const [hoveredCell, setHoveredCell] = useState(null);
  const [showCorrelations, setShowCorrelations] = useState(false);

  // Generate grid data
  const gridData = useMemo(() => {
    const data = [];
    for (let y = 0; y < gridSize; y++) {
      const row = [];
      for (let x = 0; x < gridSize; x++) {
        row.push(generateCellLayers(x, y, seed, densityThreshold));
      }
      data.push(row);
    }
    return data;
  }, [seed, gridSize, densityThreshold]);

  // Calculate correlations between layers
  const correlations = useMemo(() => {
    const flatData = gridData.flat();
    const layerNames = Object.keys(LAYER_CONFIGS);
    const correlationMatrix = {};
    
    layerNames.forEach(layer1 => {
      correlationMatrix[layer1] = {};
      const data1 = flatData.map(cell => cell[layer1] || 0);
      
      layerNames.forEach(layer2 => {
        const data2 = flatData.map(cell => cell[layer2] || 0);
        correlationMatrix[layer1][layer2] = calculateCorrelation(data1, data2);
      });
    });
    
    return correlationMatrix;
  }, [gridData]);

  // Layer statistics
  const layerStats = useMemo(() => {
    const flatData = gridData.flat();
    const stats = {};
    
    Object.keys(LAYER_CONFIGS).forEach(layer => {
      const values = flatData.map(cell => cell[layer] || 0).filter(v => v > 0);
      stats[layer] = {
        count: values.length,
        mean: values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(3) : 0,
        min: values.length ? Math.min(...values).toFixed(3) : 0,
        max: values.length ? Math.max(...values).toFixed(3) : 0,
      };
    });
    
    return stats;
  }, [gridData]);

  const toggleLayer = useCallback((layer) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  const getLayerColor = (layer, value, alpha = 1) => {
    return LAYER_CONFIGS[layer].color.replace('VAR', (value * alpha).toFixed(2));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a0a0f 0%, #12121a 50%, #0d0d14 100%)',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      color: '#e0e0e0',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '32px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '400px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #00ff88, transparent)',
          opacity: 0.5,
        }} />
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: 300,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          margin: '20px 0 8px',
          background: 'linear-gradient(135deg, #00ff88 0%, #4ecfff 50%, #ff6b6b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Property Layer Visualizer
        </h1>
        <p style={{
          fontSize: '0.75rem',
          color: '#666',
          letterSpacing: '0.15em',
        }}>
          MULTI-LAYER HASH COMPOSITION WITH SALT VALUES
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr 280px',
        gap: '24px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        {/* Left Panel - Controls */}
        <div style={{
          background: 'rgba(20, 20, 30, 0.8)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '20px',
          backdropFilter: 'blur(10px)',
        }}>
          <h3 style={{
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: '#888',
            marginBottom: '16px',
            textTransform: 'uppercase',
          }}>
            Generation Parameters
          </h3>

          {/* Seed Control */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#aaa',
              marginBottom: '8px',
            }}>
              <span>Universe Seed</span>
              <span style={{ color: '#00ff88' }}>{seed}</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={randomizeSeed}
                style={{
                  background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  color: '#000',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ↻
              </button>
            </div>
          </div>

          {/* Grid Size */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#aaa',
              marginBottom: '8px',
            }}>
              <span>Grid Size</span>
              <span style={{ color: '#4ecfff' }}>{gridSize}×{gridSize}</span>
            </label>
            <input
              type="range"
              min="8"
              max="40"
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#4ecfff' }}
            />
          </div>

          {/* Density Threshold */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#aaa',
              marginBottom: '8px',
            }}>
              <span>Existence Density</span>
              <span style={{ color: '#ff6b6b' }}>{(densityThreshold * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={densityThreshold}
              onChange={(e) => setDensityThreshold(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#ff6b6b' }}
            />
          </div>

          {/* Cell Size */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#aaa',
              marginBottom: '8px',
            }}>
              <span>Cell Size</span>
              <span style={{ color: '#ffc107' }}>{cellSize}px</span>
            </label>
            <input
              type="range"
              min="12"
              max="48"
              value={cellSize}
              onChange={(e) => setCellSize(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#ffc107' }}
            />
          </div>

          {/* Divider */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            margin: '20px 0',
          }} />

          {/* Layer Toggles */}
          <h3 style={{
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: '#888',
            marginBottom: '16px',
            textTransform: 'uppercase',
          }}>
            Layer Visibility
          </h3>

          {Object.entries(LAYER_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                marginBottom: '8px',
                background: visibleLayers[key] 
                  ? `linear-gradient(135deg, ${config.color.replace('VAR', '0.15')}, transparent)`
                  : 'rgba(0, 0, 0, 0.3)',
                border: `1px solid ${visibleLayers[key] ? config.color.replace('VAR', '0.4') : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
            >
              <span style={{
                fontSize: '1.2rem',
                color: config.color.replace('VAR', visibleLayers[key] ? '1' : '0.3'),
                width: '24px',
              }}>
                {config.icon}
              </span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{
                  fontSize: '0.8rem',
                  color: visibleLayers[key] ? '#fff' : '#555',
                  fontWeight: 500,
                }}>
                  {config.name}
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  color: visibleLayers[key] ? '#888' : '#444',
                }}>
                  Salt: 0x{config.salt.toString(16).toUpperCase()}
                </div>
              </div>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: visibleLayers[key] ? config.color.replace('VAR', '1') : '#333',
                boxShadow: visibleLayers[key] ? `0 0 12px ${config.color.replace('VAR', '0.6')}` : 'none',
              }} />
            </button>
          ))}
        </div>

        {/* Center - Grid Visualization */}
        <div style={{
          background: 'rgba(20, 20, 30, 0.8)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '20px',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            marginBottom: '16px',
          }}>
            <h3 style={{
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              color: '#888',
              textTransform: 'uppercase',
            }}>
              Coordinate Space Visualization
            </h3>
            <span style={{
              fontSize: '0.7rem',
              color: '#555',
            }}>
              {gridSize * gridSize} cells
            </span>
          </div>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
            gap: '1px',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '1px',
            borderRadius: '8px',
            maxWidth: '100%',
            overflowX: 'auto',
          }}>
            {gridData.map((row, y) =>
              row.map((cell, x) => {
                const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
                return (
                  <div
                    key={`${x}-${y}`}
                    onMouseEnter={() => setHoveredCell({ x, y, ...cell })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      position: 'relative',
                      background: '#0a0a0f',
                      borderRadius: '2px',
                      cursor: 'crosshair',
                      transition: 'transform 0.1s ease',
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1,
                      boxShadow: isHovered ? '0 0 20px rgba(0,255,136,0.3)' : 'none',
                    }}
                  >
                    {/* Existence Layer */}
                    {visibleLayers.existence && cell.existence > 0 && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: getLayerColor('existence', cell.existence, 0.7),
                        borderRadius: '2px',
                      }} />
                    )}
                    
                    {/* Type Layer */}
                    {visibleLayers.type && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: getLayerColor('type', cell.type, 0.4),
                        borderRadius: '2px',
                        mixBlendMode: 'screen',
                      }} />
                    )}
                    
                    {/* Resource Layer */}
                    {visibleLayers.resource && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: getLayerColor('resource', cell.resource, 0.35),
                        borderRadius: '2px',
                        mixBlendMode: 'screen',
                      }} />
                    )}
                    
                    {/* Danger Layer */}
                    {visibleLayers.danger && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: getLayerColor('danger', cell.danger, 0.3),
                        borderRadius: '2px',
                        mixBlendMode: 'screen',
                      }} />
                    )}

                    {/* Coordinate overlay on hover */}
                    {isHovered && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        border: '2px solid #00ff88',
                        borderRadius: '2px',
                        pointerEvents: 'none',
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Hovered Cell Info */}
          <div style={{
            marginTop: '16px',
            padding: '12px 20px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {hoveredCell ? (
              <div style={{
                display: 'flex',
                gap: '24px',
                fontSize: '0.75rem',
              }}>
                <div>
                  <span style={{ color: '#666' }}>COORD: </span>
                  <span style={{ color: '#fff' }}>({hoveredCell.x}, {hoveredCell.y})</span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>EXIST: </span>
                  <span style={{ color: '#00ff88' }}>{hoveredCell.existence.toFixed(3)}</span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>TYPE: </span>
                  <span style={{ color: '#ff6b6b' }}>Class {hoveredCell.typeClass}</span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>RES: </span>
                  <span style={{ color: '#4ecfff' }}>{hoveredCell.resource.toFixed(3)}</span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>DANGER: </span>
                  <span style={{ color: '#ffc107' }}>{hoveredCell.danger.toFixed(3)}</span>
                </div>
              </div>
            ) : (
              <span style={{ color: '#555', fontSize: '0.75rem' }}>
                Hover over a cell to inspect layer values
              </span>
            )}
          </div>
        </div>

        {/* Right Panel - Statistics */}
        <div style={{
          background: 'rgba(20, 20, 30, 0.8)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '20px',
          backdropFilter: 'blur(10px)',
        }}>
          <h3 style={{
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: '#888',
            marginBottom: '16px',
            textTransform: 'uppercase',
          }}>
            Layer Statistics
          </h3>

          {Object.entries(LAYER_CONFIGS).map(([key, config]) => (
            <div
              key={key}
              style={{
                marginBottom: '16px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                border: `1px solid ${config.color.replace('VAR', '0.2')}`,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}>
                <span style={{ color: config.color.replace('VAR', '1') }}>{config.icon}</span>
                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{config.name}</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4px',
                fontSize: '0.7rem',
              }}>
                <div>
                  <span style={{ color: '#555' }}>Count: </span>
                  <span style={{ color: '#fff' }}>{layerStats[key]?.count || 0}</span>
                </div>
                <div>
                  <span style={{ color: '#555' }}>Mean: </span>
                  <span style={{ color: '#fff' }}>{layerStats[key]?.mean || 0}</span>
                </div>
                <div>
                  <span style={{ color: '#555' }}>Min: </span>
                  <span style={{ color: '#fff' }}>{layerStats[key]?.min || 0}</span>
                </div>
                <div>
                  <span style={{ color: '#555' }}>Max: </span>
                  <span style={{ color: '#fff' }}>{layerStats[key]?.max || 0}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Divider */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            margin: '20px 0',
          }} />

          {/* Correlation Matrix */}
          <button
            onClick={() => setShowCorrelations(!showCorrelations)}
            style={{
              width: '100%',
              padding: '10px',
              background: showCorrelations 
                ? 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent)'
                : 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#aaa',
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: '12px',
            }}
          >
            {showCorrelations ? '▼' : '▶'} Correlation Matrix
          </button>

          {showCorrelations && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '8px',
              padding: '12px',
              overflow: 'auto',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.65rem',
              }}>
                <thead>
                  <tr>
                    <th style={{ padding: '4px', color: '#555' }}></th>
                    {Object.keys(LAYER_CONFIGS).map(key => (
                      <th key={key} style={{ 
                        padding: '4px', 
                        color: LAYER_CONFIGS[key].color.replace('VAR', '0.8'),
                        fontWeight: 400,
                      }}>
                        {LAYER_CONFIGS[key].icon}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(LAYER_CONFIGS).map(row => (
                    <tr key={row}>
                      <td style={{ 
                        padding: '4px', 
                        color: LAYER_CONFIGS[row].color.replace('VAR', '0.8'),
                      }}>
                        {LAYER_CONFIGS[row].icon}
                      </td>
                      {Object.keys(LAYER_CONFIGS).map(col => {
                        const corr = correlations[row]?.[col] || 0;
                        const isHighCorr = Math.abs(corr) > 0.3;
                        return (
                          <td
                            key={col}
                            style={{
                              padding: '4px',
                              textAlign: 'center',
                              color: row === col ? '#666' : (isHighCorr ? '#ff6b6b' : '#4a4a4a'),
                              background: row === col ? 'transparent' : 
                                `rgba(${corr > 0 ? '0, 255, 136' : '255, 107, 107'}, ${Math.abs(corr) * 0.3})`,
                            }}
                          >
                            {row === col ? '—' : corr.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{
                fontSize: '0.6rem',
                color: '#555',
                marginTop: '8px',
                textAlign: 'center',
              }}>
                Values near 0 indicate statistical independence
              </p>
            </div>
          )}

          {/* Info Box */}
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: 'rgba(0, 255, 136, 0.05)',
            border: '1px solid rgba(0, 255, 136, 0.15)',
            borderRadius: '8px',
          }}>
            <h4 style={{
              fontSize: '0.7rem',
              color: '#00ff88',
              marginBottom: '8px',
              fontWeight: 500,
            }}>
              Statistical Independence
            </h4>
            <p style={{
              fontSize: '0.65rem',
              color: '#888',
              lineHeight: 1.6,
            }}>
              Each layer uses a unique salt value combined with the same (x,y) coordinates. 
              Different salts produce statistically independent outputs—correlation values 
              near zero demonstrate that layer properties have no predictable relationship.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '32px',
        padding: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <p style={{
          fontSize: '0.65rem',
          color: '#444',
          letterSpacing: '0.1em',
        }}>
          HASH FUNCTION: PCG-STYLE PERMUTATION • DETERMINISM: position_is_seed PARADIGM
        </p>
      </div>
    </div>
  );
}
