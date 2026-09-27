import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeftIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowPathIcon,
} from 'react-native-heroicons/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from 'react-native-heroicons/solid';
import { productsAPI } from '@/lib/api/products';
import { sellerRoutes } from '@/constants/routes';
import { useActiveRoleProfile } from '@/hooks/useUserProfile';
import LoadingOverlay from '@/components/LoadingOverlay';
import AndroidNavBarSpacer from '@/components/AndroidNavBarSpacer';

const SUBSCRIPTION_AMOUNT = 15000;

const PRO_FEATURES = (isVehicleRental: boolean) => [
  `Unlimited ${isVehicleRental ? 'vehicle' : 'car & spare part'} listings`,
  'Priority search placement & buyer discovery',
  'Verified Pro Seller trust badge on listings',
  'Full listing views & sales performance insights',
  'Dedicated customer & mechanic support',
  'Early access to live auction & bidding tools',
];

const SellerSubscription = () => {
  const params = useLocalSearchParams();
  const usedFreeUploads = Number(params.usedFreeUploads ?? 2);
  const [isLoading, setIsLoading] = useState(false);
  const { data: roleProfile, isVehicleRental, isLoading: isProfileLoading } = useActiveRoleProfile();

  // Extract subscription data based on role
  const profile = isVehicleRental
    ? roleProfile?.data?.vehicle_rental_profile
    : roleProfile?.data?.merchant_profile;
  const isSubscribed = profile?.is_subscribed || false;
  const expiresAt = profile?.subscription_expires_at;

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!expiresAt) return null;
    if (typeof expiresAt === 'number') return expiresAt;

    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = getDaysRemaining();

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const payload = {
        requestType: 'inbound',
        data: {
          callback_url: 'https://ogamechanic.com/subscription/callback',
          plan: 'monthly',
        },
      };

      const response = await productsAPI.initiatePayment(payload, isVehicleRental);

      if (response?.data?.payment_url) {
        router.push({
          pathname: sellerRoutes.subscriptionPayment as any,
          params: {
            paymentUrl: response.data.payment_url,
            paymentReference: response.data.payment_reference || response.data.reference,
            amount: String(response.data.amount || SUBSCRIPTION_AMOUNT),
          },
        });
      } else {
        Alert.alert('Error', 'Could not initiate payment. Please try again.');
      }
    } catch (err: any) {
      Alert.alert(
        'Payment Error',
        err?.response?.data?.message || err?.message || 'Failed to initiate subscription payment. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isProfileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#D30309" />
          <Text className="mt-3 font-NunitoMedium text-gray-500 text-sm">
            Loading subscription details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white flex-row items-center px-5 py-3.5 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
          activeOpacity={0.7}
        >
          <ArrowLeftIcon size={18} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-NunitoExtraBold text-gray-900 flex-1">
          {isSubscribed ? 'My Subscription' : 'Seller Membership'}
        </Text>
        {isSubscribed && (
          <View className="flex-row items-center bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
            <Text className="text-[11px] font-NunitoBold text-emerald-700 uppercase">
              Pro Active
            </Text>
          </View>
        )}
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 24,
        }}
      >
        {/* If Subscribed: Active Status Card */}
        {isSubscribed ? (
          <View className="bg-emerald-50/70 rounded-2xl p-5 mb-5 border border-emerald-200 shadow-sm">
            <View className="flex-row justify-between items-start mb-3">
              <View>
                <View className="flex-row items-center mb-1">
                  <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                  <Text className="text-[11px] font-NunitoBold text-emerald-800 uppercase tracking-wider">
                    Current Plan
                  </Text>
                </View>
                <Text className="text-xl font-NunitoExtraBold text-gray-900">
                  Pro Seller Membership
                </Text>
              </View>
              <View className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center">
                <ShieldCheckIcon size={20} color="#059669" />
              </View>
            </View>

            <Text className="text-xs font-NunitoMedium text-gray-600 leading-5 mb-4">
              You have unlimited listing capacity, priority search discovery, and verified seller status active.
            </Text>

            {/* Countdown / Expiry Pill */}
            {daysRemaining !== null && (
              <View className="bg-white rounded-xl p-3.5 flex-row items-center justify-between border border-emerald-100">
                <View className="flex-row items-center">
                  <ClockIcon size={16} color="#059669" />
                  <Text className="text-xs font-NunitoBold text-emerald-900 ml-2">
                    {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'} Remaining
                  </Text>
                </View>
                <Text className="text-[11px] font-NunitoMedium text-gray-500">
                  Renews Monthly
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* If Not Subscribed: Free Limit Capacity Card */
          <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-5 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1 pr-2">
                <View className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center mr-3">
                  <LockClosedIcon size={18} color="#D30309" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-NunitoBold text-gray-900">
                    Free Listing Capacity
                  </Text>
                  <Text className="text-xs font-NunitoMedium text-gray-500">
                    {usedFreeUploads} of 2 free uploads used
                  </Text>
                </View>
              </View>
              <View className={`px-2.5 py-1 rounded-full ${usedFreeUploads >= 2 ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                <Text className={`text-[10px] font-NunitoBold ${usedFreeUploads >= 2 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {usedFreeUploads >= 2 ? 'Limit Reached' : `${Math.max(0, 2 - usedFreeUploads)} Left`}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <View
                style={{ width: `${Math.min(100, (usedFreeUploads / 2) * 100)}%` }}
                className={`h-full rounded-full ${usedFreeUploads >= 2 ? 'bg-primary-500' : 'bg-emerald-500'}`}
              />
            </View>
          </View>
        )}

        {/* Hero Plan Showcase Card */}
        <View className="bg-white rounded-2xl p-5 mb-5 border-2 border-primary-500 shadow-sm relative overflow-hidden">
          {/* Top Badge & Duration */}
          <View className="flex-row items-center justify-between mb-3.5">
            <View className="bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              <Text className="text-[11px] font-NunitoBold text-primary-600 uppercase tracking-wider">
                {isSubscribed ? 'Active Plan' : 'Pro Membership'}
              </Text>
            </View>
            <Text className="text-xs font-NunitoSemiBold text-gray-400">Billed monthly</Text>
          </View>

          {/* Pricing Header */}
          <View className="mb-4">
            <View className="flex-row items-baseline">
              <Text className="text-3xl font-NunitoExtraBold text-gray-900 tracking-tight">
                ₦{SUBSCRIPTION_AMOUNT.toLocaleString()}
              </Text>
              <Text className="text-sm font-NunitoMedium text-gray-500 ml-1.5">/ month</Text>
            </View>
            <Text className="text-xs font-NunitoMedium text-gray-600 mt-1 leading-4">
              Unlimited uploads, priority search discovery, and verified merchant credentials.
            </Text>
          </View>

          <View className="h-px bg-gray-100 mb-4" />

          {/* Feature List */}
          <View className="space-y-3 gap-3">
            {PRO_FEATURES(isVehicleRental).map((feature, i) => (
              <View key={i} className="flex-row items-center">
                <CheckCircleIconSolid size={18} color="#059669" />
                <Text className="text-[13px] font-NunitoSemiBold text-gray-800 ml-2.5 flex-1 leading-5">
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Plan Comparison Table */}
        {!isSubscribed && (
          <View className="bg-white rounded-2xl p-5 border border-gray-200 mb-5 shadow-sm">
            <Text className="text-xs font-NunitoBold text-gray-400 uppercase tracking-wider mb-4">
              Why Upgrade to Pro?
            </Text>

            {/* Header row */}
            <View className="flex-row items-center pb-2.5 border-b border-gray-100">
              <Text className="flex-1 text-xs font-NunitoBold text-gray-700">Feature</Text>
              <Text className="w-16 text-center text-xs font-NunitoBold text-gray-400">Starter</Text>
              <Text className="w-16 text-center text-xs font-NunitoBold text-primary-600">Pro</Text>
            </View>

            {/* Row 1 */}
            <View className="flex-row items-center py-2.5 border-b border-gray-50">
              <Text className="flex-1 text-xs font-NunitoMedium text-gray-700">Listing Limit</Text>
              <Text className="w-16 text-center text-xs font-NunitoMedium text-gray-500">2 Items</Text>
              <Text className="w-16 text-center text-xs font-NunitoBold text-primary-600">Unlimited</Text>
            </View>

            {/* Row 2 */}
            <View className="flex-row items-center py-2.5 border-b border-gray-50">
              <Text className="flex-1 text-xs font-NunitoMedium text-gray-700">Search Ranking</Text>
              <Text className="w-16 text-center text-xs font-NunitoMedium text-gray-500">Standard</Text>
              <Text className="w-16 text-center text-xs font-NunitoBold text-primary-600">Priority ⚡</Text>
            </View>

            {/* Row 3 */}
            <View className="flex-row items-center py-2.5 border-b border-gray-50">
              <Text className="flex-1 text-xs font-NunitoMedium text-gray-700">Pro Verified Badge</Text>
              <Text className="w-16 text-center text-xs text-gray-300">—</Text>
              <View className="w-16 items-center">
                <CheckCircleIconSolid size={16} color="#10B981" />
              </View>
            </View>

            {/* Row 4 */}
            <View className="flex-row items-center py-2.5 border-b border-gray-50">
              <Text className="flex-1 text-xs font-NunitoMedium text-gray-700">Sales Analytics</Text>
              <Text className="w-16 text-center text-xs font-NunitoMedium text-gray-500">Basic</Text>
              <Text className="w-16 text-center text-xs font-NunitoBold text-primary-600">Full Access</Text>
            </View>

            {/* Row 5 */}
            <View className="flex-row items-center pt-2.5">
              <Text className="flex-1 text-xs font-NunitoMedium text-gray-700">Direct Support</Text>
              <Text className="w-16 text-center text-xs font-NunitoMedium text-gray-500">Standard</Text>
              <View className="w-16 items-center">
                <CheckCircleIconSolid size={16} color="#10B981" />
              </View>
            </View>
          </View>
        )}

        {/* Trust Badges */}
        <View className="bg-gray-100/70 rounded-2xl p-4 border border-gray-200">
          <View className="flex-row items-center mb-1.5">
            <ShieldCheckIcon size={16} color="#4B5563" />
            <Text className="text-xs font-NunitoBold text-gray-700 ml-1.5">
              Safe & Flexible Billing
            </Text>
          </View>
          <Text className="text-[11px] font-NunitoMedium text-gray-500 leading-4">
            Payments are processed securely via Paystack. Your plan activates immediately and you can cancel future renewals at any time.
          </Text>
        </View>
      </ScrollView>

      {/* ── Sticky Bottom Action Bar ── */}
      <View
        className="bg-white border-t border-gray-100 px-5 pt-3 pb-4"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        {!isSubscribed ? (
          <>
            <View className="flex-row items-center justify-between mb-2.5">
              <View>
                <Text className="text-[11px] font-NunitoBold text-gray-400 uppercase tracking-wider">
                  Total Due
                </Text>
                <View className="flex-row items-baseline">
                  <Text className="text-2xl font-NunitoExtraBold text-gray-900">
                    ₦{SUBSCRIPTION_AMOUNT.toLocaleString()}
                  </Text>
                  <Text className="text-xs font-NunitoMedium text-gray-500 ml-1">/ month</Text>
                </View>
              </View>
              <View className="flex-row items-center bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                <ShieldCheckIcon size={13} color="#059669" />
                <Text className="text-[11px] font-NunitoBold text-emerald-700 ml-1">Secure Paystack</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubscribe}
              disabled={isLoading}
              activeOpacity={0.88}
              className="bg-primary-500 py-3.5 rounded-2xl items-center justify-center flex-row shadow-lg shadow-red-500/25"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-NunitoBold text-[16px]">
                  Upgrade to Pro Now
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={handleSubscribe}
            disabled={isLoading}
            activeOpacity={0.88}
            className="bg-primary-500 py-3.5 rounded-2xl items-center justify-center flex-row shadow-lg shadow-red-500/25"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <ArrowPathIcon size={18} color="#FFFFFF" />
                <Text className="text-white font-NunitoBold text-[16px] ml-2">
                  Renew Pro Membership
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <AndroidNavBarSpacer />
      </View>

      <LoadingOverlay
        visible={isLoading}
        title="Securing your checkout..."
        subtitle="We're preparing your payment gateway. Please don't close the app."
      />
    </SafeAreaView>
  );
};

export default SellerSubscription;