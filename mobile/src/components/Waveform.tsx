import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme';

interface WaveformProps {
  isPlaying: boolean;
  bars?: number;
}

export const Waveform: React.FC<WaveformProps> = ({ isPlaying, bars = 40 }) => {
  const animations = useRef(
    Array.from({ length: bars }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isPlaying) {
      const animateBar = (index: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(animations[index], {
              toValue: Math.random() * 0.7 + 0.3,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(animations[index], {
              toValue: Math.random() * 0.5 + 0.2,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ])
        ).start();
      };

      animations.forEach((_, index) => {
        setTimeout(() => animateBar(index), index * 20);
      });
    } else {
      animations.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [isPlaying]);

  return (
    <View style={styles.container}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['20%', '100%'],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 120,
    paddingHorizontal: 4,
  },
  bar: {
    width: 4,
    backgroundColor: colors.accent.primary,
    borderRadius: 2,
    opacity: 0.7,
  },
});
