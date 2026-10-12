import React from 'react';
import { View, Image } from 'react-native';
import { icons } from '@/constants';

interface IconViewProps {
  size?: number;
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
  shadow?: boolean;
}

const IconView: React.FC<IconViewProps> = ({
  size = 100,
  backgroundColor = 'bg-red-500',
  borderRadius = 12,
  padding = 16,
  shadow = true
}) => {
  return (
    <View 
      className={`${backgroundColor} items-center justify-center`}
      style={{
        width: size,
        height: size,
        borderRadius,
        padding,
        shadowColor: shadow ? '#000' : 'transparent',
        shadowOffset: {
          width: 0,
          height: shadow ? 4 : 0,
        },
        shadowOpacity: shadow ? 0.15 : 0,
        shadowRadius: shadow ? 8 : 0,
        elevation: shadow ? 8 : 0,
      }}
    >
      <icons.splash 
        width="100%" 
        height="100%"
        fill="#ffffff"
      />
    </View>
  );
};

export default IconView;
