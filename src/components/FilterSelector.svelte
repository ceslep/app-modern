<script lang="ts">
	import { filters } from '@services/filters.js';
	import { IconSelect } from '@components/icon-select.js';
	import { $ } from '@utils/dom.js';

	export let showYear = true;
	export let showAsignacion = true;
	export let showNivel = true;
	export let showNumero = true;
	export let showPeriodo = true;

	export let placeholderYear = 'Año';
	export let placeholderAsignacion = 'Sede';
	export let placeholderNivel = 'Grado';
	export let placeholderNumero = 'Grupo';
	export let placeholderPeriodo = 'Periodo';

	export let onChange: (data: { [key: string]: string }) => void = () => {};

	let year = String(new Date().getFullYear());
	let asignacion = '';
	let nivel = '';
	let numero = '';
	let periodo = '';

	// State for options
	let years: { value: string; label: string }[] = [];
	let sedes: { value: string; label: string }[] = [];
	let niveles: { value: string; label: string }[] = [];
	let numeros: { value: string; label: string }[] = [];
	let periods: { value: string; label: string }[] = [];

	// Load options
	async function loadOptions() {
		try {
			const [yearsRes, sedesRes, periodsRes] = await Promise.all([
				filters.getYears(),
				filters.getSedes(),
				filters.getPeriods()
			]);

			years = yearsRes.data?.map((y: any) => ({ value: String(y), label: String(y) })) ?? [];
			sedes = sedesRes.data?.map((s: any) => ({ value: String(s.value || s.id), label: String(s.label || s.nombre || s) })) ?? [];
			periods = periodsRes.data?.map((p: any) => ({
				value: String(p.value || p.id),
				label: String(p.label || p.nombre || p),
				group: p.current ? 'Actual' : undefined
			})) ?? [];

			// Set current year if not already set
			if (years.length && !year) {
				year = years.find(y => y.label === String(new Date().getFullYear()))?.value ?? years[0].value;
			}

			// Set current period if exists
			if (periods.length && !periodo) {
				const currentPeriod = periods.find(p => p.group === 'Actual');
				periodo = currentPeriod?.value ?? periods[0].value;
			}
		} catch (error) {
			console.error('Error loading filter options:', error);
		}
	}

	// Update dependent options when sede or nivel changes
	async function updateDependentOptions() {
		if (!asignacion) {
			niveles = [];
			numeros = [];
			nivel = '';
			numero = '';
			return;
		}

		try {
			// Load niveles for the selected asignacion and year
			const nivelesRes = await filters.getNiveles(asignacion, year);
			niveles = nivelesRes.data?.map((n: any) => ({
				value: String(n.nivel || n.value || n.id),
				label: String(n.label || n.nombre || `${n.nivel || n.value} · ${n.nombre || ''}`).trim()
			})) ?? [];

			// Reset nivel and numero when asignacion changes
			if (nivel && !niveles.some(n => n.value === nivel)) {
				nivel = '';
				numeros = [];
				numero = '';
			}
		} catch (error) {
			console.error('Error loading niveles:', error);
			niveles = [];
		}
	}

	async function updateNumeros() {
		if (!asignacion || !nivel) {
			numeros = [];
			numero = '';
			return;
		}

		try {
			const numerosRes = await filters.getNumeros(asignacion, nivel, year);
			numeros = numerosRes.data?.map((n: any) => ({
				value: String(n.numero || n.value || n.id),
				label: String(n.label || n.nombre || n.numero || n.value)
			})) ?? [];

			// Reset numero if current selection is invalid
			if (numero && !numeros.some(n => n.value === numero)) {
				numero = '';
			}
		} catch (error) {
			console.error('Error loading numeros:', error);
			numeros = [];
		}
	}

	function handleChange() {
		const data: { [key: string]: string } = {};
		if (showYear) data.year = year;
		if (showAsignacion) data.asignacion = asignacion;
		if (showNivel) data.nivel = nivel;
		if (showNumero) data.numero = numero;
		if (showPeriodo) data.periodo = periodo;

		onChange(data);
	}

	$: if (showAsignacion || showNivel || showNumero) {
		if (showAsignacion) {
			updateDependentOptions().catch(console.error);
		}

		if (showNivel && showNumero) {
			updateNumeros().catch(console.error);
		}
	}

	// Initial load
	loadOptions().catch(console.error);
</script>

<div class="space-x-4 flex flex-wrap items-end">
	{#if showYear}
		<div class="relative">
			<label for="year-select" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
				{placeholderYear}
			</label>
			<select
				id="year-select"
				bind:value={year}
				class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
				on:change={handleChange}
			>
				<option value="">Seleccione...</option>
				{#each years as option}
					<option value={option.value} selected={option.value === year}>
						{option.label}
					</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if showAsignacion}
		<div class="relative">
			<label for="asignacion-select" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
				{placeholderAsignacion}
			</label>
			<select
				id="asignacion-select"
				bind:value={asignacion}
				class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
				on:change={handleChange}
			>
				<option value="">Seleccione...</option>
				{#each sedes as option}
					<option value={option.value} selected={option.value === asignacion}>
						{option.label}
					</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if showNivel}
		<div class="relative">
			<label for="nivel-select" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
				{placeholderNivel}
			</label>
			<select
				id="nivel-select"
				bind:value={nivel}
				class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
				on:change={handleChange}
			>
				<option value="">Seleccione...</option>
				{#each niveles as option}
					<option value={option.value} selected={option.value === nivel}>
						{option.label}
					</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if showNumero}
		<div class="relative">
			<label for="numero-select" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
				{placeholderNumero}
			</label>
			<select
				id="numero-select"
				bind:value={numero}
				class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
				on:change={handleChange}
			>
				<option value="">Seleccione...</option>
				{#each numeros as option}
					<option value={option.value} selected={option.value === numero}>
						{option.label}
					</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if showPeriodo}
		<div class="relative">
			<label for="periodo-select" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
				{placeholderPeriodo}
			</label>
			<select
				id="periodo-select"
				bind:value={periodo}
				class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#543391] focus:border-transparent outline-none transition-all"
				on:change={handleChange}
			>
				<option value="">Seleccione...</option>
				{#each periods as option}
					<option value={option.value} selected={option.value === periodo}>
						{option.label}
						{#if option.group}
							<span class="text-xs text-gray-400 ml-1">({option.group})</span>
						{/if}
					</option>
				{/each}
			</select>
		</div>
	{/if}
</div>

<style>
	/* Optional: Add some styling to make it look more like the existing icon-select */
	select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23543391'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 1.5rem 1.5rem;
		padding-right: 2.5rem;
	}

	/* Hide the default arrow in IE */
	select::-ms-expand {
		display: none;
	}
</style>