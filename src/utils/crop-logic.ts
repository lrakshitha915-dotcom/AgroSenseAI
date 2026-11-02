// ---------- Types ----------

export type CropFamily = 'cereal' | 'legume' | 'oilseed' | 'cash' | 'horticulture' | 'plantation';
export type CropCategory = 'pulses' | 'major' | 'horticulture';
export type Season = 'kharif' | 'rabi' | 'zaid' | 'both';
export type Texture = 'sandy' | 'loam' | 'clay';
export type CropGoal = 'any' | 'flowers' | 'vegetables' | 'fruits' | 'plantation' | 'field-crops' | 'other';
export type GrowingSetup =
  | 'open-field'
  | 'greenhouse' // legacy alias: any protected-cultivation candidate
  | 'naturally-ventilated-polyhouse'
  | 'climate-controlled-greenhouse'
  | 'shade-net'
  | 'undecided';

export type ClimateInputs = {
  averageTemperatureC?: number;
  annualRainfallMm?: number;
  altitudeM?: number;
};

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
  // Only set true for crops explicitly included as potential protected-cultivation candidates.
  protectedCultivation?: boolean;
  /** Structures for which this crop is a potential candidate; not a guarantee of suitability. */
  suitableStructures?: Array<'naturally-ventilated-polyhouse' | 'climate-controlled-greenhouse' | 'shade-net'>;
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
// Fertilizer notes are displayed as test-led guidance. The app does not prescribe
// universal fertilizer quantities because requirements vary by crop, stage and location.

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
      beforeSowing: 'Before planting Rice (Paddy), use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
      beforeSowing: 'Before planting Wheat, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
      beforeSowing: 'Before planting Maize, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
      beforeSowing: 'Before planting Bajra (Pearl Millet), use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
      beforeSowing: 'Before planting Cotton, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
      beforeSowing: 'Before planting Sugarcane, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
      beforeSowing: 'Before planting Mustard, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
      beforeSowing: 'Before planting Soybean, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
    regions: ['Chikkamagaluru', 'Kodagu', 'Hassan', 'Wayanad', 'Idukki'],
    fertilizer: {
      beforeSowing: 'Before planting Coffee (Arabica/Robusta), use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
    regions: ['Chikkamagaluru', 'Dakshina Kannada', 'Udupi', 'Shivamogga', 'Kasargod', 'Kozhikode'],
    fertilizer: {
      beforeSowing: 'Before planting Arecanut, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
    regions: ['Rajasthan', 'Maharashtra', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Uttar Pradesh', 'Madhya Pradesh', 'Gujarat', 'Bihar'],
    fertilizer: {
      beforeSowing: 'Before planting Moong (Green Gram), use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
    regions: ['Madhya Pradesh', 'Uttar Pradesh', 'Maharashtra', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Karnataka', 'Rajasthan'],
    fertilizer: {
      beforeSowing: 'Before planting Urad (Black Gram), use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
    regions: ['Madhya Pradesh', 'Rajasthan', 'Maharashtra', 'Uttar Pradesh', 'Gujarat', 'Karnataka', 'Andhra Pradesh'],
    fertilizer: {
      beforeSowing: 'Before planting Chana (Chickpea), use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
    regions: ['Maharashtra', 'Karnataka', 'Madhya Pradesh', 'Uttar Pradesh', 'Gujarat', 'Telangana', 'Andhra Pradesh'],
    fertilizer: {
      beforeSowing: 'Before planting Tur (Pigeon Pea / Arhar), use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
      beforeSowing: 'Before planting Groundnut, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
    },
  },

  // ---- Horticulture: vegetable / fruit / flower / spice ----
  {
    name: 'Tomato',
    family: 'horticulture',
    category: 'horticulture',
    protectedCultivation: true,
    season: 'both',
    phMin: 6.0,
    phMax: 7.0,
    texture: ['loam', 'sandy'],
    nNeed: 'high',
    goodAfter: ['legume', 'cereal'],
    intercropsWith: ['Onion'],
    regions: ['Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Madhya Pradesh', 'Uttar Pradesh', 'Himachal Pradesh', 'Tamil Nadu', 'West Bengal'],
    fertilizer: {
      beforeSowing: 'Before planting Tomato, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
      beforeSowing: 'Before planting Onion, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
    },
  },
  {
    name: 'Marigold (Flower)',
    family: 'horticulture',
    category: 'horticulture',
    protectedCultivation: true,
    season: 'both',
    phMin: 6.0,
    phMax: 7.5,
    texture: ['loam', 'sandy'],
    nNeed: 'medium',
    goodAfter: ['legume', 'cereal'],
    intercropsWith: ['Tomato'],
    regions: ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'West Bengal', 'Uttar Pradesh'],
    fertilizer: {
      beforeSowing: 'Before planting Marigold (Flower), use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
    },
  },
  {
    name: 'Rose (Flower)',
    family: 'horticulture', category: 'horticulture', protectedCultivation: true,
    season: 'both', phMin: 5.8, phMax: 6.8, texture: ['loam'], nNeed: 'high',
    goodAfter: ['legume'], intercropsWith: [],
    regions: ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'West Bengal', 'Himachal Pradesh', 'Uttarakhand'],
    fertilizer: {
      beforeSowing: 'Prepare well-drained soil and incorporate mature compost/FYM; use healthy, locally recommended planting material.',
      duringGrowth: 'For greenhouse roses, use crop-stage-based fertigation guided by water/soil testing and local horticulture advice; avoid a fixed dose across varieties.',
    },
  },
  {
    name: 'Gerbera (Flower)',
    family: 'horticulture', category: 'horticulture', protectedCultivation: true,
    season: 'both', phMin: 5.5, phMax: 6.5, texture: ['loam', 'sandy'], nNeed: 'high',
    goodAfter: ['legume'], intercropsWith: [],
    regions: ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Gujarat', 'Madhya Pradesh'],
    fertilizer: {
      beforeSowing: 'Use a clean, porous, well-drained growing bed or recommended soilless substrate; incorporate mature compost only as advised locally.',
      duringGrowth: 'Gerbera commonly uses controlled fertigation under protected cultivation; tailor nutrient concentration to substrate, water quality and crop stage.',
    },
  },
  {
    name: 'Carnation (Flower)',
    family: 'horticulture', category: 'horticulture', protectedCultivation: true,
    season: 'both', phMin: 6.0, phMax: 7.0, texture: ['loam'], nNeed: 'high',
    goodAfter: ['legume'], intercropsWith: [],
    regions: ['Karnataka', 'Maharashtra', 'Himachal Pradesh', 'Uttarakhand', 'Tamil Nadu'],
    fertilizer: {
      beforeSowing: 'Prepare a well-drained bed and use disease-free planting material suitable for the local climate.',
      duringGrowth: 'Use a carnation-specific fertigation schedule based on soil/substrate and irrigation-water tests; avoid applying a generic field-crop dose.',
    },
  },
  {
    name: 'Chrysanthemum (Flower)',
    family: 'horticulture', category: 'horticulture', protectedCultivation: true,
    season: 'both', phMin: 6.0, phMax: 7.0, texture: ['loam', 'sandy'], nNeed: 'medium',
    goodAfter: ['legume', 'cereal'], intercropsWith: [],
    regions: ['Karnataka', 'Tamil Nadu', 'Maharashtra', 'West Bengal', 'Uttar Pradesh', 'Madhya Pradesh'],
    fertilizer: {
      beforeSowing: 'Incorporate mature compost into well-drained soil and choose varieties suited to the local flowering season.',
      duringGrowth: 'Nutrient timing depends on variety and whether it is grown for cut flowers, loose flowers or pots; follow local horticulture guidance.',
    },
  },
  {
    name: 'Tuberose (Flower)',
    family: 'horticulture', category: 'horticulture',
    season: 'both', phMin: 6.0, phMax: 7.5, texture: ['loam', 'sandy'], nNeed: 'medium',
    goodAfter: ['legume', 'cereal'], intercropsWith: [],
    regions: ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'West Bengal', 'Uttar Pradesh', 'Maharashtra'],
    fertilizer: {
      beforeSowing: 'Use healthy bulbs and well-drained soil enriched with mature FYM/compost before planting.',
      duringGrowth: 'Split nutrient applications according to local tuberose recommendations and growth stage; avoid waterlogging.',
    },
  },
  {
    name: 'Gladiolus (Flower)',
    family: 'horticulture', category: 'horticulture',
    season: 'rabi', phMin: 6.0, phMax: 7.0, texture: ['loam', 'sandy'], nNeed: 'medium',
    goodAfter: ['legume', 'cereal'], intercropsWith: [],
    regions: ['Karnataka', 'Maharashtra', 'West Bengal', 'Uttar Pradesh', 'Himachal Pradesh', 'Uttarakhand'],
    fertilizer: {
      beforeSowing: 'Plant healthy corms in a loose, well-drained bed; mix mature compost into the soil before planting.',
      duringGrowth: 'Apply nutrients in stages using locally recommended rates for the cultivar and planting season.',
    },
  },
  {
    name: 'Jasmine (Flower)',
    family: 'horticulture', category: 'horticulture',
    season: 'both', phMin: 6.0, phMax: 7.5, texture: ['loam', 'sandy'], nNeed: 'medium',
    goodAfter: ['legume'], intercropsWith: [],
    regions: ['Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'West Bengal'],
    fertilizer: {
      beforeSowing: 'Plant healthy, locally suitable material in well-drained soil; incorporate mature FYM/compost.',
      duringGrowth: 'Pruning and nutrient timing vary by jasmine species and harvest system; follow state horticulture recommendations.',
    },
  },
  {
    name: 'China Aster (Flower)',
    family: 'horticulture', category: 'horticulture',
    season: 'rabi', phMin: 6.0, phMax: 7.5, texture: ['loam', 'sandy'], nNeed: 'medium',
    goodAfter: ['legume', 'cereal'], intercropsWith: [],
    regions: ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'West Bengal'],
    fertilizer: {
      beforeSowing: 'Use quality seed and a fine, well-drained nursery/field bed with mature compost incorporated.',
      duringGrowth: 'Use split nutrient applications recommended for the local variety and season; monitor moisture and common flower pests.',
    },
  },
  {
    name: 'Capsicum / Bell Pepper',
    family: 'horticulture', category: 'horticulture', protectedCultivation: true,
    season: 'both', phMin: 5.5, phMax: 6.8, texture: ['loam', 'sandy'], nNeed: 'high',
    goodAfter: ['legume', 'cereal'], intercropsWith: [],
    regions: ['Karnataka', 'Maharashtra', 'Himachal Pradesh', 'Uttarakhand', 'Tamil Nadu', 'Gujarat'],
    fertilizer: {
      beforeSowing: 'Use healthy seedlings and a well-drained bed or suitable substrate; incorporate mature compost based on soil test.',
      duringGrowth: 'Protected capsicum generally needs staged fertigation; base the plan on water quality, soil/substrate test and local package of practices.',
    },
  },
  {
    name: 'Cucumber (Protected)',
    family: 'horticulture', category: 'horticulture', protectedCultivation: true,
    season: 'both', phMin: 5.5, phMax: 7.0, texture: ['loam', 'sandy'], nNeed: 'high',
    goodAfter: ['legume', 'cereal'], intercropsWith: [],
    regions: ['Karnataka', 'Maharashtra', 'Gujarat', 'Himachal Pradesh', 'Uttarakhand', 'Tamil Nadu'],
    fertilizer: {
      beforeSowing: 'Choose a greenhouse-suited cucumber variety and prepare a well-drained bed or recommended soilless system.',
      duringGrowth: 'Use crop-stage-based fertigation and trellising guidance; monitor irrigation-water quality and avoid excess salts.',
    },
  },
  {
    name: 'Cherry Tomato',
    family: 'horticulture', category: 'horticulture', protectedCultivation: true,
    season: 'both', phMin: 5.8, phMax: 6.8, texture: ['loam', 'sandy'], nNeed: 'high',
    goodAfter: ['legume', 'cereal'], intercropsWith: [],
    regions: ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Himachal Pradesh', 'Uttarakhand'],
    fertilizer: {
      beforeSowing: 'Use healthy seedlings of a protected-cultivation variety and prepare a well-drained bed or substrate.',
      duringGrowth: 'Use staged fertigation based on soil/substrate and water tests; train and prune according to the variety.',
    },
  },
  {
    name: 'Lettuce (Protected)',
    family: 'horticulture', category: 'horticulture', protectedCultivation: true,
    season: 'rabi', phMin: 6.0, phMax: 7.0, texture: ['loam', 'sandy'], nNeed: 'medium',
    goodAfter: ['legume'], intercropsWith: [],
    regions: ['Karnataka', 'Himachal Pradesh', 'Uttarakhand', 'Maharashtra'],
    fertilizer: {
      beforeSowing: 'Use clean seed/seedlings and a loose, well-drained bed or suitable soilless substrate.',
      duringGrowth: 'Keep moisture even and use modest, crop-stage-based nutrition; high temperatures can reduce lettuce quality, so check local suitability.',
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
    regions: ['Andhra Pradesh', 'Telangana', 'Gujarat', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Assam'],
    fertilizer: {
      beforeSowing: 'Before planting Papaya (Fruit), use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
      beforeSowing: 'Before planting Banana (Fruit), use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
    regions: ['Chikkamagaluru', 'Kodagu', 'Wayanad', 'Idukki'],
    fertilizer: {
      beforeSowing: 'Before planting Black Pepper, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
    regions: ['Chikkamagaluru', 'Kodagu', 'Idukki'],
    fertilizer: {
      beforeSowing: 'Before planting Cardamom, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
    regions: ['Dakshina Kannada', 'Udupi', 'Kasaragod', 'Kozhikode', 'Thrissur', 'Ernakulam', 'Thanjavur', 'Coimbatore', 'Kanyakumari', 'East Godavari', 'Konaseema'],
    fertilizer: {
      beforeSowing: 'Before planting Coconut, use a current laboratory soil test and the crop-specific package of practices for your district. Add mature FYM/compost only according to the test result and local guidance; this app does not prescribe a universal dose.',
      duringGrowth: 'Base any top-dressing or fertigation on crop variety, growth stage, soil/substrate test, irrigation-water quality and local KVK/agriculture-department guidance. Confirm a deficiency before applying corrective fertilizer.',
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
  // getValue() has already applied SoilGrids' d_factor. The converted nitrogen
  // value is interpreted in g/kg, so compare against 1.5 and 3.0.
  if (nitrogenRaw < 1.5) nitrogen = 'Low';
  else if (nitrogenRaw > 3.0) nitrogen = 'High';

  const ph = phRaw;
  let phLabel: SoilRating['phLabel'] = 'Neutral';
  if (ph < 6.0) phLabel = 'Acidic';
  else if (ph > 7.5) phLabel = 'Alkaline';

  let organicCarbon: SoilRating['organicCarbon'] = 'Medium';
  if (soc != null) {
    if (soc < 5) organicCarbon = 'Low';
    else if (soc > 10) organicCarbon = 'High';
  }

  // getValue() already applied d_factor; converted texture values are percentages.
  const clayPct = clay;
  const sandPct = sand;
  const siltPct = silt;

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

// ---------- Nationwide recommendation engine ----------

export type CropRecommendation = {
  crop: Crop;
  score: number;
  reasons: string[];
  fertilizerBeforeSowing: string;
  fertilizerDuringGrowth: string;
};

// Normalize names so locations such as "Chikkamagaluru district" and
// "Chikkamagaluru" can match. Older spellings that OpenStreetMap may return
// are mapped to the names used in the crop tags.
const LOCATION_ALIASES: Record<string, string> = {
  chikmagalur: 'chikkamagaluru',
  chikkamagalur: 'chikkamagaluru',
  chickmagalur: 'chikkamagaluru',
  coorg: 'kodagu',
  shimoga: 'shivamogga',
  mysore: 'mysuru',
  tumkur: 'tumakuru',
  belgaum: 'belagavi',
  bellary: 'ballari',
  gulbarga: 'kalaburagi',
  bijapur: 'vijayapura',
  kasargod: 'kasaragod',
  orissa: 'odisha',
};

function normalizeLocation(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/district|state|division|region/g, '')
    .replace(/[^a-z]/g, '')
    .trim();
  return LOCATION_ALIASES[base] ?? base;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
];
const STATE_KEYS = new Set(INDIAN_STATES.map(normalizeLocation));

type RegionMatchLevel = 'district' | 'state' | 'none';

// A district-level tag means the crop is a known local specialty there. A
// state-level tag only means it is grown somewhere in the state, so it counts
// for much less. This stops state-wide tags from outranking true local crops.
function regionMatchLevel(crop: Crop, region: Region): RegionMatchLevel {
  if (!region || !crop.regions?.length) return 'none';
  const district = region.district ? normalizeLocation(region.district) : '';
  const state = region.state ? normalizeLocation(region.state) : '';
  let level: RegionMatchLevel = 'none';

  for (const rawTag of crop.regions) {
    const tag = normalizeLocation(rawTag);
    if (!tag) continue;
    if (STATE_KEYS.has(tag)) {
      if (state && state === tag) level = 'state';
    } else if (district && (district === tag || (tag.length >= 6 && district.includes(tag)))) {
      return 'district';
    }
  }
  return level;
}

function matchesCropGoal(crop: Crop, goal: CropGoal): boolean {
  const name = crop.name.toLowerCase();
  switch (goal) {
    case 'flowers':
      return name.includes('(flower)');
    case 'vegetables':
      return ['tomato', 'onion', 'capsicum', 'bell pepper', 'cucumber', 'lettuce', 'cherry tomato'].some((vegetable) => name.includes(vegetable));
    case 'fruits':
      return name.includes('(fruit)') || name.includes('coconut');
    case 'plantation':
      return crop.family === 'plantation';
    case 'field-crops':
      return ['cereal', 'legume', 'oilseed', 'cash'].includes(crop.family);
    case 'other':
    case 'any':
    default:
      return true;
  }
}

function scoreCrop(
  crop: Crop,
  soilRating: SoilRating | null,
  previousCropName: string,
  season: Season | undefined,
  region: Region
): { score: number; reasons: string[] } {
  const previousCrop = CROP_DATABASE.find(
    (item) => item.name.toLowerCase() === previousCropName.trim().toLowerCase()
  );
  const previousFamily = previousCrop?.family;
  let score = 0;
  const reasons: string[] = [];

  // Location is a strong signal, but it does not override poor soil/season fit.
  const matchLevel = regionMatchLevel(crop, region);
  if (matchLevel === 'district') {
    score += 10;
    reasons.push(`A well-known local crop in ${region?.district}`);
  } else if (matchLevel === 'state') {
    score += 4;
    reasons.push(`Grown in ${region?.state}, but not a district-level specialty here`);
  } else if (region && crop.regions?.length) {
    reasons.push('Regional match is not confirmed; check local crop suitability');
  }

  if (season) {
    if (crop.season === season || crop.season === 'both') {
      score += 3;
      reasons.push(crop.season === 'both' ? 'Can be grown across multiple seasons' : `Matches the selected ${season} season`);
    } else {
      score -= 6;
      reasons.push(`Listed mainly for ${crop.season}; verify local sowing dates for ${season}`);
    }
  }

  if (crop.name.toLowerCase() === previousCropName.trim().toLowerCase()) {
    score -= 10;
    reasons.push('Avoid repeating the exact same crop where rotation is practical');
  }

  if (previousFamily) {
    if (crop.goodAfter.includes(previousFamily)) {
      score += 3;
      reasons.push(`Rotation can work well after a ${previousFamily} crop`);
    }
    if (crop.family === previousFamily && crop.family !== 'plantation') {
      score -= 3;
      reasons.push('Consider rotating to a different crop family to support soil health');
    }
  }

  if (soilRating) {
    if (soilRating.ph >= crop.phMin && soilRating.ph <= crop.phMax) {
      score += 5;
      reasons.push(`Soil pH (${soilRating.ph.toFixed(1)}) is within the listed range (${crop.phMin}–${crop.phMax})`);
    } else {
      score -= 6;
      reasons.push(`Soil pH (${soilRating.ph.toFixed(1)}) is outside the listed range (${crop.phMin}–${crop.phMax})`);
    }

    if (crop.texture.includes(soilRating.texture)) {
      score += 3;
      reasons.push(`Matches the estimated ${soilRating.texture} soil texture`);
    } else {
      score -= 2;
      reasons.push(`The estimated ${soilRating.texture} texture is not the crop's listed preferred texture`);
    }

    if (soilRating.nitrogen === 'Low' && crop.nNeed === 'low') {
      score += 2;
      reasons.push('Lower nitrogen demand may suit the current soil reading');
    } else if (soilRating.nitrogen === 'High' && crop.nNeed === 'high') {
      score += 1;
      reasons.push('The crop has relatively high nitrogen demand');
    }

    if (soilRating.organicCarbon === 'Low') {
      reasons.push('Consider adding suitable organic matter and confirming nutrient needs with a soil test');
    }
  } else {
    reasons.push('Soil data is unavailable, so this ranking uses location, season and crop rotation only');
  }

  return { score, reasons };
}

function buildFertilizerNotes(crop: Crop, soilRating: SoilRating | null, manualTest?: ManualSoilTest) {
  const name = crop.name.toLowerCase();
  const isLegume =
    crop.family === 'legume' ||
    /soybean|moong|green gram|urad|black gram|chana|chickpea|pigeon pea|tur \(/i.test(crop.name);
  const isCereal = /rice|paddy|wheat|maize|bajra|pearl millet/i.test(crop.name);
  const isVegetable = /tomato|cherry tomato|capsicum|bell pepper|cucumber|lettuce|onion/i.test(crop.name);
  const isPlantation =
    crop.family === 'plantation' ||
    /coffee|arecanut|black pepper|cardamom|coconut|banana|papaya/i.test(crop.name);
  const isFlower = name.includes('(flower)');
  const isOilseed = crop.family === 'oilseed' || /groundnut|mustard/i.test(crop.name);
  const protectedCrop = crop.protectedCultivation === true;

  // Short, farmer-facing advice. Names are examples to discuss with a local
  // agriculture officer; exact fertilizer and dose must follow a soil test.
  let before = 'Before planting: add well-decomposed FYM or compost. Use a soil test to decide whether chemical fertilizer is needed.';
  let during = 'During growth: apply fertilizer only at the crop’s recommended stage and dose. Do not add extra fertilizer just by looking at the plant.';

  if (isLegume) {
    before = 'Before sowing: use well-decomposed FYM/compost. Ask for the correct Rhizobium seed treatment for this pulse; do not use extra urea by default.';
    during = 'During growth: pulses usually need less nitrogen. Use DAP/SSP or potash only if the soil-test recommendation calls for it.';
  } else if (isCereal) {
    before = 'Before sowing: mix well-decomposed FYM/compost into the soil. Urea, DAP/SSP and potash may be needed, depending on your soil test and local crop schedule.';
    during = 'During growth: if recommended, apply urea in split doses at the crop’s advised stages. Avoid applying just before heavy rain.';
  } else if (isVegetable) {
    before = 'Before planting: mix well-decomposed FYM/compost into the bed. Choose DAP/SSP, urea or potash only as advised by the soil test.';
    during = 'During growth: give small, stage-based fertilizer applications if recommended, especially during flowering and fruiting. Avoid excess urea.';
  } else if (isPlantation) {
    before = 'Before planting: add well-decomposed FYM/compost around the planting area. Fertilizer needs depend on the crop’s age and soil-test result.';
    during = 'During growth: apply the locally recommended fertilizer in split doses when the soil has moisture. Keep fertilizer away from direct contact with the stem.';
  } else if (isFlower) {
    before = 'Before planting: mix well-decomposed FYM/compost into well-drained soil. Use a flower-specific fertilizer only if recommended locally.';
    during = 'During growth: follow the fertilizer schedule for this flower. Too much urea can produce more leaves but fewer flowers in some crops.';
  } else if (isOilseed) {
    before = 'Before sowing: add well-decomposed FYM/compost. Choose DAP/SSP, potash or other nutrients according to the soil test; groundnut may also need calcium and sulphur.';
    during = 'During growth: apply only the nutrients recommended for this crop and stage. Do not add extra nitrogen to groundnut automatically.';
  }

  if (!soilRating) {
    before += ' No soil reading is available—get a soil test for N, P, K and pH before deciding the fertilizer quantity.';
  } else {
    if (soilRating.nitrogen === 'Low') {
      during += ' SoilGrids estimates low nitrogen; confirm with a soil test before increasing nitrogen or urea.';
    } else if (soilRating.nitrogen === 'High') {
      during += ' SoilGrids estimates high nitrogen; avoid adding extra urea unless a soil test and local advice recommend it.';
    }
    if (soilRating.organicCarbon === 'Low') {
      before += ' Organic carbon is estimated low, so well-decomposed FYM/compost may help improve the soil.';
    }
    if (soilRating.ph < crop.phMin || soilRating.ph > crop.phMax) {
      before += ` Soil pH may not suit this crop; confirm it with a laboratory test before using lime or other pH-changing materials.`;
    }
  }

  // Crop-specific (non-generic) notes from the crop database, e.g. substrate or fertigation advice.
  if (!/this app does not prescribe a universal dose/i.test(crop.fertilizer.beforeSowing)) {
    before += ` Crop note: ${crop.fertilizer.beforeSowing}`;
  }
  if (!/Base any top-dressing or fertigation on crop variety/i.test(crop.fertilizer.duringGrowth)) {
    during += ` Crop note: ${crop.fertilizer.duringGrowth}`;
  }

  // Real laboratory values entered by the farmer override satellite guesses.
  if (manualTest?.phosphorus != null) {
    const level = rateManualNutrient('phosphorus', manualTest.phosphorus);
    before +=
      level === 'Low'
        ? ' Your lab test shows low phosphorus, so a phosphorus source is justified; follow the dose in your lab report.'
        : level === 'High'
          ? ' Your lab test shows high phosphorus, so avoid adding phosphorus fertilizer unless your lab report says otherwise.'
          : ' Your lab test shows medium phosphorus; follow the maintenance advice in your lab report.';
  }
  if (manualTest?.potassium != null) {
    const level = rateManualNutrient('potassium', manualTest.potassium);
    before +=
      level === 'Low'
        ? ' Your lab test shows low potassium, so a potash source is justified; follow the dose in your lab report.'
        : level === 'High'
          ? ' Your lab test shows high potassium, so avoid adding potash unless your lab report says otherwise.'
          : ' Your lab test shows medium potassium; follow the maintenance advice in your lab report.';
  }

  if (protectedCrop) {
    before += ' For polyhouse/shade-net crops, test irrigation water and growing media before choosing fertilizer.';
    during += ' Use the protected-crop fertigation schedule; do not use open-field doses automatically.';
  }

  during += ' Exact fertilizer quantities need a laboratory soil test: SoilGrids does not give reliable available phosphorus and potassium values.';
  return { beforeSowing: before, duringGrowth: during };
}

// Broad climate screening bands for the app's curated crop list. These are
// approximate suitability ranges for ranking only, not district-level forecasts
// or agronomic prescriptions. Missing inputs do not penalize a crop.
const CLIMATE_PROFILES: Record<string, { tempMin: number; tempMax: number; rainMin: number; rainMax: number; altitudeMin?: number; altitudeMax?: number }> = {
  'Rice (Paddy)': { tempMin: 20, tempMax: 35, rainMin: 1000, rainMax: 2500, altitudeMin: 0, altitudeMax: 2000 },
  'Wheat': { tempMin: 10, tempMax: 25, rainMin: 300, rainMax: 1000, altitudeMin: 0, altitudeMax: 3000 },
  'Maize': { tempMin: 18, tempMax: 32, rainMin: 500, rainMax: 1200, altitudeMin: 0, altitudeMax: 2500 },
  'Bajra (Pearl Millet)': { tempMin: 25, tempMax: 35, rainMin: 250, rainMax: 750, altitudeMin: 0, altitudeMax: 1500 },
  'Cotton': { tempMin: 21, tempMax: 35, rainMin: 500, rainMax: 1200, altitudeMin: 0, altitudeMax: 1500 },
  'Sugarcane': { tempMin: 20, tempMax: 35, rainMin: 750, rainMax: 2500, altitudeMin: 0, altitudeMax: 1500 },
  'Mustard': { tempMin: 10, tempMax: 25, rainMin: 300, rainMax: 800, altitudeMin: 0, altitudeMax: 2500 },
  'Soybean': { tempMin: 20, tempMax: 30, rainMin: 450, rainMax: 1000, altitudeMin: 0, altitudeMax: 2000 },
  'Coffee (Arabica/Robusta)': { tempMin: 15, tempMax: 28, rainMin: 1000, rainMax: 2500, altitudeMin: 600, altitudeMax: 2000 },
  'Arecanut': { tempMin: 20, tempMax: 35, rainMin: 1500, rainMax: 4000, altitudeMin: 0, altitudeMax: 1000 },
  'Moong (Green Gram)': { tempMin: 25, tempMax: 35, rainMin: 300, rainMax: 800, altitudeMin: 0, altitudeMax: 2000 },
  'Urad (Black Gram)': { tempMin: 25, tempMax: 35, rainMin: 500, rainMax: 1200, altitudeMin: 0, altitudeMax: 2000 },
  'Chana (Chickpea)': { tempMin: 15, tempMax: 25, rainMin: 300, rainMax: 800, altitudeMin: 0, altitudeMax: 2500 },
  'Tur (Pigeon Pea / Arhar)': { tempMin: 20, tempMax: 35, rainMin: 600, rainMax: 1200, altitudeMin: 0, altitudeMax: 2000 },
  'Groundnut': { tempMin: 20, tempMax: 30, rainMin: 500, rainMax: 1000, altitudeMin: 0, altitudeMax: 1500 },
  'Tomato': { tempMin: 18, tempMax: 30, rainMin: 400, rainMax: 1200, altitudeMin: 0, altitudeMax: 2500 },
  'Onion': { tempMin: 13, tempMax: 25, rainMin: 350, rainMax: 800, altitudeMin: 0, altitudeMax: 2500 },
  'Marigold (Flower)': { tempMin: 18, tempMax: 30, rainMin: 600, rainMax: 1200, altitudeMin: 0, altitudeMax: 2000 },
  'Rose (Flower)': { tempMin: 15, tempMax: 28, rainMin: 500, rainMax: 1500, altitudeMin: 0, altitudeMax: 2500 },
  'Gerbera (Flower)': { tempMin: 15, tempMax: 28, rainMin: 500, rainMax: 1500, altitudeMin: 0, altitudeMax: 2500 },
  'Carnation (Flower)': { tempMin: 10, tempMax: 25, rainMin: 400, rainMax: 1200, altitudeMin: 0, altitudeMax: 3000 },
  'Chrysanthemum (Flower)': { tempMin: 15, tempMax: 25, rainMin: 400, rainMax: 1200, altitudeMin: 0, altitudeMax: 2500 },
  'Tuberose (Flower)': { tempMin: 20, tempMax: 30, rainMin: 600, rainMax: 1500, altitudeMin: 0, altitudeMax: 1500 },
  'Gladiolus (Flower)': { tempMin: 10, tempMax: 25, rainMin: 400, rainMax: 1200, altitudeMin: 0, altitudeMax: 3000 },
  'Jasmine (Flower)': { tempMin: 20, tempMax: 35, rainMin: 600, rainMax: 1500, altitudeMin: 0, altitudeMax: 1500 },
  'China Aster (Flower)': { tempMin: 15, tempMax: 25, rainMin: 400, rainMax: 1000, altitudeMin: 0, altitudeMax: 2500 },
  'Capsicum / Bell Pepper': { tempMin: 18, tempMax: 30, rainMin: 500, rainMax: 1200, altitudeMin: 0, altitudeMax: 2500 },
  'Cucumber (Protected)': { tempMin: 18, tempMax: 30, rainMin: 400, rainMax: 1000, altitudeMin: 0, altitudeMax: 2500 },
  'Cherry Tomato': { tempMin: 18, tempMax: 30, rainMin: 400, rainMax: 1200, altitudeMin: 0, altitudeMax: 2500 },
  'Lettuce (Protected)': { tempMin: 10, tempMax: 24, rainMin: 400, rainMax: 1000, altitudeMin: 0, altitudeMax: 3000 },
  'Papaya (Fruit)': { tempMin: 22, tempMax: 32, rainMin: 1000, rainMax: 2000, altitudeMin: 0, altitudeMax: 1500 },
  'Banana (Fruit)': { tempMin: 20, tempMax: 35, rainMin: 1000, rainMax: 2500, altitudeMin: 0, altitudeMax: 1500 },
  'Black Pepper': { tempMin: 20, tempMax: 32, rainMin: 1500, rainMax: 3000, altitudeMin: 0, altitudeMax: 1200 },
  'Cardamom': { tempMin: 15, tempMax: 25, rainMin: 1500, rainMax: 4000, altitudeMin: 600, altitudeMax: 1800 },
  'Coconut': { tempMin: 20, tempMax: 32, rainMin: 1000, rainMax: 2500, altitudeMin: 0, altitudeMax: 1000 },
};

const STRUCTURE_SUITABILITY: Record<string, Array<'naturally-ventilated-polyhouse' | 'climate-controlled-greenhouse' | 'shade-net'>> = {
  'Tomato': ['naturally-ventilated-polyhouse', 'climate-controlled-greenhouse'],
  'Cherry Tomato': ['naturally-ventilated-polyhouse', 'climate-controlled-greenhouse'],
  'Capsicum / Bell Pepper': ['naturally-ventilated-polyhouse', 'climate-controlled-greenhouse', 'shade-net'],
  'Cucumber (Protected)': ['naturally-ventilated-polyhouse', 'climate-controlled-greenhouse', 'shade-net'],
  'Lettuce (Protected)': ['climate-controlled-greenhouse', 'shade-net'],
  'Marigold (Flower)': ['naturally-ventilated-polyhouse', 'shade-net'],
  'Rose (Flower)': ['naturally-ventilated-polyhouse', 'climate-controlled-greenhouse'],
  'Gerbera (Flower)': ['naturally-ventilated-polyhouse', 'climate-controlled-greenhouse'],
  'Carnation (Flower)': ['naturally-ventilated-polyhouse', 'climate-controlled-greenhouse'],
  'Chrysanthemum (Flower)': ['naturally-ventilated-polyhouse', 'shade-net'],
};

const STRUCTURE_LABELS: Record<string, string> = {
  'naturally-ventilated-polyhouse': 'naturally ventilated polyhouse',
  'climate-controlled-greenhouse': 'climate-controlled greenhouse',
  'shade-net': 'shade-net house',
};

/** True for any protected-cultivation choice (polyhouse, greenhouse or shade-net). */
export function isProtectedSetup(setup: GrowingSetup): boolean {
  return setup !== 'open-field' && setup !== 'undecided';
}

/** Plain-language note on what each structure can and cannot do. */
export function getStructureNote(setup: GrowingSetup): string | null {
  switch (setup) {
    case 'naturally-ventilated-polyhouse':
      return 'Naturally ventilated polyhouse: low-cost, relies on side and roof vents, protects from rain and pests but cannot cool or heat. Works best where outside temperatures stay moderate.';
    case 'climate-controlled-greenhouse':
      return 'Climate-controlled greenhouse: fans, cooling pads or heating hold the temperature, so temperature-sensitive crops are possible, but set-up and running costs are high.';
    case 'shade-net':
      return 'Shade-net house: reduces sunlight and heat and gives partial pest protection, but gives little temperature control and no protection from cold.';
    case 'greenhouse':
      return 'Any protected structure: the list shows crops that can be grown under protection. Choose a specific structure type to narrow it further.';
    default:
      return null;
  }
}

function getStructureOptions(crop: Crop) {
  return crop.suitableStructures ?? STRUCTURE_SUITABILITY[crop.name] ?? [];
}

function applyClimateScoring(
  crop: Crop,
  climate: ClimateInputs | undefined,
  setup: GrowingSetup,
  score: number,
  reasons: string[]
): number {
  const profile = CLIMATE_PROFILES[crop.name];
  if (!profile || !climate) return score;
  let updated = score;
  // Rain does not reach crops inside a protected structure, and a climate-controlled
  // greenhouse also controls temperature, so those outside values are not used there.
  const skipRain = isProtectedSetup(setup);
  const skipTemp = setup === 'climate-controlled-greenhouse';
  const temp = climate.averageTemperatureC;
  if (!skipTemp && temp != null && Number.isFinite(temp)) {
    if (temp >= profile.tempMin && temp <= profile.tempMax) {
      updated += 3;
      reasons.push(`Entered average temperature (${temp}°C) is within a broad screening range (${profile.tempMin}–${profile.tempMax}°C)`);
    } else {
      updated -= 4;
      reasons.push(`Entered average temperature (${temp}°C) is outside the broad screening range (${profile.tempMin}–${profile.tempMax}°C); verify with local horticulture/agriculture guidance`);
    }
  }
  const rain = climate.annualRainfallMm;
  if (!skipRain && rain != null && Number.isFinite(rain)) {
    if (rain >= profile.rainMin && rain <= profile.rainMax) {
      updated += 2;
      reasons.push(`Entered annual rainfall (${rain} mm) is within a broad screening range (${profile.rainMin}–${profile.rainMax} mm)`);
    } else {
      updated -= 2;
      reasons.push(`Entered annual rainfall (${rain} mm) is outside a broad screening range (${profile.rainMin}–${profile.rainMax} mm); irrigation/drainage may change suitability`);
    }
  }
  const altitude = climate.altitudeM;
  if (altitude != null && Number.isFinite(altitude) && profile.altitudeMin != null && profile.altitudeMax != null) {
    if (altitude >= profile.altitudeMin && altitude <= profile.altitudeMax) {
      updated += 1;
      reasons.push(`Entered altitude (${altitude} m) is within a broad screening range (${profile.altitudeMin}–${profile.altitudeMax} m)`);
    } else {
      updated -= 1;
      reasons.push(`Entered altitude (${altitude} m) is outside the broad screening range; confirm local suitability`);
    }
  }
  return updated;
}

function scoreAllCrops(
  soilRating: SoilRating | null,
  previousCropName: string,
  season: Season | undefined,
  region: Region,
  goal: CropGoal,
  setup: GrowingSetup,
  climate?: ClimateInputs,
  manualTest?: ManualSoilTest
): CropRecommendation[] {
  const selectedCrops = CROP_DATABASE.filter((crop) => {
    if (!matchesCropGoal(crop, goal)) return false;
    if (setup === 'greenhouse' && crop.protectedCultivation !== true) return false;
    if (setup !== 'open-field' && setup !== 'undecided' && setup !== 'greenhouse') {
      if (!getStructureOptions(crop).includes(setup)) return false;
    }
    return true;
  });

  return selectedCrops.map((crop) => {
    const { score: baseScore, reasons } = scoreCrop(crop, soilRating, previousCropName, season, region);
    const score = applyClimateScoring(crop, climate, setup, baseScore, reasons);

    if (isProtectedSetup(setup)) {
      const options = getStructureOptions(crop).map((s) => STRUCTURE_LABELS[s]);
      if (options.length) reasons.push(`Can be grown in: ${options.join(', ')}`);
      if (setup === 'climate-controlled-greenhouse') {
        reasons.push('Temperature is controlled inside the greenhouse, so outside weather was not used for ranking');
      }
      if (
        setup === 'naturally-ventilated-polyhouse' &&
        climate?.averageTemperatureC != null &&
        climate.averageTemperatureC > 28
      ) {
        reasons.push('Outside temperatures are high; a naturally ventilated polyhouse can overheat in summer, so consider shade-net or cooling');
      }
    }

    const fertilizer = buildFertilizerNotes(crop, soilRating, manualTest);
    return {
      crop,
      score,
      reasons,
      fertilizerBeforeSowing: fertilizer.beforeSowing,
      fertilizerDuringGrowth: fertilizer.duringGrowth,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Ranks crops from the whole database for any Indian state/district instead of
 * forcing one crop from each category. Regional tags, season, soil and previous
 * crop all contribute to the ranking. The database is a curated starting list,
 * not a live government crop-statistics service; verify final decisions locally.
 */
export function recommendCrops(
  soilRating: SoilRating | null,
  previousCropName: string,
  season?: Season,
  region?: Region,
  goal: CropGoal = 'any',
  setup: GrowingSetup = 'undecided',
  climate?: ClimateInputs,
  manualTest?: ManualSoilTest
): CropRecommendation[] {
  const resolvedRegion = region ?? null;
  return scoreAllCrops(soilRating, previousCropName, season, resolvedRegion, goal, setup, climate, manualTest).slice(0, 5);
}

// Suggest a mixed-cropping pair only when both crops are in the recommendation list.
export function getMixedCroppingSuggestion(recommendations: CropRecommendation[]): string | null {
  for (const recommendation of recommendations) {
    for (const otherName of recommendation.crop.intercropsWith) {
      const matchingRecommendation = recommendations.find(
        (item) => item.crop.name.toLowerCase() === otherName.toLowerCase()
      );
      if (matchingRecommendation) {
        return `${recommendation.crop.name} and ${matchingRecommendation.crop.name} are listed as a possible intercrop pairing. Confirm spacing, water needs and local guidance before planting them together.`;
      }
    }
  }

  const pulse = recommendations.find((item) => item.crop.category === 'pulses');
  const major = recommendations.find((item) => item.crop.category === 'major');
  if (pulse && major) {
    return `A pulse such as ${pulse.crop.name} may be suitable for intercropping with ${major.crop.name}, depending on spacing, variety and local growing conditions. Confirm with your local agriculture officer or KVK.`;
  }
  return null;
}

// ---------- Nutrient deficiency corrective fertilizer lookup ----------
// Used by Disease Detector when Gemini identifies a likely nutrient deficiency.
// These are general corrective guidelines, not AI-generated quantities.

export const DEFICIENCY_FERTILIZER_MAP: Record<string, string> = {
  nitrogen: 'Possible nitrogen deficiency: confirm with soil/plant testing and rule out waterlogging, root damage or other causes. If confirmed, use a crop- and stage-specific nitrogen recommendation from your local KVK/agriculture department; avoid a universal urea dose.',
  phosphorus: 'Possible phosphorus deficiency: confirm with a soil test and check soil pH, because pH affects phosphorus availability. Apply a locally recommended phosphorus source and rate based on the crop and test result.',
  potassium: 'Possible potassium deficiency: confirm with soil testing before applying potash. Use a crop-specific rate based on the test result and growth stage.',
  zinc: 'Possible zinc deficiency: confirm the diagnosis before applying zinc. Soil or foliar treatment and concentration depend on crop, soil pH and local recommendations.',
  iron: 'Possible iron deficiency: check soil pH, drainage and root health; confirm the diagnosis before treatment. Corrective methods depend on crop and growing medium.',
  magnesium: 'Possible magnesium deficiency: confirm with soil/plant analysis and consider potassium/calcium balance before treatment. Use crop-specific local guidance.',
  boron: 'Possible boron deficiency: confirm with plant or soil analysis before treating, because boron is needed only in very small amounts and excess is harmful. Follow a crop-specific local recommendation.',
  sulphur: 'Possible sulphur deficiency: confirm with a soil test and select a sulphur source and rate according to the crop and local recommendation.',
};

export function getDeficiencyAdvice(nutrientKeyword: string): string | null {
  const key = Object.keys(DEFICIENCY_FERTILIZER_MAP).find((k) =>
    nutrientKeyword.toLowerCase().includes(k)
  );
  return key ? DEFICIENCY_FERTILIZER_MAP[key] : null;
}