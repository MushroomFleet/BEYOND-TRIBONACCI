import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// STELLAR FORGE SIMULATOR
// Demonstrates: Star generation with physical constraints
// Shows: Mass → Luminosity → Temperature → Spectral Class derivation chain
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// PURE HASH FUNCTIONS (Position-is-Seed Paradigm)
// ─────────────────────────────────────────────────────────────────────────────

const splitmix64 = (seed) => {
  let z = BigInt(seed) + 0x9e3779b97f4a7c15n;
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  z = z ^ (z >> 31n);
  return Number(z & 0xffffffffn) / 0xffffffff;
};

const coordHash = (x, y, z, salt = 0) => {
  const prime1 = 198491317;
  const prime2 = 6542989;
  const prime3 = 357239;
  let hash = Math.abs(x * prime1 ^ y * prime2 ^ z * prime3 ^ salt);
  hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
  hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
  hash = (hash >> 16) ^ hash;
  return hash >>> 0;
};

const hashToFloat = (seed, salt = 0) => splitmix64(seed ^ (salt * 2654435761));

// ─────────────────────────────────────────────────────────────────────────────
// STELLAR PHYSICS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const SPECTRAL_CLASSES = [
  { class: 'O', minTemp: 30000, maxTemp: 52000, color: '#9bb0ff', glow: '#4466ff', desc: 'Blue Giant', rarity: 0.00003 },
  { class: 'B', minTemp: 10000, maxTemp: 30000, color: '#aabfff', glow: '#6688ff', desc: 'Blue-White', rarity: 0.0013 },
  { class: 'A', minTemp: 7500, maxTemp: 10000, color: '#cad7ff', glow: '#99aaff', desc: 'White', rarity: 0.006 },
  { class: 'F', minTemp: 6000, maxTemp: 7500, color: '#f8f7ff', glow: '#ddddff', desc: 'Yellow-White', rarity: 0.03 },
  { class: 'G', minTemp: 5200, maxTemp: 6000, color: '#fff4ea', glow: '#ffeecc', desc: 'Yellow (Sun-like)', rarity: 0.076 },
  { class: 'K', minTemp: 3700, maxTemp: 5200, color: '#ffd2a1', glow: '#ffaa66', desc: 'Orange', rarity: 0.121 },
  { class: 'M', minTemp: 2400, maxTemp: 3700, color: '#ffcc6f', glow: '#ff6622', desc: 'Red Dwarf', rarity: 0.765 },
];

const generateStar = (x, y, z, universeSeed) => {
  const seed = coordHash(x, y, z, universeSeed);
  
  // Layer 0: Stellar existence and type determination
  const existenceRoll = hashToFloat(seed, 0);
  const massRoll = hashToFloat(seed, 1);
  const ageRoll = hashToFloat(seed, 2);
  const metallicityRoll = hashToFloat(seed, 3);
  
  // Mass distribution follows IMF (Initial Mass Function) - Salpeter slope
  // More low-mass stars than high-mass (power law: N(M) ∝ M^-2.35)
  const massExponent = -Math.log(1 - massRoll * 0.9999) / 2.35;
  const mass = 0.08 + massExponent * 2.5; // Solar masses (0.08 to ~150)
  const clampedMass = Math.min(Math.max(mass, 0.08), 150);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVATION CHAIN: Mass → Luminosity → Radius → Temperature → Spectral Class
  // ═══════════════════════════════════════════════════════════════════════════
  
  // STEP 1: Mass → Luminosity (Mass-Luminosity Relation)
  // L/L☉ ≈ (M/M☉)^α where α varies with mass range
  let luminosity;
  let luminosityAlpha;
  if (clampedMass < 0.43) {
    luminosityAlpha = 2.3;
    luminosity = Math.pow(clampedMass, luminosityAlpha);
  } else if (clampedMass < 2) {
    luminosityAlpha = 4.0;
    luminosity = Math.pow(clampedMass, luminosityAlpha);
  } else if (clampedMass < 55) {
    luminosityAlpha = 3.5;
    luminosity = 1.4 * Math.pow(clampedMass, luminosityAlpha);
  } else {
    luminosityAlpha = 1.0;
    luminosity = 32000 * clampedMass;
  }
  
  // STEP 2: Mass → Radius (Mass-Radius Relation for Main Sequence)
  // R/R☉ ≈ (M/M☉)^β
  let radius;
  if (clampedMass < 1) {
    radius = Math.pow(clampedMass, 0.8);
  } else {
    radius = Math.pow(clampedMass, 0.57);
  }
  
  // STEP 3: Luminosity + Radius → Temperature (Stefan-Boltzmann)
  // L = 4πR²σT⁴ → T = (L/(4πR²σ))^0.25
  // In solar units: T/T☉ = (L/L☉)^0.25 / (R/R☉)^0.5
  const solarTemp = 5778; // Kelvin
  const temperature = solarTemp * Math.pow(luminosity, 0.25) / Math.pow(radius, 0.5);
  
  // STEP 4: Temperature → Spectral Class
  let spectralClass = SPECTRAL_CLASSES[6]; // Default to M
  for (const sc of SPECTRAL_CLASSES) {
    if (temperature >= sc.minTemp && temperature < sc.maxTemp) {
      spectralClass = sc;
      break;
    }
  }
  if (temperature >= 52000) spectralClass = SPECTRAL_CLASSES[0];
  
  // Spectral subclass (0-9, 0 being hottest within class)
  const tempRange = spectralClass.maxTemp - spectralClass.minTemp;
  const tempInRange = temperature - spectralClass.minTemp;
  const subclass = Math.min(9, Math.max(0, Math.floor(9 - (tempInRange / tempRange) * 10)));
  
  // Additional derived properties
  const age = ageRoll * (10 / Math.pow(clampedMass, 2.5)); // Gyr (massive stars live shorter)
  const metallicity = -2.5 + metallicityRoll * 3.0; // [Fe/H] in dex
  
  // Absolute magnitude from luminosity
  const absoluteMagnitude = 4.83 - 2.5 * Math.log10(luminosity);
  
  // Habitable zone boundaries (AU)
  const hzInner = Math.sqrt(luminosity / 1.1);
  const hzOuter = Math.sqrt(luminosity / 0.53);
  
  return {
    seed,
    coords: { x, y, z },
    // Core properties
    mass: clampedMass,
    luminosity,
    luminosityAlpha,
    radius,
    temperature: Math.round(temperature),
    // Classification
    spectralClass: spectralClass.class,
    spectralSubclass: subclass,
    fullClass: `${spectralClass.class}${subclass}V`,
    spectralData: spectralClass,
    // Derived
    age: Math.min(age, 13.8), // Cap at universe age
    metallicity,
    absoluteMagnitude,
    hzInner,
    hzOuter,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const StarVisualization = ({ star, size = 300 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const timeRef = useRef(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Star visual radius based on actual radius (logarithmic scale for visibility)
    const visualRadius = 20 + Math.log10(star.radius + 1) * 40;
    
    const render = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;
      
      ctx.clearRect(0, 0, size, size);
      
      // Background with subtle nebula
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
      bgGrad.addColorStop(0, 'rgba(20, 15, 35, 1)');
      bgGrad.addColorStop(0.5, 'rgba(10, 8, 20, 1)');
      bgGrad.addColorStop(1, 'rgba(5, 3, 10, 1)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);
      
      // Distant stars
      const starSeed = star.seed;
      for (let i = 0; i < 50; i++) {
        const sx = (hashToFloat(starSeed, i * 3) * size);
        const sy = (hashToFloat(starSeed, i * 3 + 1) * size);
        const sb = 0.3 + hashToFloat(starSeed, i * 3 + 2) * 0.7;
        const twinkle = Math.sin(time * (2 + hashToFloat(starSeed, i * 3 + 100) * 3)) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${sb * twinkle * 0.6})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5 + hashToFloat(starSeed, i * 3 + 200) * 1, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Corona / outer glow (pulsing)
      const coronaPulse = 1 + Math.sin(time * 0.5) * 0.05;
      for (let i = 5; i >= 1; i--) {
        const coronaGrad = ctx.createRadialGradient(
          centerX, centerY, visualRadius * coronaPulse,
          centerX, centerY, visualRadius * (1 + i * 0.8) * coronaPulse
        );
        coronaGrad.addColorStop(0, `${star.spectralData.glow}33`);
        coronaGrad.addColorStop(0.5, `${star.spectralData.glow}11`);
        coronaGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coronaGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, visualRadius * (1 + i * 0.8) * coronaPulse, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Main star body
      const starGrad = ctx.createRadialGradient(
        centerX - visualRadius * 0.2, centerY - visualRadius * 0.2, 0,
        centerX, centerY, visualRadius
      );
      starGrad.addColorStop(0, '#ffffff');
      starGrad.addColorStop(0.3, star.spectralData.color);
      starGrad.addColorStop(0.7, star.spectralData.glow);
      starGrad.addColorStop(1, `${star.spectralData.glow}88`);
      
      ctx.fillStyle = starGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, visualRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Surface turbulence
      ctx.globalCompositeOperation = 'overlay';
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + time * 0.2;
        const dist = visualRadius * 0.6 * (0.8 + Math.sin(time * 2 + i) * 0.2);
        const tx = centerX + Math.cos(angle) * dist;
        const ty = centerY + Math.sin(angle) * dist;
        const turbGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, visualRadius * 0.4);
        turbGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        turbGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = turbGrad;
        ctx.beginPath();
        ctx.arc(tx, ty, visualRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      
      // Lens flare for hot stars
      if (star.temperature > 8000) {
        const flareBrightness = Math.min(1, (star.temperature - 8000) / 30000);
        ctx.globalCompositeOperation = 'screen';
        
        // Horizontal flare
        const flareGrad = ctx.createLinearGradient(0, centerY, size, centerY);
        flareGrad.addColorStop(0, 'transparent');
        flareGrad.addColorStop(0.3, `rgba(200, 220, 255, ${flareBrightness * 0.1})`);
        flareGrad.addColorStop(0.5, `rgba(255, 255, 255, ${flareBrightness * 0.3})`);
        flareGrad.addColorStop(0.7, `rgba(200, 220, 255, ${flareBrightness * 0.1})`);
        flareGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = flareGrad;
        ctx.fillRect(0, centerY - 2, size, 4);
        
        // Diagonal flares
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.PI / 6);
        ctx.fillRect(-size/2, -1, size, 2);
        ctx.rotate(-Math.PI / 3);
        ctx.fillRect(-size/2, -1, size, 2);
        ctx.restore();
        
        ctx.globalCompositeOperation = 'source-over';
      }
      
      animationRef.current = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [star, size]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size}
      style={{ borderRadius: '12px' }}
    />
  );
};

const DerivationChain = ({ star }) => {
  const chainSteps = [
    {
      label: 'COORDINATES',
      value: `(${star.coords.x}, ${star.coords.y}, ${star.coords.z})`,
      formula: 'Input Position',
      color: '#88aaff',
      icon: '◈',
    },
    {
      label: 'SEED',
      value: star.seed.toString(16).toUpperCase().padStart(8, '0'),
      formula: 'hash(x, y, z, salt)',
      color: '#aa88ff',
      icon: '⬡',
    },
    {
      label: 'MASS',
      value: `${star.mass.toFixed(3)} M☉`,
      formula: 'IMF: N(M) ∝ M⁻²·³⁵',
      color: '#ffaa44',
      icon: '●',
    },
    {
      label: 'LUMINOSITY',
      value: `${star.luminosity.toFixed(4)} L☉`,
      formula: `L = M^${star.luminosityAlpha.toFixed(1)}`,
      color: '#ffdd44',
      icon: '✦',
    },
    {
      label: 'RADIUS',
      value: `${star.radius.toFixed(3)} R☉`,
      formula: 'R = M^β (β varies)',
      color: '#ff8866',
      icon: '○',
    },
    {
      label: 'TEMPERATURE',
      value: `${star.temperature.toLocaleString()} K`,
      formula: 'T = T☉ × L^0.25 / R^0.5',
      color: star.spectralData.color,
      icon: '◐',
    },
    {
      label: 'SPECTRAL CLASS',
      value: star.fullClass,
      formula: `${star.spectralData.desc}`,
      color: star.spectralData.glow,
      icon: '★',
    },
  ];
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    }}>
      {chainSteps.map((step, i) => (
        <div key={step.label} style={{ position: 'relative' }}>
          {i > 0 && (
            <div style={{
              position: 'absolute',
              left: '14px',
              top: '-10px',
              height: '12px',
              width: '2px',
              background: `linear-gradient(to bottom, ${chainSteps[i-1].color}44, ${step.color}44)`,
            }} />
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            background: `linear-gradient(90deg, ${step.color}11 0%, transparent 100%)`,
            borderLeft: `3px solid ${step.color}`,
            borderRadius: '0 8px 8px 0',
          }}>
            <span style={{ 
              fontSize: '18px', 
              color: step.color,
              textShadow: `0 0 10px ${step.color}`,
              width: '24px',
              textAlign: 'center',
            }}>
              {step.icon}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '10px', 
                color: '#667788',
                letterSpacing: '1px',
              }}>
                {step.label}
              </div>
              <div style={{ 
                fontSize: '16px', 
                color: step.color,
                fontWeight: 600,
                textShadow: `0 0 20px ${step.color}44`,
              }}>
                {step.value}
              </div>
            </div>
            <div style={{
              fontSize: '11px',
              color: '#556677',
              textAlign: 'right',
              fontStyle: 'italic',
            }}>
              {step.formula}
            </div>
          </div>
          {i < chainSteps.length - 1 && (
            <div style={{
              textAlign: 'center',
              color: '#334455',
              fontSize: '12px',
              margin: '2px 0',
              marginLeft: '30px',
            }}>
              ↓
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const SpectralClassBar = ({ star }) => {
  return (
    <div style={{
      background: '#0a0a12',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid #1a1a2e',
    }}>
      <div style={{
        fontSize: '11px',
        color: '#667788',
        marginBottom: '12px',
        letterSpacing: '2px',
        fontFamily: '"JetBrains Mono", monospace',
      }}>
        SPECTRAL CLASSIFICATION
      </div>
      
      <div style={{
        display: 'flex',
        height: '40px',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {SPECTRAL_CLASSES.map((sc, i) => {
          const isActive = sc.class === star.spectralClass;
          const width = [3, 5, 7, 10, 15, 20, 40][i]; // Roughly proportional to abundance
          return (
            <div
              key={sc.class}
              style={{
                flex: width,
                background: isActive 
                  ? `linear-gradient(180deg, ${sc.color}, ${sc.glow})`
                  : `linear-gradient(180deg, ${sc.color}33, ${sc.glow}22)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: isActive ? '18px' : '14px',
                fontWeight: isActive ? 700 : 400,
                color: isActive ? '#000' : '#ffffff44',
                transition: 'all 0.3s ease',
                position: 'relative',
                borderRight: i < 6 ? '1px solid #00000044' : 'none',
                boxShadow: isActive ? `0 0 30px ${sc.glow}88 inset` : 'none',
              }}
            >
              {sc.class}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: '-24px',
                  fontSize: '10px',
                  color: sc.color,
                  whiteSpace: 'nowrap',
                }}>
                  {sc.minTemp.toLocaleString()}K - {sc.maxTemp.toLocaleString()}K
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '32px',
        fontSize: '10px',
        color: '#445566',
        fontFamily: '"JetBrains Mono", monospace',
      }}>
        <span>← HOTTER</span>
        <span>COOLER →</span>
      </div>
    </div>
  );
};

const PropertyGrid = ({ star }) => {
  const properties = [
    { label: 'Age', value: `${star.age.toFixed(2)} Gyr`, desc: 'Stellar age' },
    { label: 'Metallicity', value: `[Fe/H] = ${star.metallicity.toFixed(2)}`, desc: 'Metal abundance' },
    { label: 'Abs. Magnitude', value: `M = ${star.absoluteMagnitude.toFixed(2)}`, desc: 'Intrinsic brightness' },
    { label: 'HZ Inner', value: `${star.hzInner.toFixed(3)} AU`, desc: 'Habitable zone start' },
    { label: 'HZ Outer', value: `${star.hzOuter.toFixed(3)} AU`, desc: 'Habitable zone end' },
  ];
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '8px',
    }}>
      {properties.map(prop => (
        <div key={prop.label} style={{
          background: '#0a0a12',
          borderRadius: '8px',
          padding: '12px',
          border: '1px solid #1a1a2e',
        }}>
          <div style={{
            fontSize: '10px',
            color: '#556677',
            marginBottom: '4px',
            letterSpacing: '1px',
            fontFamily: '"JetBrains Mono", monospace',
          }}>
            {prop.label.toUpperCase()}
          </div>
          <div style={{
            fontSize: '14px',
            color: '#aabbcc',
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 600,
          }}>
            {prop.value}
          </div>
          <div style={{
            fontSize: '9px',
            color: '#445566',
            marginTop: '4px',
          }}>
            {prop.desc}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function StellarForgeSimulator() {
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });
  const [universeSeed, setUniverseSeed] = useState(42);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef(null);
  
  const star = useMemo(() => 
    generateStar(coords.x, coords.y, coords.z, universeSeed),
    [coords.x, coords.y, coords.z, universeSeed]
  );
  
  const randomize = useCallback(() => {
    setCoords({
      x: Math.floor(Math.random() * 2000) - 1000,
      y: Math.floor(Math.random() * 2000) - 1000,
      z: Math.floor(Math.random() * 200) - 100,
    });
  }, []);
  
  const exploreAnimation = useCallback(() => {
    if (isAnimating) {
      cancelAnimationFrame(animationRef.current);
      setIsAnimating(false);
      return;
    }
    
    setIsAnimating(true);
    let step = 0;
    const animate = () => {
      step++;
      setCoords(prev => ({
        x: prev.x + Math.round(Math.sin(step * 0.02) * 2),
        y: prev.y + Math.round(Math.cos(step * 0.015) * 2),
        z: prev.z + (step % 50 === 0 ? Math.round((Math.random() - 0.5) * 10) : 0),
      }));
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
  }, [isAnimating]);
  
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a12 0%, #0d0d1a 50%, #0a0a12 100%)',
      color: '#e0e0e0',
      fontFamily: '"Nunito Sans", "Segoe UI", sans-serif',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '32px',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 300,
          letterSpacing: '8px',
          color: '#ffffff',
          margin: 0,
          textTransform: 'uppercase',
          textShadow: '0 0 40px rgba(100, 150, 255, 0.3)',
        }}>
          Stellar Forge
        </h1>
        <p style={{
          fontSize: '12px',
          color: '#667788',
          letterSpacing: '4px',
          marginTop: '8px',
          fontFamily: '"JetBrains Mono", monospace',
        }}>
          POSITION-IS-SEED STAR GENERATION
        </p>
      </div>
      
      {/* Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        justifyContent: 'center',
        marginBottom: '32px',
      }}>
        {['x', 'y', 'z'].map(axis => (
          <div key={axis} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}>
            <label style={{
              fontSize: '11px',
              color: '#556677',
              letterSpacing: '2px',
              fontFamily: '"JetBrains Mono", monospace',
            }}>
              {axis.toUpperCase()}
            </label>
            <input
              type="number"
              value={coords[axis]}
              onChange={e => setCoords(prev => ({ ...prev, [axis]: parseInt(e.target.value) || 0 }))}
              style={{
                width: '100px',
                padding: '8px 12px',
                background: '#0a0a12',
                border: '1px solid #2a2a3e',
                borderRadius: '8px',
                color: '#aabbcc',
                fontSize: '14px',
                textAlign: 'center',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            />
          </div>
        ))}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <label style={{
            fontSize: '11px',
            color: '#556677',
            letterSpacing: '2px',
            fontFamily: '"JetBrains Mono", monospace',
          }}>
            UNIVERSE
          </label>
          <input
            type="number"
            value={universeSeed}
            onChange={e => setUniverseSeed(parseInt(e.target.value) || 0)}
            style={{
              width: '100px',
              padding: '8px 12px',
              background: '#0a0a12',
              border: '1px solid #2a2a3e',
              borderRadius: '8px',
              color: '#aabbcc',
              fontSize: '14px',
              textAlign: 'center',
              fontFamily: '"JetBrains Mono", monospace',
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <button
            onClick={randomize}
            style={{
              padding: '8px 20px',
              background: 'linear-gradient(135deg, #2a3a5a, #1a2a4a)',
              border: '1px solid #3a4a6a',
              borderRadius: '8px',
              color: '#aabbcc',
              cursor: 'pointer',
              fontSize: '12px',
              letterSpacing: '1px',
              fontFamily: '"JetBrains Mono", monospace',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={e => e.target.style.background = 'linear-gradient(135deg, #3a4a6a, #2a3a5a)'}
            onMouseOut={e => e.target.style.background = 'linear-gradient(135deg, #2a3a5a, #1a2a4a)'}
          >
            RANDOM
          </button>
          <button
            onClick={exploreAnimation}
            style={{
              padding: '8px 20px',
              background: isAnimating 
                ? 'linear-gradient(135deg, #5a3a3a, #4a2a2a)' 
                : 'linear-gradient(135deg, #2a5a3a, #1a4a2a)',
              border: `1px solid ${isAnimating ? '#6a4a4a' : '#3a6a4a'}`,
              borderRadius: '8px',
              color: '#aabbcc',
              cursor: 'pointer',
              fontSize: '12px',
              letterSpacing: '1px',
              fontFamily: '"JetBrains Mono", monospace',
              transition: 'all 0.2s ease',
            }}
          >
            {isAnimating ? 'STOP' : 'EXPLORE'}
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 350px) 1fr',
        gap: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Left: Star Visualization */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <StarVisualization star={star} size={300} />
          
          <div style={{
            textAlign: 'center',
            padding: '16px',
            background: `linear-gradient(135deg, ${star.spectralData.glow}11, transparent)`,
            borderRadius: '12px',
            border: `1px solid ${star.spectralData.glow}33`,
            width: '100%',
          }}>
            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              color: star.spectralData.color,
              textShadow: `0 0 30px ${star.spectralData.glow}`,
              fontFamily: '"JetBrains Mono", monospace',
            }}>
              {star.fullClass}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#889999',
              marginTop: '4px',
            }}>
              {star.spectralData.desc}
            </div>
          </div>
          
          <SpectralClassBar star={star} />
        </div>
        
        {/* Right: Derivation Chain & Properties */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          <div style={{
            background: '#0a0a12',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #1a1a2e',
          }}>
            <h2 style={{
              fontSize: '13px',
              color: '#667788',
              letterSpacing: '3px',
              marginBottom: '16px',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 400,
            }}>
              PHYSICAL DERIVATION CHAIN
            </h2>
            <DerivationChain star={star} />
          </div>
          
          <div style={{
            background: '#0a0a12',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #1a1a2e',
          }}>
            <h2 style={{
              fontSize: '13px',
              color: '#667788',
              letterSpacing: '3px',
              marginBottom: '16px',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 400,
            }}>
              DERIVED PROPERTIES
            </h2>
            <PropertyGrid star={star} />
          </div>
          
          {/* Determinism Proof */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2a, #0a0a12)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #2a2a3e',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '11px',
          }}>
            <div style={{ color: '#556677', marginBottom: '8px' }}>
              DETERMINISM VERIFICATION
            </div>
            <code style={{ color: '#88aacc' }}>
              hash({coords.x}, {coords.y}, {coords.z}, {universeSeed}) → 0x{star.seed.toString(16).toUpperCase().padStart(8, '0')}
            </code>
            <div style={{ 
              color: '#445566', 
              marginTop: '8px',
              fontSize: '10px',
            }}>
              Same coordinates + seed will always produce identical results
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '48px',
        padding: '24px',
        borderTop: '1px solid #1a1a2e',
      }}>
        <div style={{
          fontSize: '10px',
          color: '#445566',
          letterSpacing: '2px',
          fontFamily: '"JetBrains Mono", monospace',
        }}>
          BASED ON "BEYOND TRIBONACCI: A CONTEMPORARY METHODOLOGY FOR ENDLESS WORLD GENERATION"
        </div>
        <div style={{
          fontSize: '9px',
          color: '#334455',
          marginTop: '8px',
        }}>
          Position-is-Seed Paradigm • Pure Functional Generation • O(1) Random Access
        </div>
      </div>
    </div>
  );
}
