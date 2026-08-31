import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useFarm } from '@/context/farm-context';
import {
  CropCategory,
  CropRecommendation,
  getMixedCroppingSuggestion,
  interpretSoilData,
  recommendCrops,
  Season
} from '@/utils/crop-logic';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SEASONS: { label: string; value: Season }[] = [
  { label: 'Kharif (Monsoon)', value: 'kharif' },
  { label: 'Rabi (Winter)', value: 'rabi' },
  { label: 'Zaid (Summer)', value: 'zaid' },
];

const CATEGORY_LABELS: Record<CropCategory, string> = {
  pulses: '🫘 PULSES',
  major: '🌾 MAJOR / CASH CROP',
  horticulture: '🍅 VEGETABLE / FRUIT / FLOWER / SPICE',
};

export default function CropAdvisorScreen() {
  const { soilData, previousCrop, region, incrementCropsTracked } = useFarm();
  const [season, setSeason] = useState<Season>('kharif');
  const [recommendations, setRecommendations] = useState<CropRecommendation[]>([]);
  const [mixedCropTip, setMixedCropTip] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const soilRating = interpretSoilData(soilData);

  function generateRecommendations() {
    const results = recommendCrops(soilRating, previousCrop, season, region);
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

          <Pressable style={styles.generateButton} onPress={generateRecommendations}>
            <ThemedText style={styles.generateButtonText}>Get Crop Recommendations</ThemedText>
          </Pressable>

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
                  <ThemedText style={styles.fertilizerSectionTitle}>🌱 Before Sowing</ThemedText>
                  <ThemedText style={styles.fertilizerValue}>{rec.fertilizerBeforeSowing}</ThemedText>
                </View>

                <View style={styles.fertilizerSection}>
                  <ThemedText style={styles.fertilizerSectionTitle}>🌿 During Growth</ThemedText>
                  <ThemedText style={styles.fertilizerValue}>{rec.fertilizerDuringGrowth}</ThemedText>
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
                These are general starting estimates based on standard agronomy guidelines and
                satellite soil data. For a precise fertilizer plan, get a soil test done at your
                nearest Krishi Vigyan Kendra (KVK) or agriculture office.
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