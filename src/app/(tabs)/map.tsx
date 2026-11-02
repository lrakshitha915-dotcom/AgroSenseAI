import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFarm } from '@/context/farm-context';

import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker, Polygon, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

// AsyncStorage is optional here: if the package is missing the app still works, just without the cache.
let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

const CACHE_PREFIX = 'soilgrids_cache_v1:';
const cacheKey = (lat: number, lon: number) => `${CACHE_PREFIX}${lat.toFixed(2)},${lon.toFixed(2)}`;

// Typical topsoil of a loamy red soil, in the SAME raw format SoilGrids returns (value / d_factor = shown value).
// Used ONLY when the person presses "Use sample soil data" while the SoilGrids server is down. It is demo data, not a reading.
function buildSampleSoil() {
  const layer = (name: string, raw: number, mapped: string, target: string, f: number) => ({
    name,
    unit_measure: { mapped_units: mapped, target_units: target, d_factor: f },
    depths: [{ label: '0-5cm', values: { mean: raw } }],
  });
  return {
    sample: true,
    properties: {
      layers: [
        layer('nitrogen', 140, 'cg/kg', 'g/kg', 100),
        layer('phh2o', 66, 'pH*10', 'pH', 10),
        layer('soc', 120, 'dg/kg', 'g/kg', 10),
        layer('clay', 280, 'g/kg', '%', 10),
        layer('sand', 420, 'g/kg', '%', 10),
        layer('silt', 300, 'g/kg', '%', 10),
        layer('cec', 150, 'mmol(c)/kg', 'cmol(c)/kg', 10),
        layer('bdod', 135, 'cg/cm3', 'kg/dm3', 100),
      ],
    },
  };
}

const INDIA_REGION: Region = {
  latitude: 22.5937,
  longitude: 78.9629,
  latitudeDelta: 15,
  longitudeDelta: 15,
};

export default function MapScreen() {
  const [drawMode, setDrawMode] = useState(false);
  const [rectangle, setRectangle] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [startPoint, setStartPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const [soilData, setSoilData] = useState<any>(null);
  const [loadingSoil, setLoadingSoil] = useState(false);
  const [soilError, setSoilError] = useState('');
  const [soilNote, setSoilNote] = useState('');
  const [lastCenter, setLastCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  // --- Address search state ---
  const [address, setAddress] = useState('');
  const [searchedPoint, setSearchedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const { setSoilData: setSharedSoilData, setLatitude: setSharedLatitude, setRegion: setSharedRegion, incrementFarmsMapped } = useFarm();
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

  // --- Geocode typed address (free, no key) and jump the map there ---
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
        setAddressError('Address not found. Try a more specific location (e.g. add district or state).');
        setSearchedPoint(null);
        return;
      }

      const lat = parseFloat(json[0].lat);
      const lng = parseFloat(json[0].lon);
      const point = { latitude: lat, longitude: lng };
      setSearchedPoint(point);
      const addr = json[0].address ?? {};
      const district = addr.state_district || addr.county || addr.city_district || '';
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
      setAddressError('Could not reach location service. Check your internet connection.');
    } finally {
      setSearchingAddress(false);
    }
  }

  // Stores the result in the screen and in the shared farm context, then finds district/state (free, no key).
  function applySoil(json: any, center: { latitude: number; longitude: number }, note: string) {
    setSoilData(json);
    setSoilNote(note);
    setSharedSoilData(json);
    setSharedLatitude(center.latitude);
    incrementFarmsMapped();
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${center.latitude}&lon=${center.longitude}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'AgroSenseAI/1.0' } }
    )
      .then((res) => res.json())
      .then((revJson: any) => {
        const addr = revJson.address ?? {};
        const district = addr.state_district || addr.county || addr.city_district || '';
        const state = addr.state || '';
        if (district || state) setSharedRegion({ district, state });
      })
      .catch(() => {}); // non-critical
  }

  // fetch with a timeout so a hung server cannot freeze the button forever
  async function fetchWithTimeout(url: string, ms = 20000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }

  // Look for a real reading saved earlier for (almost) this spot
  async function readCache(center: { latitude: number; longitude: number }) {
    if (!AsyncStorage) return null;
    try {
      const raw = await AsyncStorage.getItem(cacheKey(center.latitude, center.longitude));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function applySampleSoil() {
    if (!lastCenter) return;
    setSoilError('');
    applySoil(buildSampleSoil(), lastCenter, 'SAMPLE DATA (demo): typical loamy red soil values, NOT a real reading for this spot.');
  }

  // Soil fetch works off either the drawn rectangle's center OR the searched address point
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
      console.log('SoilGrids URL:', url);

      // SoilGrids (ISRIC) is a free public server and often returns 503/429 when busy: retry a few times.
      const isBusy = (st: number) => [429, 502, 503, 504].includes(st);
      let response: Response | null = null;
      for (let attempt = 0; attempt <= 4; attempt++) {
        try {
          response = await fetchWithTimeout(url);
          if (!isBusy(response.status)) break;
          console.log(`SoilGrids busy (${response.status}), retrying ${attempt + 1}/4...`);
        } catch (e: any) {
          response = null;
          console.log(`SoilGrids request error (${e?.name}), retrying ${attempt + 1}/4...`);
        }
        if (attempt < 4) await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      }
      if (!response || !response.ok) {
        console.log('SoilGrids failed:', response?.status);
        throw new Error(!response || isBusy(response.status) ? 'BUSY' : 'SoilGrids API request failed');
      }

      const json = await response.json();

      // Log the returned units and conversion factors so the API's values can be verified.
      const returnedLayers = json.properties?.layers ?? [];
      console.log(
        'SoilGrids property units:',
        returnedLayers.map((layer: any) => ({
          property: layer.name,
          rawValue: layer.depths?.[0]?.values?.mean,
          mappedUnits: layer.unit_measure?.mapped_units,
          targetUnits: layer.unit_measure?.target_units,
          conversionFactor: layer.unit_measure?.d_factor,
        }))
      );

      // Save a real reading so the same spot still works when the server is down later (e.g. during a demo)
      const hasReading = returnedLayers.some((l: any) => l.depths?.[0]?.values?.mean != null);
      if (AsyncStorage && hasReading) {
        AsyncStorage.setItem(cacheKey(center.latitude, center.longitude), JSON.stringify(json)).catch(() => {});
      }
      applySoil(json, center, '');
    } catch (err: any) {
      console.log('Soil fetch error:', err.message);
      if (err.message === 'BUSY') {
        const cached = await readCache(center);
        if (cached) {
          applySoil(cached, center, 'Real SoilGrids reading saved earlier for this spot (the server is busy right now).');
        } else {
          setSoilError(
            'The soil data server (SoilGrids) is busy right now. Wait a minute and tap Fetch Soil Data again, or tap "Use sample soil data" to continue with demo values.'
          );
        }
      } else {
        setSoilError('Could not fetch soil data. Check your internet connection and try again.');
      }
    } finally {
      setLoadingSoil(false);
    }
  }

  const activeCenter = rectangle ? getCenterOfRectangle() : searchedPoint;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Address search bar */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Type an address or village name..."
            placeholderTextColor="#999"
            value={address}
            onChangeText={setAddress}
            onSubmitEditing={handleAddressSearch}
            returnKeyType="search"
          />
          <Pressable style={styles.searchButton} onPress={handleAddressSearch} disabled={searchingAddress}>
            {searchingAddress ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.buttonText}>Go</ThemedText>
            )}
          </Pressable>
        </View>
        {addressError ? <ThemedText style={styles.errorText}>{addressError}</ThemedText> : null}

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
              title="First corner"
              pinColor="#F9A825"
            />
          )}
          {searchedPoint && !rectangle && (
            <Marker
              coordinate={searchedPoint}
              title={address}
              pinColor="#1565C0"
            />
          )}
        </MapView>

        <View style={styles.controls}>
          <Pressable
            style={[styles.button, drawMode && styles.buttonActive]}
            onPress={toggleDrawMode}
          >
            <ThemedText style={styles.buttonText}>
              {drawMode ? (startPoint ? 'Tap opposite corner' : 'Tap first corner') : 'Draw Area'}
            </ThemedText>
          </Pressable>

          {activeCenter && (
            <Pressable
              style={styles.fetchButton}
              onPress={() => fetchSoilData(activeCenter)}
              disabled={loadingSoil}
            >
              <ThemedText style={styles.buttonText}>
                {loadingSoil ? 'Fetching...' : 'Fetch Soil Data'}
              </ThemedText>
            </Pressable>
          )}
          {soilError ? <ThemedText style={styles.errorText}>{soilError}</ThemedText> : null}
          {soilError && lastCenter ? (
            <Pressable style={styles.sampleButton} onPress={applySampleSoil}>
              <ThemedText style={styles.buttonText}>Use sample soil data (demo)</ThemedText>
            </Pressable>
          ) : null}

          {activeCenter && (
            <View style={styles.coordsCard}>
              <ThemedText style={styles.coordsLabel}>
                Center: {activeCenter.latitude.toFixed(4)}, {activeCenter.longitude.toFixed(4)}
              </ThemedText>
            </View>
          )}

          {soilData && (
            <View style={styles.resultsCard}>
              <ThemedText style={styles.resultsTitle}>Soil Data</ThemedText>
              {soilNote ? <ThemedText style={styles.noteText}>{soilNote}</ThemedText> : null}
              {(() => {
                const layers = soilData.properties?.layers ?? [];
                const hasAnyReading = layers.some(
                  (layer: any) => layer.depths?.[0]?.values?.mean != null
                );
                if (!hasAnyReading) {
                  return (
                    <ThemedText style={styles.resultRow}>
                      No soil data available for this exact spot — this usually happens over
                      built-up/urban areas. Try a location over actual farmland or open fields
                      nearby for real readings.
                    </ThemedText>
                  );
                }
                return layers.map((layer: any) => {
                  const value = layer.depths?.[0]?.values?.mean;
                  const conversionFactor = Number(layer.unit_measure?.d_factor ?? 1);
                  const unit =
                    layer.unit_measure?.target_units ?? layer.unit_measure?.mapped_units ?? '';
                  const hasValidValue = value != null && Number.isFinite(Number(value));
                  const hasValidFactor = Number.isFinite(conversionFactor) && conversionFactor !== 0;
                  const displayValue =
                    hasValidValue && hasValidFactor
                      ? (Number(value) / conversionFactor).toFixed(2)
                      : 'N/A';
                  return (
                    <ThemedText key={layer.name} style={styles.resultRow}>
                      {layer.name.toUpperCase()}: {displayValue}{unit ? ` ${unit}` : ''}
                    </ThemedText>
                  );
                });
              })()}
            </View>
          )}
        </View>
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
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  searchInput: {
    flex: 1,
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
    minWidth: 50,
  },
  controls: {
    position: 'absolute',
    bottom: Spacing.four,
    left: Spacing.three,
    right: Spacing.three,
    gap: Spacing.two,
  },
  button: {
    backgroundColor: '#2E7D32',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#F9A825',
  },
  fetchButton: {
    backgroundColor: '#1565C0',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  sampleButton: {
    backgroundColor: '#6D4C41',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  noteText: {
    color: '#FFD54F',
    fontSize: 12,
    marginBottom: Spacing.two,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  coordsCard: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Spacing.two,
    padding: Spacing.two,
    marginTop: Spacing.two,
  },
  coordsLabel: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
  },
  resultsCard: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.two,
    maxHeight: 200,
  },
  resultsTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: Spacing.two,
  },
  resultRow: {
    color: '#e0e0e0',
    fontSize: 13,
    marginBottom: 2,
  },
  errorText: {
    color: '#e53935',
    textAlign: 'center',
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});