import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

// Safe dynamic import of expo-audio so web / simulators never crash
let AudioModule: any = null;
let useAudioRecorder: any = null;
let RecordingPresets: any = null;

try {
  const expoAudio = require('expo-audio');
  AudioModule = expoAudio.AudioModule;
  useAudioRecorder = expoAudio.useAudioRecorder;
  RecordingPresets = expoAudio.RecordingPresets;
} catch (e) {
  console.log('expo-audio not available on this platform:', e);
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export type VoiceCategory = 'address' | 'crop' | 'number' | 'general';

interface VoiceTextInputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  voiceCategory?: VoiceCategory;
  voiceTitle?: string;
  onVoiceSubmitted?: (text: string) => void;
}

export function VoiceTextInput({
  containerStyle,
  inputStyle,
  voiceCategory = 'general',
  voiceTitle,
  value,
  onChangeText,
  placeholder,
  ...props
}: VoiceTextInputProps) {
  const { language, t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  // Audio recorder reference
  const recorder = useAudioRecorder ? useAudioRecorder(RecordingPresets?.HIGH_QUALITY || {}) : null;
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const getSuggestions = () => {
    if (voiceCategory === 'address') {
      return language === 'kn'
        ? ['ಮಂಡ್ಯ', 'ಮೈಸೂರು', 'ಹಾಸನ', 'ಬೆಳಗಾವಿ', 'ಶಿವಮೊಗ್ಗ', 'ತುಮಕೂರು', 'ದಾವಣಗೆರೆ', 'ಕೋಲಾರ', 'ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ']
        : ['Mandya', 'Mysuru', 'Hassan', 'Belagavi', 'Shivamogga', 'Tumakuru', 'Davangere', 'Kolar', 'Bengaluru Rural'];
    }
    if (voiceCategory === 'crop') {
      return language === 'kn'
        ? ['ಟೊಮ್ಯಾಟೊ', 'ಭತ್ತ (Paddy)', 'ರಾಗಿ (Ragi)', 'ಮೆಕ್ಕೆಜೋಳ (Maize)', 'ಕಬ್ಬು (Sugarcane)', 'ಹತ್ತಿ (Cotton)', 'ಈರುಳ್ಳಿ (Onion)', 'ಅಡಿಕೆ (Arecanut)', 'ಕಾಫಿ (Coffee)', 'ಶುಂಠಿ (Ginger)']
        : ['Tomato', 'Rice (Paddy)', 'Finger Millet (Ragi)', 'Maize', 'Sugarcane', 'Cotton', 'Onion', 'Arecanut', 'Coffee', 'Ginger'];
    }
    if (voiceCategory === 'number') {
      return ['0.5', '1', '2', '2.5', '3', '4', '5', '8', '10', '15', '20'];
    }
    return language === 'kn'
      ? ['ಹೌದು', 'ಇಲ್ಲ', 'ಉತ್ತಮ', 'ಕಡಿಮೆ', 'ಸಾಧಾರಣ']
      : ['Yes', 'No', 'Good', 'Low', 'Medium'];
  };

  const startListening = async () => {
    setVoiceError('');
    setRecordingSeconds(0);
    setSpokenText('');

    // 1. Web Speech API if running on Web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = language === 'kn' ? 'kn-IN' : 'en-IN';

          recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((res: any) => res[0].transcript)
              .join('');
            setSpokenText(transcript);
          };

          recognition.onerror = (event: any) => {
            console.log('Voice error:', event.error);
            setIsRecording(false);
          };

          recognition.onend = () => {
            setIsRecording(false);
          };

          recognition.start();
          recognitionRef.current = recognition;
          setIsRecording(true);
          return;
        } catch (e) {
          console.log('Web speech error:', e);
        }
      }
    }

    // 2. Mobile Native Recording with expo-audio
    if (recorder && AudioModule) {
      try {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          setVoiceError(
            language === 'kn'
              ? 'ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಸೆಟ್ಟಿಂಗ್ಸ್‌ನಲ್ಲಿ ಅನುಮತಿ ನೀಡಿ.'
              : 'Microphone permission denied. Please allow microphone access in settings.'
          );
          return;
        }

        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);

        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } catch (err: any) {
        console.log('Error starting native recording:', err);
        setVoiceError(err.message || 'Could not access microphone.');
        setIsRecording(false);
      }
    } else {
      // Fallback
      setIsRecording(true);
    }
  };

  const stopListeningAndTranscribe = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    // If native recorder was used, send audio to Gemini for speech-to-text
    if (recorder && recorder.uri) {
      setIsTranscribing(true);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        console.log('Recorded audio URI:', uri);

        if (!uri) {
          setIsTranscribing(false);
          return;
        }

        // Convert audio URI to base64
        const resp = await fetch(uri);
        const blob = await resp.blob();

        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            const b64 = res.includes(',') ? res.split(',')[1] : res;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (!base64Audio) {
          throw new Error('Audio conversion failed');
        }

        // Call Google Gemini 2.5 Flash for audio transcription in Kannada / English
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const geminiResp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert speech recognition transcriber for an Indian farming app named AgroSense AI.
The user is a farmer speaking into their phone in either Kannada (ಕನ್ನಡ) or Indian English.
Category: ${voiceCategory}.
Task: Transcribe the spoken audio with 100% accuracy into text.
- If spoken in Kannada, output Kannada text (e.g. ಮಂಡ್ಯ, ಟೊಮ್ಯಾಟೊ, ರಾಗಿ, 2.5).
- If spoken in English, output English text (e.g. Mandya, Tomato, Ragi, 2.5).
- If it is a number/measurement, output the clean number.
- Output ONLY the transcribed words or value. DO NOT output any introductory or polite text, NO markdown, NO quotes.`,
                  },
                  {
                    inline_data: {
                      mime_type: 'audio/m4a',
                      data: base64Audio,
                    },
                  },
                ],
              },
            ],
          }),
        });

        const json = await geminiResp.json();
        const transcribed = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        console.log('Gemini speech transcription result:', transcribed);

        if (transcribed) {
          setSpokenText(transcribed);
        } else {
          setVoiceError(
            language === 'kn'
              ? 'ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಮಾತನಾಡಿ.'
              : 'Could not clearly recognize speech. Please try speaking again.'
          );
        }
      } catch (err: any) {
        console.log('Transcription error:', err);
        setVoiceError(
          language === 'kn'
            ? 'ಧ್ವನಿ ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಪುನಃ ಮಾತನಾಡಿ ಅಥವಾ ಕೆಳಗಿನ ಆಯ್ಕೆಗಳನ್ನು ಬಳಸಿ.'
            : 'Could not transcribe speech. Try again or tap a suggestion below.'
        );
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  const openVoiceModal = () => {
    setSpokenText(value || '');
    setVoiceError('');
    setModalVisible(true);
    startListening();
  };

  const handleConfirm = () => {
    if (isRecording) {
      stopListeningAndTranscribe();
    }
    if (spokenText.trim()) {
      onChangeText?.(spokenText.trim());
    }
    setModalVisible(false);
  };

  const handleSuggestionPress = (text: string) => {
    const cleanText = text.includes(' (') ? text.split(' (')[0] : text;
    setSpokenText(cleanText);
    onChangeText?.(cleanText);
    if (isRecording) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorder) {
        try {
          recorder.stop();
        } catch {}
      }
      setIsRecording(false);
    }
    setModalVisible(false);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        {...props}
      />

      {/* Embedded Voice Mic Button */}
      <Pressable
        style={styles.voiceButton}
        onPress={openVoiceModal}
        hitSlop={8}
        accessibilityLabel="Voice Input"
      >
        <ThemedText style={styles.voiceIcon}>🎙️</ThemedText>
      </Pressable>

      {/* Voice Assistant Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (isRecording) stopListeningAndTranscribe();
          setModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {voiceTitle || t('voiceTitle')}
              </ThemedText>
              <Pressable
                onPress={() => {
                  if (isRecording) stopListeningAndTranscribe();
                  setModalVisible(false);
                }}
                style={styles.closeBtn}
              >
                <ThemedText style={styles.closeBtnText}>✕</ThemedText>
              </Pressable>
            </View>

            {/* Listening & Recording Visualizer */}
            <View style={styles.visualizerContainer}>
              <View
                style={[
                  styles.pulsingCircle,
                  isRecording && styles.pulsingCircleActive,
                ]}
              >
                <ThemedText style={styles.largeMic}>🎙️</ThemedText>
              </View>

              {isTranscribing ? (
                <View style={styles.transcribingRow}>
                  <ActivityIndicator color="#2E7D32" size="small" />
                  <ThemedText style={styles.transcribingText}>
                    {language === 'kn' ? 'ಎಐ ಗುರುತಿಸುತ್ತಿದೆ...' : 'AI Transcribing voice...'}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.listeningText}>
                  {isRecording
                    ? `🔴 ${language === 'kn' ? 'ಆಲಿಸಲಾಗುತ್ತಿದೆ' : 'Listening...'} (${formatTimer(recordingSeconds)})`
                    : t('voiceTapToSpeak')}
                </ThemedText>
              )}

              <ThemedText style={styles.languageIndicator}>
                {language === 'kn' ? 'ಭಾಷೆ: ಕನ್ನಡ (Kannada)' : 'Language: English'}
              </ThemedText>
            </View>

            {/* Spoken Text Display */}
            <View style={styles.spokenTextCard}>
              <TextInput
                style={styles.spokenTextInput}
                value={spokenText}
                onChangeText={setSpokenText}
                placeholder={
                  language === 'kn'
                    ? 'ನೀವು ಮಾತನಾಡಿದ ಪದ ಇಲ್ಲಿ ಮೂಡಿಬರುತ್ತದೆ...'
                    : 'Spoken words appear here...'
                }
                placeholderTextColor="#888"
                multiline
              />
            </View>

            {voiceError ? (
              <ThemedText style={styles.errorText}>{voiceError}</ThemedText>
            ) : null}

            {/* Voice Control Buttons */}
            <View style={styles.voiceControlRow}>
              {isRecording ? (
                <Pressable
                  style={[styles.actionBtn, styles.stopBtn]}
                  onPress={stopListeningAndTranscribe}
                >
                  <ThemedText style={styles.actionBtnText}>
                    ⏹️ {t('voiceStop')}
                  </ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.actionBtn, styles.listenBtn]}
                  onPress={startListening}
                >
                  <ThemedText style={styles.actionBtnText}>
                    🎙️ {t('voiceTapToSpeak')}
                  </ThemedText>
                </Pressable>
              )}

              <Pressable
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={handleConfirm}
                disabled={isTranscribing}
              >
                <ThemedText style={styles.actionBtnText}>
                  ✓ {t('voiceConfirm')}
                </ThemedText>
              </Pressable>
            </View>

            {/* Quick Voice Suggestions */}
            <View style={styles.suggestionsSection}>
              <ThemedText style={styles.suggestionsTitle}>
                {t('voiceSuggestions')}
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsList}
              >
                {getSuggestions().map((item, idx) => (
                  <Pressable
                    key={idx}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestionPress(item)}
                  >
                    <ThemedText style={styles.suggestionText}>
                      🗣️ {item}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Keyboard Mic Tip for Farmers */}
            <View style={styles.tipBox}>
              <ThemedText style={styles.tipBoxText}>
                {t('voiceKeyboardTip')}
              </ThemedText>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
  },
  input: {
    paddingRight: 48,
  },
  voiceButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -17 }],
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#81C784',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  voiceIcon: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#555',
    fontWeight: 'bold',
  },
  visualizerContainer: {
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  pulsingCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#C8E6C9',
  },
  pulsingCircleActive: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
    transform: [{ scale: 1.08 }],
  },
  largeMic: {
    fontSize: 34,
  },
  listeningText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 8,
  },
  transcribingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  transcribingText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  languageIndicator: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  spokenTextCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: Spacing.two,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 65,
    marginVertical: Spacing.two,
    justifyContent: 'center',
  },
  spokenTextInput: {
    fontSize: 16,
    color: '#111',
    lineHeight: 22,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginBottom: Spacing.one,
    textAlign: 'center',
  },
  voiceControlRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  stopBtn: {
    backgroundColor: '#D32F2F',
  },
  listenBtn: {
    backgroundColor: '#2E7D32',
  },
  confirmBtn: {
    backgroundColor: '#1565C0',
  },
  suggestionsSection: {
    marginTop: Spacing.two,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  suggestionsList: {
    gap: 8,
    paddingVertical: 4,
  },
  suggestionChip: {
    backgroundColor: '#F1F8E9',
    borderWidth: 1,
    borderColor: '#AED581',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionText: {
    fontSize: 13,
    color: '#33691E',
    fontWeight: '500',
  },
  tipBox: {
    marginTop: Spacing.three,
    padding: Spacing.two,
    backgroundColor: '#FFFDE7',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FBC02D',
  },
  tipBoxText: {
    fontSize: 11,
    color: '#7F6000',
    lineHeight: 16,
  },
});
