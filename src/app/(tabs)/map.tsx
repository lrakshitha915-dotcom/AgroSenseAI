import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFarm } from '@/context/farm-context';

import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker, Polygon, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  // Soil fetch works off either the drawn rectangle's center OR the searched address point
  async function fetchSoilData(center: { latitude: number; longitude: number } | null) {
    if (!center) return;

    setLoadingSoil(true);
    setSoilError('');
    setSoilData(null);
    

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

      const response = await fetch(url);
      if (!response.ok) {
        console.log('SoilGrids failed:', response.status, await response.text());
        throw new Error('SoilGrids API request failed');
      }

      const json = await response.json();
      console.log('SoilGrids response:', JSON.stringify(json).slice(0, 300));
      setSoilData(json);
      setSharedSoilData(json);
      setSharedLatitude(center.latitude);
      incrementFarmsMapped();
      // Reverse geocode to get district/state for regional crop matching (free, no key)
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${center.latitude}&lon=${center.longitude}&format=json&addressdetails=1`,
        { headers: { 'User-Agent': 'AgroSenseAI/1.0' } }
      )
        .then((res) => res.json())
        .then((revJson: any) => {
          const addr = revJson.address ?? {};
          const district = addr.state_district || addr.county || addr.city_district || '';
          const state = addr.state || '';
          if (district || state) {
            setSharedRegion({ district, state });
          }
        })
        .catch(() => {}); // non-critical, silently skip if this fails
    } catch (err: any) {
      console.log('Soil fetch error:', err.message);
      setSoilError('Could not fetch soil data. Check your internet connection and try again.');
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
                  const unit = layer.unit_measure?.mapped_units ?? '';
                  const displayValue =
                    value != null ? (value / (layer.unit_measure?.d_factor ?? 1)).toFixed(2) : 'N/A';
                  return (
                    <ThemedText key={layer.name} style={styles.resultRow}>
                      {layer.name.toUpperCase()}: {displayValue} {unit}
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