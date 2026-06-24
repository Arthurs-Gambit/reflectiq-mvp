export const SIGNAL_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  comprehension: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  surface_understanding: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
  definitional_gap: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  causal_reasoning_gap: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
  applied_transfer_difficulty: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  pacing_concern: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  support_need: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
};

export const TOPICS = [
  "Agentic AI",
  "Blockchain",
  "Quantum Computing",
  "Generative AI Ethics",
  "Cybersecurity Basics"
];

export const formatSignalName = (signal: string) => {
  return signal.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};
