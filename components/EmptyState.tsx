import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { icons } from '@/constants';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface EmptyStateProps {
  icon?: React.ReactNode;
  image?: any;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * A premium empty state component to show when no data is available.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  image,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <Animated.View 
      entering={FadeInDown.duration(600).springify()}
      className={`flex-1 items-center justify-center p-8 ${className}`}
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        {image ? (
          <Image source={image} style={styles.image} resizeMode="contain" />
        ) : icon ? (
          icon
        ) : (
          <icons.logoBox width={100} height={100} opacity={0.2} />
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 300,
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 160,
    height: 160,
    opacity: 0.8,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Nunito-ExtraBold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Nunito-Medium',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '85%',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#D30309',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 100,
    shadowColor: '#D30309',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
});

export default EmptyState;
