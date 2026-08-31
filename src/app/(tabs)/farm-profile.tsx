import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useFarm } from '@/context/farm-context';
import { CROP_DATABASE } from '@/utils/crop-logic';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FarmProfileScreen() {
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
            Farm Profile
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            This helps AgroSense AI give you better crop and rotation advice.
          </ThemedText>

          <ThemedText type="small" style={styles.sectionTitle}>
            WHAT DID YOU GROW LAST SEASON?
          </ThemedText>

          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, previousCrop === '' && styles.chipSelected]}
              onPress={() => setPreviousCrop('')}
            >
              <ThemedText style={[styles.chipText, previousCrop === '' && styles.chipTextSelected]}>
                None / First Season
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
            OR TYPE YOUR CROP
          </ThemedText>
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              placeholder="e.g. Turmeric, Jowar, Sesame..."
              placeholderTextColor="#999"
              value={customCrop}
              onChangeText={setCustomCrop}
              onSubmitEditing={submitCustomCrop}
              returnKeyType="done"
            />
            <Pressable style={styles.addButton} onPress={submitCustomCrop}>
              <ThemedText style={styles.addButtonText}>Save</ThemedText>
            </Pressable>
          </View>

          {previousCrop !== '' && (
            <View style={styles.confirmCard}>
              <ThemedText style={styles.confirmText}>
                ✓ Saved — your last crop was <ThemedText style={styles.confirmBold}>{previousCrop}</ThemedText>.
                Crop Advisor will use this automatically.
              </ThemedText>
            </View>
          )}

          <View style={styles.statusCard}>
            <ThemedText style={styles.statusLabel}>Soil data status</ThemedText>
            <ThemedText type="small" style={styles.statusValue}>
              {soilData ? '✓ Loaded from Soil Map tab' : 'Not loaded yet — visit the Soil Map tab'}
            </ThemedText>
          </View>

          <ThemedText type="small" style={styles.sectionTitle}>
            HAVE A LAB SOIL TEST REPORT?
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Satellite data can't measure Phosphorus, Potassium, or Calcium accurately. If you
            don't have a soil test report, that's completely fine — leave these blank and
            AgroSense AI will use standard regional fertilizer guidelines instead. This section
            is only for extra precision if you happen to have the numbers.
          </ThemedText>
          <View style={styles.infoCard}>
            <ThemedText type="small" style={styles.infoText}>
              💡 Don't have a soil test? Most states offer free or subsidized testing through
              your nearest Krishi Vigyan Kendra (KVK) or the Soil Health Card scheme — ask your
              local agriculture office.
            </ThemedText>
          </View>

          <View style={styles.testRow}>
            <ThemedText style={styles.testLabel}>Phosphorus (P) — kg/ha</ThemedText>
            <TextInput
              style={styles.testInput}
              placeholder="e.g. 18"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={manualSoilTest.phosphorus?.toString() ?? ''}
              onChangeText={(text) =>
                setManualSoilTest({ ...manualSoilTest, phosphorus: text ? Number(text) : undefined })
              }
            />
          </View>

          <View style={styles.testRow}>
            <ThemedText style={styles.testLabel}>Potassium (K) — kg/ha</ThemedText>
            <TextInput
              style={styles.testInput}
              placeholder="e.g. 150"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={manualSoilTest.potassium?.toString() ?? ''}
              onChangeText={(text) =>
                setManualSoilTest({ ...manualSoilTest, potassium: text ? Number(text) : undefined })
              }
            />
          </View>

          <View style={styles.testRow}>
            <ThemedText style={styles.testLabel}>Calcium (Ca) — ppm</ThemedText>
            <TextInput
              style={styles.testInput}
              placeholder="e.g. 1200"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={manualSoilTest.calcium?.toString() ?? ''}
              onChangeText={(text) =>
                setManualSoilTest({ ...manualSoilTest, calcium: text ? Number(text) : undefined })
              }
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
  },
  customRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  customInput: {
    flex: 1,
    height: 42,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(128,128,128,0.1)',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#1565C0',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  confirmCard: {
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D32',
    marginTop: Spacing.two,
  },
  confirmText: {
    fontSize: 13,
    lineHeight: 19,
  },
  confirmBold: {
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: 'rgba(128,128,128,0.08)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
  statusLabel: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 2,
  },
  statusValue: {
    opacity: 0.7,
  },
  testRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  testLabel: {
    flex: 1,
    fontSize: 13,
  },
  testInput: {
    width: 100,
    height: 38,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    backgroundColor: 'rgba(128,128,128,0.1)',
    fontSize: 14,
    textAlign: 'right',
  },
  infoCard: {
    backgroundColor: 'rgba(21, 101, 192, 0.1)',
    borderRadius: Spacing.two,
    padding: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: '#1565C0',
  },
  infoText: {
    lineHeight: 18,
  },
});