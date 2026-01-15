import React, { useState } from 'react';
import { BirthDetails, ChartData, PlanetPosition, SynastryData } from './types';
import { analyzeBirthChart, analyzeSynastry } from './services/geminiService';
import BirthForm from './components/BirthForm';
import ZodiacWheel from './components/ZodiacWheel';
import AnalysisPanel from './components/AnalysisPanel';
import { ArrowLeft, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [chartData, setChartData] = useState<ChartData | SynastryData | null>(null);
  const [isSynastry, setIsSynastry] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState<{ planet: PlanetPosition; owner: 'A' | 'B' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async (detailsA: BirthDetails, detailsB?: BirthDetails) => {
    setIsLoading(true);
    setLoadingStep('Accessing Ephemeris Data...');
    setError(null);
    try {
      if (detailsB) {
        setLoadingStep('Calculating Synastry Aspects...');
        const data = await analyzeSynastry(detailsA, detailsB);
        setChartData(data);
        setIsSynastry(true);
      } else {
        setLoadingStep('Constructing Natal Chart...');
        const data = await analyzeBirthChart(detailsA);
        setChartData(data);
        setIsSynastry(false);
      }
      setStep('result');
    } catch (err: any) {
      console.error(err);
      setError('Alignment Error. Please verify your coordinates.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleReset = () => {
    setStep('input');
    setChartData(null);
    setSelectedPlanet(null);
    setIsSynastry(false);
  };

  const getDataForWheel = () => {
    if (!chartData) return { primary: null, secondary: null };
    if (isSynastry) {
        const sData = chartData as SynastryData;
        return { primary: sData.personA, secondary: sData.personB };
    }
    return { primary: chartData as ChartData, secondary: null };
  };

  const { primary, secondary } = getDataForWheel();

  return (
    <main className="min-h-screen w-full flex flex-col relative z-10 selection:bg-white selection:text-black">
      {step === 'input' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-void">
          <BirthForm onSubmit={handleCalculate} isLoading={isLoading} />
          {isLoading && (
              <div className="mt-8 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-champagne" />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-gray-500">{loadingStep}</span>
              </div>
          )}
          {error && (
             <div className="mt-8 text-red-400 font-mono text-xs uppercase tracking-widest border border-red-900/50 p-2">
                {error}
             </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden animate-fade-in bg-void">
           {/* Left: Visualization */}
           <div className="w-full lg:w-1/2 flex flex-col relative border-b lg:border-b-0 lg:border-r border-white/5">
              
              {/* Top Bar */}
              <div className="p-6 flex justify-between items-center z-20">
                  <button 
                    onClick={handleReset}
                    className="group flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-champagne transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 
                    Back
                  </button>
                  <div className="font-mono text-[9px] text-gray-700">LAT: {getDataForWheel().primary?.rising.degree.toFixed(2)}</div>
              </div>
              
              {/* Main Wheel Container */}
              <div className="flex-1 flex items-center justify-center p-8 lg:p-12 relative">
                 {primary && (
                   <ZodiacWheel 
                     data={primary} 
                     secondaryData={secondary || undefined}
                     onPlanetSelect={(p, o) => setSelectedPlanet({ planet: p!, owner: o! })}
                     selectedPlanet={selectedPlanet}
                   />
                 )}
              </div>

              {/* Bottom Info */}
              <div className="p-8">
                  {isSynastry ? (
                      <div className="flex justify-between items-end border-t border-white/5 pt-4">
                           <div className="text-right">
                               <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Subject A (Outer)</div>
                               <div className="font-display text-lg text-champagne">{(chartData as SynastryData).personA.name}</div>
                           </div>
                           <div className="w-px h-8 bg-white/10 mx-4"></div>
                           <div>
                               <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Subject B (Inner)</div>
                               <div className="font-display text-lg text-gray-400">{(chartData as SynastryData).personB.name}</div>
                           </div>
                      </div>
                  ) : (
                      <div className="grid grid-cols-3 gap-8 border-t border-white/5 pt-6">
                          <div>
                              <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Sun Sign</div>
                              <div className="font-display text-xl text-paper">{primary?.bigThree.sun}</div>
                          </div>
                          <div>
                              <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Moon Sign</div>
                              <div className="font-display text-xl text-paper">{primary?.bigThree.moon}</div>
                          </div>
                          <div>
                              <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Rising</div>
                              <div className="font-display text-xl text-paper">{primary?.bigThree.rising}</div>
                          </div>
                      </div>
                  )}
              </div>
           </div>

           {/* Right: Analysis */}
           {chartData && (
             <AnalysisPanel 
              data={chartData} 
              isSynastry={isSynastry} 
              selectedPlanet={selectedPlanet} 
             />
           )}
        </div>
      )}
    </main>
  );
};

export default App;