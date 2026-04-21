import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Preset components
export const SkeletonCard = ({ style }: { style?: ViewStyle }) => (
  <SkeletonLoader width="100%" height={80} borderRadius={12} style={style} />
);

export const SkeletonText = ({ width = '70%', style }: { width?: string | number, style?: ViewStyle }) => (
  <SkeletonLoader width={width} height={16} borderRadius={6} style={style} />
);

export const SkeletonCircle = ({ size = 48, style }: { size?: number, style?: ViewStyle }) => (
  <SkeletonLoader width={size} height={size} borderRadius={size / 2} style={style} />
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#243044', // Matches backgroundCard in new theme
  },
});
