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

// ─── Safe imports: try native speech recognition first, then expo-audio fallback ───
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;
let HAS_NATIVE_SPEECH = false;

try {
  const speechMod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechMod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechMod.useSpeechRecognitionEvent;
  // Verify the module actually loaded (won't if native code isn't compiled in)
  if (ExpoSpeechRecognitionModule && typeof ExpoSpeechRecognitionModule.start === 'function') {
    HAS_NATIVE_SPEECH = true;
  }
} catch (e) {
  console.log('expo-speech-recognition not available, will use expo-audio fallback');
}

// Fallback: expo-audio for recording + Gemini for transcription
let AudioModule: any = null;
let useAudioRecorder: any = null;
let RecordingPresets: any = null;
let setAudioModeAsync: any = null;

try {
  const expoAudio = require('expo-audio');
  AudioModule = expoAudio.AudioModule;
  useAudioRecorder = expoAudio.useAudioRecorder;
  RecordingPresets = expoAudio.RecordingPresets;
  setAudioModeAsync = expoAudio.setAudioModeAsync || AudioModule?.setAudioModeAsync;
} catch (e) {
  console.log('expo-audio not available:', e);
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

// ─── Inner modal content: uses hooks so it's only mounted when modal is visible ───
function VoiceModalContent({
  voiceCategory,
  voiceTitle,
  language,
  t,
  onConfirm,
  onClose,
  initialText,
}: {
  voiceCategory: VoiceCategory;
  voiceTitle?: string;
  language: string;
  t: (key: any) => string;
  onConfirm: (text: string) => void;
  onClose: () => void;
  initialText: string;
}) {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [spokenText, setSpokenText] = useState(initialText);
  const [voiceError, setVoiceError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mode, setMode] = useState<'native' | 'audio' | 'none'>('none');
  const timerRef = useRef<any>(null);

  // expo-audio recorder hook (always called — hooks must be unconditional)
  const recorder = useAudioRecorder
    ? useAudioRecorder(RecordingPresets?.HIGH_QUALITY || {})
    : null;

  // ─── Native speech recognition event handlers (only if available) ───
  if (HAS_NATIVE_SPEECH && useSpeechRecognitionEvent) {
    useSpeechRecognitionEvent('start', () => {
      setIsRecognizing(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    });

    useSpeechRecognitionEvent('end', () => {
      setIsRecognizing(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    useSpeechRecognitionEvent('result', (event: any) => {
      const transcript = event.results?.[0]?.transcript ?? '';
      if (transcript) {
        setSpokenText(transcript);
        setVoiceError('');
      }
    });

    useSpeechRecognitionEvent('error', (event: any) => {
      console.log('Speech recognition error:', event.error, event.message);
      setIsRecognizing(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const errCode = event.error;
      if (errCode === 'no-speech') {
        setVoiceError(
          language === 'kn'
            ? 'ಯಾವುದೇ ಮಾತು ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಮಾತನಾಡಿ.'
            : 'No speech detected. Please tap the mic and speak clearly.'
        );
      } else if (errCode === 'not-allowed') {
        setVoiceError(
          language === 'kn'
            ? 'ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ.'
            : 'Microphone permission denied. Allow it in Settings.'
        );
      } else {
        setVoiceError(
          language === 'kn'
            ? 'ಧ್ವನಿ ಗ್ರಹಣ ದೋಷ. ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.'
            : 'Recognition error. Try again or select a suggestion.'
        );
      }
    });
  }

  useEffect(() => {
    startListening();
    return () => stopListening();
  }, []);

  const getLangCode = () => (language === 'kn' ? 'kn-IN' : 'en-IN');

  // ─── Start: tries native speech → expo-audio fallback ───
  const startListening = async () => {
    setVoiceError('');
    setSpokenText('');
    setElapsed(0);

    // 1) Web platform: use Web Speech API
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = getLangCode();
        rec.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((r: any) => r[0].transcript)
            .join('');
          setSpokenText(transcript);
        };
        rec.onerror = () => setIsRecognizing(false);
        rec.onend = () => setIsRecognizing(false);
        rec.start();
        setIsRecognizing(true);
        setMode('native');
        return;
      }
    }

    // 2) Native: try expo-speech-recognition (available after new APK)
    if (HAS_NATIVE_SPEECH && ExpoSpeechRecognitionModule) {
      try {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          setVoiceError(
            language === 'kn'
              ? 'ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ.'
              : 'Microphone permission denied.'
          );
          return;
        }
        ExpoSpeechRecognitionModule.start({
          lang: getLangCode(),
          interimResults: true,
          continuous: false,
          requiresOnDeviceRecognition: false,
        });
        setMode('native');
        return;
      } catch (err) {
        console.log('Native speech start failed, falling through to audio:', err);
      }
    }

    // 3) Fallback: expo-audio recording + Gemini transcription
    if (recorder && AudioModule) {
      try {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          setVoiceError(
            language === 'kn'
              ? 'ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಸೆಟ್ಟಿಂಗ್ಸ್‌ನಲ್ಲಿ ಅನುಮತಿ ನೀಡಿ.'
              : 'Microphone permission denied. Please allow it in Settings.'
          );
          return;
        }

        if (setAudioModeAsync) {
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
          });
        }

        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecognizing(true);
        setMode('audio');
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
        return;
      } catch (err: any) {
        console.log('Audio recording start failed:', err);
        setVoiceError(err.message || 'Could not access microphone.');
        return;
      }
    }

    // 4) Nothing available
    setVoiceError(
      language === 'kn'
        ? 'ಧ್ವನಿ ಗ್ರಹಣ ಲಭ್ಯವಿಲ್ಲ. ಕೆಳಗಿನ ಸಲಹೆಗಳನ್ನು ಒತ್ತಿ ಆಯ್ಕೆಮಾಡಿ.'
        : 'Voice input unavailable. Please select a suggestion below or type manually.'
    );
  };

  // ─── Stop: handles both native and audio-recording modes ───
  const stopListening = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mode === 'native') {
      try { ExpoSpeechRecognitionModule?.stop(); } catch {}
      setIsRecognizing(false);
      return;
    }

    // Audio mode: stop recording → transcribe with Gemini
    if (mode === 'audio' && recorder) {
      setIsRecognizing(false);
      setIsTranscribing(true);

      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) throw new Error('No audio file');

        // Read audio as base64
        const resp = await fetch(uri);
        const blob = await resp.blob();
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.includes(',') ? res.split(',')[1] : res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (!base64Audio) throw new Error('Audio conversion failed');

        // Send to Gemini for speech-to-text
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const geminiResp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `You are a speech recognition assistant for an Indian farming app.
The user spoke into their microphone in ${language === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English'}.
Category: ${voiceCategory}.
Transcribe the audio to text accurately.
- If Kannada, output Kannada script (e.g. ಮಂಡ್ಯ, ಟೊಮ್ಯಾಟೊ).
- If English, output English text.
- If a number, output the number.
- Output ONLY the recognized text. No explanations.`,
                },
                {
                  inline_data: {
                    mime_type: 'audio/m4a',
                    data: base64Audio,
                  },
                },
              ],
            }],
          }),
        });

        const json = await geminiResp.json();
        const transcribed = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        console.log('Gemini transcribed:', transcribed);

        if (transcribed) {
          setSpokenText(transcribed);
        } else {
          setVoiceError(
            language === 'kn'
              ? 'ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ಮತ್ತೊಮ್ಮೆ ಮಾತನಾಡಿ ಅಥವಾ ಸಲಹೆ ಆಯ್ಕೆಮಾಡಿ.'
              : 'Could not detect speech. Please speak again or pick a suggestion.'
          );
        }
      } catch (err: any) {
        console.log('Audio transcription error:', err);
        setVoiceError(
          language === 'kn'
            ? 'ಧ್ವನಿ ಪ್ರಕ್ರಿಯೆ ವಿಫಲ. ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.'
            : 'Voice processing failed. Try again.'
        );
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  const handleConfirm = async () => {
    if (isRecognizing) {
      await stopListening();
    }
    // Small delay to let transcription finish if audio mode
    setTimeout(() => {
      onConfirm(spokenText.trim());
    }, mode === 'audio' && isTranscribing ? 500 : 0);
  };

  const handleSuggestionPress = (text: string) => {
    const cleanText = text.includes(' (') ? text.split(' (')[0] : text;
    try { ExpoSpeechRecognitionModule?.stop(); } catch {}
    if (recorder && mode === 'audio') {
      try { recorder.stop(); } catch {}
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecognizing(false);
    setSpokenText(cleanText);
    onConfirm(cleanText);
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const getSuggestions = () => {
    if (voiceCategory === 'address') {
      return language === 'kn'
        ? ['ಮಂಡ್ಯ', 'ಮೈಸೂರು', 'ಹಾಸನ', 'ಬೆಳಗಾವಿ', 'ಶಿವಮೊಗ್ಗ', 'ತುಮಕೂರು', 'ದಾವಣಗೆರೆ', 'ಕೋಲಾರ', 'ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ']
        : ['Mandya', 'Mysuru', 'Hassan', 'Belagavi', 'Shivamogga', 'Tumakuru', 'Davangere', 'Kolar', 'Bengaluru Rural'];
    }
    if (voiceCategory === 'crop') {
      return language === 'kn'
        ? ['ಟೊಮ್ಯಾಟೊ', 'ಭತ್ತ', 'ರಾಗಿ', 'ಮೆಕ್ಕೆಜೋಳ', 'ಕಬ್ಬು', 'ಹತ್ತಿ', 'ಈರುಳ್ಳಿ', 'ಅಡಿಕೆ', 'ಕಾಫಿ', 'ಶುಂಠಿ']
        : ['Tomato', 'Rice (Paddy)', 'Finger Millet (Ragi)', 'Maize', 'Sugarcane', 'Cotton', 'Onion', 'Arecanut', 'Coffee', 'Ginger'];
    }
    if (voiceCategory === 'number') {
      return ['0.5', '1', '1.5', '2', '2.5', '3', '4', '5', '8', '10', '15', '20'];
    }
    return language === 'kn'
      ? ['ಹೌದು', 'ಇಲ್ಲ', 'ಉತ್ತಮ', 'ಕಡಿಮೆ', 'ಸಾಧಾರಣ']
      : ['Yes', 'No', 'Good', 'Low', 'Medium'];
  };

  const modeLabel = mode === 'native'
    ? (language === 'kn' ? '⚡ ನೇರ ಧ್ವನಿ ಗ್ರಹಣ' : '⚡ Live Speech Recognition')
    : mode === 'audio'
    ? (language === 'kn' ? '🎵 ಆಡಿಯೋ + AI ಪರಿವರ್ತನೆ' : '🎵 Audio + AI Transcription')
    : '';

  return (
    <View style={styles.modalContent}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <ThemedText style={styles.modalTitle}>
          {voiceTitle || (language === 'kn' ? '🎙️ ಧ್ವನಿ ಇನ್‌ಪುಟ್' : '🎙️ Voice Input')}
        </ThemedText>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <ThemedText style={styles.closeBtnText}>✕</ThemedText>
        </Pressable>
      </View>

      {/* Mode indicator */}
      {modeLabel ? (
        <ThemedText style={styles.modeBadge}>{modeLabel}</ThemedText>
      ) : null}

      {/* Mic Visualizer */}
      <View style={styles.visualizerContainer}>
        <Pressable
          style={[styles.pulsingCircle, isRecognizing && styles.pulsingCircleActive]}
          onPress={isRecognizing ? () => stopListening() : startListening}
        >
          <ThemedText style={styles.largeMic}>🎙️</ThemedText>
        </Pressable>

        {isTranscribing ? (
          <View style={styles.transcribingRow}>
            <ActivityIndicator color="#2E7D32" size="small" />
            <ThemedText style={styles.listeningText}>
              {language === 'kn' ? 'AI ಧ್ವನಿ ಪರಿವರ್ತಿಸುತ್ತಿದೆ...' : 'AI transcribing voice...'}
            </ThemedText>
          </View>
        ) : isRecognizing ? (
          <ThemedText style={styles.listeningText}>
            {language === 'kn'
              ? `🔴 ಆಲಿಸಲಾಗುತ್ತಿದೆ... (${formatTimer(elapsed)})`
              : `🔴 Listening... (${formatTimer(elapsed)})`}
          </ThemedText>
        ) : (
          <ThemedText style={styles.listeningText}>
            {language === 'kn' ? '🎙️ ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ' : '🎙️ Tap mic to speak'}
          </ThemedText>
        )}

        <ThemedText style={styles.languageIndicator}>
          {language === 'kn' ? '🇮🇳 ಭಾಷೆ: ಕನ್ನಡ' : '🇮🇳 Language: English (India)'}
        </ThemedText>
      </View>

      {/* Transcribed text */}
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

      {voiceError ? <ThemedText style={styles.errorText}>{voiceError}</ThemedText> : null}

      {/* Controls */}
      <View style={styles.voiceControlRow}>
        {isRecognizing ? (
          <Pressable style={[styles.actionBtn, styles.stopBtn]} onPress={() => stopListening()}>
            <ThemedText style={styles.actionBtnText}>
              ⏹️ {language === 'kn' ? 'ನಿಲ್ಲಿಸಿ' : 'Stop'}
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.actionBtn, styles.listenBtn]}
            onPress={startListening}
            disabled={isTranscribing}
          >
            <ThemedText style={styles.actionBtnText}>
              🎙️ {language === 'kn' ? 'ಮಾತನಾಡಿ' : 'Speak'}
            </ThemedText>
          </Pressable>
        )}

        <Pressable
          style={[styles.actionBtn, styles.confirmBtn]}
          onPress={handleConfirm}
          disabled={isTranscribing}
        >
          <ThemedText style={styles.actionBtnText}>
            ✓ {language === 'kn' ? 'ದೃಢಪಡಿಸಿ' : 'Confirm'}
          </ThemedText>
        </Pressable>
      </View>

      {/* Quick Suggestions */}
      <View style={styles.suggestionsSection}>
        <ThemedText style={styles.suggestionsTitle}>
          {language === 'kn' ? '💡 ಬೇಗ ಆಯ್ಕೆ:' : '💡 Quick picks:'}
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsList}
        >
          {getSuggestions().map((item, idx) => (
            <Pressable key={idx} style={styles.suggestionChip} onPress={() => handleSuggestionPress(item)}>
              <ThemedText style={styles.suggestionText}>🗣️ {item}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Tip */}
      <View style={styles.tipBox}>
        <ThemedText style={styles.tipBoxText}>
          {mode === 'audio'
            ? (language === 'kn'
              ? '💡 ಮಾತನಾಡಿ → ನಿಲ್ಲಿಸಿ ಒತ್ತಿ → AI ನಿಮ್ಮ ಮಾತನ್ನು ಅಕ್ಷರಗಳಾಗಿ ಪರಿವರ್ತಿಸುತ್ತದೆ.'
              : '💡 Speak → Tap Stop → AI will convert your voice to text.')
            : (language === 'kn'
              ? '💡 ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ. ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್ ಎರಡೂ ಅರ್ಥವಾಗುತ್ತದೆ.'
              : '💡 Speak clearly near the mic. Both Kannada and English are understood.')}
        </ThemedText>
      </View>
    </View>
  );
}

// ─── Main exported component ───
export function VoiceTextInput({
  containerStyle,
  inputStyle,
  voiceCategory = 'general',
  voiceTitle,
  value,
  onChangeText,
  placeholder,
  onVoiceSubmitted,
  ...props
}: VoiceTextInputProps) {
  const { language, t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = () => setModalVisible(true);

  const handleConfirm = (text: string) => {
    if (text) {
      onChangeText?.(text);
      onVoiceSubmitted?.(text);
    }
    setModalVisible(false);
  };

  const handleClose = () => {
    setModalVisible(false);
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

      {/* Mic button overlaid on the right of the input */}
      <Pressable
        style={styles.voiceButton}
        onPress={openModal}
        hitSlop={8}
        accessibilityLabel={language === 'kn' ? 'ಧ್ವನಿ ಇನ್‌ಪುಟ್' : 'Voice Input'}
      >
        <ThemedText style={styles.voiceIcon}>🎙️</ThemedText>
      </Pressable>

      {/* Voice Modal — inner content only mounts when visible */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          {modalVisible && (
            <VoiceModalContent
              voiceCategory={voiceCategory}
              voiceTitle={voiceTitle}
              language={language}
              t={t}
              onConfirm={handleConfirm}
              onClose={handleClose}
              initialText={value || ''}
            />
          )}
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
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
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
  modeBadge: {
    fontSize: 11,
    color: '#1565C0',
    fontWeight: '600',
    backgroundColor: '#E3F2FD',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: Spacing.one,
    overflow: 'hidden',
  },
  visualizerContainer: {
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  pulsingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#C8E6C9',
    marginBottom: 8,
  },
  pulsingCircleActive: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
    transform: [{ scale: 1.1 }],
  },
  largeMic: {
    fontSize: 36,
  },
  transcribingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listeningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 4,
    textAlign: 'center',
  },
  languageIndicator: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
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
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
    marginTop: Spacing.one,
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
    marginTop: Spacing.two,
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
