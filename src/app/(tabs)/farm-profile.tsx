import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VoiceTextInput } from '@/components/voice-text-input';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useFarm } from '@/context/farm-context';
import { useLanguage } from '@/context/language-context';
import { CROP_DATABASE } from '@/utils/crop-logic';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FarmProfileScreen() {
  const { language, t } = useLanguage();
  const { previousCrop, setPreviousCrop, soilData, manualSoilTest, setManualSoilTest } = useFarm();
  const [customCrop, setCustomCrop] = useState('');

  function submitCustomCrop() {
    const trimmed = customCrop.trim();
    if (trimmed) {
      setPreviousCrop(trimmed);
      setCustomCrop('');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            {t('farmProfileTitle')}
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            {t('farmProfileSubtitle')}
          </ThemedText>

          <ThemedText type="small" style={styles.sectionTitle}>
            {t('lastSeasonCrop')}
          </ThemedText>

          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, previousCrop === '' && styles.chipSelected]}
              onPress={() => setPreviousCrop('')}
            >
              <ThemedText style={[styles.chipText, previousCrop === '' && styles.chipTextSelected]}>
                {t('noneFirstSeason')}
              </ThemedText>
            </Pressable>
            {CROP_DATABASE.map((crop) => (
              <Pressable
                key={crop.name}
                style={[styles.chip, previousCrop === crop.name && styles.chipSelected]}
                onPress={() => setPreviousCrop(crop.name)}
              >
                <ThemedText
                  style={[styles.chipText, previousCrop === crop.name && styles.chipTextSelected]}
                >
                  {crop.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" style={styles.sectionTitle}>
            {t('orTypeCrop')}
          </ThemedText>
          <View style={styles.customRow}>
            <View style={{ flex: 1 }}>
              <VoiceTextInput
                style={styles.customInput}
                placeholder={t('cropPlaceholder')}
                placeholderTextColor="#999"
                value={customCrop}
                onChangeText={setCustomCrop}
                onSubmitEditing={submitCustomCrop}
                returnKeyType="done"
                voiceCategory="crop"
                voiceTitle={language === 'kn' ? 'ಬೆಳೆಯ ಹೆಸರು ಹೇಳಿ' : 'Speak Crop Name'}
              />
            </View>
            <Pressable style={styles.addButton} onPress={submitCustomCrop}>
              <ThemedText style={styles.addButtonText}>{t('save')}</ThemedText>
            </Pressable>
          </View>

          {previousCrop !== '' && (
            <View style={styles.confirmCard}>
              <ThemedText style={styles.confirmText}>
                {t('savedConfirm')}{' '}
                <ThemedText style={styles.confirmBold}>{previousCrop}</ThemedText>.
              </ThemedText>
            </View>
          )}

          <View style={styles.statusCard}>
            <ThemedText style={styles.statusLabel}>{t('soilDataStatus')}</ThemedText>
            <ThemedText type="small" style={styles.statusValue}>
              {soilData ? t('soilLoaded') : t('soilNotLoaded')}
            </ThemedText>
          </View>

          <ThemedText type="small" style={styles.sectionTitle}>
            {language === 'kn'
              ? 'ಪ್ರಯೋಗಾಲಯ ಮಣ್ಣು ಪರೀಕ್ಷಾ ವರದಿ ಇದೆಯೇ?'
              : 'HAVE A LAB SOIL TEST REPORT?'}
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            {language === 'kn'
              ? 'ಉಪಗ್ರಹ ದತ್ತಾಂಶವು ರಂಜಕ ಮತ್ತು ಪೊಟ್ಯಾಶ್ ಅನ್ನು ಅಳೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ. ವರದಿ ಇಲ್ಲದಿದ್ದರೆ ಇವುಗಳನ್ನು ಖಾಲಿ ಬಿಡಿ — ಆಗ್ರೋಸೆನ್ಸ್ ಎಐ ಪ್ರಾದೇಶಿಕ ಮಾರ್ಗಸೂಚಿಗಳನ್ನು ಬಳಸುತ್ತದೆ.'
              : "Satellite data can't measure Phosphorus, Potassium, or Calcium accurately. If you don't have a soil test report, leave these blank and AgroSense AI will use regional guidelines."}
          </ThemedText>
          <View style={styles.infoCard}>
            <ThemedText type="small" style={styles.infoText}>
              {language === 'kn'
                ? '💡 ಸೂಚನೆ: ನಿಮ್ಮ ಹತ್ತಿರದ ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರ (KVK) ಅಥವಾ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರದಲ್ಲಿ ಮಣ್ಣು ಪರೀಕ್ಷೆ ಮಾಡಿಸಬಹುದು.'
                : '💡 Tip: Free or subsidized testing is available through your nearest Krishi Vigyan Kendra (KVK) or Soil Health Card scheme.'}
            </ThemedText>
          </View>

          <View style={styles.testRow}>
            <ThemedText style={styles.testLabel}>
              {language === 'kn' ? 'ರಂಜಕ (Phosphorus - P) — kg/ha' : 'Phosphorus (P) — kg/ha'}
            </ThemedText>
            <VoiceTextInput
              style={styles.testInput}
              placeholder="e.g. 18"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={manualSoilTest.phosphorus?.toString() ?? ''}
              onChangeText={(text) =>
                setManualSoilTest({ ...manualSoilTest, phosphorus: text ? Number(text) : undefined })
              }
              voiceCategory="number"
              voiceTitle={language === 'kn' ? 'ರಂಜಕ ಪ್ರಮಾಣ ಹೇಳಿ (kg/ha)' : 'Speak Phosphorus (kg/ha)'}
            />
          </View>

          <View style={styles.testRow}>
            <ThemedText style={styles.testLabel}>
              {language === 'kn' ? 'ಪೊಟ್ಯಾಶ್ (Potassium - K) — kg/ha' : 'Potassium (K) — kg/ha'}
            </ThemedText>
            <VoiceTextInput
              style={styles.testInput}
              placeholder="e.g. 150"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={manualSoilTest.potassium?.toString() ?? ''}
              onChangeText={(text) =>
                setManualSoilTest({ ...manualSoilTest, potassium: text ? Number(text) : undefined })
              }
              voiceCategory="number"
              voiceTitle={language === 'kn' ? 'ಪೊಟ್ಯಾಶ್ ಪ್ರಮಾಣ ಹೇಳಿ (kg/ha)' : 'Speak Potassium (kg/ha)'}
            />
          </View>

          <View style={styles.testRow}>
            <ThemedText style={styles.testLabel}>
              {language === 'kn' ? 'ಕ್ಯಾಲ್ಸಿಯಂ (Calcium - Ca) — ppm' : 'Calcium (Ca) — ppm'}
            </ThemedText>
            <VoiceTextInput
              style={styles.testInput}
              placeholder="e.g. 1200"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={manualSoilTest.calcium?.toString() ?? ''}
              onChangeText={(text) =>
                setManualSoilTest({ ...manualSoilTest, calcium: text ? Number(text) : undefined })
              }
              voiceCategory="number"
              voiceTitle={language === 'kn' ? 'ಕ್ಯಾಲ್ಸಿಯಂ ಪ್ರಮಾಣ ಹೇಳಿ (ppm)' : 'Speak Calcium (ppm)'}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    opacity: 0.6,
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
    fontWeight: '600',
  },
  customRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  customInput: {
    height: 44,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  addButton: {
    backgroundColor: '#2E7D32',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  confirmCard: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D32',
  },
  confirmText: {
    fontSize: 13,
    color: '#2E7D32',
  },
  confirmBold: {
    fontWeight: '700',
    color: '#2E7D32',
  },
  statusCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    backgroundColor: 'rgba(128,128,128,0.08)',
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '600',
  },
  statusValue: {
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#FFF9C4',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderLeftWidth: 3,
    borderLeftColor: '#FBC02D',
  },
  infoText: {
    color: '#7F6000',
    lineHeight: 18,
  },
  testRow: {
    gap: Spacing.one,
  },
  testLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  testInput: {
    height: 44,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
});