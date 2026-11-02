import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFarm } from '@/context/farm-context';
import { useLanguage } from '@/context/language-context';
import { auth } from '@/firebase/config';
import { Link } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { user } = useAuth();
  const { farmsMapped, cropsTracked, scansDone } = useFarm();
  const { language, setLanguage, confirmLanguage, showLanguageModal, setShowLanguageModal, t } =
    useLanguage();
  const [greeting, setGreeting] = useState('');
  const [selectedLang, setSelectedLang] = useState(language);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t('goodMorning'));
    else if (hour < 17) setGreeting(t('goodAfternoon'));
    else setGreeting(t('goodEvening'));
  }, [language]);

  useEffect(() => {
    setSelectedLang(language);
  }, [language]);

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
                {t('appName')}
              </ThemedText>
              {user?.email && (
                <ThemedText type="small" style={styles.email}>
                  {user.email}
                </ThemedText>
              )}
            </View>

            <View style={styles.headerRightButtons}>
              {/* Language Switch Button */}
              <Pressable
                style={styles.langBadge}
                onPress={() => setShowLanguageModal(true)}
              >
                <ThemedText style={styles.langBadgeText}>
                  🌐 {language === 'kn' ? 'ಕನ್ನಡ' : 'EN'}
                </ThemedText>
              </Pressable>

              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <ThemedText style={styles.logoutText}>{t('logOut')}</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Quick stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#2E7D32' }]}>
              <ThemedText style={styles.statNumber}>{farmsMapped}</ThemedText>
              <ThemedText style={styles.statLabel}>{t('farmsMapped')}</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#1565C0' }]}>
              <ThemedText style={styles.statNumber}>{cropsTracked}</ThemedText>
              <ThemedText style={styles.statLabel}>{t('cropsTracked')}</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F9A825' }]}>
              <ThemedText style={styles.statNumber}>{scansDone}</ThemedText>
              <ThemedText style={styles.statLabel}>{t('scansDone')}</ThemedText>
            </View>
          </View>

          {/* Quick actions */}
          <ThemedText type="small" style={styles.sectionTitle}>
            {t('quickActions')}
          </ThemedText>

          <Link href="/map" asChild>
            <Pressable style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#2E7D32' }]}>
                <ThemedText style={styles.actionIconText}>🗺️</ThemedText>
              </View>
              <View style={styles.actionTextWrap}>
                <ThemedText style={styles.actionTitle}>{t('actionSoilMap')}</ThemedText>
                <ThemedText type="small" style={styles.actionSubtitle}>
                  {t('actionSoilMapDesc')}
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
                <ThemedText style={styles.actionTitle}>{t('actionCropAdvisor')}</ThemedText>
                <ThemedText type="small" style={styles.actionSubtitle}>
                  {t('actionCropAdvisorDesc')}
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
                <ThemedText style={styles.actionTitle}>{t('actionDiseaseDetector')}</ThemedText>
                <ThemedText type="small" style={styles.actionSubtitle}>
                  {t('actionDiseaseDetectorDesc')}
                </ThemedText>
              </View>
              <ThemedText style={styles.chevron}>›</ThemedText>
            </Pressable>
          </Link>

          {/* Tip of the day */}
          <View style={styles.tipCard}>
            <ThemedText style={styles.tipLabel}>💡 {t('tipLabel')}</ThemedText>
            <ThemedText type="small" style={styles.tipText}>
              {t('homeTip')}
            </ThemedText>
          </View>
        </ScrollView>

        {/* First-launch & Accessible Language Selection Modal */}
        <Modal
          visible={showLanguageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.langModalCard}>
              <View style={styles.langModalHeaderIcon}>
                <ThemedText style={{ fontSize: 32 }}>🌾</ThemedText>
              </View>
              <ThemedText style={styles.langModalTitle}>
                {t('selectLanguageTitle')}
              </ThemedText>
              <ThemedText style={styles.langModalSubtitle}>
                {t('selectLanguageSubtitle')}
              </ThemedText>
              <ThemedText style={styles.langModalDesc}>
                {t('selectLanguageDesc')}
              </ThemedText>

              {/* Language Selection Options */}
              <View style={styles.langOptionsRow}>
                <Pressable
                  style={[
                    styles.langOptionCard,
                    selectedLang === 'kn' && styles.langOptionSelected,
                  ]}
                  onPress={() => setSelectedLang('kn')}
                >
                  <ThemedText style={styles.langLetter}>ಕ</ThemedText>
                  <ThemedText style={styles.langOptionTitle}>ಕನ್ನಡ</ThemedText>
                  <ThemedText style={styles.langOptionSub}>Kannada</ThemedText>
                  {selectedLang === 'kn' && (
                    <View style={styles.selectedBadge}>
                      <ThemedText style={styles.selectedBadgeText}>✓</ThemedText>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  style={[
                    styles.langOptionCard,
                    selectedLang === 'en' && styles.langOptionSelected,
                  ]}
                  onPress={() => setSelectedLang('en')}
                >
                  <ThemedText style={styles.langLetter}>A</ThemedText>
                  <ThemedText style={styles.langOptionTitle}>English</ThemedText>
                  <ThemedText style={styles.langOptionSub}>ಇಂಗ್ಲಿಷ್</ThemedText>
                  {selectedLang === 'en' && (
                    <View style={styles.selectedBadge}>
                      <ThemedText style={styles.selectedBadgeText}>✓</ThemedText>
                    </View>
                  )}
                </Pressable>
              </View>

              <Pressable
                style={styles.langConfirmBtn}
                onPress={() => confirmLanguage(selectedLang)}
              >
                <ThemedText style={styles.langConfirmText}>
                  {t('continueButton')} / ಮುಂದುವರಿಯಿರಿ
                </ThemedText>
              </Pressable>
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
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  langBadge: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: Spacing.two,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
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
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  langModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: Spacing.four,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  langModalHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  langModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E20',
    textAlign: 'center',
  },
  langModalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C',
    textAlign: 'center',
    marginTop: 2,
  },
  langModalDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: Spacing.three,
    lineHeight: 16,
  },
  langOptionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    marginBottom: Spacing.four,
  },
  langOptionCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: Spacing.three,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    position: 'relative',
  },
  langOptionSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#F1F8E9',
  },
  langLetter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  langOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  langOptionSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  langConfirmBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: Spacing.four,
    width: '100%',
    alignItems: 'center',
  },
  langConfirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});