import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface PlayButtonProps {
  isPlaying: boolean;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}

const sizeMap = {
  small: { container: 48, icon: 24 },
  medium: { container: 64, icon: 32 },
  large: { container: 80, icon: 40 },
};

export const PlayButton: React.FC<PlayButtonProps> = ({
  isPlaying,
  onPress,
  size = 'large',
}) => {
  const dimensions = sizeMap[size];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: dimensions.container,
          height: dimensions.container,
          borderRadius: dimensions.container / 2,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={dimensions.icon}
          color={colors.text.primary}
          style={!isPlaying && { marginLeft: 4 }}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
