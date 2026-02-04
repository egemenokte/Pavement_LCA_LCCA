import React, { useState, useMemo, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

const DEFAULT_TREATMENTS = {
  'Reconstruction': {
    name: 'Reconstruction', cost: { dist: 'normal', mean: 45.00, std: 10.0, min: 30, max: 60, det: 45.00 }, costYear: 2022,
    co2: { dist: 'normal', mean: 18.0, std: 3.0, min: 12, max: 24, det: 18.0 }, workzoneDays: 7, delayHoursPerVeh: 0.25,
    iriReset: true, iriAfterTreatment: 60, iriProg: { dist: 'normal', mean: 3.5, std: 0.5, min: 2.5, max: 4.5, det: 3.5 }, description: 'Full depth reconstruction'
  },
  'Mill & Overlay (2")': {
    name: 'Mill & Overlay (2")', cost: { dist: 'normal', mean: 7.05, std: 2.5, min: 4, max: 10, det: 7.05 }, costYear: 2022,
    co2: { dist: 'normal', mean: 5.5, std: 1.0, min: 4, max: 7, det: 5.5 }, workzoneDays: 3, delayHoursPerVeh: 0.15,
    iriReset: true, iriAfterTreatment: 60, iriProg: { dist: 'uniform', mean: 4.0, std: 0.75, min: 3, max: 5, det: 4.0 }, description: '2-inch mill and overlay'
  },
  'Mill & Overlay (4")': {
    name: 'Mill & Overlay (4")', cost: { dist: 'normal', mean: 12.50, std: 3.0, min: 8, max: 17, det: 12.50 }, costYear: 2022,
    co2: { dist: 'normal', mean: 9.5, std: 1.5, min: 7, max: 12, det: 9.5 }, workzoneDays: 4, delayHoursPerVeh: 0.20,
    iriReset: true, iriAfterTreatment: 60, iriProg: { dist: 'uniform', mean: 3.8, std: 0.6, min: 3, max: 4.5, det: 3.8 }, description: '4-inch mill and overlay'
  },
  'Microsurfacing': {
    name: 'Microsurfacing', cost: { dist: 'uniform', mean: 3.50, std: 0.5, min: 3, max: 4, det: 3.50 }, costYear: 2022,
    co2: { dist: 'normal', mean: 2.0, std: 0.4, min: 1.2, max: 2.8, det: 2.0 }, workzoneDays: 1, delayHoursPerVeh: 0.05,
    iriReset: false, iriImprovement: 15, iriProg: { dist: 'uniform', mean: 5.0, std: 1.0, min: 4, max: 6, det: 5.0 }, description: 'Polymer-modified emulsion treatment'
  },
  'Chip Seal': {
    name: 'Chip Seal', cost: { dist: 'uniform', mean: 2.00, std: 0.5, min: 1.5, max: 2.5, det: 2.00 }, costYear: 2022,
    co2: { dist: 'normal', mean: 1.5, std: 0.3, min: 1, max: 2, det: 1.5 }, workzoneDays: 0.5, delayHoursPerVeh: 0.03,
    iriReset: false, iriImprovement: 10, iriProg: { dist: 'uniform', mean: 5.5, std: 1.0, min: 4, max: 7, det: 5.5 }, description: 'Aggregate and emulsion surface'
  },
  'Crack Sealing': {
    name: 'Crack Sealing', cost: { dist: 'normal', mean: 1.25, std: 0.30, min: 0.8, max: 1.7, det: 1.25 }, costYear: 2022,
    co2: { dist: 'normal', mean: 0.3, std: 0.1, min: 0.1, max: 0.5, det: 0.3 }, workzoneDays: 0.25, delayHoursPerVeh: 0.02,
    iriReset: false, iriImprovement: 0, iriProg: { dist: 'normal', mean: 6.0, std: 1.0, min: 4, max: 8, det: 6.0 }, description: 'Preventive crack maintenance'
  }
};

const DEFAULT_ALTERNATIVES = [
  { name: 'Alternative A', schedule: [{ year: 10, treatment: 'Mill & Overlay (2")' }, { year: 20, treatment: 'Mill & Overlay (2")' }, { year: 30, treatment: 'Mill & Overlay (2")' }] },
  { name: 'Alternative B', schedule: [{ year: 5, treatment: 'Microsurfacing' }, { year: 10, treatment: 'Microsurfacing' }, { year: 15, treatment: 'Microsurfacing' }, { year: 20, treatment: 'Mill & Overlay (2")' }, { year: 25, treatment: 'Microsurfacing' }, { year: 30, treatment: 'Microsurfacing' }, { year: 35, treatment: 'Microsurfacing' }] }
];

const CPI = (() => {
  const base = { 2010: 218.05, 2011: 224.94, 2012: 229.59, 2013: 232.96, 2014: 236.74, 2015: 237.02, 2016: 240.01, 2017: 245.12, 2018: 251.11, 2019: 255.66, 2020: 258.82, 2021: 270.97, 2022: 282.43, 2023: 296.81, 2024: 308.42 };
  for (let y = 2025; y <= 2070; y++) base[y] = base[y - 1] * 1.025;
  return base;
})();

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

// Year input that only updates on blur
const YearInput = ({ value, onChange, min, max }) => {
  const [local, setLocal] = useState(value);
  const handleBlur = () => { const v = Math.max(min, Math.min(max, parseInt(local) || value)); onChange(v); setLocal(v); };
  React.useEffect(() => { setLocal(value); }, [value]);
  return <input type="number" value={local} onChange={e => setLocal(e.target.value)} onBlur={handleBlur} className="w-16 border rounded px-2 py-0.5" min={min} max={max} />;
};

const DistInput = ({ label, value, onChange }) => (
  <div className="border rounded p-2 bg-gray-50">
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <select value={value.dist} onChange={e => onChange({ ...value, dist: e.target.value })} className="text-xs border rounded px-1 py-0.5">
        <option value="normal">Normal</option>
        <option value="uniform">Uniform</option>
      </select>
    </div>
    <div className="mb-1">
      <label className="text-xs text-gray-500">Deterministic</label>
      <input type="number" step="0.1" value={value.det} onChange={e => onChange({ ...value, det: +e.target.value })} className="w-full border rounded px-1 py-0.5 text-sm bg-yellow-50" />
    </div>
    <div className="text-xs text-gray-500 mb-1">Probabilistic:</div>
    {value.dist === 'normal' ? (
      <div className="flex gap-1">
        <div className="flex-1"><label className="text-xs text-gray-400">μ</label><input type="number" step="0.1" value={value.mean} onChange={e => onChange({ ...value, mean: +e.target.value })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
        <div className="flex-1"><label className="text-xs text-gray-400">σ</label><input type="number" step="0.1" value={value.std} onChange={e => onChange({ ...value, std: +e.target.value })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
      </div>
    ) : (
      <div className="flex gap-1">
        <div className="flex-1"><label className="text-xs text-gray-400">Min</label><input type="number" step="0.1" value={value.min} onChange={e => onChange({ ...value, min: +e.target.value })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
        <div className="flex-1"><label className="text-xs text-gray-400">Max</label><input type="number" step="0.1" value={value.max} onChange={e => onChange({ ...value, max: +e.target.value })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
      </div>
    )}
  </div>
);

// Simplified road icon with two converging lines and dashed center line
const RoadIcon = () => (
  <svg viewBox="0 0 64 64" className="w-12 h-12">
    {/* Left lane edge */}
    <line x1="12" y1="56" x2="26" y2="8" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" />
    {/* Right lane edge */}
    <line x1="52" y1="56" x2="38" y2="8" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" />
    {/* Center dashed line */}
    <line x1="32" y1="56" x2="32" y2="8" stroke="#FCD34D" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />
  </svg>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('treatments');
  const [treatments, setTreatments] = useState(DEFAULT_TREATMENTS);
  const [alternatives, setAlternatives] = useState(DEFAULT_ALTERNATIVES);
  const [params, setParams] = useState({
    analysisPeriod: 40,
    discountRateDet: 4.0, discountRate: { dist: 'uniform', mean: 4.0, std: 1.0, min: 3, max: 5 },
    lengthMiles: 1.0, widthFeet: 24, aadt: 20000, baseIRI: 60, initialIRI: 60,
    fuelCostDet: 4.25, fuelCost: { dist: 'uniform', mean: 4.25, std: 0.5, min: 3.5, max: 5 },
    co2PerGallonDet: 8.89, co2PerGallon: { dist: 'normal', mean: 8.89, std: 0.5, min: 8, max: 10 },
    wzIdlingCO2: 0.5, valueOfTime: 25, constructionYear: 2024, nSimulations: 1000
  });
  const [analysisMode, setAnalysisMode] = useState('deterministic');
  const [viewMode, setViewMode] = useState('timeline');
  const [analysisCategory, setAnalysisCategory] = useState('cost');
  const [costType, setCostType] = useState('total');
  const [results, setResults] = useState(null); // { deterministic: [...], probabilistic: [...] }
  const [isRunning, setIsRunning] = useState(false);
  const [newTreatmentName, setNewTreatmentName] = useState('');
  const [editingTreatment, setEditingTreatment] = useState(null);

  const area = params.lengthMiles * params.widthFeet * 1760 * 0.33;
  const cpiWarning = params.constructionYear > 2070;

  const sample = (distObj) => {
    if (distObj.dist === 'uniform') return distObj.min + Math.random() * (distObj.max - distObj.min);
    const u1 = Math.random(), u2 = Math.random();
    return distObj.mean + distObj.std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const getDistDisplay = (distObj) => distObj.dist === 'uniform' ? `U(${distObj.min}, ${distObj.max})` : `N(${distObj.mean}, ${distObj.std})`;

  // IRI progression with sharp drops at treatment years (for chart visualization)
  const calcIRIProgressionForChart = useCallback((alt, deterministic = true) => {
    const data = [];
    let currentIRI = params.initialIRI;
    let currentProgRate = 4.0;
    const treatmentYears = new Set(alt.schedule.map(s => s.year));

    for (let year = 0; year <= params.analysisPeriod; year++) {
      const activity = alt.schedule.find(s => s.year === year);

      if (activity && treatments[activity.treatment]) {
        const t = treatments[activity.treatment];
        // Add point BEFORE treatment (at year - epsilon) with the deteriorated IRI
        const preIRI = currentIRI;
        data.push({ year: year - 0.001, iri: preIRI });

        // Apply treatment
        if (t.iriReset) currentIRI = t.iriAfterTreatment || params.baseIRI;
        else if (t.iriImprovement) currentIRI = Math.max(params.baseIRI, currentIRI - t.iriImprovement);
        currentProgRate = deterministic ? t.iriProg.det : sample(t.iriProg);
      }

      data.push({ year, iri: currentIRI });

      // Deteriorate AFTER recording
      if (year < params.analysisPeriod) {
        currentIRI += currentProgRate;
      }
    }
    return data;
  }, [treatments, params]);

  // Original IRI calculation for cost analysis (yearly data only)
  const calcIRIProgression = useCallback((alt, deterministic = true) => {
    const data = [];
    let currentIRI = params.initialIRI;
    let currentProgRate = 4.0;

    for (let year = 0; year <= params.analysisPeriod; year++) {
      const activity = alt.schedule.find(s => s.year === year);
      if (activity && treatments[activity.treatment]) {
        const t = treatments[activity.treatment];
        if (t.iriReset) currentIRI = t.iriAfterTreatment || params.baseIRI;
        else if (t.iriImprovement) currentIRI = Math.max(params.baseIRI, currentIRI - t.iriImprovement);
        currentProgRate = deterministic ? t.iriProg.det : sample(t.iriProg);
      }

      data.push({ year, iri: currentIRI });

      if (year < params.analysisPeriod) {
        currentIRI += currentProgRate;
      }
    }
    return data;
  }, [treatments, params]);

  const calcYearlyBreakdown = (alt, dr, fuelCost, co2PerGal, cpiAdj, deterministic = true) => {
    const iriData = calcIRIProgression(alt, deterministic);
    const yearly = [];
    let cumCostDisc = 0, cumCostUndisc = 0, cumCO2 = 0;

    for (let y = 1; y <= params.analysisPeriod; y++) {
      const avgIRI = (iriData[y - 1].iri + iriData[y].iri) / 2;
      const excessIRI = Math.max(0, avgIRI - params.baseIRI);
      const excessGal = 2.0469 * excessIRI / 131 / 1000 * params.aadt * 365 * params.lengthMiles;
      const fuelCostY = excessGal * fuelCost;
      const fuelCO2Y = excessGal * co2PerGal / 1000;
      const disc = Math.pow(1 + dr / 100, -y);

      const act = alt.schedule.find(s => s.year === y);
      let treatCostDisc = 0, treatCostUndisc = 0, treatCO2 = 0, wzCostDisc = 0, wzCostUndisc = 0, wzCO2 = 0;
      if (act && treatments[act.treatment]) {
        const t = treatments[act.treatment];
        const cpiCorr = cpiAdj / (CPI[t.costYear] || cpiAdj);
        const costVal = deterministic ? t.cost.det : sample(t.cost);
        const co2Val = deterministic ? t.co2.det : sample(t.co2);
        treatCostUndisc = costVal * cpiCorr * area;
        treatCostDisc = treatCostUndisc * disc;
        treatCO2 = co2Val * area / 1000;
        const wzDelayHours = t.delayHoursPerVeh * params.aadt * t.workzoneDays;
        wzCostUndisc = wzDelayHours * params.valueOfTime;
        wzCostDisc = wzCostUndisc * disc;
        wzCO2 = wzDelayHours * params.wzIdlingCO2 / 1000;
      }

      cumCostDisc += treatCostDisc + wzCostDisc + fuelCostY * disc;
      cumCostUndisc += treatCostUndisc + wzCostUndisc + fuelCostY;
      cumCO2 += treatCO2 + wzCO2 + fuelCO2Y;

      yearly.push({
        year: y, treatCostDisc, treatCostUndisc, treatCO2, wzCostDisc, wzCostUndisc, wzCO2,
        fuelCostDisc: fuelCostY * disc, fuelCostUndisc: fuelCostY, fuelCO2: fuelCO2Y,
        cumCostDisc, cumCostUndisc, cumCO2, treatment: act?.treatment || null
      });
    }
    return { iriData, yearly };
  };

  const runAnalysis = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const cpiAdj = CPI[Math.min(params.constructionYear, 2070)] || CPI[2024];

      // Run DETERMINISTIC
      const detResults = alternatives.map((alt, idx) => {
        const dr = params.discountRateDet;
        const fuelCost = params.fuelCostDet;
        const co2PerGal = params.co2PerGallonDet;
        const { iriData, yearly } = calcYearlyBreakdown(alt, dr, fuelCost, co2PerGal, cpiAdj, true);
        const last = yearly[yearly.length - 1];
        const treatCostDisc = yearly.reduce((s, y) => s + y.treatCostDisc, 0) / 1e6;
        const treatCO2 = yearly.reduce((s, y) => s + y.treatCO2, 0);
        const wzCostDisc = yearly.reduce((s, y) => s + y.wzCostDisc, 0) / 1e6;
        const wzCO2 = yearly.reduce((s, y) => s + y.wzCO2, 0);
        const fuelCostDisc = yearly.reduce((s, y) => s + y.fuelCostDisc, 0) / 1e6;
        const fuelCO2 = yearly.reduce((s, y) => s + y.fuelCO2, 0);

        return {
          name: alt.name, color: COLORS[idx % COLORS.length], iriData,
          yearly: yearly.map(y => ({ ...y, cumCostDisc: y.cumCostDisc / 1e6, cumCO2: y.cumCO2 })),
          agencyCost: treatCostDisc, userCost: wzCostDisc + fuelCostDisc, totalCost: last.cumCostDisc / 1e6,
          agencyCO2: treatCO2, userCO2: wzCO2 + fuelCO2, totalCO2: last.cumCO2,
          treatCostDisc, wzCostDisc, fuelCostDisc, treatCO2, wzCO2, fuelCO2,
          pieDataCost: [{ name: 'Treatment', value: treatCostDisc }, { name: 'Work Zone', value: wzCostDisc }, { name: 'Excess Fuel', value: fuelCostDisc }],
          pieDataCO2: [{ name: 'Treatment', value: treatCO2 }, { name: 'Work Zone', value: wzCO2 }, { name: 'Excess Fuel', value: fuelCO2 }]
        };
      });

      // Run PROBABILISTIC
      const N = params.nSimulations;
      const probResults = alternatives.map((alt, idx) => {
        const samples = { agency: [], user: [], total: [], agencyCO2: [], userCO2: [], totalCO2: [] };
        for (let sim = 0; sim < N; sim++) {
          const dr = sample(params.discountRate);
          const fuelCost = sample(params.fuelCost);
          const co2PerGal = sample(params.co2PerGallon);
          const { yearly } = calcYearlyBreakdown(alt, dr, fuelCost, co2PerGal, cpiAdj, false);
          const last = yearly[yearly.length - 1];
          const treatCost = yearly.reduce((s, y) => s + y.treatCostDisc, 0) / 1e6;
          const wzCost = yearly.reduce((s, y) => s + y.wzCostDisc, 0) / 1e6;
          const fuelCostSum = yearly.reduce((s, y) => s + y.fuelCostDisc, 0) / 1e6;
          const treatCO2 = yearly.reduce((s, y) => s + y.treatCO2, 0);
          const wzCO2 = yearly.reduce((s, y) => s + y.wzCO2, 0);
          const fuelCO2 = yearly.reduce((s, y) => s + y.fuelCO2, 0);
          samples.agency.push(treatCost);
          samples.user.push(wzCost + fuelCostSum);
          samples.total.push(last.cumCostDisc / 1e6);
          samples.agencyCO2.push(treatCO2);
          samples.userCO2.push(wzCO2 + fuelCO2);
          samples.totalCO2.push(last.cumCO2);
        }
        const stats = (arr) => {
          const sorted = [...arr].sort((a, b) => a - b), mean = arr.reduce((a, b) => a + b, 0) / N;
          const std = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / N);
          return { mean, std, cov: (std / Math.sqrt(N)) / mean, p5: sorted[Math.floor(N * 0.05)], p95: sorted[Math.floor(N * 0.95)], samples: arr };
        };
        return {
          name: alt.name, color: COLORS[idx % COLORS.length],
          agency: stats(samples.agency), user: stats(samples.user), total: stats(samples.total),
          agencyCO2: stats(samples.agencyCO2), userCO2: stats(samples.userCO2), totalCO2: stats(samples.totalCO2)
        };
      });

      setResults({ deterministic: detResults, probabilistic: probResults });
      setIsRunning(false);
    }, 50);
  }, [alternatives, treatments, params, calcIRIProgression, area]);

  const getHistogramData = (samples, bins = 25) => {
    const min = Math.min(...samples), max = Math.max(...samples), binWidth = (max - min) / bins || 1;
    const hist = Array(bins).fill(0);
    samples.forEach(v => { hist[Math.min(bins - 1, Math.floor((v - min) / binWidth))]++; });
    return hist.map((count, i) => ({ x: min + (i + 0.5) * binWidth, count: count / samples.length }));
  };

  // IRI chart data with sharp drops
  const iriChartData = useMemo(() => {
    const iriByAlt = alternatives.map(alt => calcIRIProgressionForChart(alt, true));

    // Collect all unique year values (including the year-0.001 points)
    const allYears = new Set();
    iriByAlt.forEach(data => data.forEach(pt => allYears.add(pt.year)));
    const sortedYears = [...allYears].sort((a, b) => a - b);

    // Build combined data
    const data = sortedYears.map(year => {
      const pt = { year };
      alternatives.forEach((alt, i) => {
        const iriData = iriByAlt[i];
        const match = iriData.find(d => d.year === year);
        if (match) {
          pt[alt.name] = match.iri;
        } else {
          // Interpolate if needed (shouldn't happen often)
          const before = iriData.filter(d => d.year < year).pop();
          const after = iriData.find(d => d.year > year);
          if (before && after) {
            const ratio = (year - before.year) / (after.year - before.year);
            pt[alt.name] = before.iri + ratio * (after.iri - before.iri);
          }
        }
      });
      return pt;
    });

    return data;
  }, [alternatives, calcIRIProgressionForChart]);

  const updateTreatment = (key, field, value) => setTreatments({ ...treatments, [key]: { ...treatments[key], [field]: value } });

  const currentResults = results ? results[analysisMode] : null;
  const getDataKey = () => analysisCategory === 'cost' ? (costType === 'agency' ? 'agencyCost' : costType === 'user' ? 'userCost' : 'totalCost') : (costType === 'agency' ? 'agencyCO2' : costType === 'user' ? 'userCO2' : 'totalCO2');
  const getUnit = () => analysisCategory === 'cost' ? 'Million $' : 'Tonnes CO₂e';
  const getProbKey = () => analysisCategory === 'cost' ? costType : (costType === 'agency' ? 'agencyCO2' : costType === 'user' ? 'userCO2' : 'totalCO2');

  const tabs = [
    { id: 'treatments', label: '📚 Treatments' }, { id: 'alternatives', label: '🔀 Alternatives' },
    { id: 'params', label: '⚙️ Parameters' }, { id: 'visualize', label: '📊 Visualize' },
    { id: 'analysis', label: '📈 Analysis' }, { id: 'info', label: 'ℹ️ Info' }
  ];

  const updateAltYear = (altIdx, sIdx, newYear) => {
    const n = [...alternatives];
    n[altIdx].schedule[sIdx].year = newYear;
    setAlternatives(n);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 p-3">
      <div className="max-w-6xl mx-auto">
        <div className="bg-blue-500 rounded-xl shadow-lg p-4 mb-4 text-white flex items-center justify-center gap-4">
          <RoadIcon />
          <div>
            <h1 className="text-2xl font-bold text-center">Pavement LCCA & LCA Tool</h1>
            <p className="text-center text-blue-100 text-sm">Life Cycle Cost Analysis and Life Cycle Assessment for Pavement Management</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3 justify-center">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}>{tab.label}</button>
          ))}
        </div>

        {/* Treatments Tab */}
        {activeTab === 'treatments' && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Treatment Library</h2>
              <div className="flex gap-2">
                <input type="text" placeholder="New treatment" value={newTreatmentName} onChange={e => setNewTreatmentName(e.target.value)} className="border rounded px-2 py-1 text-sm w-32" />
                <button onClick={() => {
                  if (newTreatmentName && !treatments[newTreatmentName]) {
                    setTreatments({
                      ...treatments, [newTreatmentName]: {
                        name: newTreatmentName, cost: { dist: 'normal', mean: 5.0, std: 1.0, min: 3, max: 7, det: 5.0 }, costYear: 2024,
                        co2: { dist: 'normal', mean: 3.0, std: 0.5, min: 2, max: 4, det: 3.0 }, workzoneDays: 2, delayHoursPerVeh: 0.1,
                        iriReset: false, iriImprovement: 10, iriAfterTreatment: 60,
                        iriProg: { dist: 'normal', mean: 5.0, std: 1.0, min: 3, max: 7, det: 5.0 }, description: 'Custom treatment'
                      }
                    }); setNewTreatmentName('');
                  }
                }} className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">+ Add</button>
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(treatments).map(([key, t]) => (
                <div key={key} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div><h3 className="font-medium text-blue-700">{t.name}</h3><p className="text-xs text-gray-500">{t.description}</p></div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingTreatment(editingTreatment === key ? null : key)} className={`text-sm px-2 py-0.5 rounded ${editingTreatment === key ? 'bg-blue-100 text-blue-700' : 'text-blue-500 hover:bg-blue-50'}`}>{editingTreatment === key ? '✓ Done' : '✎ Edit'}</button>
                      {!DEFAULT_TREATMENTS[key] && <button onClick={() => { const { [key]: _, ...rest } = treatments; setTreatments(rest); }} className="text-red-500 text-sm hover:bg-red-50 px-2 py-0.5 rounded">🗑</button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                    <div className="bg-green-50 rounded p-1"><span className="text-gray-500">Cost:</span> ${t.cost.det}/sqyd</div>
                    <div className="bg-blue-50 rounded p-1"><span className="text-gray-500">CO₂:</span> {t.co2.det} kg/sqyd</div>
                    <div className="bg-orange-50 rounded p-1"><span className="text-gray-500">Work Zone:</span> {t.workzoneDays}d, {t.delayHoursPerVeh}h/veh</div>
                    <div className="bg-purple-50 rounded p-1"><span className="text-gray-500">IRI:</span> {t.iriReset ? `Reset→${t.iriAfterTreatment}` : `↓${t.iriImprovement}`}, +{t.iriProg.det}/yr</div>
                  </div>
                  {editingTreatment === key && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-3 gap-3">
                      <DistInput label="Cost ($/sqyd)" value={t.cost} onChange={v => updateTreatment(key, 'cost', v)} />
                      <DistInput label="CO₂ (kg/sqyd)" value={t.co2} onChange={v => updateTreatment(key, 'co2', v)} />
                      <DistInput label="IRI Progression (in/mi/yr)" value={t.iriProg} onChange={v => updateTreatment(key, 'iriProg', v)} />
                      <div className="border rounded p-2 bg-gray-50">
                        <span className="text-xs font-medium text-gray-700">Work Zone</span>
                        <div className="flex gap-2 mt-1">
                          <div className="flex-1"><label className="text-xs text-gray-500">Duration (days)</label><input type="number" step="0.25" value={t.workzoneDays} onChange={e => updateTreatment(key, 'workzoneDays', +e.target.value)} className="w-full border rounded px-1 py-0.5 text-sm" /></div>
                          <div className="flex-1"><label className="text-xs text-gray-500">Delay (hr/veh)</label><input type="number" step="0.01" value={t.delayHoursPerVeh} onChange={e => updateTreatment(key, 'delayHoursPerVeh', +e.target.value)} className="w-full border rounded px-1 py-0.5 text-sm" /></div>
                        </div>
                      </div>
                      <div className="border rounded p-2 bg-gray-50 col-span-2">
                        <span className="text-xs font-medium text-gray-700">IRI Behavior</span>
                        <div className="flex gap-4 mt-1 items-center">
                          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={t.iriReset} onChange={e => updateTreatment(key, 'iriReset', e.target.checked)} />Resets IRI</label>
                          {t.iriReset ? <div className="flex items-center gap-1"><label className="text-xs text-gray-500">To:</label><input type="number" value={t.iriAfterTreatment || 60} onChange={e => updateTreatment(key, 'iriAfterTreatment', +e.target.value)} className="w-16 border rounded px-1 py-0.5 text-sm" /></div>
                            : <div className="flex items-center gap-1"><label className="text-xs text-gray-500">Improvement:</label><input type="number" value={t.iriImprovement || 0} onChange={e => updateTreatment(key, 'iriImprovement', +e.target.value)} className="w-16 border rounded px-1 py-0.5 text-sm" /></div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternatives Tab */}
        {activeTab === 'alternatives' && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Alternatives</h2>
              <button onClick={() => setAlternatives([...alternatives, { name: `Alternative ${String.fromCharCode(65 + alternatives.length)}`, schedule: [] }])} className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">+ Add Alternative</button>
            </div>
            {alternatives.map((alt, altIdx) => (
              <div key={altIdx} className="border rounded-lg p-3 mb-3" style={{ borderLeftColor: COLORS[altIdx % COLORS.length], borderLeftWidth: 4 }}>
                <div className="flex justify-between items-center mb-2">
                  <input type="text" value={alt.name} onChange={e => { const n = [...alternatives]; n[altIdx] = { ...alt, name: e.target.value }; setAlternatives(n); }} className="font-medium text-lg border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent" />
                  <button onClick={() => setAlternatives(alternatives.filter((_, i) => i !== altIdx))} className="text-red-500 text-sm hover:bg-red-50 px-2 py-1 rounded">Remove</button>
                </div>
                <div className="space-y-1 mb-2">
                  {alt.schedule.sort((a, b) => a.year - b.year).map((s, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2 bg-gray-50 rounded p-1.5 text-sm">
                      <span className="text-gray-500 w-14">Year</span>
                      <YearInput value={s.year} onChange={(v) => updateAltYear(altIdx, sIdx, v)} min={1} max={params.analysisPeriod} />
                      <select value={s.treatment} onChange={e => { const n = [...alternatives]; n[altIdx].schedule[sIdx].treatment = e.target.value; setAlternatives(n); }} className="flex-1 border rounded px-2 py-0.5">
                        {Object.keys(treatments).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button onClick={() => { const n = [...alternatives]; n[altIdx].schedule = alt.schedule.filter((_, i) => i !== sIdx); setAlternatives(n); }} className="text-red-400 hover:text-red-600 px-1">✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => { const n = [...alternatives]; const ly = alt.schedule.length > 0 ? Math.max(...alt.schedule.map(s => s.year)) : 0; n[altIdx].schedule.push({ year: Math.min(ly + 10, params.analysisPeriod), treatment: Object.keys(treatments)[0] }); setAlternatives(n); }} className="text-blue-500 text-sm hover:underline">+ Add Activity</button>
              </div>
            ))}
          </div>
        )}

        {/* Parameters Tab */}
        {activeTab === 'params' && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h2 className="font-semibold mb-3">Analysis Parameters</h2>
            {cpiWarning && <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 mb-3 text-sm">⚠️ Construction year exceeds 2070. CPI projections capped.</div>}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <div><label className="block text-xs text-gray-600 mb-1">Analysis Period (years)</label><input type="number" value={params.analysisPeriod} onChange={e => setParams({ ...params, analysisPeriod: +e.target.value })} className="w-full border rounded px-2 py-1.5" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">Section Length (miles)</label><input type="number" step="0.1" value={params.lengthMiles} onChange={e => setParams({ ...params, lengthMiles: +e.target.value })} className="w-full border rounded px-2 py-1.5" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">Section Width (feet)</label><input type="number" value={params.widthFeet} onChange={e => setParams({ ...params, widthFeet: +e.target.value })} className="w-full border rounded px-2 py-1.5" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">AADT (veh/day)</label><input type="number" value={params.aadt} onChange={e => setParams({ ...params, aadt: +e.target.value })} className="w-full border rounded px-2 py-1.5" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">Base IRI (in/mi)</label><input type="number" value={params.baseIRI} onChange={e => setParams({ ...params, baseIRI: +e.target.value })} className="w-full border rounded px-2 py-1.5" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">Initial IRI (in/mi)</label><input type="number" value={params.initialIRI} onChange={e => setParams({ ...params, initialIRI: +e.target.value })} className="w-full border rounded px-2 py-1.5" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">Value of Time ($/hr)</label><input type="number" value={params.valueOfTime} onChange={e => setParams({ ...params, valueOfTime: +e.target.value })} className="w-full border rounded px-2 py-1.5" /></div>
              <div><label className="block text-xs text-gray-600 mb-1">Construction Year</label><input type="number" value={params.constructionYear} onChange={e => setParams({ ...params, constructionYear: +e.target.value })} className={`w-full border rounded px-2 py-1.5 ${cpiWarning ? 'border-yellow-500' : ''}`} /></div>
              <div><label className="block text-xs text-gray-600 mb-1">MC Simulations</label><input type="number" value={params.nSimulations} onChange={e => setParams({ ...params, nSimulations: +e.target.value })} className="w-full border rounded px-2 py-1.5" /></div>
            </div>

            <h3 className="font-medium text-sm mb-2 text-gray-700">Work Zone Emissions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <div><label className="block text-xs text-gray-600 mb-1">Idling CO₂ (kg/veh-hr delay)</label><input type="number" step="0.1" value={params.wzIdlingCO2} onChange={e => setParams({ ...params, wzIdlingCO2: +e.target.value })} className="w-full border rounded px-2 py-1.5" /></div>
            </div>

            <h3 className="font-medium text-sm mb-2 text-gray-700">Economic & Emissions Parameters</h3>
            <p className="text-xs text-gray-500 mb-2">Deterministic values (yellow) used in deterministic analysis. Distributions used in probabilistic.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="border rounded p-2 bg-gray-50">
                <label className="block text-xs font-medium text-gray-700 mb-1">Discount Rate (%)</label>
                <div className="mb-2"><label className="text-xs text-gray-500">Deterministic</label><input type="number" step="0.1" value={params.discountRateDet} onChange={e => setParams({ ...params, discountRateDet: +e.target.value })} className="w-full border rounded px-1 py-0.5 text-sm bg-yellow-50" /></div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Probabilistic:</span>
                  <select value={params.discountRate.dist} onChange={e => setParams({ ...params, discountRate: { ...params.discountRate, dist: e.target.value } })} className="text-xs border rounded px-1 py-0.5">
                    <option value="normal">Normal</option>
                    <option value="uniform">Uniform</option>
                  </select>
                </div>
                {params.discountRate.dist === 'normal' ? (
                  <div className="flex gap-1">
                    <div className="flex-1"><label className="text-xs text-gray-400">μ</label><input type="number" step="0.1" value={params.discountRate.mean} onChange={e => setParams({ ...params, discountRate: { ...params.discountRate, mean: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                    <div className="flex-1"><label className="text-xs text-gray-400">σ</label><input type="number" step="0.1" value={params.discountRate.std} onChange={e => setParams({ ...params, discountRate: { ...params.discountRate, std: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <div className="flex-1"><label className="text-xs text-gray-400">Min</label><input type="number" step="0.1" value={params.discountRate.min} onChange={e => setParams({ ...params, discountRate: { ...params.discountRate, min: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                    <div className="flex-1"><label className="text-xs text-gray-400">Max</label><input type="number" step="0.1" value={params.discountRate.max} onChange={e => setParams({ ...params, discountRate: { ...params.discountRate, max: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                  </div>
                )}
              </div>
              <div className="border rounded p-2 bg-gray-50">
                <label className="block text-xs font-medium text-gray-700 mb-1">Fuel Cost ($/gal)</label>
                <div className="mb-2"><label className="text-xs text-gray-500">Deterministic</label><input type="number" step="0.1" value={params.fuelCostDet} onChange={e => setParams({ ...params, fuelCostDet: +e.target.value })} className="w-full border rounded px-1 py-0.5 text-sm bg-yellow-50" /></div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Probabilistic:</span>
                  <select value={params.fuelCost.dist} onChange={e => setParams({ ...params, fuelCost: { ...params.fuelCost, dist: e.target.value } })} className="text-xs border rounded px-1 py-0.5">
                    <option value="normal">Normal</option>
                    <option value="uniform">Uniform</option>
                  </select>
                </div>
                {params.fuelCost.dist === 'normal' ? (
                  <div className="flex gap-1">
                    <div className="flex-1"><label className="text-xs text-gray-400">μ</label><input type="number" step="0.1" value={params.fuelCost.mean} onChange={e => setParams({ ...params, fuelCost: { ...params.fuelCost, mean: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                    <div className="flex-1"><label className="text-xs text-gray-400">σ</label><input type="number" step="0.1" value={params.fuelCost.std} onChange={e => setParams({ ...params, fuelCost: { ...params.fuelCost, std: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <div className="flex-1"><label className="text-xs text-gray-400">Min</label><input type="number" step="0.1" value={params.fuelCost.min} onChange={e => setParams({ ...params, fuelCost: { ...params.fuelCost, min: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                    <div className="flex-1"><label className="text-xs text-gray-400">Max</label><input type="number" step="0.1" value={params.fuelCost.max} onChange={e => setParams({ ...params, fuelCost: { ...params.fuelCost, max: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                  </div>
                )}
              </div>
              <div className="border rounded p-2 bg-gray-50">
                <label className="block text-xs font-medium text-gray-700 mb-1">CO₂ per Gallon (kg)</label>
                <div className="mb-2"><label className="text-xs text-gray-500">Deterministic</label><input type="number" step="0.01" value={params.co2PerGallonDet} onChange={e => setParams({ ...params, co2PerGallonDet: +e.target.value })} className="w-full border rounded px-1 py-0.5 text-sm bg-yellow-50" /></div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Probabilistic:</span>
                  <select value={params.co2PerGallon.dist} onChange={e => setParams({ ...params, co2PerGallon: { ...params.co2PerGallon, dist: e.target.value } })} className="text-xs border rounded px-1 py-0.5">
                    <option value="normal">Normal</option>
                    <option value="uniform">Uniform</option>
                  </select>
                </div>
                {params.co2PerGallon.dist === 'normal' ? (
                  <div className="flex gap-1">
                    <div className="flex-1"><label className="text-xs text-gray-400">μ</label><input type="number" step="0.1" value={params.co2PerGallon.mean} onChange={e => setParams({ ...params, co2PerGallon: { ...params.co2PerGallon, mean: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                    <div className="flex-1"><label className="text-xs text-gray-400">σ</label><input type="number" step="0.1" value={params.co2PerGallon.std} onChange={e => setParams({ ...params, co2PerGallon: { ...params.co2PerGallon, std: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <div className="flex-1"><label className="text-xs text-gray-400">Min</label><input type="number" step="0.1" value={params.co2PerGallon.min} onChange={e => setParams({ ...params, co2PerGallon: { ...params.co2PerGallon, min: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                    <div className="flex-1"><label className="text-xs text-gray-400">Max</label><input type="number" step="0.1" value={params.co2PerGallon.max} onChange={e => setParams({ ...params, co2PerGallon: { ...params.co2PerGallon, max: +e.target.value } })} className="w-full border rounded px-1 py-0.5 text-xs" /></div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 p-2 bg-blue-50 rounded text-sm"><strong>Section Area:</strong> {area.toLocaleString()} sq yards | <strong>Annual Traffic:</strong> {(params.aadt * 365).toLocaleString()} veh</div>
          </div>
        )}

        {/* Visualize Tab */}
        {activeTab === 'visualize' && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Visualization</h2>
              <div className="flex gap-1">
                <button onClick={() => setViewMode('timeline')} className={`px-3 py-1 rounded text-sm ${viewMode === 'timeline' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>Timeline</button>
                <button onClick={() => setViewMode('iri')} className={`px-3 py-1 rounded text-sm ${viewMode === 'iri' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>IRI Curve</button>
              </div>
            </div>
            {viewMode === 'timeline' && (
              <div className="space-y-6">
                {alternatives.map((alt, idx) => (
                  <div key={idx}>
                    <h3 className="font-medium mb-2" style={{ color: COLORS[idx % COLORS.length] }}>{alt.name}</h3>
                    <div className="relative h-8 bg-gray-100 rounded border">
                      {alt.schedule.map((act, i) => (
                        <div key={i} className="absolute top-0 bottom-0 flex items-center" style={{ left: `${(act.year / params.analysisPeriod) * 100}%` }}>
                          <div className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: COLORS[idx % COLORS.length] }} title={`${act.treatment} @ Year ${act.year}`} />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      {[0, params.analysisPeriod / 4, params.analysisPeriod / 2, params.analysisPeriod * 3 / 4, params.analysisPeriod].map(y => <span key={y}>{Math.round(y)}</span>)}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {alt.schedule.sort((a, b) => a.year - b.year).map((act, i) => (
                        <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">Yr {act.year}: {act.treatment}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {viewMode === 'iri' && (
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={iriChartData} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" type="number" domain={[0, params.analysisPeriod]} label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'IRI (in/mi)', angle: -90, position: 'insideLeft' }} domain={[0, 'auto']} />
                  <Tooltip formatter={(v) => [v?.toFixed(1) + ' in/mi', 'IRI']} labelFormatter={(v) => `Year ${Math.round(v)}`} />
                  <Legend verticalAlign="top" height={36} />
                  {alternatives.map((alt, i) => <Line key={alt.name} type="linear" dataKey={alt.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />)}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <div className="flex gap-1 bg-gray-100 p-1 rounded">
                <button onClick={() => setAnalysisMode('deterministic')} className={`px-3 py-1 rounded text-sm ${analysisMode === 'deterministic' ? 'bg-white shadow' : ''}`}>Deterministic</button>
                <button onClick={() => setAnalysisMode('probabilistic')} className={`px-3 py-1 rounded text-sm ${analysisMode === 'probabilistic' ? 'bg-white shadow' : ''}`}>Probabilistic</button>
              </div>
              <div className="flex gap-1 bg-green-100 p-1 rounded">
                <button onClick={() => setAnalysisCategory('cost')} className={`px-3 py-1 rounded text-sm ${analysisCategory === 'cost' ? 'bg-white shadow' : ''}`}>💰 Cost</button>
                <button onClick={() => setAnalysisCategory('environmental')} className={`px-3 py-1 rounded text-sm ${analysisCategory === 'environmental' ? 'bg-white shadow' : ''}`}>🌱 Emissions</button>
              </div>
              <div className="flex gap-1 bg-blue-100 p-1 rounded">
                {['agency', 'user', 'total'].map(ct => (
                  <button key={ct} onClick={() => setCostType(ct)} className={`px-2 py-1 rounded text-xs capitalize ${costType === ct ? 'bg-white shadow' : ''}`}>{ct}</button>
                ))}
              </div>
              <button onClick={runAnalysis} disabled={isRunning} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 ml-auto">
                {isRunning ? '⏳ Running...' : '▶ Run Analysis'}
              </button>
            </div>

            {!results && <div className="text-center text-gray-400 py-8">Click "Run Analysis" to compute both deterministic and probabilistic results</div>}

            {results && analysisMode === 'deterministic' && (
              <div>
                <h3 className="font-semibold mb-2">Deterministic Results — {analysisCategory === 'cost' ? 'Cost Analysis' : 'Environmental Analysis'}</h3>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Alternative</th>
                        <th className="px-3 py-2 text-right">Agency {analysisCategory === 'cost' ? '($M)' : '(t CO₂e)'}</th>
                        <th className="px-3 py-2 text-right">User {analysisCategory === 'cost' ? '($M)' : '(t CO₂e)'}</th>
                        <th className="px-3 py-2 text-right">Total {analysisCategory === 'cost' ? '($M)' : '(t CO₂e)'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.deterministic.map((r, i) => (
                        <tr key={i} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium" style={{ color: r.color }}>{r.name}</td>
                          <td className="px-3 py-2 text-right">{(analysisCategory === 'cost' ? r.agencyCost : r.agencyCO2).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right">{(analysisCategory === 'cost' ? r.userCost : r.userCO2).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{(analysisCategory === 'cost' ? r.totalCost : r.totalCO2).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 className="font-medium mb-2 text-sm">Breakdown by Source</h4>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left">Alternative</th>
                        <th className="px-2 py-1 text-right">Treatment {analysisCategory === 'cost' ? '($M)' : '(t)'}</th>
                        <th className="px-2 py-1 text-right">Work Zone {analysisCategory === 'cost' ? '($M)' : '(t)'}</th>
                        <th className="px-2 py-1 text-right">Excess Fuel {analysisCategory === 'cost' ? '($M)' : '(t)'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.deterministic.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1" style={{ color: r.color }}>{r.name}</td>
                          <td className="px-2 py-1 text-right">{(analysisCategory === 'cost' ? r.treatCostDisc : r.treatCO2).toFixed(3)}</td>
                          <td className="px-2 py-1 text-right">{(analysisCategory === 'cost' ? r.wzCostDisc : r.wzCO2).toFixed(4)}</td>
                          <td className="px-2 py-1 text-right">{(analysisCategory === 'cost' ? r.fuelCostDisc : r.fuelCO2).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Dynamic pie charts grid */}
                <div className={`grid gap-4 mb-4 ${results.deterministic.length <= 2 ? 'md:grid-cols-3' : results.deterministic.length === 3 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                  <div>
                    <h4 className="text-xs font-medium text-center mb-1">Comparison ({getUnit()})</h4>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={results.deterministic} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={v => v.toFixed(2)} />
                        <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(v) => [v.toFixed(3), getUnit()]} />
                        <Bar dataKey={getDataKey()} fill={analysisCategory === 'cost' ? '#3B82F6' : '#10B981'} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {results.deterministic.map((r, i) => (
                    <div key={i}>
                      <h4 className="text-xs font-medium text-center mb-1">{r.name}</h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={analysisCategory === 'cost' ? r.pieDataCost : r.pieDataCO2} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} label={({ name, value }) => value > 0.001 ? `${name.split(' ')[0]}` : ''} labelLine={false}>
                            {PIE_COLORS.map((c, j) => <Cell key={j} fill={c} />)}
                          </Pie>
                          <Tooltip formatter={(v) => [v.toFixed(4), analysisCategory === 'cost' ? '$M' : 't CO₂e']} />
                          <Legend wrapperStyle={{ fontSize: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>

                <h4 className="font-medium mb-2 text-sm">Cumulative Over Time</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart margin={{ top: 5, right: 20, left: 60, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" type="number" domain={[0, params.analysisPeriod]} label={{ value: 'Year', position: 'insideBottom', offset: -5 }} allowDuplicatedCategory={false} />
                    <YAxis label={{ value: analysisCategory === 'cost' ? 'Cumulative ($M)' : 'Cumulative (t CO₂e)', angle: -90, position: 'insideLeft', offset: 0 }} />
                    <Tooltip formatter={(v) => [v.toFixed(3), analysisCategory === 'cost' ? '$M' : 't CO₂e']} labelFormatter={(v) => `Year ${Math.round(v)}`} />
                    <Legend verticalAlign="top" height={36} />
                    {results.deterministic.map((r) => (
                      <Line key={r.name} data={r.yearly} dataKey={analysisCategory === 'cost' ? 'cumCostDisc' : 'cumCO2'} name={r.name} stroke={r.color} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>


              </div>
            )}

            {results && analysisMode === 'probabilistic' && (
              <div>
                <h3 className="font-semibold mb-2">Probabilistic Results (N={params.nSimulations}) — {analysisCategory === 'cost' ? 'Cost' : 'Emissions'}</h3>

                <h4 className="font-medium mb-1 text-sm">Mean Values (Agency / User / Total)</h4>
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Alternative</th>
                        <th className="px-3 py-2 text-right">Agency {analysisCategory === 'cost' ? '($M)' : '(t CO₂e)'}</th>
                        <th className="px-3 py-2 text-right">User {analysisCategory === 'cost' ? '($M)' : '(t CO₂e)'}</th>
                        <th className="px-3 py-2 text-right">Total {analysisCategory === 'cost' ? '($M)' : '(t CO₂e)'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.probabilistic.map((r, i) => (
                        <tr key={i} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium" style={{ color: r.color }}>{r.name}</td>
                          <td className="px-3 py-2 text-right">{(analysisCategory === 'cost' ? r.agency.mean : r.agencyCO2.mean).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right">{(analysisCategory === 'cost' ? r.user.mean : r.userCO2.mean).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{(analysisCategory === 'cost' ? r.total.mean : r.totalCO2.mean).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 className="font-medium mb-1 text-sm">Statistical Summary ({costType} {analysisCategory === 'cost' ? 'cost' : 'emissions'})</h4>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Alternative</th>
                        <th className="px-3 py-2 text-right">Mean ({getUnit()})</th>
                        <th className="px-3 py-2 text-right">Std Dev</th>
                        <th className="px-3 py-2 text-right">5th %ile</th>
                        <th className="px-3 py-2 text-right">95th %ile</th>
                        <th className="px-3 py-2 text-right">Conv. COV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.probabilistic.map((r, i) => {
                        const d = r[getProbKey()];
                        return (
                          <tr key={i} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium" style={{ color: r.color }}>{r.name}</td>
                            <td className="px-3 py-2 text-right">{d.mean.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right">{d.std.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right">{d.p5.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right">{d.p95.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right text-gray-400">{(d.cov * 100).toFixed(2)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 mt-1">Conv. COV = Convergence Coefficient of Variation. Smaller = better MC convergence.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-center">Probability Density Function</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tickFormatter={v => v.toFixed(2)} label={{ value: getUnit(), position: 'insideBottom', offset: -5 }} />
                        <YAxis />
                        <Tooltip cursor={false} formatter={(v, n) => [v.toFixed(4), 'Density']} labelFormatter={v => `${getUnit()}: ${v.toFixed(3)}`} />
                        <Legend verticalAlign="top" height={36} />
                        {results.probabilistic.map((r) => {
                          const d = r[getProbKey()];
                          return <Area key={r.name} data={getHistogramData(d.samples)} type="monotone" dataKey="count" stroke={r.color} fill={r.color} fillOpacity={0.4} name={r.name} />;
                        })}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-center">Cumulative Distribution Function</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tickFormatter={v => v.toFixed(2)} label={{ value: getUnit(), position: 'insideBottom', offset: -5 }} />
                        <YAxis domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                        <Tooltip cursor={false} formatter={(v) => [(v * 100).toFixed(1) + '%', 'Probability']} labelFormatter={v => `${getUnit()}: ${v.toFixed(3)}`} />
                        <Legend verticalAlign="top" height={36} />
                        {results.probabilistic.map((r) => {
                          const d = r[getProbKey()];
                          const sorted = [...d.samples].sort((a, b) => a - b);
                          const cdf = sorted.filter((_, i) => i % 20 === 0).map((v, idx) => ({ x: v, y: (idx * 20 + 1) / sorted.length }));
                          return <Line key={r.name} data={cdf} type="monotone" dataKey="y" stroke={r.color} strokeWidth={2} dot={false} name={r.name} />;
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>


              </div>
            )}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-xl shadow-lg p-4 space-y-3 text-sm">
            <h2 className="font-semibold">Methodology & References</h2>

            <div className="border rounded p-3 bg-blue-50">
              <h3 className="font-medium mb-1">📐 Excess Fuel Consumption Model</h3>
              <p className="text-gray-600 mb-2">Based on Ziyadi et al. (2018):</p>
              <code className="block bg-white p-2 rounded text-xs font-mono">Excess Fuel (gal/veh-mi) = 2.0469 × (IRI - Base_IRI) / 131 / 1000</code>
              <p className="text-xs text-gray-500 mt-2">Annual excess fuel = rate × AADT × 365 × length (miles).</p>
            </div>

            <div className="border rounded p-3 bg-green-50">
              <h3 className="font-medium mb-1">🌱 Emissions Calculations</h3>
              <ul className="text-gray-600 text-xs space-y-1">
                <li><strong>Treatment CO₂:</strong> kg/sqyd × area (sqyd) ÷ 1000 = tonnes</li>
                <li><strong>Work Zone CO₂:</strong> delay_hr/veh × AADT × days × idling_rate (kg/veh-hr) ÷ 1000 = tonnes</li>
                <li><strong>Excess Fuel CO₂:</strong> gallons × kg_CO₂/gal ÷ 1000 = tonnes</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2"><strong>Defaults:</strong> HMA ~51-54 kg CO₂e/ton (NAPA 2024). Gasoline: 8.89 kg CO₂/gal (EPA).</p>
            </div>

            <div className="border rounded p-3 bg-orange-50">
              <h3 className="font-medium mb-1">🚧 Work Zone Assumptions</h3>
              <p className="text-gray-600 text-xs"><strong>Assumption:</strong> Vehicle delay time = idling time. Total delay hours = delay_per_veh × AADT × work_zone_days.</p>
              <p className="text-gray-600 text-xs mt-1">Work zone CO₂ = total_delay_hours × idling_CO₂_rate. Default idling rate: 0.5 kg/veh-hr (adjustable in Parameters).</p>
            </div>

            <div className="border rounded p-3 bg-purple-50">
              <h3 className="font-medium mb-1">💰 Cost Calculations</h3>
              <ul className="text-gray-600 text-xs space-y-1">
                <li><strong>Treatment:</strong> $/sqyd × area × CPI_adjustment, then discounted to PV</li>
                <li><strong>Work Zone:</strong> delay_hours × value_of_time ($/hr), then discounted</li>
                <li><strong>Excess Fuel:</strong> gallons × fuel_price ($/gal), then discounted</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">Area = length (mi) × width (ft) × 1760 × 0.33 sqyd</p>
            </div>

            <div className="border rounded p-3 bg-yellow-50">
              <h3 className="font-medium mb-1">📊 Distributions</h3>
              <p className="text-gray-600 text-xs"><strong>Normal N(μ,σ):</strong> When mean & std dev known. <strong>Uniform U(a,b):</strong> When only range known.</p>
            </div>

            <div className="border rounded p-3 bg-gray-50">
              <h3 className="font-medium mb-1">🎲 Monte Carlo</h3>
              <p className="text-gray-600 text-xs">Both deterministic and probabilistic run simultaneously. Conv. COV = (std/√N)/mean indicates convergence quality.</p>
            </div>

            <div className="border rounded p-3 bg-red-50">
              <h3 className="font-medium mb-1">⚠️ Limitations</h3>
              <ul className="text-gray-600 text-xs space-y-1 list-disc pl-4">
                <li>Salvage value / remaining service life not included</li>
                <li>Simplified IRI progression (linear)</li>
                <li>Work zone delay assumed = idling time</li>
              </ul>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 mt-4">
          For Educational Purposes Only. Created by <a href="https://egemenokte.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Egemen Okte</a>
        </p>
      </div>
    </div>
  );
}
