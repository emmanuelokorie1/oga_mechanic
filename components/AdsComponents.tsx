import { View, Text, Image, TouchableOpacity, Animated } from "react-native";
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { LinearGradient } from "expo-linear-gradient";
import { ShieldCheckIcon } from "react-native-heroicons/solid";
import { AdsProps } from "@/types/type";

interface ExtendedAdsProps extends AdsProps {
  images?: { uri: string }[];
}

const AdsComponents = memo(
  ({
    image,
    images,
    title,
    description,
    onPress,
    price,
    currency = "NGN",
    year,
    repairHistoryCount = 0,
    isBidding = false,
  }: ExtendedAdsProps) => {
    const formattedPrice = useMemo(() => {
      if (!price) return null;
      const numPrice = typeof price === "string" ? parseFloat(price) : price;
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 0,
      }).format(numPrice);
    }, [price, currency]);

    const displayImages = useMemo(() => {
      if (images && images.length > 0) return images;
      if (image) return [image];
      return [];
    }, [images, image]);

    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{
          width: '100%',
          height: 170, // Reduced from 185 to 155 for a slimmer profile
          backgroundColor: '#111827',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Static Background Image Layer */}
        {displayImages.length > 0 && (
          <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
            <Image
              source={displayImages[0]} // Just show the first image statically
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Subtle gradient for badges at top */}
        <LinearGradient
          colors={["rgba(0,0,0,0.5)", "transparent"]}
          style={{ position: 'absolute', top: 0, width: '100%', height: 50 }}
        />
        
        {/* Rich gradient for text legibility at bottom */}
        <LinearGradient
          colors={["transparent", "rgba(15, 23, 42, 0.7)", "rgba(15, 23, 42, 0.95)"]}
          style={{ position: 'absolute', bottom: 0, width: '100%', height: 90 }} // Reduced gradient height
        />

        <View style={{ flex: 1, justifyContent: 'space-between', padding: 14 }}>
          
          {/* Top: Badges */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isBidding && (
              <View style={{ backgroundColor: 'rgba(225, 29, 72, 0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 4, height: 4, backgroundColor: '#FFFFFF', borderRadius: 2, marginRight: 4 }} />
                <Text style={{ fontSize: 9, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 }} className="font-NunitoExtraBold">Live</Text>
              </View>
            )}
            {repairHistoryCount > 0 && (
              <View style={{ backgroundColor: 'rgba(5, 150, 105, 0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                <ShieldCheckIcon size={10} color="white" />
                <Text style={{ fontSize: 9, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }} className="font-NunitoExtraBold">Verified</Text>
              </View>
            )}
          </View>

          {/* Bottom: Info (Highly Structured) */}
          <View style={{ paddingBottom: 12 }}> 
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              
              {/* Left Side: Vehicle Info */}
              <View style={{ flex: 1, paddingRight: 16 }}>
                {year && (
                  <Text style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }} className="font-NunitoExtraBold">
                    {year} MODEL
                  </Text>
                )}
                <Text style={{ fontSize: 17, color: '#FFFFFF', letterSpacing: -0.5 }} numberOfLines={1} className="font-NunitoExtraBold">
                  {title}
                </Text>
              </View>
              
              {/* Right Side: Price */}
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }} className="font-NunitoBold">
                  {isBidding ? "Current Bid" : "Price"}
                </Text>
                <Text style={{ fontSize: 16, color: '#FFFFFF', letterSpacing: -0.5 }} className="font-NunitoExtraBold">
                  {formattedPrice || "Contact"}
                </Text>
              </View>

            </View>
          </View>

        </View>
      </TouchableOpacity>
    );
  }
);

export default AdsComponents;
