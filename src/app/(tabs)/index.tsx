import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFarm } from '@/context/farm-context';
import { auth } from '@/firebase/config';
import { Link } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { farmsMapped, cropsTracked, scansDone } = useFarm();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  async function handleLogout() {
    await signOut(auth);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText type="small" style={styles.greeting}>
                {greeting} 🌾
              </ThemedText>
              <ThemedText type="title" style={styles.appName}>
                AgroSense AI
              </ThemedText>
              {user?.email && (
                <ThemedText type="small" style={styles.email}>
                  {user.email}
                </ThemedText>
              )}
            </View>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <ThemedText style={styles.logoutText}>Log Out</ThemedText>
            </Pressable>
          </View>

          {/* Quick stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#2E7D32' }]}>
              <ThemedText style={styles.statNumber}>{farmsMapped}</ThemedText>
              <ThemedText style={styles.statLabel}>Farms Mapped</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#1565C0' }]}>
              <ThemedText style={styles.statNumber}>{cropsTracked}</ThemedText>
              <ThemedText style={styles.statLabel}>Crops Tracked</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F9A825' }]}>
              <ThemedText style={styles.statNumber}>{scansDone}</ThemedText>
              <ThemedText style={styles.statLabel}>Scans Done</ThemedText>
            </View>
          </View>

          {/* Quick actions */}
          <ThemedText type="small" style={styles.sectionTitle}>
            QUICK ACTIONS
          </ThemedText>

          <Link href="/map" asChild>
            <Pressable style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#2E7D32' }]}>
                <ThemedText style={styles.actionIconText}>🗺️</ThemedText>
              </View>
              <View style={styles.actionTextWrap}>
                <ThemedText style={styles.actionTitle}>Soil Map</ThemedText>
                <ThemedText type="small" style={styles.actionSubtitle}>
                  Draw your farm area and get real soil data
                </ThemedText>
              </View>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </Pressable>
          </Link>

          <Link href="/crop-advisor" asChild>
            <Pressable style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#F9A825' }]}>
                <ThemedText style={styles.actionIconText}>🌱</ThemedText>
              </View>
              <View style={styles.actionTextWrap}>
                <ThemedText style={styles.actionTitle}>Crop Advisor</ThemedText>
                <ThemedText type="small" style={styles.actionSubtitle}>
                  Get crop and fertilizer recommendations
                </ThemedText>
              </View>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </Pressable>
          </Link>

          <Link href="/disease-detector" asChild>
            <Pressable style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#C62828' }]}>
                <ThemedText style={styles.actionIconText}>🔬</ThemedText>
              </View>
              <View style={styles.actionTextWrap}>
                <ThemedText style={styles.actionTitle}>Disease Detector</ThemedText>
                <ThemedText type="small" style={styles.actionSubtitle}>
                  Scan plant photos for diagnosis
                </ThemedText>
              </View>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </Pressable>
          </Link>

          {/* Tip of the day */}
          <View style={styles.tipCard}>
            <ThemedText style={styles.tipLabel}>💡 TIP</ThemedText>
            <ThemedText type="small" style={styles.tipText}>
              Start by mapping your farm on the Soil Map tab — it's the foundation for
              every recommendation AgroSense AI gives you.
            </ThemedText>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    opacity: 0.7,
  },
  appName: {
    marginTop: 2,
  },
  email: {
    opacity: 0.5,
    marginTop: 2,
    fontSize: 12,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  logoutText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  statCard: {
    flex: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.9,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    opacity: 0.6,
    letterSpacing: 1,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 20,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontWeight: '600',
    fontSize: 15,
  },
  actionSubtitle: {
    opacity: 0.6,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    opacity: 0.3,
  },
  tipCard: {
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D32',
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.7,
  },
  tipText: {
    marginTop: 4,
    opacity: 0.8,
  },
});