import React from 'react';
import { View, StyleSheet, PanResponder, Animated } from 'react-native';
import { colors, spacing } from '../theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  onSeek?: (position: number) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, onSeek }) => {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const progressValue = React.useRef(new Animated.Value(progress)).current;
  const isDragging = React.useRef(false);
  const containerRef = React.useRef<View>(null);

  React.useEffect(() => {
    if (!isDragging.current) {
      Animated.timing(progressValue, {
        toValue: progress,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  const handleSeek = (locationX: number) => {
    if (onSeek && containerWidth > 0) {
      const position = Math.max(0, Math.min(1, locationX / containerWidth));
      progressValue.setValue(position);
      onSeek(position);
    }
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        isDragging.current = true;
        if (containerRef.current) {
          containerRef.current.measure((x, y, width, height, pageX, pageY) => {
            const locationX = evt.nativeEvent.pageX - pageX;
            handleSeek(locationX);
          });
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (containerRef.current) {
          containerRef.current.measure((x, y, width, height, pageX, pageY) => {
            const locationX = evt.nativeEvent.pageX - pageX;
            handleSeek(locationX);
          });
        }
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    })
  ).current;

  return (
    <View
      style={styles.container}
      ref={containerRef}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.trackContainer} {...panResponder.panHandlers}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              {
                width: progressValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.thumbTouchArea,
            {
              transform: [
                {
                  translateX: progressValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, containerWidth],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.thumb} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: spacing.md,
  },
  trackContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  track: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  thumbTouchArea: {
    position: 'absolute',
    left: -20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
