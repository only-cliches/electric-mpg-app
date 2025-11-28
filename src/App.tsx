import type { Component } from "solid-js";
import { createSignal, createMemo, Show } from "solid-js";
import "./App.css"

const App: Component = () => {
	const [electricityCost, setElectricityCost] = createSignal("");
	const [milesPerKwh, setMilesPerKwh] = createSignal("");
	const [gasPrice, setGasPrice] = createSignal("");
	const [gasMpg, setGasMpg] = createSignal("");

	const parsePositiveNumber = (value: string): number | null => {
		const n = Number(value);
		if (!isFinite(n) || n <= 0) return null;
		return n;
	};

	const electricityCostNum = createMemo(() => parsePositiveNumber(electricityCost()));
	const milesPerKwhNum = createMemo(() => parsePositiveNumber(milesPerKwh()));
	const gasPriceNum = createMemo(() => parsePositiveNumber(gasPrice()));
	const gasMpgNum = createMemo(() => {
		if (!gasMpg().trim()) return null;
		return parsePositiveNumber(gasMpg());
	});

	// --- RESULTS (reactive) ---

	const evResults = createMemo(() => {
		const Ce = electricityCostNum();
		const Me = milesPerKwhNum();
		const Cg = gasPriceNum();

		if (Ce === null || Me === null || Cg === null) return null;

		const electricCostPerMile = Ce / Me;            // USD per mile (electric)
		const electricMilesPerDollar = 1 / electricCostPerMile; // miles per USD
		const evMpgEquivalent = electricMilesPerDollar * Cg;    // MPG equivalent

		return {
			evMpgEquivalent,
			electricCostPerMile,
		};
	});

	const comparisonResults = createMemo(() => {
		const base = evResults();
		const Mg = gasMpgNum();

		if (!base || Mg === null) return null;

		const Cg = gasPriceNum();
		if (Cg === null) return null;

		const gasCostPerMile = Cg / Mg;
		const electricCostPerMile = base.electricCostPerMile;
		const savingsPerMile = gasCostPerMile - electricCostPerMile;
		const percentSavings =
			gasCostPerMile > 0 ? (savingsPerMile / gasCostPerMile) * 100 : 0;
		const efficiencyFactor = base.evMpgEquivalent / Mg;

		return {
			gasCostPerMile,
			electricCostPerMile,
			savingsPerMile,
			percentSavings,
			efficiencyFactor,
		};
	});

	// formatting helpers
	const formatCurrency = (value: number, digits = 3) => `$${value.toFixed(digits)}`;
	const formatNumber = (value: number, digits = 1) => value.toFixed(digits);
	const formatPercent = (value: number, digits = 0) => `${value.toFixed(digits)}%`;

	const showElectricityError = createMemo(
		() => electricityCost().trim().length > 0 && electricityCostNum() === null
	);
	const showMilesError = createMemo(
		() => milesPerKwh().trim().length > 0 && milesPerKwhNum() === null
	);
	const showGasError = createMemo(
		() => gasPrice().trim().length > 0 && gasPriceNum() === null
	);
	const showGasMpgError = createMemo(
		() => gasMpg().trim().length > 0 && gasMpgNum() === null
	);

	const ev = () => evResults();           // tiny helpers so JSX reads nicer
	const cmp = () => comparisonResults();

	return (
		<div class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
			<div class="w-full max-w-3xl">
				<header class="mb-8 text-center mt-10">
					<h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-50">
						EV MPG Calculator
					</h1>
					<p class="mt-2 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
						Find your electric vehicle&apos;s gasoline-equivalent MPG and compare it
						to a gas car using your local electricity and fuel prices.
					</p>
				</header>

				<main class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
					{/* Input card */}
					<section class="bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-lg shadow-black/40 p-6 sm:p-7 backdrop-blur">
						<h2 class="text-lg font-medium text-slate-100 mb-4">
							Inputs
						</h2>
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-slate-200 mb-1.5">
									Electricity cost (USD per kWh)
								</label>
								<input
									type="number"
									inputMode="decimal"
									step="any"
									min="0"
									class="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-400/60"
									placeholder="0.12"
									value={electricityCost()}
									onInput={(e) => setElectricityCost(e.currentTarget.value)}
								/>
								<Show when={showElectricityError()}>
									<p class="mt-1 text-xs text-red-400">
										Please enter a number greater than zero.
									</p>
								</Show>
								<p class="mt-1 text-xs text-slate-500">
									Use the rate from your utility bill (for example: 0.12).
								</p>
							</div>

							<div>
								<label class="block text-sm font-medium text-slate-200 mb-1.5">
									EV efficiency (miles per kWh)
								</label>
								<input
									type="number"
									inputMode="decimal"
									step="any"
									min="0"
									class="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-400/60"
									placeholder="3.5"
									value={milesPerKwh()}
									onInput={(e) => setMilesPerKwh(e.currentTarget.value)}
								/>
								<Show when={showMilesError()}>
									<p class="mt-1 text-xs text-red-400">
										Please enter a number greater than zero.
									</p>
								</Show>
								<p class="mt-1 text-xs text-slate-500">
									Use your EV or plug-in&apos;s average miles per kWh.
								</p>
							</div>

							<div>
								<label class="block text-sm font-medium text-slate-200 mb-1.5">
									Gas price (USD per gallon)
								</label>
								<input
									type="number"
									inputMode="decimal"
									step="any"
									min="0"
									class="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-400/60"
									placeholder="4.00"
									value={gasPrice()}
									onInput={(e) => setGasPrice(e.currentTarget.value)}
								/>
								<Show when={showGasError()}>
									<p class="mt-1 text-xs text-red-400">
										Please enter a number greater than zero.
									</p>
								</Show>
							</div>

							<div>
								<label class="block text-sm font-medium text-slate-200 mb-1.5">
									Your gas car MPG (optional)
								</label>
								<input
									type="number"
									inputMode="decimal"
									step="any"
									min="0"
									class="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-400/60"
									placeholder="30"
									value={gasMpg()}
									onInput={(e) => setGasMpg(e.currentTarget.value)}
								/>
								<Show when={showGasMpgError()}>
									<p class="mt-1 text-xs text-red-400">
										Please enter a number greater than zero, or leave blank.
									</p>
								</Show>
							</div>

							{/* Live EV MPG display button */}
							<button
								class="mt-2 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/30 bg-emerald-300 transition"
								type="button"
							>
								EV MPG:&nbsp;
								{evResults()?.evMpgEquivalent
									? formatNumber(evResults()!.evMpgEquivalent, 1)
									: "?"}
							</button>

							<p class="mt-2 text-xs text-slate-500">
								All values are US-based units: dollars, miles, and gallons.
								This calculator is stateless and does not store or transmit any
								data.
							</p>
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
									when={ev()}
									fallback={
										<p class="text-sm text-slate-500">
											Enter your electricity rate, EV efficiency, and gas price to
											see the gasoline-equivalent MPG for driving on electricity.
										</p>
									}
								>
									{(data) => {
										const Ce = electricityCostNum()!;
										const Cg = gasPriceNum()!;
										return (
											<div class="space-y-3">
												<div>
													<p class="text-xs uppercase tracking-wide text-emerald-400 mb-1">
														Electric MPG Equivalent
													</p>
													<p class="text-3xl font-semibold text-emerald-300">
														{formatNumber(data().evMpgEquivalent, 1)}{" "}
														<span class="text-base font-normal text-slate-400">
															mpg (electric)
														</span>
													</p>
													<p class="mt-1 text-xs text-slate-400">
														For the cost of 1 gallon of gas at{" "}
														<span class="font-medium text-slate-200">
															{formatCurrency(Cg, 2)}
														</span>
														, you can drive about{" "}
														<span class="font-medium text-slate-200">
															{formatNumber(data().evMpgEquivalent, 1)} miles
														</span>{" "}
														on electricity.
													</p>
												</div>

												<div class="border-t border-slate-800 pt-3 mt-2">
													<p class="text-xs uppercase tracking-wide text-slate-400 mb-1">
														Cost per mile (electric)
													</p>
													<p class="text-sm font-medium text-slate-100">
														{formatCurrency(data().electricCostPerMile, 3)}{" "}
														<span class="text-slate-400 text-xs">per mile</span>
													</p>
													<p class="mt-1 text-xs text-slate-500">
														Based on {formatCurrency(Ce, 4)} per kWh and{" "}
														{formatNumber(milesPerKwhNum()!, 2)} miles per kWh.
													</p>
												</div>
											</div>
										);
									}}
								</Show>
							</div>

							<Show when={cmp()}>
								{(data) => {
									const Mg = gasMpgNum()!;
									return (
										<div class="mt-4 border-t border-slate-800 pt-3">
											<p class="text-xs uppercase tracking-wide text-amber-300 mb-1">
												Gas vs Electric
											</p>
											<p class="text-sm text-slate-100">
												Gas car MPG:{" "}
												<span class="font-semibold">
													{formatNumber(Mg, 1)} mpg
												</span>
											</p>
											<p class="mt-1 text-xs text-slate-300">
												Gas cost per mile:{" "}
												<span class="font-medium">
													{formatCurrency(data().gasCostPerMile, 3)}
												</span>
												{" · "}Electric cost per mile:{" "}
												<span class="font-medium">
													{formatCurrency(data().electricCostPerMile, 3)}
												</span>
											</p>
											<p class="mt-1 text-xs text-emerald-300">
												Electric is about{" "}
												<span class="font-semibold">
													{formatNumber(data().efficiencyFactor, 1)}×
												</span>{" "}
												more efficient, saving roughly{" "}
												<span class="font-semibold">
													{formatPercent(data().percentSavings, 0)}
												</span>{" "}
												per mile on fuel.
											</p>
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
								This calculator estimates your EV&apos;s gasoline-equivalent MPG by
								comparing how many miles you can drive on electricity for the
								same cost as one gallon of gas.
							</p>
							<p class="mb-1.5">
								It uses your electricity cost, your EV&apos;s miles per kWh, and
								the current gas price to compute:
							</p>
							<ul class="list-disc list-inside mb-1.5 space-y-0.5">
								<li>Electric cost per mile</li>
								<li>Electric miles you can drive for the cost of one gallon</li>
								<li>
									(Optional) How that compares to your gas car&apos;s MPG and cost
									per mile
								</li>
							</ul>
							<p class="text-[0.7rem] text-slate-500 mt-1">
								These values are estimates only. Real-world results vary based on
								driving conditions, temperature, vehicle model, and other
								factors.
							</p>
						</div>
					</section>
				</main>
			</div>
		</div>
	);
};

export default App;
