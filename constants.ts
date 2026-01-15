export const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈︎', startDegree: 0, element: 'fire' },
  { name: 'Taurus', symbol: '♉︎', startDegree: 30, element: 'earth' },
  { name: 'Gemini', symbol: '♊︎', startDegree: 60, element: 'air' },
  { name: 'Cancer', symbol: '♋︎', startDegree: 90, element: 'water' },
  { name: 'Leo', symbol: '♌︎', startDegree: 120, element: 'fire' },
  { name: 'Virgo', symbol: '♍︎', startDegree: 150, element: 'earth' },
  { name: 'Libra', symbol: '♎︎', startDegree: 180, element: 'air' },
  { name: 'Scorpio', symbol: '♏︎', startDegree: 210, element: 'water' },
  { name: 'Sagittarius', symbol: '♐︎', startDegree: 240, element: 'fire' },
  { name: 'Capricorn', symbol: '♑︎', startDegree: 270, element: 'earth' },
  { name: 'Aquarius', symbol: '♒︎', startDegree: 300, element: 'air' },
  { name: 'Pisces', symbol: '♓︎', startDegree: 330, element: 'water' },
];

export const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  Chiron: '⚷',
  NorthNode: '☊',
};

export const INITIAL_BIRTH_DETAILS = {
  date: '',
  time: '',
  location: '',
  name: '',
};