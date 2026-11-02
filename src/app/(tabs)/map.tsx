import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VoiceTextInput } from '@/components/voice-text-input';
import { Spacing } from '@/constants/theme';
import { useFarm } from '@/context/farm-context';
import { useLanguage } from '@/context/language-context';
import {
  estimateRegionalSoil,
  getSoilPayloadForType,
  SoilTypeKey,
  STANDARD_SOIL_PROFILES,
} from '@/utils/soil-estimator';

import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polygon, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

const CACHE_PREFIX = 'soilgrids_cache_v1:';
const cacheKey = (lat: number, lon: number) => `${CACHE_PREFIX}${lat.toFixed(2)},${lon.toFixed(2)}`;

const INDIA_REGION: Region = {
  latitude: 22.5937,
  longitude: 78.9629,
  latitudeDelta: 15,
  longitudeDelta: 15,
};

export default function MapScreen() {
  const { language, t } = useLanguage();
  const [drawMode, setDrawMode] = useState(false);
  const [rectangle, setRectangle] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [startPoint, setStartPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const [soilData, setSoilData] = useState<any>(null);
  const [loadingSoil, setLoadingSoil] = useState(false);
  const [soilError, setSoilError] = useState('');
  const [soilNote, setSoilNote] = useState('');
  const [soilSourceTag, setSoilSourceTag] = useState<string>('');
  const [lastCenter, setLastCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showSoilTypeModal, setShowSoilTypeModal] = useState(false);

  // --- Address search state ---
  const [address, setAddress] = useState('');
  const [searchedPoint, setSearchedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  const {
    region: sharedRegion,
    setSoilData: setSharedSoilData,
    setLatitude: setSharedLatitude,
    setRegion: setSharedRegion,
    incrementFarmsMapped,
  } = useFarm();

  function handleMapPress(e: any) {
    if (!drawMode) return;
    const coord = e.nativeEvent.coordinate;

    if (!startPoint) {
      setStartPoint(coord);
      setRectangle(null);
    } else {
      const rect = [
        { latitude: startPoint.latitude, longitude: startPoint.longitude },
        { latitude: startPoint.latitude, longitude: coord.longitude },
        { latitude: coord.latitude, longitude: coord.longitude },
        { latitude: coord.latitude, longitude: startPoint.longitude },
      ];
      setRectangle(rect);
      setStartPoint(null);
      setDrawMode(false);
    }
  }

  function toggleDrawMode() {
    setStartPoint(null);
    setDrawMode(!drawMode);
  }

  function getCenterOfRectangle() {
    if (!rectangle) return null;
    const lats = rectangle.map((p) => p.latitude);
    const lngs = rectangle.map((p) => p.longitude);
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  }

  // --- Geocode typed address and jump the map there ---
  async function handleAddressSearch() {
    if (!address.trim()) return;

    setSearchingAddress(true);
    setAddressError('');
    setSoilData(null);
    setRectangle(null);
    setStartPoint(null);

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        address
      )}&countrycodes=in&format=json&limit=1&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AgroSenseAI/1.0',
        },
      });
      const json: any = await response.json();

      if (!json.length) {
        console.log('Geocoding failed: no results for', address);
        setAddressError(
          language === 'kn'
            ? 'ವಿಳಾಸ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಜಿಲ್ಲೆ ಅಥವಾ ತಾಲೂಕಿನ ಹೆಸರನ್ನು ಸೇರಿಸಿ ಪ್ರಯತ್ನಿಸಿ.'
            : 'Address not found. Try adding district or state.'
        );
        setSearchedPoint(null);
        return;
      }

      const lat = parseFloat(json[0].lat);
      const lng = parseFloat(json[0].lon);
      const point = { latitude: lat, longitude: lng };
      setSearchedPoint(point);
      const addr = json[0].address ?? {};
      const district = addr.state_district || addr.county || addr.city_district || addr.city || '';
      const state = addr.state || '';
      if (district || state) {
        setSharedRegion({ district, state });
      }

      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        800
      );
    } catch (err) {
      console.log('Geocoding error:', err);
      setAddressError(
        language === 'kn'
          ? 'ಸ್ಥಳ ಸೇವೆ ತಲುಪಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ.'
          : 'Could not reach location service. Check your internet connection.'
      );
    } finally {
      setSearchingAddress(false);
    }
  }

  function applySoil(
    json: any,
    center: { latitude: number; longitude: number },
    note: string,
    sourceTag = 'live'
  ) {
    setSoilData(json);
    setSoilNote(note);
    setSoilSourceTag(sourceTag);
    setSharedSoilData(json);
    setSharedLatitude(center.latitude);
    incrementFarmsMapped();

    // Reverse geocode in background to obtain district & state
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${center.latitude}&lon=${center.longitude}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'AgroSenseAI/1.0' } }
    )
      .then((res) => res.json())
      .then((revJson: any) => {
        const addr = revJson.address ?? {};
        const district = addr.state_district || addr.county || addr.city_district || addr.city || '';
        const state = addr.state || '';
        if (district || state) setSharedRegion({ district, state });
      })
      .catch(() => {});
  }

  async function fetchWithTimeout(url: string, ms = 6000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }

  async function readCache(center: { latitude: number; longitude: number }) {
    if (!AsyncStorage) return null;
    try {
      const raw = await AsyncStorage.getItem(cacheKey(center.latitude, center.longitude));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // Fallback handler: Applies scientifically estimated regional agro-climatic soil
  function applyRegionalAgroSoil(center: { latitude: number; longitude: number }) {
    const estimated = estimateRegionalSoil(
      sharedRegion?.district,
      sharedRegion?.state,
      center.latitude,
      center.longitude
    );

    const note =
      language === 'kn'
        ? `⚠️ ಜಾಗತಿಕ ಸರ್ವರ್ ಕಾರ್ಯನಿರತವಾಗಿದೆ. ಆಗ್ರೋಸೆನ್ಸ್ ಎಐ ನಿಮ್ಮ ಪ್ರದೇಶದ (${estimated.regionDescription}) ಕೃಷಿ-ಹವಾಮಾನ ವಿಜ್ಞಾನ ಆಧಾರಿತ ಮಣ್ಣಿನ ಮಾಹಿತಿಯನ್ನು ಅನ್ವಯಿಸಿದೆ.`
        : `⚠️ Global SoilGrids server is currently busy. AgroSense AI applied the regional agro-climatic soil profile (${estimated.regionDescription}).`;

    applySoil(estimated.payload, center, note, 'regional');
    setSoilError('');
  }

  // Manual Soil Type selection handler
  function handleSelectCustomSoilType(key: SoilTypeKey) {
    if (!activeCenter) return;
    const profile = STANDARD_SOIL_PROFILES[key];
    const payload = getSoilPayloadForType(key);
    const note =
      language === 'kn'
        ? `🧪 ಆಯ್ಕೆಮಾಡಿದ ಮಣ್ಣಿನ ಪ್ರೊಫೈಲ್: ${profile.nameKn} (${profile.descriptionKn})`
        : `🧪 Selected soil profile: ${profile.nameEn} (${profile.descriptionEn})`;

    applySoil(payload, activeCenter, note, 'preset');
    setShowSoilTypeModal(false);
  }

  // Soil fetch: Tries live SoilGrids with fast timeout, then automatically uses Regional Agro-Climatic Model!
  async function fetchSoilData(center: { latitude: number; longitude: number } | null) {
    if (!center) return;

    setLoadingSoil(true);
    setSoilError('');
    setSoilNote('');
    setSoilData(null);
    setLastCenter(center);

    try {
      const properties = ['nitrogen', 'phh2o', 'soc', 'clay', 'sand', 'silt', 'cec', 'bdod'];
      const params = new URLSearchParams();
      params.append('lon', String(center.longitude));
      params.append('lat', String(center.latitude));
      properties.forEach((p) => params.append('property', p));
      params.append('depth', '0-5cm');
      params.append('value', 'mean');

      const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?${params.toString()}`;
      console.log('Fetching SoilGrids URL:', url);

      let response: Response | null = null;
      // Try live server with 5s timeout; maximum 1 quick retry so user doesn't wait
      for (let attempt = 0; attempt <= 1; attempt++) {
        try {
          response = await fetchWithTimeout(url, 5000);
          if (response && response.ok) break;
        } catch (e: any) {
          response = null;
        }
        if (attempt < 1) await new Promise((r) => setTimeout(r, 1000));
      }

      if (response && response.ok) {
        const json = await response.json();
        const returnedLayers = json.properties?.layers ?? [];
        const hasReading = returnedLayers.some((l: any) => l.depths?.[0]?.values?.mean != null);

        if (AsyncStorage && hasReading) {
          AsyncStorage.setItem(cacheKey(center.latitude, center.longitude), JSON.stringify(json)).catch(() => {});
        }

        applySoil(json, center, '', 'live');
        return;
      }

      // If live server failed or timed out:
      console.log('Live SoilGrids server is busy or down. Switching to regional agro-climatic estimation...');
      const cached = await readCache(center);
      if (cached) {
        applySoil(
          cached,
          center,
          language === 'kn'
            ? '💾 ಈ ಸ್ಥಳಕ್ಕಾಗಿ ಮುಂಚಿತವಾಗಿ ಸಂಗ್ರಹಿಸಲಾದ ಲೈವ್ ಮಣ್ಣಿನ ಮಾಹಿತಿಯನ್ನು ಬಳಸಲಾಗಿದೆ.'
            : '💾 Using cached SoilGrids reading previously saved for this location.',
          'cached'
        );
      } else {
        // Automatically apply regional agro-climatic profile
        applyRegionalAgroSoil(center);
      }
    } catch (err: any) {
      console.log('Soil fetch error, switching to fallback:', err);
      applyRegionalAgroSoil(center);
    } finally {
      setLoadingSoil(false);
    }
  }

  const activeCenter = rectangle ? getCenterOfRectangle() : searchedPoint;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Address Search Bar with Voice Input */}
        <View style={styles.searchBar}>
          <View style={styles.inputWrapper}>
            <VoiceTextInput
              style={styles.searchInput}
              placeholder={t('addressPlaceholder')}
              value={address}
              onChangeText={setAddress}
              onSubmitEditing={handleAddressSearch}
              returnKeyType="search"
              voiceCategory="address"
              voiceTitle={language === 'kn' ? 'ಊರು ಅಥವಾ ವಿಳಾಸ ಹೇಳಿ' : 'Speak Village / Town Name'}
            />
          </View>

          <Pressable
            style={styles.searchButton}
            onPress={handleAddressSearch}
            disabled={searchingAddress}
          >
            {searchingAddress ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.buttonText}>{t('searchButton')}</ThemedText>
            )}
          </Pressable>
        </View>

        {addressError ? <ThemedText style={styles.errorText}>{addressError}</ThemedText> : null}

        {/* Map View */}
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={INDIA_REGION}
          onPress={handleMapPress}
        >
          {rectangle && (
            <Polygon
              coordinates={rectangle}
              strokeColor="#2E7D32"
              fillColor="rgba(46, 125, 50, 0.3)"
              strokeWidth={2}
            />
          )}
          {startPoint && (
            <Marker
              coordinate={startPoint}
              title={language === 'kn' ? 'ಮೊದಲ ಮೂಲೆ' : 'First corner'}
              pinColor="#F9A825"
            />
          )}
          {searchedPoint && !rectangle && (
            <Marker coordinate={searchedPoint} title={address} pinColor="#1565C0" />
          )}
        </MapView>

        {/* Bottom Controls Sheet */}
        <View style={styles.controls}>
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, drawMode && styles.buttonActive]}
              onPress={toggleDrawMode}
            >
              <ThemedText style={styles.buttonText}>
                {drawMode
                  ? startPoint
                    ? t('tapOppositeCorner')
                    : t('tapFirstCorner')
                  : t('drawArea')}
              </ThemedText>
            </Pressable>

            {activeCenter && (
              <Pressable
                style={styles.fetchButton}
                onPress={() => fetchSoilData(activeCenter)}
                disabled={loadingSoil}
              >
                <ThemedText style={styles.buttonText}>
                  {loadingSoil ? t('fetching') : t('fetchSoilData')}
                </ThemedText>
              </Pressable>
            )}
          </View>

          {activeCenter && (
            <View style={styles.centerRow}>
              <ThemedText style={styles.coordsLabel}>
                📍 {t('centerLabel')}: {activeCenter.latitude.toFixed(4)},{' '}
                {activeCenter.longitude.toFixed(4)}
                {sharedRegion?.district ? ` (${sharedRegion.district})` : ''}
              </ThemedText>

              {/* Quick Soil Type Selector Button */}
              <Pressable
                style={styles.changeSoilTypeBadge}
                onPress={() => setShowSoilTypeModal(true)}
              >
                <ThemedText style={styles.changeSoilTypeText}>
                  🌱 {t('changeSoilType')}
                </ThemedText>
              </Pressable>
            </View>
          )}

          {soilError ? <ThemedText style={styles.errorText}>{soilError}</ThemedText> : null}

          {/* Soil Results Display */}
          {soilData && (
            <ScrollView style={styles.resultsScroll} nestedScrollEnabled>
              <View style={styles.resultsCard}>
                <View style={styles.resultsCardHeader}>
                  <ThemedText style={styles.resultsTitle}>
                    🌾 {t('soilDataTitle')}
                  </ThemedText>
                  <ThemedText style={styles.sourceBadge}>
                    {soilSourceTag === 'live'
                      ? t('soilSourceLive')
                      : soilSourceTag === 'cached'
                      ? t('soilSourceCached')
                      : soilSourceTag === 'preset'
                      ? t('soilSourcePreset')
                      : t('soilSourceRegional')}
                  </ThemedText>
                </View>

                {soilNote ? (
                  <View style={styles.noteBox}>
                    <ThemedText style={styles.noteText}>{soilNote}</ThemedText>
                  </View>
                ) : null}

                {/* Layer Readings */}
                {(() => {
                  const layers = soilData.properties?.layers ?? [];
                  const hasAnyReading = layers.some(
                    (layer: any) => layer.depths?.[0]?.values?.mean != null
                  );
                  if (!hasAnyReading) {
                    return (
                      <ThemedText style={styles.resultRow}>
                        {language === 'kn'
                          ? 'ಈ ನಿಖರ ಸ್ಥಳಕ್ಕೆ ಯಾವುದೇ ಲೈವ್ ಉಪಗ್ರಹ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ. "ಮಣ್ಣಿನ ವಿಧ ಬದಲಾಯಿಸಿ" ಒತ್ತಿ ಮಣ್ಣನ್ನು ಆಯ್ಕೆಮಾಡಬಹುದು.'
                          : 'No live satellite reading available. Tap "Change Soil Type" above to choose standard soil properties.'}
                      </ThemedText>
                    );
                  }
                  return (
                    <View style={styles.gridContainer}>
                      {layers.map((layer: any) => {
                        const value = layer.depths?.[0]?.values?.mean;
                        const conversionFactor = Number(layer.unit_measure?.d_factor ?? 1);
                        const unit =
                          layer.unit_measure?.target_units ??
                          layer.unit_measure?.mapped_units ??
                          '';
                        const hasValidValue = value != null && Number.isFinite(Number(value));
                        const hasValidFactor =
                          Number.isFinite(conversionFactor) && conversionFactor !== 0;
                        const displayValue =
                          hasValidValue && hasValidFactor
                            ? (Number(value) / conversionFactor).toFixed(1)
                            : 'N/A';

                        // Friendly name map
                        const friendlyNames: Record<string, { en: string; kn: string }> = {
                          nitrogen: { en: 'Nitrogen (N)', kn: 'ಸಾರಜನಕ (N)' },
                          phh2o: { en: 'Soil pH', kn: 'ಮಣ್ಣಿನ pH (ಆಮ್ಲೀಯತೆ)' },
                          soc: { en: 'Organic Carbon', kn: 'ಸಾವಯವ ಇಂಗಾಲ (SOC)' },
                          clay: { en: 'Clay Content', kn: 'ಜೇಡಿ ಅಂಶ (Clay)' },
                          sand: { en: 'Sand Content', kn: 'ಮರಳು ಅಂಶ (Sand)' },
                          silt: { en: 'Silt Content', kn: 'ಮೆಕ್ಕಲು ಅಂಶ (Silt)' },
                          cec: { en: 'CEC (Fertility)', kn: 'ಪೋಷಕಾಂಶ ಶಕ್ತಿ (CEC)' },
                          bdod: { en: 'Density / Compaction', kn: 'ಮಣ್ಣಿನ ಸಾಂದ್ರತೆ' },
                        };

                        const fName =
                          friendlyNames[layer.name]?.[language === 'kn' ? 'kn' : 'en'] ||
                          layer.name.toUpperCase();

                        return (
                          <View key={layer.name} style={styles.gridItem}>
                            <ThemedText style={styles.gridLabel}>{fName}</ThemedText>
                            <ThemedText style={styles.gridValue}>
                              {displayValue} {unit}
                            </ThemedText>
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}

                {/* Action to switch soil or retry */}
                <View style={styles.actionButtonsRow}>
                  <Pressable
                    style={styles.changeSoilBtn}
                    onPress={() => setShowSoilTypeModal(true)}
                  >
                    <ThemedText style={styles.changeSoilBtnText}>
                      🧪 {t('changeSoilType')}
                    </ThemedText>
                  </Pressable>

                  {activeCenter && (
                    <Pressable
                      style={styles.retryBtn}
                      onPress={() => fetchSoilData(activeCenter)}
                    >
                      <ThemedText style={styles.retryBtnText}>
                        🔄 {t('retryLiveServer')}
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Soil Type Selection Modal */}
        <Modal
          visible={showSoilTypeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSoilTypeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.soilModalCard}>
              <View style={styles.modalHeaderRow}>
                <ThemedText style={styles.modalTitle}>
                  🌱 {t('selectSoilType')}
                </ThemedText>
                <Pressable
                  onPress={() => setShowSoilTypeModal(false)}
                  style={styles.closeBtn}
                >
                  <ThemedText style={styles.closeBtnText}>✕</ThemedText>
                </Pressable>
              </View>
              <ThemedText style={styles.modalSub}>
                {language === 'kn'
                  ? 'ಲೈವ್ ಸರ್ವರ್ ಇಲ್ಲದಿದ್ದಾಗಲೂ ನಿಮ್ಮ ಜಮೀನಿನ ಮಣ್ಣಿನ ವಿಧವನ್ನು ಆರಿಸಿ ನಿಖರ ಬೆಳೆ ಶಿಫಾರಸು ಪಡೆಯಬಹುದು:'
                  : 'Choose your farm soil type to get accurate recommendations even when satellite servers are down:'}
              </ThemedText>

              <ScrollView style={{ maxHeight: 380 }}>
                {Object.values(STANDARD_SOIL_PROFILES).map((item) => (
                  <Pressable
                    key={item.key}
                    style={styles.soilOptionCard}
                    onPress={() => handleSelectCustomSoilType(item.key)}
                  >
                    <ThemedText style={styles.soilOptionName}>
                      {language === 'kn' ? item.nameKn : item.nameEn}
                    </ThemedText>
                    <ThemedText style={styles.soilOptionDesc}>
                      {language === 'kn' ? item.descriptionKn : item.descriptionEn}
                    </ThemedText>
                    <View style={styles.soilPillRow}>
                      <ThemedText style={styles.soilPill}>
                        pH {(item.properties.phh2o / 10).toFixed(1)}
                      </ThemedText>
                      <ThemedText style={styles.soilPill}>
                        N {(item.properties.nitrogen / 100).toFixed(1)} g/kg
                      </ThemedText>
                      <ThemedText style={styles.soilPill}>
                        Clay {(item.properties.clay / 10).toFixed(0)}%
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  map: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.96)',
    zIndex: 20,
  },
  inputWrapper: {
    flex: 1,
  },
  searchInput: {
    height: 42,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    backgroundColor: '#f0f0f0',
    fontSize: 14,
    color: '#000',
  },
  searchButton: {
    backgroundColor: '#1565C0',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    maxHeight: '52%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    backgroundColor: '#2E7D32',
    borderRadius: Spacing.two,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#F9A825',
  },
  fetchButton: {
    flex: 1,
    backgroundColor: '#1565C0',
    borderRadius: Spacing.two,
    paddingVertical: 12,
    alignItems: 'center',
  },
  centerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  coordsLabel: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
    flex: 1,
  },
  changeSoilTypeBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#81C784',
  },
  changeSoilTypeText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '700',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    backgroundColor: '#FFEBEE',
  },
  resultsScroll: {
    marginTop: 4,
  },
  resultsCard: {
    backgroundColor: '#F9FBE7',
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#DCEDC8',
    gap: 8,
  },
  resultsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#33691E',
  },
  sourceBadge: {
    fontSize: 11,
    color: '#558B2F',
    fontWeight: '600',
  },
  noteBox: {
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FBC02D',
  },
  noteText: {
    fontSize: 11,
    color: '#6D4C41',
    lineHeight: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  gridLabel: {
    fontSize: 11,
    color: '#666',
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 2,
  },
  resultRow: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 6,
  },
  changeSoilBtn: {
    flex: 1,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  changeSoilBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  retryBtn: {
    flex: 1,
    backgroundColor: '#F57C00',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  soilModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#555',
  },
  modalSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: Spacing.two,
    lineHeight: 16,
  },
  soilOptionCard: {
    borderWidth: 1,
    borderColor: '#C8E6C9',
    backgroundColor: '#F1F8E9',
    borderRadius: 12,
    padding: Spacing.two,
    marginBottom: 8,
  },
  soilOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  soilOptionDesc: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
    lineHeight: 15,
  },
  soilPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  soilPill: {
    fontSize: 10,
    color: '#1B5E20',
    backgroundColor: '#DCEDC8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
});