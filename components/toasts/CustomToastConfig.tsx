import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from 'react-native-heroicons/solid';

type ToastVariant = 'success' | 'error' | 'info' | 'warn';

interface ToastVariantStyle {
  label: string;
  badgeBg: string;
  badgeBorder: string;
  iconColor: string;
  tagBg: string;
  tagText: string;
  accentBar: string;
  IconComponent: React.ComponentType<{ size: number; color: string }>;
}

const VARIANT_CONFIG: Record<ToastVariant, ToastVariantStyle> = {
  success: {
    label: 'SUCCESS',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    iconColor: '#059669',
    tagBg: 'bg-emerald-50',
    tagText: 'text-emerald-700',
    accentBar: 'bg-emerald-500',
    IconComponent: CheckCircleIcon,
  },
  error: {
    label: 'NOTICE',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    iconColor: '#E11D48',
    tagBg: 'bg-rose-50',
    tagText: 'text-rose-700',
    accentBar: 'bg-rose-500',
    IconComponent: ExclamationCircleIcon,
  },
  info: {
    label: 'UPDATE',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-200',
    iconColor: '#0F172A',
    tagBg: 'bg-slate-100',
    tagText: 'text-slate-800',
    accentBar: 'bg-slate-700',
    IconComponent: InformationCircleIcon,
  },
  warn: {
    label: 'ATTENTION',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    iconColor: '#D97706',
    tagBg: 'bg-amber-50',
    tagText: 'text-amber-700',
    accentBar: 'bg-amber-500',
    IconComponent: ExclamationTriangleIcon,
  },
};

const CustomToastCard: React.FC<ToastConfigParams<any> & { variant: ToastVariant }> = ({
  variant,
  text1,
  text2,
  hide,
  onPress,
}) => {
  const cfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.info;
  const Icon = cfg.IconComponent;
  const hasSubtitle = Boolean(text2 && text2.trim().length > 0);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => {
        if (onPress) {
          onPress();
        } else {
          hide();
        }
      }}
      className="w-[93%] max-w-[430px] bg-white rounded-[22px] p-3.5 border border-slate-200/90 overflow-hidden"
      style={{
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0.18,
        shadowRadius: 20,
        elevation: 10,
      }}
    >
      {/* Top Category Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className={`${cfg.tagBg} px-2.5 py-0.5 rounded-full border ${cfg.badgeBorder}`}>
          <Text className={`${cfg.tagText} font-NunitoBold text-[10px] tracking-wider uppercase`}>
            {cfg.label}
          </Text>
        </View>

        {/* Tactile Dismiss Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={(e) => {
            e.stopPropagation?.();
            hide();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className="w-6 h-6 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
        >
          <XMarkIcon size={12} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Main Toast Content */}
      <View className="flex-row items-center">
        <View className={`w-11 h-11 rounded-2xl ${cfg.badgeBg} border ${cfg.badgeBorder} items-center justify-center mr-3`}>
          <Icon size={22} color={cfg.iconColor} />
        </View>

        <View className="flex-1 mr-1">
          <Text
            className="text-slate-900 font-NunitoExtraBold text-[14px] leading-5 mb-0.5"
            numberOfLines={hasSubtitle ? 1 : 2}
          >
            {text1}
          </Text>

          {hasSubtitle && (
            <Text
              className="text-slate-600 font-NunitoMedium text-[12.5px] leading-[17px]"
              numberOfLines={2}
            >
              {text2}
            </Text>
          )}
        </View>
      </View>

      {/* Subtle Tactile Bottom Grabber */}
      <View className="w-8 h-1 bg-slate-200 rounded-full mx-auto mt-2" />
    </TouchableOpacity>
  );
};

export const customToastConfig: ToastConfig = {
  success: (props) => <CustomToastCard {...props} variant="success" />,
  error: (props) => <CustomToastCard {...props} variant="error" />,
  info: (props) => <CustomToastCard {...props} variant="info" />,
  warn: (props) => <CustomToastCard {...props} variant="warn" />,
  warning: (props) => <CustomToastCard {...props} variant="warn" />,
};

export default customToastConfig;
