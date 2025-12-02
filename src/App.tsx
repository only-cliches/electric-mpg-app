import type { Component } from "solid-js";
import { createSignal, createMemo, Show } from "solid-js";
import "./App.css";

// Typical Level 2 AC charging efficiency (90%).
// This means you pay for 10% more electricity than what ends up in the battery.
const CHARGING_EFFICIENCY = 0.90; 

type UnitSystem = "US" | "METRIC";

const App: Component = () => {
    // --- STATE ---
    const [unitSystem, setUnitSystem] = createSignal<UnitSystem>("US");
    
    // Inputs (stored as strings to handle decimal inputs cleanly)
    const [electricityCost, setElectricityCost] = createSignal("");
    const [efficiencyInput, setEfficiencyInput] = createSignal("");
    const [fuelPrice, setFuelPrice] = createSignal("");
    const [iceEfficiency, setIceEfficiency] = createSignal("");

    // --- HELPERS ---

    const parsePositiveNumber = (value: string): number | null => {
        const n = Number(value);
        if (!isFinite(n) || n <= 0) return null;
        return n;
    };

    // Derived numeric values
    const electricityCostNum = createMemo(() => parsePositiveNumber(electricityCost()));
    const efficiencyNum = createMemo(() => parsePositiveNumber(efficiencyInput()));
    const fuelPriceNum = createMemo(() => parsePositiveNumber(fuelPrice()));
    const iceEfficiencyNum = createMemo(() => {
        if (!iceEfficiency().trim()) return null;
        return parsePositiveNumber(iceEfficiency());
    });

    // Dynamic labels based on unit system
    const units = createMemo(() => {
        const isUS = unitSystem() === "US";
        return {
            currency: "$", 
            dist: isUS ? "miles" : "km",
            vol: isUS ? "gallon" : "liter",
            eff: isUS ? "miles per kWh" : "km per kWh",
            iceEff: isUS ? "MPG" : "L/100km",
        };
    });

    // --- CORE CALCULATIONS ---

    const results = createMemo(() => {
        const Ce = electricityCostNum(); // Cost per kWh
        const E_raw = efficiencyNum();   // Distance per kWh (raw input)
        const Cf = fuelPriceNum();       // Cost per Fuel Unit (gallon or liter)

        if (Ce === null || E_raw === null || Cf === null) return null;

        // Apply charging losses: 
        // Effective Efficiency = Raw Efficiency * Charging Efficiency
        const E_effective = E_raw * CHARGING_EFFICIENCY;

        // 1. Electric Cost per Distance Unit (e.g., $ per mile)
        // Cost = (Cost per kWh) / (Effective Distance per kWh)
        const electricCostPerDist = Ce / E_effective;

        // 2. EV "Fuel-Equivalent" Efficiency
        // How much distance can I travel on electricity for the cost of 1 unit of fuel?
        // = (Cost of 1 Fuel Unit) / (Electric Cost per Distance Unit)
        const evFuelEquivalent = Cf / electricCostPerDist; 

        return {
            electricCostPerDist,
            evFuelEquivalent,
            rawEfficiency: E_raw,
            effectiveEfficiency: E_effective
        };
    });

    const comparison = createMemo(() => {
        const base = results();
        const IceEffInput = iceEfficiencyNum(); // MPG or L/100km

        if (!base || IceEffInput === null) return null;

        const Cf = fuelPriceNum(); 
        if (Cf === null) return null;

        let gasCostPerDist = 0;
        let efficiencyDisplay = 0; // For displaying "30 MPG" or "7.8 L/100km"

        if (unitSystem() === "US") {
            // US: Input is MPG. Cost = Price / MPG
            gasCostPerDist = Cf / IceEffInput;
            efficiencyDisplay = IceEffInput;
        } else {
            // Metric: Input is L/100km. 
            // Cost per km = (Price per Liter * Liters per 100km) / 100
            gasCostPerDist = (Cf * IceEffInput) / 100;
            efficiencyDisplay = IceEffInput;
        }

        const savingsPerDist = gasCostPerDist - base.electricCostPerDist;
        const percentSavings = gasCostPerDist > 0 
            ? (savingsPerDist / gasCostPerDist) * 100 
            : 0;
        
        // Efficiency Factor: How many times cheaper is electric?
        const efficiencyFactor = gasCostPerDist / base.electricCostPerDist;

        return {
            gasCostPerDist,
            efficiencyDisplay,
            savingsPerDist,
            percentSavings,
            efficiencyFactor,
        };
    });

    // formatting helpers
    const formatCurrency = (val: number, d = 3) => `$${val.toFixed(d)}`;
    const formatNumber = (val: number, d = 1) => val.toFixed(d);
    const formatPercent = (val: number, d = 0) => `${val.toFixed(d)}%`;

    return (
        <div class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8 font-sans">
            <div class="w-full max-w-3xl">
                <header class="mb-8 text-center mt-6">
                    <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-50">
                        EV MPG Calculator
                    </h1>
                    <p class="mt-2 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
                        Find your electric vehicle&apos;s gasoline-equivalent MPG and compare it
                        to a gas car using your local electricity and fuel prices. 
                        <span class="block mt-1 text-slate-500 text-xs">
                            (Includes ~10% factor for charging energy losses)
                        </span>
                    </p>
                    
                    {/* Unit Toggle */}
                    <div class="mt-6 flex justify-center">
                        <div class="bg-slate-900 p-1 rounded-lg border border-slate-800 inline-flex">
                            <button
                                onClick={() => setUnitSystem("US")}
                                class={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    unitSystem() === "US" 
                                    ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30" 
                                    : "text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                US Units (MPG)
                            </button>
                            <button
                                onClick={() => setUnitSystem("METRIC")}
                                class={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    unitSystem() === "METRIC" 
                                    ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30" 
                                    : "text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                Metric (L/100km)
                            </button>
                        </div>
                    </div>
                </header>

                <main class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    {/* Input card */}
                    <section class="bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-lg shadow-black/40 p-6 sm:p-7 backdrop-blur">
                        <h2 class="text-lg font-medium text-slate-100 mb-4">
                            Inputs <span class="text-xs font-normal text-slate-500 ml-2">({unitSystem()})</span>
                        </h2>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-200 mb-1.5">
                                    Electricity cost <span class="text-slate-500 font-normal">({units().currency} per kWh)</span>
                                </label>
                                <input
                                    type="number" inputMode="decimal" step="any" min="0"
                                    class="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                                    placeholder="0.12"
                                    value={electricityCost()}
                                    onInput={(e) => setElectricityCost(e.currentTarget.value)}
                                />
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-slate-200 mb-1.5">
                                    EV efficiency <span class="text-slate-500 font-normal">({units().eff})</span>
                                </label>
                                <input
                                    type="number" inputMode="decimal" step="any" min="0"
                                    class="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                                    placeholder={unitSystem() === "US" ? "3.5" : "5.6"}
                                    value={efficiencyInput()}
                                    onInput={(e) => setEfficiencyInput(e.currentTarget.value)}
                                />
                                <p class="mt-1 text-[11px] text-slate-500">
                                    Use your EV's dashboard average.
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-slate-200 mb-1.5">
                                    Gas price <span class="text-slate-500 font-normal">({units().currency} per {units().vol})</span>
                                </label>
                                <input
                                    type="number" inputMode="decimal" step="any" min="0"
                                    class="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                                    placeholder="4.00"
                                    value={fuelPrice()}
                                    onInput={(e) => setFuelPrice(e.currentTarget.value)}
                                />
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-slate-200 mb-1.5">
                                    Gas Car Efficiency <span class="text-slate-500 font-normal">({units().iceEff})</span>
                                </label>
                                <input
                                    type="number" inputMode="decimal" step="any" min="0"
                                    class="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                                    placeholder={unitSystem() === "US" ? "30" : "7.8"}
                                    value={iceEfficiency()}
                                    onInput={(e) => setIceEfficiency(e.currentTarget.value)}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Results + Info */}
                    <section class="space-y-4">
                        <div class="bg-slate-900/80 border border-slate-800/80 rounded-2xl shadow-lg shadow-black/40 p-6 sm:p-7 backdrop-blur min-h-[220px] flex flex-col justify-between">
                            <div>
                                <h2 class="text-lg font-medium text-slate-100 mb-2">
                                    Results
                                </h2>

                                <Show
                                    when={results()}
                                    fallback={
                                        <p class="text-sm text-slate-500">
                                            Enter your details to see the equivalent efficiency and savings.
                                        </p>
                                    }
                                >
                                    {(data) => {
                                        // Accessors for reactive updates inside the block
                                        const r = () => data();
                                        const cf = () => fuelPriceNum() || 0;
                                        const ce = () => electricityCostNum() || 0;
                                        
                                        return (
                                            <div class="space-y-4">
                                                <div>
                                                    <p class="text-xs uppercase tracking-wide text-emerald-400 mb-1">
                                                        Electric Equivalent
                                                    </p>
                                                    <div class="flex items-baseline gap-2">
                                                        <p class="text-3xl font-semibold text-emerald-300">
                                                            {formatNumber(r().evFuelEquivalent, 1)}
                                                        </p>
                                                        <span class="text-sm font-normal text-slate-400">
                                                            {unitSystem() === "US" ? "MPG equivalent" : "km per unit cost"}
                                                        </span>
                                                    </div>
                                                    
                                                    <p class="mt-2 text-xs text-slate-400 leading-relaxed">
                                                        For the cost of 1 {units().vol} of gas ({formatCurrency(cf(), 2)}), 
                                                        you can drive <span class="font-medium text-slate-200">{formatNumber(r().evFuelEquivalent, 1)} {units().dist}</span> on electricity.
                                                    </p>
                                                </div>

                                                <div class="border-t border-slate-800 pt-3">
                                                    <p class="text-xs uppercase tracking-wide text-slate-400 mb-1">
                                                        Real Cost per {units().dist}
                                                    </p>
                                                    <p class="text-sm font-medium text-slate-100">
                                                        {formatCurrency(r().electricCostPerDist, 3)}
                                                    </p>
                                                    <p class="mt-1 text-[10px] text-slate-500">
                                                        Based on {formatCurrency(ce(), 4)}/kWh and wall-to-wheel efficiency of {formatNumber(r().effectiveEfficiency, 2)} {units().eff}.
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }}
                                </Show>
                            </div>

                            <Show when={comparison()}>
                                {(data) => {
                                    const c = () => data(); 
                                    return (
                                        <div class="mt-4 border-t border-slate-800 pt-3">
                                            <p class="text-xs uppercase tracking-wide text-amber-300 mb-1">
                                                vs Gas Car
                                            </p>
                                            <p class="text-sm text-slate-100 mb-1">
                                                Gas efficiency: <span class="font-semibold">{formatNumber(c().efficiencyDisplay, 1)} {units().iceEff}</span>
                                            </p>
                                            <div class="flex justify-between text-xs text-slate-400 mb-2">
                                                <span>Gas: {formatCurrency(c().gasCostPerDist, 3)}/{units().dist}</span>
                                                <span class="text-emerald-400">EV: {formatCurrency(results()!.electricCostPerDist, 3)}/{units().dist}</span>
                                            </div>
                                            
                                            <div class="bg-slate-950/50 rounded p-2 border border-slate-800">
                                                <p class="text-xs text-emerald-300 text-center">
                                                    <span class="font-semibold">{formatNumber(c().efficiencyFactor, 1)}× cheaper</span> to drive electric.
                                                    <br/>
                                                    Saves {formatPercent(c().percentSavings, 0)} on fuel costs.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }}
                            </Show>
                        </div>
                        <div class="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-4 sm:p-5 text-xs text-slate-400 leading-relaxed mb-20">
                            <h3 class="text-sm font-semibold text-slate-200 mb-1.5">
                                How this works
                            </h3>
                            <p class="mb-1.5">
                                This calculator estimates your EV&apos;s gasoline-equivalent efficiency by
                                comparing how many {units().dist} you can drive on electricity for the
                                same cost as one {units().vol} of gas.
                            </p>
                            <p class="mb-1.5">
                                It uses your electricity cost, your EV&apos;s {units().eff}, and
                                the current gas price to compute results.
                            </p>
                            <ul class="list-disc list-inside mb-1.5 space-y-0.5">
                                <li>Real-world electric cost per {units().dist}</li>
                                <li>Electric {units().dist} you can drive for the cost of one {units().vol}</li>
                                <li>
                                    Comparison to your gas car&apos;s cost per {units().dist}
                                </li>
                            </ul>
                            <p class="text-[0.7rem] text-slate-500 mt-2 italic">
                                Note: This calculator applies a <strong>{Math.round((1 - CHARGING_EFFICIENCY) * 100)}% energy loss factor</strong> to account for the electricity lost as heat during the charging process (wall-to-battery efficiency).
                            </p>
                        </div>

                    </section>
                </main>
            </div>
        </div>
    );
};

export default App;