import React, { useState } from 'react';
import { ChartData, PlanetPosition, SynastryData, ElementalBalance } from '../types';
import { ChevronRight, Minus } from 'lucide-react';

interface AnalysisPanelProps {
  data: ChartData | SynastryData;
  isSynastry?: boolean;
  selectedPlanet: { planet: PlanetPosition; owner: 'A' | 'B' } | null;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ data, isSynastry, selectedPlanet }) => {
  // --- SYNASTRY VIEW ---
  if (isSynastry) {
    const synastry = data as SynastryData;
    
    if (selectedPlanet) {
       return (
         <PlanetDetailView 
           key={`${selectedPlanet.owner}-${selectedPlanet.planet.name}`} 
           planet={selectedPlanet.planet} 
           ownerName={selectedPlanet.owner === 'A' ? synastry.personA.name : synastry.personB.name} 
         />
       );
    }

    // Editorial Synastry Dashboard
    return (
      <div className="w-full lg:w-1/2 flex flex-col h-full border-l border-white/5 bg-void/50 backdrop-blur-sm overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-16 animate-slide-up">
            
            <div className="flex items-baseline justify-between mb-12 border-b border-white/10 pb-6">
                <h2 className="text-[10px] uppercase tracking-[0.4em] text-gray-500">Synastry Report</h2>
                <div className="font-mono text-[10px] text-champagne">NO. {(Math.random() * 1000).toFixed(0).padStart(4, '0')}</div>
            </div>

            <div className="mb-12">
                <h1 className="font-display text-4xl lg:text-5xl text-paper mb-4 leading-tight">
                   {synastry.personA.name} <br/> <span className="text-gray-600">&</span> {synastry.personB.name}
                </h1>
            </div>

            <div className="prose prose-invert prose-lg max-w-none mb-16">
               <p className="font-serif text-2xl leading-relaxed text-gray-300 first-letter:text-6xl first-letter:font-display first-letter:float-left first-letter:mr-4 first-letter:text-champagne">
                  {synastry.analysis.overview}
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                <div>
                   <h4 className="border-b border-white/20 pb-2 text-[10px] uppercase tracking-[0.3em] text-champagne mb-6">
                      Bond Strengths
                   </h4>
                   <ul className="space-y-4">
                      {synastry.analysis.strengths.map((s, i) => (
                         <li key={i} className="text-gray-400 font-serif text-lg leading-snug flex items-start">
                            <span className="mr-3 text-xs mt-1.5 opacity-30">0{i+1}</span>
                            {s}
                         </li>
                      ))}
                   </ul>
                </div>
                <div>
                   <h4 className="border-b border-white/20 pb-2 text-[10px] uppercase tracking-[0.3em] text-gray-500 mb-6">
                      Friction Points
                   </h4>
                   <ul className="space-y-4">
                      {synastry.analysis.challenges.map((c, i) => (
                         <li key={i} className="text-gray-400 font-serif text-lg leading-snug flex items-start">
                            <span className="mr-3 text-xs mt-1.5 opacity-30">0{i+1}</span>
                            {c}
                         </li>
                      ))}
                   </ul>
                </div>
            </div>

            <div>
               <h4 className="text-[10px] uppercase tracking-[0.3em] text-gray-600 mb-8 flex items-center gap-4">
                 <span className="w-4 h-px bg-gray-600"></span> Planetary Geometries
               </h4>
               <div className="space-y-0">
                  {synastry.analysis.keyAspects.map((aspect, i) => (
                     <div key={i} className="group border-t border-white/5 py-6 transition-colors hover:bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <span className="font-display text-champagne">{aspect.planetA}</span>
                                <span className="text-[9px] uppercase tracking-widest text-gray-600 border border-gray-800 px-1.5 py-0.5 rounded-full">{aspect.aspectType}</span>
                                <span className="font-display text-gray-400">{aspect.planetB}</span>
                            </div>
                            <Minus className="w-4 h-4 text-gray-800" />
                        </div>
                        <p className="text-gray-500 text-sm font-serif max-w-md mt-2 group-hover:text-gray-300 transition-colors">{aspect.description}</p>
                     </div>
                  ))}
               </div>
            </div>
        </div>
      </div>
    );
  }

  // --- NATAL VIEW ---
  const natal = data as ChartData;
  const displayPlanet = selectedPlanet?.planet || natal.planets.find(p => p.name === 'Sun');

  if (!displayPlanet) return null;

  // Calculate percentages
  const getNormalizedElements = (elements: ElementalBalance) => {
    const f = Number(elements.fire || 0);
    const e = Number(elements.earth || 0);
    const a = Number(elements.air || 0);
    const w = Number(elements.water || 0);
    const total = f + e + a + w;
    if (total === 0) return { fire: 0, earth: 0, air: 0, water: 0 };
    if (total > 20) return { fire: f, earth: e, air: a, water: w };
    return {
        fire: Math.round((f / total) * 100),
        earth: Math.round((e / total) * 100),
        air: Math.round((a / total) * 100),
        water: Math.round((w / total) * 100),
    };
  };

  const normalizedElements = getNormalizedElements(natal.elements);

  return (
    <PlanetDetailView 
      key={displayPlanet.name} 
      planet={displayPlanet} 
      showElements 
      natalData={natal} 
      normalizedElements={normalizedElements} 
    />
  );
};

// Extracted Component for Planet Details
interface PlanetDetailViewProps {
  planet: PlanetPosition;
  ownerName?: string;
  showElements?: boolean;
  natalData?: ChartData;
  normalizedElements?: ElementalBalance;
}

const PlanetDetailView: React.FC<PlanetDetailViewProps> = ({ planet, ownerName, showElements, natalData, normalizedElements }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="w-full lg:w-1/2 flex flex-col h-full bg-void/50 backdrop-blur-sm border-l border-white/5 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-16">
                <div className="animate-slide-up">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] uppercase tracking-[0.4em] text-gray-500">
                             {ownerName ? `Chart of ${ownerName}` : 'Planetary Analysis'}
                        </h3>
                        <div className="w-8 h-px bg-champagne"></div>
                    </div>
                    
                    <h1 className="font-display text-6xl lg:text-7xl text-paper mb-2 leading-none tracking-tight">
                    {planet.name}
                    </h1>
                    <p className="text-xl lg:text-2xl font-serif italic text-gray-500 mb-12 font-light">
                        Residing in {planet.sign}
                    </p>

                    <div className="grid grid-cols-4 gap-4 py-8 border-t border-b border-white/10 mb-12">
                        <Metric label="DEG" value={planet.degree.toFixed(1)} />
                        <Metric label="HSE" value={planet.house.toString()} />
                        <Metric label="MOT" value={planet.retrograde ? "Rx" : "D"} highlight={planet.retrograde} />
                        <Metric label="ELM" value={planet.signSymbol} />
                    </div>
                    
                    <div className="mb-16">
                        <div className="prose prose-invert prose-xl max-w-none">
                            <p className="text-gray-300 font-serif leading-loose">
                                {planet.interpretation}
                            </p>
                        </div>
                    </div>
                </div>

                {showElements && natalData && normalizedElements && (
                    <div className="mt-8 pt-12 border-t border-white/10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex justify-between items-end mb-8">
                             <h3 className="text-[10px] uppercase tracking-[0.4em] text-gray-500">Constitution</h3>
                             <span className="font-mono text-[9px] text-gray-600">ELEMENTAL_BREAKDOWN_V1</span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-px bg-white/10 border border-white/10 mb-16">
                            <ElementStat label="Fire" value={normalizedElements.fire} />
                            <ElementStat label="Earth" value={normalizedElements.earth} />
                            <ElementStat label="Air" value={normalizedElements.air} />
                            <ElementStat label="Water" value={normalizedElements.water} />
                        </div>

                        <div className="bg-white/[0.03] p-8 border border-white/5 relative">
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-champagne to-transparent opacity-30"></div>
                            <h3 className="text-[10px] uppercase tracking-[0.3em] text-champagne mb-6 text-center">Soul Signature</h3>
                            <p className="text-gray-300 font-serif italic text-xl leading-relaxed text-center">
                                "{natalData.summary}"
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Metric = ({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) => (
    <div className="flex flex-col gap-2 items-center justify-center border-r last:border-0 border-white/5">
        <span className="font-mono text-[9px] uppercase text-gray-600">{label}</span>
        <span className={`font-display text-xl ${highlight ? 'text-champagne' : 'text-gray-300'}`}>{value}</span>
    </div>
);

const ElementStat = ({ label, value }: { label: string, value: number }) => (
  <div className="flex flex-col items-center justify-center p-4 bg-void hover:bg-white/5 transition-colors aspect-square">
    <span className="font-mono text-[9px] uppercase text-gray-500 mb-2">{label}</span>
    <span className="font-display text-2xl text-paper">{value}%</span>
  </div>
);

export default AnalysisPanel;