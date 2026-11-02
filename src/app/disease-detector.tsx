import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VoiceTextInput } from '@/components/voice-text-input';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useFarm } from '@/context/farm-context';
import { useLanguage } from '@/context/language-context';
import { CROP_DATABASE, getDeficiencyAdvice, interpretSoilData } from '@/utils/crop-logic';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Confirmed free-tier as of writing. If you verify gemini-3.6-flash shows
// "Free tier" for YOUR account in AI Studio, you can switch to it instead.
// If the first model is overloaded (503) even after retries, the next one is tried.
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

type Category =
  | 'Disease'
  | 'Pest'
  | 'Nutrient Deficiency'
  | 'Environmental Stress'
  | 'Healthy'
  | 'Uncertain';

type AnalysisResult = {
  category: Category;
  condition: string;
  confidence: number;
  alternative: string;
  severity: string;
  symptoms: string;
  treatment: string;
  prevention: string;
  deficiencyNutrient?: string; // set only when category is Nutrient Deficiency
};

export default function DiseaseDetectorScreen() {
  const { language, t } = useLanguage();
  const { soilData, previousCrop, incrementScansDone } = useFarm();

  const [cropName, setCropName] = useState(previousCrop || '');
  const [customCropName, setCustomCropName] = useState('');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [rawFallback, setRawFallback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function pickImage(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError('Permission denied. Enable camera/gallery access in your phone settings.');
      return;
    }

    const pickerResult = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6 });

    if (!pickerResult.canceled && pickerResult.assets?.[0]) {
      setImageUri(pickerResult.assets[0].uri);
      setImageBase64(pickerResult.assets[0].base64 ?? null);
      setResult(null);
      setRawFallback('');
      setError('');
    }
  }

  function buildSoilContext() {
    const rating = interpretSoilData(soilData);
    if (!rating) return '';

    return `Field soil context: Nitrogen ${rating.nitrogen}, pH ${rating.ph.toFixed(
      1
    )} (${rating.phLabel}), texture ${rating.texture}. `;
  }

  async function analyzeImage() {
    if (!imageBase64) {
      setError('Take or select a photo first.');
      return;
    }

    if (!cropName.trim()) {
      setError('Select or type the plant/crop name for a more accurate diagnosis.');
      return;
    }

    if (!GEMINI_API_KEY) {
      setError('Missing Gemini API key. Check your .env file and restart the app.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setRawFallback('');

    const prompt = `You are an expert plant pathologist helping an Indian farmer. Examine this plant photo.

The plant/crop is: ${cropName}. ${buildSoilContext()}

Classify what you see and respond with ONLY valid JSON (no markdown, no code fences, no extra text) matching this exact shape:

{
  "category": one of "Disease" | "Pest" | "Nutrient Deficiency" | "Environmental Stress" | "Healthy" | "Uncertain",
  "condition": short name of the specific disease/pest/deficiency, or "Healthy" or "Image unclear",
  "confidence": a number 0-100 for how confident you are,
  "alternative": a second possible explanation if confidence is below 80, otherwise empty string,
  "severity": "Mild" | "Moderate" | "Severe" | "N/A",
  "symptoms": what you observe in the photo, 1-2 sentences,
  "treatment": practical treatment steps including common Indian brand names for fungicide/pesticide where relevant. If category is "Nutrient Deficiency", do NOT include exact fertilizer quantities here — just name the likely nutrient.
  "prevention": how to avoid this next season, 1-2 sentences,
  "deficiencyNutrient": if category is "Nutrient Deficiency", the single nutrient name (e.g. "nitrogen", "zinc", "potassium"), otherwise empty string
}

If the photo is unclear or doesn't show a plant well enough to diagnose, set category to "Uncertain" and confidence below 40 rather than guessing.`;

    try {
      const doFetch = (model: string) => fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY as string,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      // Google sometimes returns 503 (model busy) or 429 (rate limit).
      // Retry each model a few times, then fall back to the next model.
      let response: Response | null = null;
      for (const model of GEMINI_MODELS) {
        for (let attempt = 0; attempt < 3; attempt++) {
          response = await doFetch(model);
          if (response.status !== 503 && response.status !== 429) break;
          console.log(`Gemini ${model} busy (${response.status}), retry ${attempt + 1}/3...`);
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
        // Stop when this model answered, or failed for a reason another model cannot fix.
        if (response && response.status !== 503 && response.status !== 429 && response.status !== 404) break;
        console.log(`Gemini ${model} unavailable (${response?.status}), trying next model...`);
      }

      if (!response || !response.ok) {
        if (!response) throw new Error('No response');
        const errText = await response.text();
        throw new Error(errText);
      }

      const data = await response.json();
      const text: string =
        data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      try {
        const cleaned = text.replace(/```json|```/g, '').trim();
        const parsed: AnalysisResult = JSON.parse(cleaned);
        setResult(parsed);
        incrementScansDone();
      } catch {
        setRawFallback(text || 'No response generated. Try a clearer photo.');
      }
    } catch (err: any) {
      console.log('Gemini analysis error:', err.message);
      const busy = /"code":\s*(503|429)|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(String(err.message));
      setError(
        busy
          ? "Google's AI service is busy right now. Please wait a minute and try again."
          : 'Could not analyze photo. Check your API key, internet connection, and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  const deficiencyDose = result?.deficiencyNutrient
    ? getDeficiencyAdvice(result.deficiencyNutrient)
    : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={styles.backButton}>‹ Back</ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            Disease Detector
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} />
          ) : (
            <View style={styles.placeholder}>
              <ThemedText style={styles.placeholderText}>
                📷 No photo yet
              </ThemedText>
            </View>
          )}

          <ThemedText type="small" style={styles.sectionTitle}>
            WHICH PLANT IS THIS?
          </ThemedText>

          <View style={styles.chipRow}>
            {CROP_DATABASE.map((crop) => (
              <Pressable
                key={crop.name}
                style={[
                  styles.chip,
                  cropName === crop.name && styles.chipSelected,
                ]}
                onPress={() => {
                  setCropName(crop.name);
                  setCustomCropName('');
                  setError('');
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    cropName === crop.name && styles.chipTextSelected,
                  ]}
                >
                  {crop.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.customRow}>
            <VoiceTextInput
              style={styles.customInput}
              placeholder={
                language === 'kn'
                  ? 'ಅಥವಾ ಬೆಳೆಯ ಹೆಸರು ಹೇಳಿ / ಟೈಪ್ ಮಾಡಿ...'
                  : 'Or type / speak crop name...'
              }
              placeholderTextColor="#999"
              value={customCropName}
              onChangeText={(text) => {
                setCustomCropName(text);
                setCropName(text);
                setError('');
              }}
              voiceCategory="crop"
              voiceTitle={language === 'kn' ? 'ಬೆಳೆಯ ಹೆಸರು ಹೇಳಿ' : 'Speak Plant / Crop Name'}
              returnKeyType="done"
            />
          </View>

          {cropName ? (
            <ThemedText type="small" style={styles.selectedCropText}>
              Selected: {cropName}
            </ThemedText>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable
              style={styles.pickButton}
              onPress={() => pickImage(true)}
            >
              <ThemedText style={styles.pickButtonText}>
                Take Photo
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.pickButton}
              onPress={() => pickImage(false)}
            >
              <ThemedText style={styles.pickButtonText}>
                Choose from Gallery
              </ThemedText>
            </Pressable>
          </View>

          {imageUri && (
            <Pressable
              style={styles.analyzeButton}
              onPress={analyzeImage}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.analyzeButtonText}>
                  Analyze Plant
                </ThemedText>
              )}
            </Pressable>
          )}

          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}

          {result && (
            <View style={styles.reportCard}>
              <View style={styles.resultHeaderRow}>
                <ThemedText style={styles.categoryBadge}>
                  {result.category}
                </ThemedText>

                <ThemedText style={styles.confidenceText}>
                  {result.confidence}% confident
                </ThemedText>
              </View>

              <ThemedText style={styles.conditionName}>
                {result.condition}
              </ThemedText>

              {result.confidence < 60 && (
                <View style={styles.lowConfidenceWarning}>
                  <ThemedText style={styles.lowConfidenceText}>
                    ⚠️ Low confidence — take a clearer, closer photo of the
                    affected leaf/area for a more reliable result. Don't apply
                    treatment based on this alone.
                  </ThemedText>
                </View>
              )}

              {result.alternative ? (
                <ThemedText style={styles.altText}>
                  Could also be: {result.alternative}
                </ThemedText>
              ) : null}

              {result.category !== 'Healthy' && (
                <>
                  <ThemedText style={styles.fieldLabel}>
                    Severity
                  </ThemedText>

                  <ThemedText style={styles.fieldValue}>
                    {result.severity}
                  </ThemedText>

                  <ThemedText style={styles.fieldLabel}>
                    Symptoms Observed
                  </ThemedText>

                  <ThemedText style={styles.fieldValue}>
                    {result.symptoms}
                  </ThemedText>

                  <ThemedText style={styles.fieldLabel}>
                    Treatment
                  </ThemedText>

                  <ThemedText style={styles.fieldValue}>
                    {result.treatment}
                  </ThemedText>

                  {deficiencyDose && (
                    <View style={styles.doseCard}>
                      <ThemedText style={styles.doseTitle}>
                        🌾 Corrective Fertilizer Dose
                      </ThemedText>

                      <ThemedText style={styles.doseText}>
                        {deficiencyDose}
                      </ThemedText>
                    </View>
                  )}

                  <ThemedText style={styles.fieldLabel}>
                    Prevention
                  </ThemedText>

                  <ThemedText style={styles.fieldValue}>
                    {result.prevention}
                  </ThemedText>
                </>
              )}
            </View>
          )}

          {rawFallback ? (
            <View style={styles.reportCard}>
              <ThemedText style={styles.reportText}>
                {rawFallback}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.disclaimerCard}>
            <ThemedText type="small" style={styles.disclaimerText}>
              AI-generated diagnosis is a starting guide, not a substitute for
              expert confirmation. For valuable crops or uncertain cases,
              confirm with your local KVK or agriculture extension officer
              before applying chemical treatments.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

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

  preview: {
    width: '100%',
    height: 260,
    borderRadius: Spacing.two,
    backgroundColor: '#000',
  },

  placeholder: {
    width: '100%',
    height: 260,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(128,128,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    opacity: 0.5,
    fontSize: 16,
  },

  sectionTitle: {
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

  customRow: {
    flexDirection: 'row',
  },

  customInput: {
    flex: 1,
    height: 42,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(128,128,128,0.1)',
    fontSize: 14,
  },

  selectedCropText: {
    opacity: 0.6,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },

  pickButton: {
    flex: 1,
    backgroundColor: '#1565C0',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },

  pickButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },

  analyzeButton: {
    backgroundColor: '#C62828',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },

  analyzeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  errorText: {
    color: '#e53935',
    textAlign: 'center',
  },

  reportCard: {
    backgroundColor: 'rgba(128,128,128,0.08)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: 4,
  },

  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  categoryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },

  confidenceText: {
    fontSize: 12,
    opacity: 0.6,
  },

  conditionName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 4,
  },

  lowConfidenceWarning: {
    backgroundColor: 'rgba(249, 168, 37, 0.2)',
    borderRadius: Spacing.two,
    padding: Spacing.two,
    marginVertical: Spacing.two,
  },

  lowConfidenceText: {
    fontSize: 12,
    lineHeight: 18,
  },

  altText: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
    marginBottom: Spacing.two,
  },

  fieldLabel: {
    fontWeight: '700',
    fontSize: 13,
    marginTop: Spacing.two,
  },

  fieldValue: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },

  doseCard: {
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
    borderRadius: Spacing.two,
    padding: Spacing.two,
    marginTop: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D32',
  },

  doseTitle: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },

  doseText: {
    fontSize: 13,
    lineHeight: 19,
  },

  reportText: {
    fontSize: 14,
    lineHeight: 22,
  },

  disclaimerCard: {
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },

  disclaimerText: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
});