// ---------- Types ----------

export type CropFamily = 'cereal' | 'legume' | 'oilseed' | 'cash' | 'horticulture' | 'plantation';
export type CropCategory = 'pulses' | 'major' | 'horticulture';
export type Season = 'kharif' | 'rabi' | 'zaid' | 'both';
export type Texture = 'sandy' | 'loam' | 'clay';

export type Crop = {
  name: string;
  family: CropFamily;
  category: CropCategory;
  season: Season;
  phMin: number;
  phMax: number;
  texture: Texture[];
  nNeed: 'low' | 'medium' | 'high';
  goodAfter: CropFamily[];
  intercropsWith: string[];
  // Districts and/or states where this crop is a well-known regional specialty.
  // Matching here carries the heaviest scoring weight — a real farmer in a
  // coffee belt shouldn't be told to grow tomatoes over coffee.
  regions?: string[];
  fertilizer: {
    beforeSowing: string;
    duringGrowth: string;
  };
};

export type SoilRating = {
  nitrogen: 'Low' | 'Medium' | 'High';
  ph: number;
  phLabel: 'Acidic' | 'Neutral' | 'Alkaline';
  organicCarbon: 'Low' | 'Medium' | 'High';
  texture: Texture;
  clayPct: number;
  sandPct: number;
  siltPct: number;
  cec: number | null; // cmol/kg — nutrient-holding capacity
  cecLabel: 'Low' | 'Medium' | 'High' | 'Unknown';
  bulkDensity: number | null; // kg/dm³ — indicates compaction
  compactionLabel: 'Loose' | 'Normal' | 'Compacted' | 'Unknown';
};

export type Region = { district: string; state: string } | null;

// Optional real lab soil-test values, entered manually by the farmer.
// These are far more accurate than satellite estimates for P/K/Ca, which
// SoilGrids does not provide at all.
export type ManualSoilTest = {
  phosphorus?: number; // kg/ha, standard Indian soil test unit
  potassium?: number; // kg/ha
  calcium?: number; // ppm
};

// Standard Indian soil-test interpretation bands (kg/ha for P and K)
export function rateManualNutrient(nutrient: 'phosphorus' | 'potassium', value: number): 'Low' | 'Medium' | 'High' {
  if (nutrient === 'phosphorus') {
    if (value < 10) return 'Low';
    if (value <= 25) return 'Medium';
    return 'High';
  }
  // potassium
  if (value < 120) return 'Low';
  if (value <= 280) return 'Medium';
  return 'High';
}

// ---------- Crop database ----------
// Fertilizer rates are standard general recommendations (kg/acre), meant as a
// starting estimate — always confirm with local KVK for a field-specific plan.

export const CROP_DATABASE: Crop[] = [
  // ---- Major crops (cereals + cash crops) ----
  {
    name: 'Rice (Paddy)',
    family: 'cereal',
    category: 'major',
    season: 'kharif',
    phMin: 5.5,
    phMax: 7.0,
    texture: ['clay', 'loam'],
    nNeed: 'high',
    goodAfter: ['legume', 'oilseed'],
    intercropsWith: ['Azolla (biofertilizer)'],
    regions: ['Punjab', 'Haryana', 'West Bengal', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Odisha', 'Chhattisgarh'],
    fertilizer: {
      beforeSowing:
        'DAP 50 kg/acre + MOP 20 kg/acre at transplanting, plus FYM/compost 2 tonnes/acre worked into soil beforehand',
      duringGrowth:
        'Urea 25 kg/acre at tillering (25-30 days) + Urea 25 kg/acre at panicle stage (50-55 days)',
    },
  },
  {
    name: 'Wheat',
    family: 'cereal',
    category: 'major',
    season: 'rabi',
    phMin: 6.0,
    phMax: 7.5,
    texture: ['loam', 'clay'],
    nNeed: 'high',
    goodAfter: ['legume', 'oilseed', 'cash'],
    intercropsWith: ['Chana (Chickpea)'],
    regions: ['Punjab', 'Haryana', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan'],
    fertilizer: {
      beforeSowing: 'DAP 50 kg/acre + MOP 20 kg/acre at sowing, plus FYM/compost 2 tonnes/acre',
      duringGrowth:
        'Urea 25 kg/acre at first irrigation (20-25 days) + Urea 20 kg/acre at second irrigation (45 days)',
    },
  },
  {
    name: 'Maize',
    family: 'cereal',
    category: 'major',
    season: 'both',
    phMin: 5.5,
    phMax: 7.5,
    texture: ['loam', 'sandy'],
    nNeed: 'high',
    goodAfter: ['legume', 'oilseed'],
    intercropsWith: ['Moong (Green Gram)', 'Tur (Pigeon Pea / Arhar)'],
    regions: ['Karnataka', 'Bihar', 'Madhya Pradesh', 'Maharashtra'],
    fertilizer: {
      beforeSowing: 'DAP 40 kg/acre + MOP 20 kg/acre at sowing, plus FYM/compost 2 tonnes/acre',
      duringGrowth:
        'Urea 25 kg/acre at knee-high stage (25-30 days) + Urea 20 kg/acre at tasseling (45 days)',
    },
  },
  {
    name: 'Bajra (Pearl Millet)',
    family: 'cereal',
    category: 'major',
    season: 'kharif',
    phMin: 6.0,
    phMax: 8.0,
    texture: ['sandy', 'loam'],
    nNeed: 'medium',
    goodAfter: ['legume'],
    intercropsWith: ['Moong (Green Gram)'],
    regions: ['Rajasthan', 'Gujarat', 'Haryana'],
    fertilizer: {
      beforeSowing: 'DAP 30 kg/acre at sowing, plus FYM 1.5 tonnes/acre',
      duringGrowth: 'Urea 20 kg/acre at 25-30 days',
    },
  },
  {
    name: 'Cotton',
    family: 'cash',
    category: 'major',
    season: 'kharif',
    phMin: 6.0,
    phMax: 8.0,
    texture: ['clay', 'loam'],
    nNeed: 'high',
    goodAfter: ['legume', 'cereal'],
    intercropsWith: ['Moong (Green Gram)', 'Groundnut'],
    regions: ['Gujarat', 'Maharashtra', 'Telangana', 'Punjab'],
    fertilizer: {
      beforeSowing: 'DAP 40 kg/acre + MOP 20 kg/acre at sowing, plus FYM 2 tonnes/acre',
      duringGrowth:
        'Urea 25 kg/acre at squaring (35-40 days) + Urea 25 kg/acre at flowering (60-65 days)',
    },
  },
  {
    name: 'Sugarcane',
    family: 'cash',
    category: 'major',
    season: 'both',
    phMin: 6.0,
    phMax: 7.5,
    texture: ['loam', 'clay'],
    nNeed: 'high',
    goodAfter: ['legume'],
    intercropsWith: ['Onion'],
    regions: ['Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu'],
    fertilizer: {
      beforeSowing: 'DAP 60 kg/acre + MOP 30 kg/acre at planting, plus FYM 4 tonnes/acre',
      duringGrowth: 'Urea 40 kg/acre at 45 days + Urea 40 kg/acre at 90 days',
    },
  },
  {
    name: 'Mustard',
    family: 'oilseed',
    category: 'major',
    season: 'rabi',
    phMin: 6.0,
    phMax: 7.5,
    texture: ['loam', 'sandy'],
    nNeed: 'medium',
    goodAfter: ['cereal', 'legume'],
    intercropsWith: ['Chana (Chickpea)'],
    regions: ['Rajasthan', 'Haryana', 'Madhya Pradesh'],
    fertilizer: {
      beforeSowing: 'DAP 30 kg/acre + MOP 15 kg/acre at sowing, plus FYM 1.5 tonnes/acre',
      duringGrowth: 'Urea 20 kg/acre at first irrigation (25-30 days)',
    },
  },
  {
    name: 'Soybean',
    family: 'oilseed',
    category: 'major',
    season: 'kharif',
    phMin: 6.0,
    phMax: 7.5,
    texture: ['loam', 'clay'],
    nNeed: 'low',
    goodAfter: ['cereal'],
    intercropsWith: ['Maize'],
    regions: ['Madhya Pradesh', 'Maharashtra', 'Rajasthan'],
    fertilizer: {
      beforeSowing: 'DAP 40 kg/acre at sowing, plus FYM 1.5 tonnes/acre',
      duringGrowth: 'Usually not needed — soybean fixes its own nitrogen',
    },
  },

  // ---- Plantation / regional specialty crops (major category) ----
  {
    name: 'Coffee (Arabica/Robusta)',
    family: 'plantation',
    category: 'major',
    season: 'both',
    phMin: 5.5,
    phMax: 6.5,
    texture: ['loam', 'clay'],
    nNeed: 'medium',
    goodAfter: ['legume'],
    intercropsWith: ['Black Pepper', 'Cardamom'],
    regions: ['Chikkamagaluru', 'Kodagu', 'Hassan', 'Wayanad', 'Idukki', 'Karnataka', 'Kerala'],
    fertilizer: {
      beforeSowing: 'FYM 10 kg/plant + DAP 100 g/plant at planting (established plantation crop)',
      duringGrowth: 'NPK 100:100:100 g/plant/year, split into 2-3 applications with monsoon',
    },
  },
  {
    name: 'Arecanut',
    family: 'plantation',
    category: 'major',
    season: 'both',
    phMin: 5.5,
    phMax: 7.0,
    texture: ['loam', 'clay'],
    nNeed: 'medium',
    goodAfter: ['legume'],
    intercropsWith: ['Black Pepper', 'Cocoa'],
    regions: ['Chikkamagaluru', 'Dakshina Kannada', 'Udupi', 'Shivamogga', 'Karnataka', 'Kerala'],
    fertilizer: {
      beforeSowing: 'FYM 12 kg/palm + rock phosphate 500 g/palm at planting',
      duringGrowth: 'Urea 260 g/palm + MOP 300 g/palm per year, split into 2 doses',
    },
  },

  // ---- Pulses (legumes) ----
  {
    name: 'Moong (Green Gram)',
    family: 'legume',
    category: 'pulses',
    season: 'kharif',
    phMin: 6.0,
    phMax: 7.5,
    texture: ['loam', 'sandy'],
    nNeed: 'low',
    goodAfter: ['cereal'],
    intercropsWith: ['Maize', 'Cotton', 'Bajra (Pearl Millet)'],
    fertilizer: {
      beforeSowing:
        'DAP 20 kg/acre at sowing (pulses need little N — they fix their own), plus FYM 1 tonne/acre',
      duringGrowth: 'Usually not needed',
    },
  },
  {
    name: 'Urad (Black Gram)',
    family: 'legume',
    category: 'pulses',
    season: 'kharif',
    phMin: 6.0,
    phMax: 7.5,
    texture: ['loam', 'clay'],
    nNeed: 'low',
    goodAfter: ['cereal'],
    intercropsWith: [],
    fertilizer: {
      beforeSowing: 'DAP 20 kg/acre at sowing, plus FYM 1 tonne/acre',
      duringGrowth: 'Usually not needed',
    },
  },
  {
    name: 'Chana (Chickpea)',
    family: 'legume',
    category: 'pulses',
    season: 'rabi',
    phMin: 6.0,
    phMax: 7.5,
    texture: ['loam', 'clay'],
    nNeed: 'low',
    goodAfter: ['cereal'],
    intercropsWith: ['Wheat', 'Mustard'],
    fertilizer: {
      beforeSowing: 'DAP 25 kg/acre at sowing, plus FYM 1 tonne/acre',
      duringGrowth: 'Usually not needed',
    },
  },
  {
    name: 'Tur (Pigeon Pea / Arhar)',
    family: 'legume',
    category: 'pulses',
    season: 'kharif',
    phMin: 5.5,
    phMax: 7.5,
    texture: ['loam', 'sandy'],
    nNeed: 'low',
    goodAfter: ['cereal'],
    intercropsWith: ['Maize', 'Groundnut'],
    fertilizer: {
      beforeSowing: 'DAP 20 kg/acre at sowing, plus FYM 1 tonne/acre',
      duringGrowth: 'Usually not needed',
    },
  },
  {
    name: 'Groundnut',
    family: 'legume',
    category: 'pulses',
    season: 'kharif',
    phMin: 6.0,
    phMax: 7.0,
    texture: ['sandy', 'loam'],
    nNeed: 'low',
    goodAfter: ['cereal'],
    intercropsWith: ['Tur (Pigeon Pea / Arhar)', 'Cotton'],
    regions: ['Gujarat', 'Andhra Pradesh', 'Tamil Nadu'],
    fertilizer: {
      beforeSowing: 'DAP 30 kg/acre + Gypsum 40 kg/acre at flowering, plus FYM 1.5 tonnes/acre',
      duringGrowth: 'Usually not needed',
    },
  },

  // ---- Horticulture: vegetable / fruit / flower / spice ----
  {
    name: 'Tomato',
    family: 'horticulture',
    category: 'horticulture',
    season: 'both',
    phMin: 6.0,
    phMax: 7.0,
    texture: ['loam', 'sandy'],
    nNeed: 'high',
    goodAfter: ['legume', 'cereal'],
    intercropsWith: ['Onion'],
    fertilizer: {
      beforeSowing: 'DAP 40 kg/acre + MOP 20 kg/acre at transplanting, plus FYM 2 tonnes/acre',
      duringGrowth: 'Urea 20 kg/acre every 20 days through the season',
    },
  },
  {
    name: 'Onion',
    family: 'horticulture',
    category: 'horticulture',
    season: 'rabi',
    phMin: 6.0,
    phMax: 7.5,
    texture: ['loam', 'sandy'],
    nNeed: 'medium',
    goodAfter: ['legume', 'cereal'],
    intercropsWith: ['Tomato', 'Sugarcane'],
    regions: ['Maharashtra', 'Karnataka', 'Gujarat'],
    fertilizer: {
      beforeSowing: 'DAP 30 kg/acre + MOP 20 kg/acre at transplanting, plus FYM 2 tonnes/acre',
      duringGrowth: 'Urea 20 kg/acre at 30 days + Urea 15 kg/acre at 45 days',
    },
  },
  {
    name: 'Marigold (Flower)',
    family: 'horticulture',
    category: 'horticulture',
    season: 'both',
    phMin: 6.0,
    phMax: 7.5,
    texture: ['loam', 'sandy'],
    nNeed: 'medium',
    goodAfter: ['legume', 'cereal'],
    intercropsWith: ['Tomato'],
    fertilizer: {
      beforeSowing: 'DAP 25 kg/acre at transplanting, plus FYM 1.5 tonnes/acre',
      duringGrowth: 'Urea 15 kg/acre at 30 days',
    },
  },
  {
    name: 'Papaya (Fruit)',
    family: 'horticulture',
    category: 'horticulture',
    season: 'both',
    phMin: 6.0,
    phMax: 7.0,
    texture: ['loam', 'sandy'],
    nNeed: 'medium',
    goodAfter: ['legume', 'cereal'],
    intercropsWith: [],
    fertilizer: {
      beforeSowing: 'DAP 100 g/plant + FYM 10 kg/plant at planting',
      duringGrowth: 'Urea 100 g/plant every 2 months through the first year',
    },
  },
  {
    name: 'Banana (Fruit)',
    family: 'horticulture',
    category: 'horticulture',
    season: 'both',
    phMin: 6.0,
    phMax: 7.5,
    texture: ['loam', 'clay'],
    nNeed: 'high',
    goodAfter: ['legume'],
    intercropsWith: [],
    regions: ['Tamil Nadu', 'Maharashtra', 'Gujarat'],
    fertilizer: {
      beforeSowing: 'DAP 200 g/plant + FYM 15 kg/plant at planting',
      duringGrowth: 'Urea 150 g/plant every 45 days through the season',
    },
  },
  {
    name: 'Black Pepper',
    family: 'plantation',
    category: 'horticulture',
    season: 'both',
    phMin: 5.5,
    phMax: 6.5,
    texture: ['loam', 'clay'],
    nNeed: 'medium',
    goodAfter: ['plantation' as CropFamily],
    intercropsWith: ['Coffee (Arabica/Robusta)', 'Arecanut'],
    regions: ['Chikkamagaluru', 'Kodagu', 'Wayanad', 'Idukki', 'Karnataka', 'Kerala'],
    fertilizer: {
      beforeSowing: 'FYM 10 kg/vine + rock phosphate 250 g/vine at planting, grown as a climber on support trees',
      duringGrowth: 'NPK 50:50:150 g/vine/year, split into 2 applications',
    },
  },
  {
    name: 'Cardamom',
    family: 'plantation',
    category: 'horticulture',
    season: 'both',
    phMin: 5.0,
    phMax: 6.5,
    texture: ['loam', 'clay'],
    nNeed: 'medium',
    goodAfter: ['plantation' as CropFamily],
    intercropsWith: ['Coffee (Arabica/Robusta)'],
    regions: ['Chikkamagaluru', 'Kodagu', 'Idukki', 'Karnataka', 'Kerala'],
    fertilizer: {
      beforeSowing: 'FYM 5 kg/clump at planting, needs shade and high humidity',
      duringGrowth: 'NPK 75:75:150 g/clump/year, split with monsoon applications',
    },
  },
  {
    name: 'Coconut',
    family: 'plantation',
    category: 'horticulture',
    season: 'both',
    phMin: 5.5,
    phMax: 8.0,
    texture: ['sandy', 'loam'],
    nNeed: 'medium',
    goodAfter: ['legume'],
    intercropsWith: [],
    regions: ['Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh'],
    fertilizer: {
      beforeSowing: 'FYM 25 kg/palm + rock phosphate 500 g/palm at planting',
      duringGrowth: 'Urea 500 g/palm + MOP 1.2 kg/palm per year, split into 2 doses',
    },
  },
];

// ---------- Soil interpretation ----------

export function interpretSoilData(
  soilData: any,
  manualTest?: { phosphorus?: number; potassium?: number; calcium?: number }
): SoilRating | null {
  const layers = soilData?.properties?.layers;
  if (!layers) return null;

  function getValue(name: string): number | null {
    const layer = layers.find((l: any) => l.name === name);
    const raw = layer?.depths?.[0]?.values?.mean;
    if (raw == null) return null;
    const dFactor = layer?.unit_measure?.d_factor ?? 1;
    return raw / dFactor;
  }

  const nitrogenRaw = getValue('nitrogen');
  const phRaw = getValue('phh2o');
  const clay = getValue('clay') ?? 0;
  const sand = getValue('sand') ?? 0;
  const silt = getValue('silt') ?? 0;
  const soc = getValue('soc');
  const cecRaw = getValue('cec'); // cmol(+)/kg
  const bdodRaw = getValue('bdod'); // kg/dm3

  if (nitrogenRaw == null || phRaw == null) return null;

  let nitrogen: SoilRating['nitrogen'] = 'Medium';
  if (nitrogenRaw < 150) nitrogen = 'Low';
  else if (nitrogenRaw > 300) nitrogen = 'High';

  const ph = phRaw;
  let phLabel: SoilRating['phLabel'] = 'Neutral';
  if (ph < 6.0) phLabel = 'Acidic';
  else if (ph > 7.5) phLabel = 'Alkaline';

  let organicCarbon: SoilRating['organicCarbon'] = 'Medium';
  if (soc != null) {
    if (soc < 5) organicCarbon = 'Low';
    else if (soc > 10) organicCarbon = 'High';
  }

  const clayPct = clay / 10;
  const sandPct = sand / 10;
  const siltPct = silt / 10;

  let texture: Texture = 'loam';
  if (clayPct > 40) texture = 'clay';
  else if (sandPct > 55) texture = 'sandy';

  // CEC: how well soil retains nutrients like K, Ca, Mg — higher is generally better
  let cecLabel: SoilRating['cecLabel'] = 'Unknown';
  if (cecRaw != null) {
    if (cecRaw < 12) cecLabel = 'Low';
    else if (cecRaw <= 25) cecLabel = 'Medium';
    else cecLabel = 'High';
  }

  // Bulk density: higher usually means more compacted, harder for roots
  let compactionLabel: SoilRating['compactionLabel'] = 'Unknown';
  if (bdodRaw != null) {
    if (bdodRaw < 1.3) compactionLabel = 'Loose';
    else if (bdodRaw <= 1.6) compactionLabel = 'Normal';
    else compactionLabel = 'Compacted';
  }

  return {
    nitrogen,
    ph,
    phLabel,
    organicCarbon,
    texture,
    clayPct,
    sandPct,
    siltPct,
    cec: cecRaw,
    cecLabel,
    bulkDensity: bdodRaw,
    compactionLabel,
  };
}

// ---------- Recommendation engine ----------

export type CropRecommendation = {
  crop: Crop;
  score: number;
  reasons: string[];
  fertilizerBeforeSowing: string;
  fertilizerDuringGrowth: string;
};

function regionMatches(crop: Crop, region: Region): boolean {
  if (!region || !crop.regions) return false;
  const targets = [region.district, region.state].filter(Boolean).map((s) => s.toLowerCase());
  return crop.regions.some((r) => targets.some((t) => t.includes(r.toLowerCase()) || r.toLowerCase().includes(t)));
}

// A "plantation region" is one where at least one known plantation/cash crop
// (coffee, pepper, cardamom, arecanut, rubber, tea etc.) specifically lists this
// district/state — meaning farmers there realistically grow cash crops, not a
// forced mix of pulses + cereal + vegetable.
export function isPlantationRegion(region: Region): boolean {
  if (!region) return false;
  return CROP_DATABASE.some(
    (c) => (c.family === 'plantation' || c.family === 'cash') && regionMatches(c, region)
  );
}

function scoreCrop(
  crop: Crop,
  soilRating: SoilRating | null,
  previousCropName: string,
  season: Season | undefined,
  region: Region
): { score: number; reasons: string[] } {
  const previousCrop = CROP_DATABASE.find((c) => c.name === previousCropName);
  const previousFamily = previousCrop?.family;
  let score = 0;
  const reasons: string[] = [];

  // Regional suitability — heaviest weight, matches how strongly a region is
  // known for this crop (e.g. Chikkamagaluru → coffee, not generic tomato)
  if (regionMatches(crop, region)) {
    score += 8;
    reasons.push(`Well-known regional crop for ${region?.district || region?.state}`);
  }

  if (season && crop.season !== 'both' && crop.season !== season) {
    score -= 5;
  } else if (season && (crop.season === season || crop.season === 'both')) {
    score += 1;
  }

  if (crop.name === previousCropName) {
    score -= 10;
  }

  if (previousFamily) {
    if (crop.goodAfter.includes(previousFamily)) {
      score += 3;
      reasons.push(`Rotates well after ${previousFamily} crops like your previous crop`);
    }
    if (crop.family === previousFamily && crop.family !== 'plantation') {
      score -= 3;
      reasons.push('Same crop family as last season — rotating away is usually better for soil health');
    }
  }

  if (soilRating) {
    if (soilRating.ph >= crop.phMin && soilRating.ph <= crop.phMax) {
      score += 2;
      reasons.push(`Soil pH (${soilRating.ph.toFixed(1)}) fits this crop's ideal range`);
    }
    if (crop.texture.includes(soilRating.texture)) {
      score += 2;
      reasons.push(`Suits your ${soilRating.texture} soil texture`);
    }
    if (soilRating.nitrogen === 'Low' && crop.nNeed === 'low') {
      score += 2;
      reasons.push('Your soil nitrogen is low — this crop fixes its own nitrogen, needs less fertilizer');
    }
    if (soilRating.nitrogen === 'High' && crop.nNeed === 'high') {
      score += 1;
      reasons.push('Your soil has good nitrogen reserves, suits a nitrogen-hungry crop');
    }
  }

  return { score, reasons };
}

function buildFertilizerNotes(crop: Crop, soilRating: SoilRating | null) {
  let beforeSowing = crop.fertilizer.beforeSowing;
  if (soilRating?.nitrogen === 'Low' && crop.nNeed !== 'low') {
    beforeSowing += ' — add an extra 10 kg Urea/acre since your soil nitrogen is low';
  } else if (soilRating?.nitrogen === 'High') {
    beforeSowing += ' — you can reduce basal Urea slightly since soil nitrogen is already good';
  }
  return { beforeSowing, duringGrowth: crop.fertilizer.duringGrowth };
}

function scoreAllCrops(
  candidates: Crop[],
  soilRating: SoilRating | null,
  previousCropName: string,
  season: Season | undefined,
  region: Region
): CropRecommendation[] {
  return candidates.map((crop) => {
    const { score, reasons } = scoreCrop(crop, soilRating, previousCropName, season, region);
    const fert = buildFertilizerNotes(crop, soilRating);
    return {
      crop,
      score,
      reasons,
      fertilizerBeforeSowing: fert.beforeSowing,
      fertilizerDuringGrowth: fert.duringGrowth,
    };
  });
}

// Normally returns one recommendation per category (pulses / major / horticulture) —
// the right shape for typical mixed-farming regions. But if the farm sits in a
// known plantation belt (coffee, pepper, cardamom, arecanut, rubber, tea...),
// that fixed split doesn't reflect how farmers there actually plant — so instead
// this returns the top 3 crops overall, unconstrained by category, letting real
// regional cash crops dominate the list the way they should.
export function recommendCrops(
  soilRating: SoilRating | null,
  previousCropName: string,
  season?: Season,
  region?: Region
): CropRecommendation[] {
  const resolvedRegion = region ?? null;

  if (isPlantationRegion(resolvedRegion)) {
    const scored = scoreAllCrops(CROP_DATABASE, soilRating, previousCropName, season, resolvedRegion);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }

  const categories: CropCategory[] = ['pulses', 'major', 'horticulture'];
  return categories.map((category) => {
    const candidates = CROP_DATABASE.filter((c) => c.category === category);
    const scored = scoreAllCrops(candidates, soilRating, previousCropName, season, resolvedRegion);
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  });
}

// Suggests a mixed-cropping (intercropping) pairing from the current recommendations, if any exist
export function getMixedCroppingSuggestion(recommendations: CropRecommendation[]): string | null {
  for (const rec of recommendations) {
    for (const otherName of rec.crop.intercropsWith) {
      const match = recommendations.find((r) => r.crop.name === otherName);
      if (match) {
        return `${rec.crop.name} and ${match.crop.name} grow well together — consider intercropping them in alternating rows. This can improve soil health and give you two harvests from the same field.`;
      }
    }
  }
  const pulse = recommendations.find((r) => r.crop.category === 'pulses');
  const major = recommendations.find((r) => r.crop.category === 'major');
  if (pulse && major) {
    return `You can intercrop ${pulse.crop.name} between rows of ${major.crop.name} — pulses fix nitrogen naturally, which benefits the major crop and gives you an extra harvest.`;
  }
  return null;
}

// ---------- Nutrient deficiency corrective fertilizer lookup ----------
// Used by Disease Detector when Gemini identifies a likely nutrient deficiency.
// These are general corrective guidelines, not AI-generated quantities.

export const DEFICIENCY_FERTILIZER_MAP: Record<string, string> = {
  nitrogen:
    'Apply Urea 20-25 kg/acre as a top-dress, split into 2 applications 10-15 days apart. Look for improved dark-green color within 7-10 days.',
  phosphorus:
    'Apply DAP or SSP (Single Super Phosphate) 25-30 kg/acre at the base of plants. Phosphorus moves slowly in soil, so apply close to the root zone.',
  potassium:
    'Apply MOP (Muriate of Potash) 15-20 kg/acre. Improves stem strength and disease resistance within 2-3 weeks.',
  zinc:
    'Apply Zinc Sulphate 10 kg/acre mixed with soil, or a foliar spray of Zinc Sulphate 0.5% solution for faster correction.',
  iron:
    'Foliar spray of Ferrous Sulphate 0.5% solution is faster-acting than soil application for iron deficiency (common in alkaline soils).',
  magnesium:
    'Apply Magnesium Sulphate (Epsom salt) 10 kg/acre, or as a 1-2% foliar spray for quicker visible correction.',
  sulphur:
    'Apply Gypsum 40 kg/acre or Single Super Phosphate, which also supplies sulphur alongside phosphorus.',
  boron:
    'Foliar spray of Borax 0.1-0.2% solution — boron deficiency often shows as poor flowering/fruit set and responds well to foliar feeding.',
};

export function getDeficiencyAdvice(nutrientKeyword: string): string | null {
  const key = Object.keys(DEFICIENCY_FERTILIZER_MAP).find((k) =>
    nutrientKeyword.toLowerCase().includes(k)
  );
  return key ? DEFICIENCY_FERTILIZER_MAP[key] : null;
}