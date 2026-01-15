import React, { useState } from 'react';
import { BirthDetails } from '../types';
import { ArrowRight, Star, Users } from 'lucide-react';

interface BirthFormProps {
  onSubmit: (details: BirthDetails, secondaryDetails?: BirthDetails) => void;
  isLoading: boolean;
}

const MinimalInput = ({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  placeholder 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  type?: string; 
  placeholder?: string;
}) => (
  <div className="group relative pt-4">
    <label className="absolute top-0 left-0 text-[9px] uppercase tracking-[0.2em] text-gray-500 font-medium transition-colors group-focus-within:text-champagne">
      {label}
    </label>
    <input
      type={type}
      required
      placeholder={placeholder}
      className="w-full bg-transparent border-b border-white/20 py-2 text-paper focus:outline-none focus:border-champagne transition-colors font-serif text-lg placeholder-white/10"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const BirthForm: React.FC<BirthFormProps> = ({ onSubmit, isLoading }) => {
  const [mode, setMode] = useState<'natal' | 'synastry'>('natal');
  const [personA, setPersonA] = useState<BirthDetails>({ name: '', date: '', time: '', location: '' });
  const [personB, setPersonB] = useState<BirthDetails>({ name: '', date: '', time: '', location: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mode === 'natal' ? onSubmit(personA) : onSubmit(personA, personB);
  };

  return (
    <div className="w-full max-w-lg mx-auto p-6 md:p-0 animate-slide-up">
        {/* Header */}
        <div className="mb-16 text-center">
            <h1 className="font-display text-5xl md:text-7xl tracking-tighter text-paper mb-4">Celestia</h1>
            <p className="font-serif text-gray-500 italic">
                {mode === 'natal' ? 'An instrument for self-discovery.' : 'The architecture of your connection.'}
            </p>
        </div>

        {/* Mode Toggles */}
        <div className="flex justify-center gap-8 mb-16">
            <button 
                onClick={() => setMode('natal')}
                className={`text-[10px] uppercase tracking-[0.3em] pb-2 border-b transition-all ${mode === 'natal' ? 'text-champagne border-champagne' : 'text-gray-600 border-transparent hover:text-gray-400'}`}
            >
                Natal
            </button>
            <button 
                onClick={() => setMode('synastry')}
                className={`text-[10px] uppercase tracking-[0.3em] pb-2 border-b transition-all ${mode === 'synastry' ? 'text-champagne border-champagne' : 'text-gray-600 border-transparent hover:text-gray-400'}`}
            >
                Synastry
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
            <div className="space-y-8">
                {mode === 'synastry' && <h3 className="font-display text-xl text-gray-700 text-center">- Subject I -</h3>}
                <MinimalInput label="Name" value={personA.name} onChange={v => setPersonA({ ...personA, name: v })} placeholder="Enter name" />
                <div className="grid grid-cols-2 gap-8">
                    <MinimalInput label="Date" type="date" value={personA.date} onChange={v => setPersonA({ ...personA, date: v })} />
                    <MinimalInput label="Time" type="time" value={personA.time} onChange={v => setPersonA({ ...personA, time: v })} />
                </div>
                <MinimalInput label="Location" value={personA.location} onChange={v => setPersonA({ ...personA, location: v })} placeholder="City, Country" />
            </div>

            {mode === 'synastry' && (
                <div className="space-y-8 animate-fade-in">
                    <h3 className="font-display text-xl text-gray-700 text-center pt-8">- Subject II -</h3>
                    <MinimalInput label="Name" value={personB.name} onChange={v => setPersonB({ ...personB, name: v })} placeholder="Enter name" />
                    <div className="grid grid-cols-2 gap-8">
                        <MinimalInput label="Date" type="date" value={personB.date} onChange={v => setPersonB({ ...personB, date: v })} />
                        <MinimalInput label="Time" type="time" value={personB.time} onChange={v => setPersonB({ ...personB, time: v })} />
                    </div>
                    <MinimalInput label="Location" value={personB.location} onChange={v => setPersonB({ ...personB, location: v })} placeholder="City, Country" />
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-8 group relative flex items-center justify-between bg-white text-black px-6 py-5 hover:bg-champagne transition-colors duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className="font-display text-lg tracking-widest uppercase">
                    {isLoading ? 'Calculating...' : 'Analyze'}
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
        </form>
    </div>
  );
};

export default BirthForm;