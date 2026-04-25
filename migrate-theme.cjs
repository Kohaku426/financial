const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

// The sequence of replaces is crucial to prevent chaining mismatches.
const replaces = [
    // Backgrounds
    [/bg-\[#0a0a0f\]/g, 'bg-slate-50'],
    [/bg-\[#0a0f15\]/g, 'bg-white'],
    [/bg-\[#0f0f15\]/g, 'bg-white'],
    [/bg-\[#1a1a24\]/g, 'bg-white'],
    [/bg-black/g, 'bg-slate-100'],

    // Glass panes and hovers
    [/bg-white\/5(?!0)/g, 'bg-white shadow-sm'],
    [/bg-white\/10/g, 'bg-slate-200'],
    [/hover:bg-white\/5(?!0)/g, 'hover:bg-slate-50'],
    [/hover:bg-white\/10/g, 'hover:bg-slate-200'],

    // Borders
    [/border-white\/5(?!0)/g, 'border-slate-100'],
    [/border-white\/10/g, 'border-slate-200'],
    [/border-white\/20/g, 'border-slate-300'],
    [/border-white\/30/g, 'border-slate-400'],

    // Gradients & Shadows
    [/from-white to-slate-400/g, 'from-slate-800 to-slate-400'],
    [/rgba\(255,255,255,/g, 'rgba(0,0,0,'],

    // Base Text
    [/text-white/g, 'text-slate-900'],

    // Subtle Text Shifts (darkening for contrast on white)
    [/text-slate-200/g, 'text-slate-800'],
    [/text-slate-300/g, 'text-slate-700'],
    [/text-slate-400/g, 'text-slate-500'],
    [/text-slate-500 hover:text-white/g, 'text-slate-500 hover:text-slate-900'],

    // Accent Colors
    [/text-cyan-400/g, 'text-cyan-600'],
    [/text-emerald-400/g, 'text-emerald-600'],
    [/text-rose-400/g, 'text-rose-600'],
    [/text-amber-400/g, 'text-amber-600'],
    [/text-indigo-400/g, 'text-indigo-600'],
    [/text-purple-400/g, 'text-indigo-600'],

    // Inverse Primary Button Logic
    [/bg-white hover:bg-slate-200 text-black/g, 'bg-slate-900 hover:bg-slate-800 text-white shadow-xl'],
    [/bg-white text-black/g, 'bg-slate-900 text-white'],
];

replaces.forEach(([regex, replacement]) => {
    code = code.replace(regex, replacement);
});

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log('Migration to Light Theme completed successfully.');
