import * as Astronomy from 'astronomy-engine';
import { CalculatedChart, PlanetPosition, ElementalBalance, SynastryAspect } from '../types';
import { ZODIAC_SIGNS } from '../constants';

// --- Types & Constants ---
const BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
];

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇'
};

// --- Helper Functions ---

/**
 * Converts Ecliptic Longitude (0-360) to Zodiac Sign and Degree (0-30)
 */
function getZodiacInfo(longitude: number) {
  const normalized = (longitude + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const sign = ZODIAC_SIGNS[signIndex];
  const relativeDegree = normalized % 30;
  return { sign, relativeDegree };
}

/**
 * Calculates the Ascendant (Rising Sign) degree.
 * Formula: ASC = atan2(cos(RAMC), -sin(RAMC)*cos(eps) - tan(lat)*sin(eps))
 */
function calculateAscendant(date: Date, lat: number, lon: number): number {
  const observer = new Astronomy.Observer(lat, lon, 0);
  
  // 1. Get Equator position of the sun to determine Ecliptic Obliquity (eps)
  // Sidereal Time (Greenwich)
  const gmst = Astronomy.SiderealTime(date);
  
  // Local Sidereal Time (hours) -> Convert to degrees
  const lstHours = (gmst + lon / 15.0);
  const lstDeg = lstHours * 15.0;
  const ramc = (lstDeg * Math.PI) / 180.0; // Right Ascension of Medium Coeli in Radians

  // Obliquity of the Ecliptic (approx 23.44 deg)
  const eps = (23.4392911 * Math.PI) / 180.0;
  const latRad = (lat * Math.PI) / 180.0;

  // Formula
  // tan(ASC) = cos(RAMC) / ( -sin(RAMC)*cos(eps) - tan(lat)*sin(eps) )
  const num = Math.cos(ramc);
  const den = -Math.sin(ramc) * Math.cos(eps) - Math.tan(latRad) * Math.sin(eps);
  
  let ascRad = Math.atan2(num, den);
  let ascDeg = (ascRad * 180.0) / Math.PI;
  
  return (ascDeg + 360) % 360;
}

/**
 * Calculate the chart deterministically
 */
export function calculateChart(date: Date, lat: number, lon: number): CalculatedChart {
  const ascDegree = calculateAscendant(date, lat, lon);
  const ascInfo = getZodiacInfo(ascDegree);

  // Whole Sign Houses: Ascendant Sign is House 1
  const ascSignIndex = ZODIAC_SIGNS.findIndex(z => z.name === ascInfo.sign.name);

  const planets = BODIES.map(bodyName => {
    // 1. Calculate Geocentric position
    const time = Astronomy.MakeTime(date);
    const body = (Astronomy.Body as any)[bodyName]; // Dynamic access
    
    // Get Ecliptic coordinates 
    const vec = Astronomy.GeoVector(body, time, true); // true for aberration
    
    // Convert to spherical Ecliptic
    const ecliptic = Astronomy.Ecliptic(vec);
    const longitude = ecliptic.elon; // 0-360
    
    // Check Retrograde: Compare with position 1 hour later
    const timeNext = Astronomy.MakeTime(new Date(date.getTime() + 3600000));
    const vecNext = Astronomy.GeoVector(body, timeNext, true);
    const eclipticNext = Astronomy.Ecliptic(vecNext);
    const retrograde = eclipticNext.elon < longitude && (longitude - eclipticNext.elon) < 180; // Basic check

    const { sign, relativeDegree } = getZodiacInfo(longitude);
    const signIndex = ZODIAC_SIGNS.findIndex(z => z.name === sign.name);
    
    const house = ((signIndex - ascSignIndex + 12) % 12) + 1;

    return {
      name: bodyName,
      symbol: PLANET_SYMBOLS[bodyName],
      sign: sign.name,
      signSymbol: sign.symbol,
      degree: longitude,
      relativeDegree,
      house,
      retrograde
    };
  });

  // Calculate Elemental Balance (Strict Percentage)
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };
  planets.forEach(p => {
    const el = ZODIAC_SIGNS.find(z => z.name === p.sign)?.element;
    if (el && el in counts) counts[el as keyof typeof counts]++;
  });
  
  const total = Math.max(planets.length, 1); // Avoid division by zero
  
  // Calculate percentages and handle rounding so it sums to 100
  const firePct = Math.round((counts.fire / total) * 100);
  const earthPct = Math.round((counts.earth / total) * 100);
  const airPct = Math.round((counts.air / total) * 100);
  // Assign remainder to water to ensure perfect 100 sum
  const waterPct = 100 - firePct - earthPct - airPct;

  const elements = {
    fire: firePct,
    earth: earthPct,
    air: airPct,
    water: waterPct < 0 ? 0 : waterPct // Safety clip
  };

  // Find Big Three
  const sun = planets.find(p => p.name === 'Sun');
  const moon = planets.find(p => p.name === 'Moon');

  return {
    planets,
    rising: {
      sign: ascInfo.sign.name,
      signSymbol: ascInfo.sign.symbol,
      degree: ascDegree
    },
    elements,
    bigThree: {
      sun: `${sun?.sign}`,
      moon: `${moon?.sign}`,
      rising: `${ascInfo.sign.name}`
    }
  };
}

/**
 * Calculate Synastry Aspects Deterministically
 */
export function calculateAspects(p1: CalculatedChart, p2: CalculatedChart): SynastryAspect[] {
  const aspects: SynastryAspect[] = [];
  const ORB = 6; // Standard orb for synastry

  p1.planets.forEach(planetA => {
    p2.planets.forEach(planetB => {
      // Calculate shortest distance on the circle
      const diff = Math.abs(planetA.degree - planetB.degree);
      const angle = diff > 180 ? 360 - diff : diff;

      let type = '';
      if (Math.abs(angle - 0) <= ORB) type = 'Conjunction';
      else if (Math.abs(angle - 60) <= ORB * 0.7) type = 'Sextile';
      else if (Math.abs(angle - 90) <= ORB) type = 'Square';
      else if (Math.abs(angle - 120) <= ORB) type = 'Trine';
      else if (Math.abs(angle - 180) <= ORB) type = 'Opposition';

      if (type) {
        aspects.push({
          planetA: planetA.name,
          planetB: planetB.name,
          aspectType: type,
          description: '', 
          orb: Math.abs(angle - (type === 'Conjunction' ? 0 : type === 'Sextile' ? 60 : type === 'Square' ? 90 : type === 'Trine' ? 120 : 180))
        });
      }
    });
  });

  // Sort by tightness of orb
  return aspects.sort((a, b) => a.orb - b.orb).slice(0, 8); // Top 8 aspects
}