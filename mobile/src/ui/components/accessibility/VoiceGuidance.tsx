import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from '../../i18n/TranslationProvider';

interface VoiceGuidanceProps {
  text: string;
  urgency?: 'normal' | 'important' | 'critical';
  autoPlay?: boolean;
}

export const VoiceGuidance: React.FC<VoiceGuidanceProps> = ({
  text,
  urgency = 'normal',
  autoPlay = false
}) => {
  const { t, currentLanguage } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);

  // This would integrate with device TTS in a real implementation
  const speakText = async () => {
    setIsPlaying(true);
    
    // Mock TTS implementation - in real app, use react-native-tts
    console.log(`TTS (${currentLanguage}): ${text}`);
    
    // Simulate speech duration
    setTimeout(() => setIsPlaying(false), 2000);
  };

  useEffect(() => {
    if (autoPlay) {
      speakText();
    }
  }, [autoPlay, text]);

  const getUrgencyColor = () => {
    switch (urgency) {
      case 'critical': return '#e74c3c';
      case 'important': return '#f39c12';
      default: return '#3498db';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: getUrgencyColor() }]}
        onPress={speakText}
        disabled={isPlaying}
      >
        <Text style={styles.buttonText}>
          {isPlaying ? t('accessibility.playing', 'Playing...') : t('accessibility.listen', 'Listen')}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.instructionText}>
        {t('accessibility.tap_to_listen', 'Tap to listen to instructions')}
      </Text>
    </View>
  );
};

    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center'
  },
  instructionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center'
  }
});
