export interface PlanetPosition {
  name: string;
  symbol: string;
  sign: string;
  signSymbol: string;
  degree: number; // 0-360 absolute longitude
  relativeDegree: number; // 0-30 within the sign
  house: number;
  retrograde: boolean;
  interpretation: string;
}

export interface ElementalBalance {
  fire: number;
  earth: number;
  air: number;
  water: number;
}

export interface ChartData {
  name?: string;
  planets: PlanetPosition[];
  rising: {
    sign: string;
    signSymbol: string;
    degree: number; // 0-360
  };
  elements: ElementalBalance;
  summary: string;
  bigThree: {
    sun: string;
    moon: string;
    rising: string;
  }
}

export interface SynastryAspect {
  planetA: string;
  planetB: string;
  aspectType: string;
  description: string;
  orb: number;
}

export interface SynastryData {
  personA: ChartData;
  personB: ChartData;
  analysis: {
    overview: string;
    strengths: string[];
    challenges: string[];
    keyAspects: SynastryAspect[];
  }
}

export interface BirthDetails {
  date: string;
  time: string;
  location: string;
  name: string;
}

// Intermediate type for the Astronomy Service output before AI enrichment
export interface CalculatedChart {
  planets: Omit<PlanetPosition, 'interpretation'>[];
  rising: {
    sign: string;
    signSymbol: string;
    degree: number;
  };
  elements: ElementalBalance;
  bigThree: {
    sun: string;
    moon: string;
    rising: string;
  };
}

export interface ResolvedLocation {
  lat: number;
  lon: number;
  utcTime: string; // ISO String
  formattedAddress: string;
}
