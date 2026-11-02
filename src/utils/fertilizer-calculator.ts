/** Short, farmer-friendly soil guidance. This is not a laboratory prescription. */
export type NutrientStatus = 'low' | 'medium' | 'high' | 'unknown';
export type SoilNutrientStatuses = {
  nitrogen?: NutrientStatus;
  phosphorus?: NutrientStatus;
  potassium?: NutrientStatus;
};
export type SoilGuidanceContext = {
  soilNitrogen?: 'Low' | 'Medium' | 'High';
  phLabel?: 'Acidic' | 'Neutral' | 'Alkaline';
  texture?: 'sandy' | 'loam' | 'clay';
  cropFamily?: 'cereal' | 'legume' | 'oilseed' | 'cash' | 'horticulture' | 'plantation';
  nitrogenNeed?: 'low' | 'medium' | 'high';
};
export type SoilFertilizerGuidance = {
  title: string;
  summary: string;
  suggestions: string[];
  caution: string;
  isDoseProvided: false;
};

const KNOWN = (v?: NutrientStatus) => v !== undefined && v !== 'unknown';

export function getSoilBasedFertilizerGuidance(
  soil: SoilNutrientStatuses,
  cropName = 'selected crop',
  context: SoilGuidanceContext = {},
): SoilFertilizerGuidance {
  const tips: string[] = [];
  const n = soil.nitrogen;
  const p = soil.phosphorus;
  const k = soil.potassium;

  if (KNOWN(n)) {
    if (n === 'low') tips.push('Nitrogen is low: plan a crop-appropriate nitrogen feed; split it during growth rather than applying it all at once.');
    if (n === 'medium') tips.push('Nitrogen is moderate: follow the crop’s normal nutrient plan; avoid extra nitrogen without a reason.');
    if (n === 'high') tips.push('Nitrogen is high: avoid adding extra nitrogen unless the crop-specific advice calls for it.');
  } else if (context.soilNitrogen) {
    if (context.soilNitrogen === 'Low') tips.push('The soil map flags low nitrogen: add well-rotted compost if available and confirm fertilizer needs with a soil test.');
    else if (context.soilNitrogen === 'High') tips.push('The soil map indicates relatively higher nitrogen; use it as a clue only and do not increase fertilizer from this estimate alone.');
    else tips.push('The soil map shows a moderate nitrogen level; use crop-specific advice and avoid unnecessary extra nitrogen.');
  }

  if (KNOWN(p)) {
    if (p === 'low') tips.push('Phosphorus is low: consider a phosphorus source such as SSP or DAP according to the crop recommendation; DAP also adds nitrogen.');
    if (p === 'medium') tips.push('Phosphorus is moderate: do not add extra phosphorus beyond the crop recommendation.');
    if (p === 'high') tips.push('Phosphorus is high: avoid extra phosphorus unless a local crop recommendation specifically requires it.');
  }
  if (KNOWN(k)) {
    if (k === 'low') tips.push('Potassium is low: check whether the crop needs a potassium source such as MOP under local guidance.');
    if (k === 'medium') tips.push('Potassium is moderate: keep to the crop’s recommended potassium amount.');
    if (k === 'high') tips.push('Potassium is high: avoid extra potash unless a crop-specific recommendation supports it.');
  }

  // If P/K lab results are absent, use only cautious soil/crop clues instead of a missing-category warning.
  if (!KNOWN(p) && !KNOWN(k) && tips.length === 0) {
    if (context.cropFamily === 'legume') tips.push('For this pulse/legume, avoid heavy nitrogen feeding; focus on the crop’s recommended starter nutrients and healthy root nodules.');
    else if (context.nitrogenNeed === 'high') tips.push('This crop has a higher nitrogen need. Use a crop-specific fertilizer plan and split nitrogen applications to match growth.');
    else if (context.nitrogenNeed === 'low') tips.push('This crop generally needs less nitrogen than heavy-feeding crops; avoid excess nitrogen and follow its local nutrient plan.');
    else tips.push('Use the soil texture and pH as clues, but get a soil test before choosing phosphorus or potash amounts.');
  }

  if (context.phLabel === 'Acidic') tips.push('Soil is acidic: ask the local agriculture office whether a lime recommendation is needed before applying it.');
  else if (context.phLabel === 'Alkaline') tips.push('Soil is alkaline: nutrient availability may be affected; confirm the cause before choosing a soil amendment.');
  if (context.texture === 'sandy') tips.push('Sandy soil loses nutrients more easily; smaller, well-timed applications may help, depending on the crop.');
  else if (context.texture === 'clay') tips.push('Clay soil holds water and nutrients longer; avoid applying fertilizer just before heavy rain or flooding.');

  const shortTips = tips.slice(0, 2);
  if (shortTips.length === 0) shortTips.push('Use the crop’s local nutrient plan. A soil map cannot confirm available phosphorus or potassium.');
  return {
    title: `Soil tips for ${cropName}`,
    summary: context.phLabel
      ? `${context.phLabel} soil${context.texture ? ` · ${context.texture} texture` : ''}`
      : 'Based on the soil information currently available',
    suggestions: shortTips,
    caution: 'Approximate guidance only—no dose is calculated. Use a soil-test report and local crop advice before applying fertilizer.',
    isDoseProvided: false,
  };
}

export type NutrientDosePerAcre = { nitrogenKg: number; phosphorusKg: number; potassiumKg: number };
export type FertilizerProductPlan = {
  areaAcres: number;
  perAcre: { ureaKg: number; dapKg: number; mopKg: number };
  total: { ureaKg: number; dapKg: number; mopKg: number };
  note: string;
};

/** Convert an already-verified N-P2O5-K2O target to approximate product weights. */
export function calculateFertilizerProducts(dose: NutrientDosePerAcre, areaAcres: number): FertilizerProductPlan | null {
  const values = [dose.nitrogenKg, dose.phosphorusKg, dose.potassiumKg, areaAcres];
  if (!values.every((v) => Number.isFinite(v) && v >= 0) || areaAcres <= 0) return null;
  const dap = dose.phosphorusKg / 0.46;
  const nFromDap = dap * 0.18;
  if (nFromDap > dose.nitrogenKg) return null;
  const urea = (dose.nitrogenKg - nFromDap) / 0.46;
  const mop = dose.potassiumKg / 0.60;
  const r = (v: number) => Math.round(v * 10) / 10;
  return {
    areaAcres,
    perAcre: { ureaKg: r(urea), dapKg: r(dap), mopKg: r(mop) },
    total: { ureaKg: r(urea * areaAcres), dapKg: r(dap * areaAcres), mopKg: r(mop * areaAcres) },
    note: 'Use only with a verified crop-specific nutrient target. If DAP exceeds the nitrogen target, this calculation returns no plan.',
  };
}


/**
 * DEMO ranges for the app prototype only (kg of commercial product per acre).
 * These broad ranges are not an official recommendation or soil-test prescription.
 * Validate every crop and district against current UAS/KVK package-of-practices data
 * before publishing this feature for real farm use.
 */
export type ApproximateProductRange = { min: number; max: number };
export type ApproximateCropFertilizerPlan = {
  cropName: string;
  areaAcres: number;
  productsPerAcre: { urea: ApproximateProductRange; dap: ApproximateProductRange; mop: ApproximateProductRange };
  productsForArea: { urea: ApproximateProductRange; dap: ApproximateProductRange; mop: ApproximateProductRange };
  note: string;
  isVerifiedDose: false;
};

// Deliberately broad, provisional prototype values. Values are product kg, not pure nutrients.
// These are starting UI examples and must be reviewed by an agronomist before deployment.
const DEMO_PRODUCT_RANGES: Record<string, { urea: [number, number]; dap: [number, number]; mop: [number, number] }> = {
  'Rice (Paddy)': { urea: [35, 55], dap: [20, 35], mop: [10, 20] },
  Wheat: { urea: [35, 50], dap: [20, 30], mop: [5, 15] },
  Maize: { urea: [35, 55], dap: [20, 35], mop: [10, 20] },
  'Bajra (Pearl Millet)': { urea: [15, 30], dap: [10, 20], mop: [5, 10] },
  Cotton: { urea: [25, 45], dap: [15, 30], mop: [10, 20] },
  Sugarcane: { urea: [90, 140], dap: [35, 60], mop: [35, 60] },
  Mustard: { urea: [15, 25], dap: [15, 25], mop: [5, 15] },
  Soybean: { urea: [5, 15], dap: [20, 35], mop: [10, 20] },
  'Coffee (Arabica/Robusta)': { urea: [20, 40], dap: [10, 25], mop: [10, 25] },
  Arecanut: { urea: [25, 45], dap: [15, 30], mop: [20, 40] },
  'Moong (Green Gram)': { urea: [5, 12], dap: [15, 25], mop: [5, 12] },
  'Urad (Black Gram)': { urea: [5, 12], dap: [15, 25], mop: [5, 12] },
  'Chana (Chickpea)': { urea: [5, 12], dap: [15, 25], mop: [5, 12] },
  'Tur (Pigeon Pea / Arhar)': { urea: [5, 15], dap: [15, 25], mop: [5, 15] },
  Groundnut: { urea: [5, 15], dap: [15, 25], mop: [10, 20] },
  Tomato: { urea: [35, 60], dap: [25, 40], mop: [25, 45] },
  Onion: { urea: [25, 45], dap: [20, 35], mop: [15, 30] },
  'Marigold (Flower)': { urea: [20, 35], dap: [15, 25], mop: [10, 20] },
  'Rose (Flower)': { urea: [20, 40], dap: [15, 30], mop: [15, 30] },
  'Gerbera (Flower)': { urea: [20, 40], dap: [15, 30], mop: [15, 30] },
  'Carnation (Flower)': { urea: [20, 40], dap: [15, 30], mop: [15, 30] },
  'Chrysanthemum (Flower)': { urea: [20, 35], dap: [15, 25], mop: [10, 20] },
  'Tuberose (Flower)': { urea: [20, 35], dap: [15, 25], mop: [10, 20] },
  'Gladiolus (Flower)': { urea: [20, 35], dap: [15, 25], mop: [10, 20] },
  'Jasmine (Flower)': { urea: [20, 35], dap: [15, 25], mop: [10, 20] },
  'China Aster (Flower)': { urea: [15, 30], dap: [10, 20], mop: [5, 15] },
  'Capsicum / Bell Pepper': { urea: [30, 50], dap: [20, 35], mop: [20, 40] },
  'Cucumber (Protected)': { urea: [25, 45], dap: [15, 30], mop: [20, 35] },
  'Cherry Tomato': { urea: [30, 50], dap: [20, 35], mop: [20, 40] },
  'Lettuce (Protected)': { urea: [15, 30], dap: [10, 20], mop: [10, 20] },
  'Papaya (Fruit)': { urea: [25, 45], dap: [15, 30], mop: [25, 45] },
  'Banana (Fruit)': { urea: [45, 75], dap: [20, 35], mop: [45, 75] },
  'Black Pepper': { urea: [15, 30], dap: [10, 20], mop: [15, 30] },
  Cardamom: { urea: [15, 30], dap: [10, 20], mop: [15, 30] },
  Coconut: { urea: [20, 40], dap: [10, 20], mop: [20, 40] },
};

const roundKg = (value: number) => Math.round(value * 10) / 10;

/** Returns provisional per-acre and farm-area product ranges for prototype display. */
export function getApproximateCropFertilizerPlan(
  cropName: string,
  areaAcres: number,
): ApproximateCropFertilizerPlan | null {
  if (!Number.isFinite(areaAcres) || areaAcres <= 0) return null;
  const products = DEMO_PRODUCT_RANGES[cropName];
  if (!products) return null;
  const scale = (range: [number, number]): ApproximateProductRange => ({ min: roundKg(range[0]), max: roundKg(range[1]) });
  const total = (range: [number, number]): ApproximateProductRange => ({ min: roundKg(range[0] * areaAcres), max: roundKg(range[1] * areaAcres) });
  return {
    cropName,
    areaAcres,
    productsPerAcre: { urea: scale(products.urea), dap: scale(products.dap), mop: scale(products.mop) },
    productsForArea: { urea: total(products.urea), dap: total(products.dap), mop: total(products.mop) },
    note: 'Prototype estimate only, not an approved dose. Actual needs vary with district, variety, season, irrigation and soil-test results. Confirm locally before applying.',
    isVerifiedDose: false,
  };
}
