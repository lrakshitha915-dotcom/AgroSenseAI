import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useFarm } from '@/context/farm-context';
import {
  ClimateInputs,
  CROP_DATABASE,
  CropCategory,
  CropGoal,
  CropRecommendation,
  getMixedCroppingSuggestion,
  GrowingSetup,
  interpretSoilData,
  recommendCrops,
  Season
} from '@/utils/crop-logic';
import { getApproximateCropFertilizerPlan, getSoilBasedFertilizerGuidance, NutrientStatus } from '@/utils/fertilizer-calculator';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SEASONS: { label: string; value: Season }[] = [
  { label: 'Kharif (Monsoon)', value: 'kharif' },
  { label: 'Rabi (Winter)', value: 'rabi' },
  { label: 'Zaid (Summer)', value: 'zaid' },
];

const FARMER_GOALS: { label: string; value: CropGoal }[] = [
  { label: 'Any crop', value: 'any' },
  { label: 'Flowers', value: 'flowers' },
  { label: 'Vegetables', value: 'vegetables' },
  { label: 'Fruits', value: 'fruits' },
  { label: 'Plantation crops', value: 'plantation' },
  { label: 'Cereals & pulses', value: 'field-crops' },
  { label: 'Other / not sure', value: 'other' },
];

const GROWING_SETUPS: { label: string; value: GrowingSetup }[] = [
  { label: 'Open field', value: 'open-field' },
  { label: 'Naturally ventilated polyhouse', value: 'naturally-ventilated-polyhouse' },
  { label: 'Climate-controlled greenhouse', value: 'climate-controlled-greenhouse' },
  { label: 'Shade-net structure', value: 'shade-net' },
  { label: 'Not decided', value: 'undecided' },
];

const CATEGORY_LABELS: Record<CropCategory, string> = {
  pulses: '🫘 PULSES',
  major: '🌾 MAJOR / CASH CROP',
  horticulture: '🍅 VEGETABLE / FRUIT / FLOWER / SPICE',
};

export default function CropAdvisorScreen() {
  const { soilData, previousCrop, region, incrementCropsTracked } = useFarm();
  const [season, setSeason] = useState<Season>('kharif');
  const [cropGoal, setCropGoal] = useState<CropGoal>('any');
  const [growingSetup, setGrowingSetup] = useState<GrowingSetup>('undecided');
  const [averageTemperature, setAverageTemperature] = useState('');
  const [annualRainfall, setAnnualRainfall] = useState('');
  const [altitude, setAltitude] = useState('');
  const [farmAreaAcres, setFarmAreaAcres] = useState('1');
  const [irrigation, setIrrigation] = useState<'rainfed' | 'irrigated'>('rainfed');
  const [soilPhosphorus, setSoilPhosphorus] = useState('');
  const [soilPotassium, setSoilPotassium] = useState('');
  const [hasCropInMind, setHasCropInMind] = useState<boolean | null>(null);
  const [plannedCropText, setPlannedCropText] = useState('');
  const [plannedCrop, setPlannedCrop] = useState<(typeof CROP_DATABASE)[number] | null>(null);
  const [plannedSearched, setPlannedSearched] = useState(false);
  const [recommendations, setRecommendations] = useState<CropRecommendation[]>([]);
  const [mixedCropTip, setMixedCropTip] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const soilRating = interpretSoilData(soilData);

  function findPlannedCrop() {
    const q = plannedCropText.trim().toLowerCase();
    const match = q
      ? CROP_DATABASE.find((c) => c.name.toLowerCase() === q) ??
        CROP_DATABASE.find((c) => c.name.toLowerCase().includes(q))
      : undefined;
    setPlannedCrop(match ?? null);
    setPlannedSearched(true);
  }

  function generateRecommendations() {
    const climate: ClimateInputs = {
      ...(averageTemperature.trim() && Number.isFinite(Number(averageTemperature))
        ? { averageTemperatureC: Number(averageTemperature) } : {}),
      ...(annualRainfall.trim() && Number.isFinite(Number(annualRainfall))
        ? { annualRainfallMm: Number(annualRainfall) } : {}),
      ...(altitude.trim() && Number.isFinite(Number(altitude))
        ? { altitudeM: Number(altitude) } : {}),
    };
    const hasClimateInput = Object.keys(climate).length > 0;
    const results = recommendCrops(soilRating, previousCrop, season, region, cropGoal, growingSetup, hasClimateInput ? climate : undefined);
    setRecommendations(results);
    setMixedCropTip(getMixedCroppingSuggestion(results));
    setHasGenerated(true);
    incrementCropsTracked();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={styles.backButton}>‹ Back</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.title}>
            Crop Advisor
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {region && (
            <View style={styles.soilCard}>
              <ThemedText style={styles.soilCardTitle}>Location</ThemedText>
              <ThemedText style={styles.soilRow}>
                {[region.district, region.state].filter(Boolean).join(', ')}
              </ThemedText>
            </View>
          )}

          {soilRating ? (
            <View style={styles.soilCard}>
              <ThemedText style={styles.soilCardTitle}>Your Soil Reading</ThemedText>
              <ThemedText style={styles.soilRow}>
                Nitrogen: {soilRating.nitrogen} · pH: {soilRating.ph.toFixed(1)} ({soilRating.phLabel}) ·
                Texture: {soilRating.texture}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.warningCard}>
              <ThemedText type="small" style={styles.warningText}>
                No soil data loaded. Visit the Soil Map tab and fetch data first for a soil-matched
                recommendation — you can still get general season/rotation advice without it.
              </ThemedText>
            </View>
          )}

          <View style={styles.soilCard}>
            <ThemedText style={styles.soilCardTitle}>Previous Crop</ThemedText>
            <ThemedText style={styles.soilRow}>
              {previousCrop || 'None set — visit the Farm Profile tab to set this for better recommendations'}
            </ThemedText>
          </View>

          <ThemedText type="small" style={styles.sectionTitle}>
            WHAT ARE YOU PLANNING TO GROW?
          </ThemedText>
          <ThemedText style={styles.helperText}>
            Choose the type of crop you are interested in. You can change this anytime.
          </ThemedText>
          <View style={styles.chipRow}>
            {FARMER_GOALS.map((goal) => (
              <Pressable
                key={goal.value}
                style={[styles.chip, cropGoal === goal.value && styles.chipSelected]}
                onPress={() => setCropGoal(goal.value)}
              >
                <ThemedText style={[styles.chipText, cropGoal === goal.value && styles.chipTextSelected]}>
                  {goal.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" style={styles.sectionTitle}>
            HOW WILL YOU GROW IT?
          </ThemedText>
          <View style={styles.chipRow}>
            {GROWING_SETUPS.map((setup) => (
              <Pressable
                key={setup.value}
                style={[styles.chip, growingSetup === setup.value && styles.chipSelected]}
                onPress={() => setGrowingSetup(setup.value)}
              >
                <ThemedText style={[styles.chipText, growingSetup === setup.value && styles.chipTextSelected]}>
                  {setup.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {growingSetup !== 'open-field' && growingSetup !== 'undecided' && (
            <View style={styles.warningCard}>
              <ThemedText type="small" style={styles.warningText}>
                This filters to crops marked as potential candidates for the selected structure. It is a preliminary screen, not a construction or investment recommendation. Ventilation, temperature control, light, water quality, disease pressure and local crop guidance still matter.
              </ThemedText>
            </View>
          )}

          <ThemedText type="small" style={styles.sectionTitle}>
            OPTIONAL LOCAL CLIMATE DETAILS
          </ThemedText>
          <ThemedText style={styles.helperText}>
            Enter values if you know them. Leave any field blank if unsure. These broad ranges only adjust ranking; they are not live weather readings or a substitute for local agronomy advice.
          </ThemedText>
          <View style={styles.climateInputsRow}>
            <View style={styles.climateInputGroup}>
              <ThemedText type="small" style={styles.climateLabel}>Average temperature (°C)</ThemedText>
              <TextInput
                value={averageTemperature}
                onChangeText={setAverageTemperature}
                keyboardType="decimal-pad"
                placeholder="e.g. 25"
                placeholderTextColor="#888"
                style={styles.climateInput}
                accessibilityLabel="Average temperature in degrees Celsius"
              />
            </View>
            <View style={styles.climateInputGroup}>
              <ThemedText type="small" style={styles.climateLabel}>Annual rainfall (mm)</ThemedText>
              <TextInput
                value={annualRainfall}
                onChangeText={setAnnualRainfall}
                keyboardType="number-pad"
                placeholder="e.g. 900"
                placeholderTextColor="#888"
                style={styles.climateInput}
                accessibilityLabel="Annual rainfall in millimeters"
              />
            </View>
            <View style={styles.climateInputGroup}>
              <ThemedText type="small" style={styles.climateLabel}>Altitude (m)</ThemedText>
              <TextInput
                value={altitude}
                onChangeText={setAltitude}
                keyboardType="number-pad"
                placeholder="e.g. 800"
                placeholderTextColor="#888"
                style={styles.climateInput}
                accessibilityLabel="Altitude in meters above sea level"
              />
            </View>
          </View>

          <ThemedText type="small" style={styles.sectionTitle}>
            FARM DETAILS FOR FERTILIZER PLANNING
          </ThemedText>
          <ThemedText style={styles.helperText}>
            Enter your cultivated area and water source. If you have a soil-lab report, add its available phosphorus and potassium values in kg/ha. Leave them blank if you do not know them.
          </ThemedText>
          <View style={styles.climateInputsRow}>
            <View style={styles.climateInputGroup}>
              <ThemedText type="small" style={styles.climateLabel}>Farm area (acres)</ThemedText>
              <TextInput value={farmAreaAcres} onChangeText={setFarmAreaAcres} keyboardType="decimal-pad" placeholder="e.g. 2.5" placeholderTextColor="#888" style={styles.climateInput} accessibilityLabel="Farm area in acres" />
            </View>
            <View style={styles.climateInputGroup}>
              <ThemedText type="small" style={styles.climateLabel}>Soil-test phosphorus (kg/ha)</ThemedText>
              <TextInput value={soilPhosphorus} onChangeText={setSoilPhosphorus} keyboardType="decimal-pad" placeholder="Optional" placeholderTextColor="#888" style={styles.climateInput} accessibilityLabel="Soil test phosphorus in kilograms per hectare" />
            </View>
            <View style={styles.climateInputGroup}>
              <ThemedText type="small" style={styles.climateLabel}>Soil-test potassium (kg/ha)</ThemedText>
              <TextInput value={soilPotassium} onChangeText={setSoilPotassium} keyboardType="decimal-pad" placeholder="Optional" placeholderTextColor="#888" style={styles.climateInput} accessibilityLabel="Soil test potassium in kilograms per hectare" />
            </View>
          </View>
          <ThemedText type="small" style={styles.climateLabel}>Water availability</ThemedText>
          <View style={styles.chipRow}>
            {[{ label: 'Rainfed', value: 'rainfed' as const }, { label: 'Irrigated', value: 'irrigated' as const }].map((item) => (
              <Pressable key={item.value} style={[styles.chip, irrigation === item.value && styles.chipSelected]} onPress={() => setIrrigation(item.value)}>
                <ThemedText style={[styles.chipText, irrigation === item.value && styles.chipTextSelected]}>{item.label}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" style={styles.helperText}>
            Optional: enter phosphorus and potassium from a laboratory soil report. Leave blank if you do not have the report.
          </ThemedText>

          <ThemedText type="small" style={styles.sectionTitle}>
            CURRENT SEASON
          </ThemedText>
          <View style={styles.chipRow}>
            {SEASONS.map((s) => (
              <Pressable
                key={s.value}
                style={[styles.chip, season === s.value && styles.chipSelected]}
                onPress={() => setSeason(s.value)}
              >
                <ThemedText style={[styles.chipText, season === s.value && styles.chipTextSelected]}>
                  {s.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" style={styles.sectionTitle}>
            DO YOU ALREADY HAVE A CROP IN MIND?
          </ThemedText>
          <View style={styles.chipRow}>
            {[{ label: 'Yes, I have a crop', value: true }, { label: 'No, suggest crops', value: false }].map((o) => (
              <Pressable
                key={o.label}
                style={[styles.chip, hasCropInMind === o.value && styles.chipSelected]}
                onPress={() => {
                  setHasCropInMind(o.value);
                  setPlannedSearched(false);
                  setPlannedCrop(null);
                }}
              >
                <ThemedText style={[styles.chipText, hasCropInMind === o.value && styles.chipTextSelected]}>{o.label}</ThemedText>
              </Pressable>
            ))}
          </View>

          {hasCropInMind === true && (
            <View style={{ gap: Spacing.two }}>
              <TextInput
                value={plannedCropText}
                onChangeText={(t) => {
                  setPlannedCropText(t);
                  setPlannedSearched(false);
                }}
                placeholder="Type the crop, e.g. Tomato, Maize, Rice"
                placeholderTextColor="#888"
                style={styles.climateInput}
                accessibilityLabel="Crop you plan to grow"
              />
              <Pressable style={styles.generateButton} onPress={findPlannedCrop}>
                <ThemedText style={styles.generateButtonText}>Get Fertilizer Suggestions</ThemedText>
              </Pressable>

              {plannedSearched && !plannedCrop && (
                <View style={styles.warningCard}>
                  <ThemedText type="small" style={styles.warningText}>
                    This crop is not in the app's database yet. Check the spelling, or choose “No, suggest crops”.
                  </ThemedText>
                </View>
              )}

              {plannedCrop && (
                <View style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <ThemedText style={styles.resultRank}>YOUR PLANNED CROP</ThemedText>
                    <ThemedText style={styles.resultCropName}>{plannedCrop.name}</ThemedText>
                  </View>
                  <View style={styles.fertilizerSection}>
                    <ThemedText style={styles.fertilizerSectionTitle}>🌱 Fertilizer tips</ThemedText>
                    {(() => {
                      const pValue = Number(soilPhosphorus);
                      const kValue = Number(soilPotassium);
                      const pStatus = soilPhosphorus.trim() && Number.isFinite(pValue)
                        ? (pValue < 10 ? 'low' : pValue <= 25 ? 'medium' : 'high') as NutrientStatus
                        : 'unknown' as NutrientStatus;
                      const kStatus = soilPotassium.trim() && Number.isFinite(kValue)
                        ? (kValue < 120 ? 'low' : kValue <= 280 ? 'medium' : 'high') as NutrientStatus
                        : 'unknown' as NutrientStatus;
                      const guidance = getSoilBasedFertilizerGuidance({
                        phosphorus: pStatus,
                        potassium: kStatus,
                      }, plannedCrop.name, {
                        soilNitrogen: soilRating?.nitrogen,
                        phLabel: soilRating?.phLabel,
                        texture: soilRating?.texture,
                        cropFamily: plannedCrop.family,
                        nitrogenNeed: plannedCrop.nNeed,
                      });
                      return (
                        <View style={styles.soilGuidanceBox}>
                          <ThemedText style={styles.fertilizerValue}>{guidance.summary}</ThemedText>
                          {guidance.suggestions.map((suggestion, i) => (
                            <ThemedText key={i} style={styles.reasonText}>• {suggestion}</ThemedText>
                          ))}
                          <ThemedText style={styles.helperText}>{guidance.caution}</ThemedText>
                        </View>
                      );
                    })()}
                    {(() => {
                      const area = Number(farmAreaAcres);
                      const plan = getApproximateCropFertilizerPlan(plannedCrop.name, area);
                      if (!plan) {
                        return <ThemedText style={styles.helperText}>No prototype quantity is available for this crop yet. Follow local crop guidance.</ThemedText>;
                      }
                      const fmt = (r: { min: number; max: number }) => `${r.min}–${r.max} kg`;
                      return (
                        <View style={styles.soilGuidanceBox}>
                          <ThemedText style={styles.fertilizerSectionTitle}>Approximate quantity (demo)</ThemedText>
                          <ThemedText style={styles.fertilizerValue}>Per acre: Urea {fmt(plan.productsPerAcre.urea)} · DAP {fmt(plan.productsPerAcre.dap)} · MOP/Potash {fmt(plan.productsPerAcre.mop)}</ThemedText>
                          <ThemedText style={styles.fertilizerValue}>For {area} acre(s): Urea {fmt(plan.productsForArea.urea)} · DAP {fmt(plan.productsForArea.dap)} · MOP/Potash {fmt(plan.productsForArea.mop)}</ThemedText>
                          <ThemedText style={styles.helperText}>{plan.note}</ThemedText>
                        </View>
                      );
                    })()}
                  </View>
                  <View style={styles.fertilizerSection}>
                    <ThemedText style={styles.fertilizerSectionTitle}>🌱 Before sowing</ThemedText>
                    <ThemedText style={styles.fertilizerValue}>{plannedCrop.fertilizer.beforeSowing}</ThemedText>
                  </View>
                  <View style={styles.fertilizerSection}>
                    <ThemedText style={styles.fertilizerSectionTitle}>🌿 During growth</ThemedText>
                    <ThemedText style={styles.fertilizerValue}>{plannedCrop.fertilizer.duringGrowth}</ThemedText>
                  </View>
                </View>
              )}
            </View>
          )}

          <Pressable style={styles.generateButton} onPress={generateRecommendations}>
            <ThemedText style={styles.generateButtonText}>Get Crop Recommendations</ThemedText>
          </Pressable>

          {hasGenerated && recommendations.length === 0 && (
            <View style={styles.warningCard}>
              <ThemedText style={styles.warningText}>
                No crops in the current database match this combination yet. Try another crop interest or choose “Not decided” for growing setup.
              </ThemedText>
            </View>
          )}

          {hasGenerated &&
            recommendations.map((rec, idx) => (
              <View key={rec.crop.name} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <ThemedText style={styles.resultRank}>
                    #{idx + 1} · {CATEGORY_LABELS[rec.crop.category]}
                  </ThemedText>
                  <ThemedText style={styles.resultCropName}>{rec.crop.name}</ThemedText>
                </View>

                {rec.reasons.length > 0 && (
                  <View style={styles.reasonsBox}>
                    {rec.reasons.map((reason, i) => (
                      <ThemedText key={i} style={styles.reasonText}>
                        • {reason}
                      </ThemedText>
                    ))}
                  </View>
                )}

                <View style={styles.fertilizerSection}>
                  <ThemedText style={styles.fertilizerSectionTitle}>🌱 Fertilizer tips</ThemedText>
                  {(() => {
                    const pValue = Number(soilPhosphorus);
                    const kValue = Number(soilPotassium);
                    const pStatus = soilPhosphorus.trim() && Number.isFinite(pValue)
                      ? (pValue < 10 ? 'low' : pValue <= 25 ? 'medium' : 'high') as NutrientStatus
                      : 'unknown' as NutrientStatus;
                    const kStatus = soilPotassium.trim() && Number.isFinite(kValue)
                      ? (kValue < 120 ? 'low' : kValue <= 280 ? 'medium' : 'high') as NutrientStatus
                      : 'unknown' as NutrientStatus;
                    const guidance = getSoilBasedFertilizerGuidance({
                      phosphorus: pStatus,
                      potassium: kStatus,
                    }, rec.crop.name, {
                      soilNitrogen: soilRating?.nitrogen,
                      phLabel: soilRating?.phLabel,
                      texture: soilRating?.texture,
                      cropFamily: rec.crop.family,
                      nitrogenNeed: rec.crop.nNeed,
                    });
                    return (
                      <View style={styles.soilGuidanceBox}>
                        <ThemedText style={styles.fertilizerValue}>{guidance.summary}</ThemedText>
                        {guidance.suggestions.map((suggestion, i) => (
                          <ThemedText key={i} style={styles.reasonText}>• {suggestion}</ThemedText>
                        ))}
                        <ThemedText style={styles.helperText}>{guidance.caution}</ThemedText>
                      </View>
                    );
                  })()}
                  <ThemedText style={styles.fertilizerValue}>
                    Area: {Number.isFinite(Number(farmAreaAcres)) && Number(farmAreaAcres) > 0 ? `${Number(farmAreaAcres)} acre(s)` : 'enter a valid area'} · {irrigation === 'rainfed' ? 'Rainfed' : 'Irrigated'}
                  </ThemedText>
                  {(() => {
                    const area = Number(farmAreaAcres);
                    const plan = getApproximateCropFertilizerPlan(rec.crop.name, area);
                    if (!plan) {
                      return <ThemedText style={styles.helperText}>No prototype quantity is available for this crop yet. Follow local crop guidance.</ThemedText>;
                    }
                    const fmt = (r: { min: number; max: number }) => `${r.min}–${r.max} kg`;
                    return (
                      <View style={styles.soilGuidanceBox}>
                        <ThemedText style={styles.fertilizerSectionTitle}>Approximate quantity (demo)</ThemedText>
                        <ThemedText style={styles.fertilizerValue}>Per acre: Urea {fmt(plan.productsPerAcre.urea)} · DAP {fmt(plan.productsPerAcre.dap)} · MOP/Potash {fmt(plan.productsPerAcre.mop)}</ThemedText>
                        <ThemedText style={styles.fertilizerValue}>For {area} acre(s): Urea {fmt(plan.productsForArea.urea)} · DAP {fmt(plan.productsForArea.dap)} · MOP/Potash {fmt(plan.productsForArea.mop)}</ThemedText>
                        <ThemedText style={styles.helperText}>{plan.note}</ThemedText>
                      </View>
                    );
                  })()}
                </View>

                <View style={styles.fertilizerSection}>
                  <ThemedText style={styles.fertilizerSectionTitle}>🌱 Before sowing</ThemedText>
                  <ThemedText style={styles.fertilizerValue}>
                    {rec.crop.family === 'legume'
                      ? 'Mix in well-rotted compost if available. Use the seed/soil-test based starter fertilizer advised locally.'
                      : rec.crop.family === 'plantation'
                        ? 'Add compost around the root zone if needed; avoid placing fertilizer against the stem.'
                        : rec.crop.family === 'horticulture'
                          ? 'Mix mature compost into the planting area. Choose basal fertilizer from the soil test and crop guidance.'
                          : 'Mix mature compost into the soil if available. Apply basal fertilizer only as advised for this crop and soil.'}
                  </ThemedText>
                </View>

                <View style={styles.fertilizerSection}>
                  <ThemedText style={styles.fertilizerSectionTitle}>🌿 During growth</ThemedText>
                  <ThemedText style={styles.fertilizerValue}>
                    {rec.crop.family === 'legume'
                      ? 'Avoid heavy nitrogen top-dressing. Check crop growth and nodulation before adding more.'
                      : rec.crop.nNeed === 'high'
                        ? `Split nitrogen for ${rec.crop.name} across suitable growth stages; water after application when appropriate.`
                        : rec.crop.nNeed === 'low'
                          ? `Avoid excess nitrogen for ${rec.crop.name}. Add nutrients only if the crop plan or a confirmed deficiency calls for them.`
                          : `Check ${rec.crop.name} growth and apply any top-dressing at the crop-recommended stage; do not add extra by guesswork.`}
                  </ThemedText>
                </View>
              </View>
            ))}
          {hasGenerated && mixedCropTip && (
            <View style={styles.mixedCard}>
              <ThemedText style={styles.mixedTitle}>🌻 Mixed Cropping Suggestion</ThemedText>
              <ThemedText style={styles.mixedText}>{mixedCropTip}</ThemedText>
            </View>
          )}

          {hasGenerated && (
            <View style={styles.disclaimerCard}>
              <ThemedText type="small" style={styles.disclaimerText}>
                Crop suggestions use your location, season and available soil data. Displayed fertilizer quantities are provisional prototype ranges, not verified recommendations. Confirm crop-, district- and soil-specific doses with a soil-test report or local agriculture officer before applying.
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  backButton: {
    fontSize: 16,
    color: '#2E7D32',
  },
  title: {
    fontSize: 20,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  soilCard: {
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D32',
  },
  soilCardTitle: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  soilRow: {
    fontSize: 13,
    opacity: 0.85,
  },
  warningCard: {
    backgroundColor: 'rgba(249, 168, 37, 0.15)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderLeftWidth: 3,
    borderLeftColor: '#F9A825',
  },
  warningText: {
    opacity: 0.85,
  },
  sectionTitle: {
    marginTop: Spacing.two,
    opacity: 0.6,
    letterSpacing: 1,
  },
  helperText: {
    fontSize: 13,
    opacity: 0.75,
    marginTop: -Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chipSelected: {
    backgroundColor: '#2E7D32',
  },
  chipText: {
    fontSize: 13,
    color: '#2E7D32',
  },
  chipTextSelected: {
    color: '#fff',
  },
  climateInputsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  climateInputGroup: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 95,
    gap: 4,
  },
  nutrientStatusRow: { gap: Spacing.one, marginBottom: Spacing.two },
  soilGuidanceBox: { marginTop: Spacing.two, padding: Spacing.two, borderRadius: Spacing.two, backgroundColor: 'rgba(46, 125, 50, 0.08)', gap: Spacing.two },
  climateLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  climateInput: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.5)',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    color: '#222',
    backgroundColor: 'rgba(255,255,255,0.9)',
    minHeight: 42,
  },
  generateButton: {
    backgroundColor: '#2E7D32',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  generateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: 'rgba(128,128,128,0.08)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.two,
    gap: 4,
  },
  resultHeader: {
    marginBottom: Spacing.two,
  },
  resultRank: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 1,
  },
  resultCropName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  reasonsBox: {
    marginBottom: Spacing.two,
  },
  reasonText: {
    fontSize: 13,
    opacity: 0.75,
    marginBottom: 2,
  },
  fertilizerSection: {
    marginTop: Spacing.two,
    backgroundColor: 'rgba(128,128,128,0.06)',
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  fertilizerSectionTitle: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  fertilizerValue: {
    fontSize: 13,
    lineHeight: 19,
  },
  mixedCard: {
    backgroundColor: 'rgba(249, 168, 37, 0.15)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: '#F9A825',
  },
  mixedTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  mixedText: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.9,
  },
  disclaimerCard: {
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  disclaimerText: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
});