import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Episode } from '../utils/apiClient';
import { PlayButton, Waveform, ProgressBar } from '../components';
import { colors, typography, spacing } from '../theme';

export default function AudioPlayerScreen({ route, navigation }: any) {
  const episode = route.params?.episode as Episode;
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  useEffect(() => {
    loadAudio();
    setupInterruptionHandling();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const setupInterruptionHandling = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error setting up interruption handling:', error);
    }
  };

  const loadAudio = async () => {
    try {
      setIsLoading(true);

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: episode.audio_url },
        { shouldPlay: false, rate: playbackSpeed },
        onPlaybackStatusUpdate
      );

      soundRef.current = newSound;
      setSound(newSound);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to load audio file');
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish && !status.isLooping) {
        setIsPlaying(false);
      }
    }
  };

  const handlePlayPause = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      Alert.alert('Error', 'Failed to control playback');
    }
  };

  const handleSeek = async (positionRatio: number) => {
    if (!sound) return;

    try {
      await sound.setPositionAsync(positionRatio * duration);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const handleSpeedChange = async (speed: number) => {
    if (!sound) return;

    try {
      await sound.setRateAsync(speed, true);
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
    } catch (error) {
      console.error('Error changing speed:', error);
    }
  };

  const handleSkip = async (seconds: number) => {
    if (!sound) return;
    const newPosition = Math.max(0, Math.min(position + seconds * 1000, duration));
    try {
      await sound.setPositionAsync(newPosition);
    } catch (error) {
      console.error('Error skipping:', error);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleShowInfo = () => {
    Alert.alert(
      'Episode Details',
      'Feature coming soon! This will show articles, authors, and sources used in this episode.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShowInfo} style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={28} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Your Morning Briefing</Text>
          <Text style={styles.subtitle}>
            {new Date(episode.created_at).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text style={styles.loadingText}>Loading audio...</Text>
          </View>
        ) : (
          <>
            <View style={styles.waveformContainer}>
              <Waveform isPlaying={isPlaying} />
            </View>

            <View style={styles.progressContainer}>
              <ProgressBar progress={position / duration} onSeek={handleSeek} />
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => handleSkip(-15)}
                disabled={!sound}
              >
                <View style={styles.skipButtonContent}>
                  <Ionicons name="play-back" size={32} color={colors.text.primary} />
                  <Text style={styles.skipText}>15s</Text>
                </View>
              </TouchableOpacity>

              <PlayButton
                isPlaying={isPlaying}
                onPress={handlePlayPause}
                size="large"
              />

              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => handleSkip(30)}
                disabled={!sound}
              >
                <View style={styles.skipButtonContent}>
                  <Ionicons name="play-forward" size={32} color={colors.text.primary} />
                  <Text style={styles.skipText}>30s</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.secondaryControls}>
              <TouchableOpacity
                style={styles.speedButton}
                onPress={() => setShowSpeedMenu(!showSpeedMenu)}
              >
                <Ionicons name="speedometer-outline" size={16} color={colors.accent.primary} style={styles.speedIcon} />
                <Text style={styles.speedText}>{playbackSpeed}x</Text>
                <Ionicons name={showSpeedMenu ? "chevron-up" : "chevron-down"} size={16} color={colors.accent.primary} />
              </TouchableOpacity>

              {showSpeedMenu && (
                <View style={styles.speedMenu}>
                  {speeds.map((speed) => (
                    <TouchableOpacity
                      key={speed}
                      style={[
                        styles.speedMenuItem,
                        playbackSpeed === speed && styles.speedMenuItemActive,
                      ]}
                      onPress={() => handleSpeedChange(speed)}
                    >
                      <Text
                        style={[
                          styles.speedMenuText,
                          playbackSpeed === speed && styles.speedMenuTextActive,
                        ]}
                      >
                        {speed}x
                      </Text>
                      {playbackSpeed === speed && (
                        <Ionicons name="checkmark" size={18} color={colors.accent.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 50,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  waveformContainer: {
    marginBottom: spacing.xxl,
  },
  progressContainer: {
    marginBottom: spacing.xxl,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  timeText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxl * 1.5,
    marginBottom: spacing.xl,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    ...typography.small,
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  secondaryControls: {
    alignItems: 'center',
    position: 'relative',
  },
  speedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    gap: spacing.xs,
  },
  speedIcon: {
    marginRight: 4,
  },
  speedText: {
    ...typography.caption,
    color: colors.accent.primary,
    fontWeight: '600',
  },
  speedMenu: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  speedMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  speedMenuItemActive: {
    backgroundColor: colors.accent.primary + '20',
  },
  speedMenuText: {
    ...typography.body,
    color: colors.text.primary,
  },
  speedMenuTextActive: {
    color: colors.accent.primary,
    fontWeight: '600',
  },
});
