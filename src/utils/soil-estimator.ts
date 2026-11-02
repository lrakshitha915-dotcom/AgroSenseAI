export type SoilTypeKey =
  | 'red_sandy_loam'
  | 'black_cotton'
  | 'laterite'
  | 'alluvial'
  | 'clay_loam'
  | 'sandy';

export type PredefinedSoil = {
  key: SoilTypeKey;
  nameEn: string;
  nameKn: string;
  descriptionEn: string;
  descriptionKn: string;
  properties: {
    nitrogen: number; // cg/kg
    phh2o: number; // pH * 10
    soc: number; // dg/kg
    clay: number; // g/kg (i.e. % * 10)
    sand: number; // g/kg
    silt: number; // g/kg
    cec: number; // mmol(c)/kg (i.e. cmol/kg * 10)
    bdod: number; // cg/cm3
  };
};

export const STANDARD_SOIL_PROFILES: Record<SoilTypeKey, PredefinedSoil> = {
  red_sandy_loam: {
    key: 'red_sandy_loam',
    nameEn: 'Red Sandy Loam',
    nameKn: 'ಕೆಂಪು ಮರಳು ಮಿಶ್ರಿತ ಮಣ್ಣು',
    descriptionEn: 'Common in Southern Karnataka (Mandya, Mysuru, Tumakuru, Kolar). Well-drained, moderate fertility.',
    descriptionKn: 'ದಕ್ಷಿಣ ಕರ್ನಾಟಕದಲ್ಲಿ ಸಾಮಾನ್ಯ (ಮಂಡ್ಯ, ಮೈಸೂರು, ತುಮಕೂರು, ಕೋಲಾರ). ಉತ್ತಮ ನೀರು ಬಸಿದುಹೋಗುವ ಮಣ್ಣು.',
    properties: {
      nitrogen: 145, // 1.45 g/kg
      phh2o: 65,    // 6.5 pH
      soc: 85,      // 8.5 g/kg
      clay: 220,    // 22%
      sand: 560,    // 56%
      silt: 220,    // 22%
      cec: 155,     // 15.5 cmol/kg
      bdod: 138,    // 1.38 kg/dm3
    },
  },
  black_cotton: {
    key: 'black_cotton',
    nameEn: 'Deep Black Cotton (Vertisol)',
    nameKn: 'ಕಪ್ಪು ಹತ್ತಿ ಮಣ್ಣು (ಕಪ್ಪು ಮಣ್ಣು)',
    descriptionEn: 'Found across Northern Karnataka (Belagavi, Dharwad, Vijayapura, Raichur). High clay & moisture retention.',
    descriptionKn: 'ಉತ್ತರ ಕರ್ನಾಟಕದಲ್ಲಿ ವ್ಯಾಪಕ (ಬೆಳಗಾವಿ, ಧಾರವಾಡ, ವಿಜಯಪುರ, ರಾಯಚೂರು). ತೇವಾಂಶ ಹಿಡಿದಿಟ್ಟುಕೊಳ್ಳುವ ಸಾಮರ್ಥ್ಯ ಅಧಿಕ.',
    properties: {
      nitrogen: 180, // 1.80 g/kg
      phh2o: 81,    // 8.1 pH (Mildly Alkaline)
      soc: 92,      // 9.2 g/kg
      clay: 480,    // 48% (High clay)
      sand: 240,    // 24%
      silt: 280,    // 28%
      cec: 380,     // 38.0 cmol/kg (High CEC)
      bdod: 145,    // 1.45 kg/dm3
    },
  },
  laterite: {
    key: 'laterite',
    nameEn: 'Laterite & Malnad Loam',
    nameKn: 'ಲ್ಯಾಟರೈಟ್ / ಮಲೆನಾಡು ಮುರಕಲ್ಲು ಮಣ್ಣು',
    descriptionEn: 'Western Ghats & Coastal Karnataka (Shivamogga, Chikkamagaluru, Kodagu, Udupi). Acidic, rich in organic matter.',
    descriptionKn: 'ಮಲೆನಾಡು ಮತ್ತು ಕರಾವಳಿ (ಶಿವಮೊಗ್ಗ, ಚಿಕ್ಕಮಗಳೂರು, ಕೊಡಗು, ಉಡುಪಿ). ಆಮ್ಲೀಯ ಗುಣ ಮತ್ತು ಸಾವಯವ ಇಂಗಾಲ ಸಮೃದ್ಧ.',
    properties: {
      nitrogen: 240, // 2.40 g/kg
      phh2o: 54,    // 5.4 pH (Acidic)
      soc: 165,     // 16.5 g/kg (High SOC)
      clay: 340,    // 34%
      sand: 400,    // 40%
      silt: 260,    // 26%
      cec: 180,     // 18.0 cmol/kg
      bdod: 132,    // 1.32 kg/dm3
    },
  },
  alluvial: {
    key: 'alluvial',
    nameEn: 'Alluvial River Valley Soil',
    nameKn: 'ಮೆಕ್ಕಲು ಮಣ್ಣು (ನದಿ ಪಾತ್ರ)',
    descriptionEn: 'River basins and fertile valleys (Cauvery, Krishna, Tungabhadra). Highly fertile, balanced texture.',
    descriptionKn: 'ಕಾವೇರಿ, ಕೃಷ್ಣಾ, ತುಂಗಭದ್ರಾ ನದಿ ಬಯಲು ಪ್ರದೇಶಗಳು. ಅತ್ಯಂತ ಫಲವತ್ತಾದ ಮಣ್ಣು.',
    properties: {
      nitrogen: 195, // 1.95 g/kg
      phh2o: 73,    // 7.3 pH (Neutral)
      soc: 110,     // 11.0 g/kg
      clay: 260,    // 26%
      sand: 380,    // 38%
      silt: 360,    // 36%
      cec: 220,     // 22.0 cmol/kg
      bdod: 130,    // 1.30 kg/dm3
    },
  },
  clay_loam: {
    key: 'clay_loam',
    nameEn: 'Clay Loam Soil',
    nameKn: 'ಜೇಡಿ ಮರಳು ಮಿಶ್ರಿತ ಮಣ್ಣು',
    descriptionEn: 'Medium-heavy soil with good water retention and balanced nutrients.',
    descriptionKn: 'ಉತ್ತಮ ನೀರು ಹಿಡಿದಿಟ್ಟುಕೊಳ್ಳುವ ಗುಣ ಮತ್ತು ಸಮತೋಲಿತ ಪೋಷಕಾಂಶಗಳ ಮಣ್ಣು.',
    properties: {
      nitrogen: 170, // 1.70 g/kg
      phh2o: 70,    // 7.0 pH
      soc: 100,     // 10.0 g/kg
      clay: 360,    // 36%
      sand: 320,    // 32%
      silt: 320,    // 32%
      cec: 240,     // 24.0 cmol/kg
      bdod: 140,    // 1.40 kg/dm3
    },
  },
  sandy: {
    key: 'sandy',
    nameEn: 'Sandy / Light Soil',
    nameKn: 'ಮರಳು / ಹಗುರ ಮಣ್ಣು',
    descriptionEn: 'Fast draining, aerated, ideal for groundnut, watermelon, and tuber crops.',
    descriptionKn: 'ಬೇಗನೆ ನೀರು ಬಸಿಯುವ ಮಣ್ಣು, ಕಡಲೆಕಾಯಿ, ಕಲ್ಲಂಗಡಿ ಮತ್ತು ಗೆಡ್ಡೆ ಬೆಳೆಗಳಿಗೆ ಸೂಕ್ತ.',
    properties: {
      nitrogen: 95,  // 0.95 g/kg
      phh2o: 68,    // 6.8 pH
      soc: 45,      // 4.5 g/kg
      clay: 120,    // 12%
      sand: 760,    // 76%
      silt: 120,    // 12%
      cec: 85,      // 8.5 cmol/kg
      bdod: 155,    // 1.55 kg/dm3
    },
  },
};

/**
 * Builds the exact SoilGrids v2 JSON response structure
 * so interpretSoilData() can consume it identically.
 */
export function buildSoilGridsCompatiblePayload(
  props: PredefinedSoil['properties'],
  sourceTag: string,
  extraMeta?: { soilTypeKey?: SoilTypeKey; regionName?: string }
) {
  const layer = (name: string, raw: number, mapped: string, target: string, f: number) => ({
    name,
    unit_measure: { mapped_units: mapped, target_units: target, d_factor: f },
    depths: [{ label: '0-5cm', values: { mean: raw } }],
  });

  return {
    isEstimated: true,
    source: sourceTag,
    soilTypeKey: extraMeta?.soilTypeKey,
    regionName: extraMeta?.regionName,
    properties: {
      layers: [
        layer('nitrogen', props.nitrogen, 'cg/kg', 'g/kg', 100),
        layer('phh2o', props.phh2o, 'pH*10', 'pH', 10),
        layer('soc', props.soc, 'dg/kg', 'g/kg', 10),
        layer('clay', props.clay, 'g/kg', '%', 10),
        layer('sand', props.sand, 'g/kg', '%', 10),
        layer('silt', props.silt, 'g/kg', '%', 10),
        layer('cec', props.cec, 'mmol(c)/kg', 'cmol(c)/kg', 10),
        layer('bdod', props.bdod, 'cg/cm3', 'kg/dm3', 100),
      ],
    },
  };
}

/**
 * Estimates soil characteristics using regional Indian agro-climatic databases
 * and coordinates when the remote SoilGrids server is busy or down.
 */
export function estimateRegionalSoil(
  district?: string,
  state?: string,
  lat?: number,
  lng?: number
): { payload: any; soilType: PredefinedSoil; regionDescription: string } {
  const d = (district || '').toLowerCase();
  const s = (state || '').toLowerCase();

  let matchedTypeKey: SoilTypeKey = 'red_sandy_loam';
  let regionDesc = 'Regional Agro-Climatic Soil Profile';

  // 1. Northern Karnataka Black Soil Belt
  const northKarnatakaDistricts = [
    'belagavi', 'belgaum', 'dharwad', 'vijayapura', 'bijapur', 'bagalkot',
    'kalaburagi', 'gulbarga', 'raichur', 'koppal', 'gadag', 'ballari',
    'bellary', 'yadgir', 'bidar'
  ];
  // 2. Malnad & Western Ghats Laterite Belt
  const malnadDistricts = [
    'shivamogga', 'shimoga', 'chikkamagaluru', 'chikmagalur', 'kodagu',
    'coorg', 'hassan', 'dakshina kannada', 'south canara', 'mangalore',
    'mangaluru', 'udupi', 'uttara kannada', 'karwar'
  ];
  // 3. Central Transition
  const centralDistricts = ['davangere', 'haveri', 'chitradurga'];
  // 4. Southern Dry Zone Red Sandy Loam
  const southDistricts = [
    'mandya', 'mysuru', 'mysore', 'ramanagara', 'tumakuru', 'tumkur',
    'kolar', 'chikkaballapura', 'bengaluru', 'bangalore', 'chamarajanagar'
  ];

  if (northKarnatakaDistricts.some((name) => d.includes(name))) {
    matchedTypeKey = 'black_cotton';
    regionDesc = 'Northern Karnataka Dry Zone (Deep Black Soil)';
  } else if (malnadDistricts.some((name) => d.includes(name))) {
    matchedTypeKey = 'laterite';
    regionDesc = 'Western Ghats / Malnad Zone (Laterite Loam)';
  } else if (centralDistricts.some((name) => d.includes(name))) {
    matchedTypeKey = 'alluvial';
    regionDesc = 'Central Karnataka Transition Zone (Fertile Loam)';
  } else if (southDistricts.some((name) => d.includes(name))) {
    matchedTypeKey = 'red_sandy_loam';
    regionDesc = 'Southern Karnataka Zone (Red Sandy Loam)';
  } else if (s.includes('maharashtra')) {
    matchedTypeKey = 'black_cotton';
    regionDesc = 'Deccan Plateau (Black Cotton Soil)';
  } else if (s.includes('punjab') || s.includes('haryana') || s.includes('uttar pradesh')) {
    matchedTypeKey = 'alluvial';
    regionDesc = 'Indo-Gangetic Basin (Alluvial Loam)';
  } else if (s.includes('kerala')) {
    matchedTypeKey = 'laterite';
    regionDesc = 'Coastal & Highland Laterite Soil';
  } else if (lat != null && lng != null) {
    // Coordinate-based interpolation across India
    if (lat > 14.8 && lat < 21.0 && lng > 74.0 && lng < 78.5) {
      matchedTypeKey = 'black_cotton';
      regionDesc = 'Deccan & North Karnataka Region (Black Soil)';
    } else if (lat > 11.5 && lat <= 14.8 && lng > 74.0 && lng < 76.0) {
      matchedTypeKey = 'laterite';
      regionDesc = 'Coastal & Ghats Region (Laterite)';
    } else if (lat > 23.0 && lat < 31.0 && lng > 74.0 && lng < 88.0) {
      matchedTypeKey = 'alluvial';
      regionDesc = 'River Plains (Alluvial Soil)';
    } else {
      matchedTypeKey = 'red_sandy_loam';
      regionDesc = 'Southern Agro-Climatic Zone (Red Loam)';
    }
  }

  const soilType = STANDARD_SOIL_PROFILES[matchedTypeKey];
  const payload = buildSoilGridsCompatiblePayload(
    soilType.properties,
    'regional_agro_estimate',
    { soilTypeKey: matchedTypeKey, regionName: regionDesc }
  );

  return { payload, soilType, regionDescription: regionDesc };
}

export function getSoilPayloadForType(key: SoilTypeKey) {
  const soilType = STANDARD_SOIL_PROFILES[key] || STANDARD_SOIL_PROFILES.red_sandy_loam;
  return buildSoilGridsCompatiblePayload(
    soilType.properties,
    'standard_preset',
    { soilTypeKey: key, regionName: soilType.nameEn }
  );
}
