import React, { useState, useMemo, useEffect } from 'react';
import { ChartData, PlanetPosition } from '../types';
import { ZODIAC_SIGNS } from '../constants';
import { RotateCw, RefreshCcw } from 'lucide-react';

interface ZodiacWheelProps {
  data: ChartData;
  secondaryData?: ChartData; // For Synastry
  onPlanetSelect: (planet: PlanetPosition | null, owner?: 'A' | 'B') => void;
  selectedPlanet: { planet: PlanetPosition; owner: 'A' | 'B' } | null;
}

// Robust collision logic to assign radial "tracks" to clustered planets
// Also determines if a planet is "isolated" (has ample space)
const resolveCollisions = (planets: PlanetPosition[], minDeg: number = 6) => {
    // Sort by degree to find neighbors
    const sorted = [...planets].sort((a, b) => a.degree - b.degree);
    
    const getDist = (d1: number, d2: number) => {
        const diff = Math.abs(d1 - d2);
        return diff > 180 ? 360 - diff : diff;
    };

    const withTracks: (PlanetPosition & { track: number; isIsolated: boolean })[] = [];

    sorted.forEach((planet, i) => {
        // 1. Determine Isolation (Ample Space)
        // Check distance to immediate neighbors in the sorted ring
        const prev = sorted[(i - 1 + sorted.length) % sorted.length];
        const next = sorted[(i + 1) % sorted.length];
        
        // If only 1 planet, it is isolated. Otherwise check neighbors.
        let isIsolated = true;
        if (sorted.length > 1) {
            const dPrev = getDist(planet.degree, prev.degree);
            const dNext = getDist(planet.degree, next.degree);
            // Threshold for "ample space" for a label (approx 15 degrees)
            if (dPrev < 15 || dNext < 15) isIsolated = false;
        }

        // 2. Assign Tracks for Collision Avoidance
        const usedTracks = new Set<number>();

        // Look back at previous neighbors in the processed list to determine stack height
        for (let j = 1; j <= 4; j++) {
            if (i - j >= 0) {
                const prevProcessed = withTracks[i - j];
                if (getDist(planet.degree, prevProcessed.degree) < minDeg) {
                    usedTracks.add(prevProcessed.track);
                }
            }
        }
        
        // Find first available track (0 = default/outermost for A, innermost for B)
        let track = 0;
        while (usedTracks.has(track)) track++;
        
        withTracks.push({ ...planet, track, isIsolated });
    });

    // Handle Wrap-around collisions (Pisces -> Aries) for tracks
    if (withTracks.length > 1) {
        const first = withTracks[0];
        const last = withTracks[withTracks.length - 1];
        if (getDist(first.degree, last.degree) < minDeg && first.track === last.track) {
            first.track = first.track + 1;
        }
    }
    
    return withTracks;
};

const ZodiacWheel: React.FC<ZodiacWheelProps> = ({ data, secondaryData, onPlanetSelect, selectedPlanet }) => {
  const [hoveredPlanet, setHoveredPlanet] = useState<{ planet: PlanetPosition; owner: 'A' | 'B' } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [manualOffset, setManualOffset] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Reset manual rotation when chart data changes
  useEffect(() => {
    setManualOffset(0);
  }, [data]);

  // Dimensions
  const radius = 300;
  const center = radius + 50; 
  const size = center * 2;
  const trackSpacing = 18; // Space between orbital tracks
  
  // Rotate wheel so Primary Rising sign is at 9 o'clock (standard chart orientation)
  // Add manual offset for user interaction
  const rotationOffset = (180 - (data.rising?.degree || 0)) + manualOffset;

  const getCoordinates = (degree: number, r: number) => {
    const adjustedDegree = degree + rotationOffset;
    const rad = (adjustedDegree * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center - r * Math.sin(rad),
    };
  };

  // Generate Zodiac Ring Segments
  const signSectors = useMemo(() => {
    return ZODIAC_SIGNS.map((sign) => {
      const startAngle = sign.startDegree;
      const endAngle = sign.startDegree + 30;
      
      // Geometry for the outer ring
      const rOuter = radius;
      const rInner = radius * 0.90; // Thinner ring
      
      const p1 = getCoordinates(startAngle, rOuter);
      const p2 = getCoordinates(endAngle, rOuter);
      const p3 = getCoordinates(endAngle, rInner);
      const p4 = getCoordinates(startAngle, rInner);
      
      // Divider lines
      const divStart = getCoordinates(startAngle, radius * 0.88);
      const divEnd = getCoordinates(startAngle, radius * 1.02);

      const labelPos = getCoordinates(startAngle + 15, radius * 0.95);

      return {
        ...sign,
        path: `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 0 0 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 0 1 ${p4.x} ${p4.y} Z`,
        divider: `M ${divStart.x} ${divStart.y} L ${divEnd.x} ${divEnd.y}`,
        labelX: labelPos.x,
        labelY: labelPos.y,
      };
    });
  }, [rotationOffset]);

  // Planet Placement Logic
  const plottedPlanetsA = useMemo(() => {
    const resolved = resolveCollisions(data.planets);
    // Person A starts inside the ring and stacks INWARD
    const baseR = radius * 0.82; 
    return resolved.map(p => {
        const r = baseR - (p.track * trackSpacing);
        const coords = getCoordinates(p.degree, r);
        return { ...p, x: coords.x, y: coords.y, r, owner: 'A' as const };
    });
  }, [data.planets, rotationOffset]);

  const plottedPlanetsB = useMemo(() => {
    if (!secondaryData) return [];
    const resolved = resolveCollisions(secondaryData.planets);
    // Person B starts from center void and stacks OUTWARD
    const baseR = radius * 0.45; 
    return resolved.map(p => {
        const r = baseR + (p.track * trackSpacing);
        const coords = getCoordinates(p.degree, r);
        return { ...p, x: coords.x, y: coords.y, r, owner: 'B' as const };
    });
  }, [secondaryData, rotationOffset]);

  const active = hoveredPlanet || selectedPlanet;

  // Calculate Aspect Lines (only for active selection or high-level view)
  const aspectLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    const set1 = plottedPlanetsA;
    const set2 = secondaryData ? plottedPlanetsB : plottedPlanetsA;

    set1.forEach((p1, i) => {
      set2.forEach((p2, j) => {
        if (!secondaryData && i >= j) return;
        
        // Filter logic: If something is active, only show relevant lines
        if (active) {
            const p1IsActive = p1.name === active.planet.name && p1.owner === active.owner;
            const p2IsActive = p2.name === active.planet.name && p2.owner === active.owner;
            if (!p1IsActive && !p2IsActive) return;
        }

        const diff = Math.abs(p1.degree - p2.degree);
        const normDiff = diff > 180 ? 360 - diff : diff; 
        
        let type = '';
        if (Math.abs(normDiff - 180) < 6) type = 'opposition';
        else if (Math.abs(normDiff - 120) < 6) type = 'trine';
        else if (Math.abs(normDiff - 90) < 6) type = 'square';
        else if (Math.abs(normDiff - 60) < 4) type = 'sextile';
        else if (Math.abs(normDiff - 0) < 6 && secondaryData) type = 'conjunction';

        if (!type) return;

        // Minimalist aspect styling
        const isActive = active && ((p1.name === active.planet.name && p1.owner === active.owner) || (p2.name === active.planet.name && p2.owner === active.owner));
        
        lines.push(
          <line 
            key={`${p1.name}-${p1.owner}-${p2.name}-${p2.owner}`} 
            x1={p1.x} y1={p1.y} 
            x2={p2.x} y2={p2.y} 
            stroke={isActive ? "#D4C5A5" : "#333"} // Champagne vs Dark Grey
            strokeWidth={isActive ? 1 : 0.5}
            strokeDasharray={type === 'opposition' || type === 'square' ? "0" : "2 2"}
            className="transition-colors duration-500"
            style={{ opacity: isActive ? 1 : (active ? 0 : 0.3) }}
          />
        );
      });
    });
    return lines;
  }, [plottedPlanetsA, plottedPlanetsB, secondaryData, active]);

  // Render a Planet Dot
  const renderPlanet = (p: PlanetPosition & { x: number; y: number; r: number; owner: 'A' | 'B'; isIsolated: boolean }) => {
    const isSelected = selectedPlanet?.planet.name === p.name && selectedPlanet?.owner === p.owner;
    const isHovered = hoveredPlanet?.planet.name === p.name && hoveredPlanet?.owner === p.owner;
    const isActive = isSelected || isHovered;
    const isDimmed = active && !isActive;
    
    // Logic for displaying label:
    // 1. Always show if Active (Selected/Hovered)
    // 2. Show if Isolated (Ample space), but with lower opacity if not active, to act as "ambient" info
    // 3. Hide if Clustered and not active
    const showLabel = isActive || (p.isIsolated && !secondaryData); // Avoid clutter in synastry by only showing active labels

    // Person A: White/Champagne. Person B: Hollow/Outline or distinctive style.
    const fill = p.owner === 'A' ? (isActive ? '#D4C5A5' : '#EAEAEA') : '#0A0A0A';
    const stroke = p.owner === 'A' ? '#0A0A0A' : (isActive ? '#D4C5A5' : '#EAEAEA');

    return (
      <g 
        key={`${p.name}-${p.owner}`} 
        onClick={(e) => { e.stopPropagation(); onPlanetSelect(p, p.owner); }}
        onMouseEnter={() => setHoveredPlanet({ planet: p, owner: p.owner })}
        onMouseLeave={() => setHoveredPlanet(null)}
        className="cursor-pointer transition-all duration-300"
        style={{ 
            opacity: isLoaded ? (isDimmed ? 0.2 : 1) : 0, 
            transformOrigin: `${p.x}px ${p.y}px`,
        }}
      >
        {/* Invisible hit area for easier selection */}
        <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
        
        {/* Visible Planet Dot */}
        <circle 
          cx={p.x} cy={p.y} 
          r={isActive ? 5 : 3.5} 
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
          className="transition-all duration-300"
        />

        {/* Label with Fade-In/Out */}
        <text 
            x={p.x} y={p.y - 12} 
            textAnchor="middle" 
            className={`font-sans text-[10px] uppercase tracking-widest font-bold pointer-events-none transition-all duration-500 ease-out`}
            style={{ 
                fill: isActive ? '#D4C5A5' : '#555',
                opacity: showLabel ? 1 : 0,
                transform: showLabel ? 'translateY(0)' : 'translateY(4px)'
            }}
        >
            {p.name}
        </text>
      </g>
    );
  };

  // Generate visualization tracks (concentric circles)
  const tracks = useMemo(() => {
      const maxTrackA = Math.max(...plottedPlanetsA.map(p => p.track), 0);
      const maxTrackB = Math.max(...plottedPlanetsB.map(p => p.track), 0);
      const circles = [];

      // A Tracks
      const baseRA = radius * 0.82;
      for(let i=0; i<=maxTrackA; i++) {
          circles.push(<circle key={`track-a-${i}`} cx={center} cy={center} r={baseRA - (i * trackSpacing)} fill="none" stroke="#222" strokeWidth="0.5" />);
      }
      
      // B Tracks
      const baseRB = radius * 0.45;
      for(let i=0; i<=maxTrackB; i++) {
          circles.push(<circle key={`track-b-${i}`} cx={center} cy={center} r={baseRB + (i * trackSpacing)} fill="none" stroke="#222" strokeWidth="0.5" />);
      }
      return circles;
  }, [plottedPlanetsA, plottedPlanetsB]);


  return (
    <div className="relative w-full max-w-[600px] mx-auto aspect-square select-none group/wheel">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
        
        {/* --- Background Mechanism --- */}
        <g className={`transition-all duration-1000 ease-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ transformOrigin: 'center' }}>
            {/* Outer Rim */}
            <circle cx={center} cy={center} r={radius} fill="none" stroke="#333" strokeWidth="0.5" />
            <circle cx={center} cy={center} r={radius * 0.90} fill="none" stroke="#333" strokeWidth="0.5" />
            <circle cx={center} cy={center} r={radius * 0.88} fill="none" stroke="#333" strokeWidth="0.5" />
            
            {/* Decorative Inner Bounds */}
            <circle cx={center} cy={center} r={radius * 0.40} fill="none" stroke="#333" strokeWidth="0.5" strokeDasharray="2 4" />
            
            {/* Orbital Tracks */}
            {tracks}
        </g>

        {/* --- Zodiac Ring --- */}
        {signSectors.map((s, i) => (
          <g key={s.name} className="group" style={{ opacity: isLoaded ? 1 : 0, transitionDelay: `${i * 20}ms` }}>
             {/* Divider Lines */}
             <path d={s.divider} stroke="#333" strokeWidth="0.5" />
             
             {/* Text Label */}
             <text 
                transform={`translate(${s.labelX}, ${s.labelY}) rotate(${(s.startDegree + 15 + rotationOffset + 90)})`}
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="font-serif fill-gray-500 text-xs tracking-wider"
                style={{ fontSize: '10px' }}
             >
                {s.name.toUpperCase()}
             </text>
          </g>
        ))}

        {/* --- Aspects --- */}
        {aspectLines}

        {/* --- Planets --- */}
        {plottedPlanetsA.map(renderPlanet)}
        {plottedPlanetsB.map(renderPlanet)}

        {/* --- Center Info --- */}
        <g className="transition-opacity duration-500" style={{ opacity: isLoaded ? 1 : 0 }}>
             <text 
                x={center} y={center} 
                textAnchor="middle" 
                dominantBaseline="middle"
                className="font-display fill-paper text-4xl tracking-[0.2em] font-light"
             >
                {active ? active.planet.symbol : ""}
             </text>
             {!active && (
                 <circle cx={center} cy={center} r={2} fill="#333" />
             )}
        </g>
      </svg>
      
      {/* --- Markers / Floating UI --- */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 -mt-4 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
         <div className="w-px h-8 bg-champagne mx-auto mb-2"></div>
         <span className="text-[10px] uppercase tracking-[0.3em] text-champagne block text-center bg-void px-2">Midheaven</span>
      </div>

       <div className={`absolute left-0 top-1/2 -translate-y-1/2 -ml-8 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'} flex items-center`}>
         <span className="text-[10px] uppercase tracking-[0.3em] text-champagne -rotate-90 bg-void px-2">Ascendant</span>
         <div className="w-8 h-px bg-champagne"></div>
      </div>

      {/* --- Manual Rotation Control --- */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-4 z-30 transition-all duration-500 opacity-0 group-hover/wheel:opacity-100 translate-y-4 group-hover/wheel:translate-y-0">
        <div className="bg-cosmic-900/90 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl">
            <RotateCw className="w-3 h-3 text-gray-500" />
            <input 
                type="range" 
                min="0" 
                max="360" 
                value={manualOffset} 
                onChange={(e) => setManualOffset(Number(e.target.value))}
                className="w-32 h-0.5 bg-white/20 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-champagne [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
            />
            <button 
                onClick={() => setManualOffset(0)}
                className={`transition-all duration-300 ${manualOffset === 0 ? 'w-0 opacity-0 overflow-hidden' : 'w-4 opacity-100'}`}
                title="Reset Orientation"
            >
                <RefreshCcw className="w-3 h-3 text-gray-400 hover:text-white" />
            </button>
        </div>
      </div>

    </div>
  );
};

export default ZodiacWheel;