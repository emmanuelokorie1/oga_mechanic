import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeftIcon,
  PlusIcon,
  ChevronRightIcon,
  BuildingLibraryIcon,
} from 'react-native-heroicons/outline';
import { router } from 'expo-router';
import { useBankAccounts } from '@/hooks/useUserProfile';
import { UserBankAccount } from '@/lib/api/user';
import { LinearGradient } from 'expo-linear-gradient';
import AddBankModal from '@/components/modals/AddBankModal';
import BankAccountDetailsModal from '@/components/modals/BankAccountDetailsModal';

const BankInfo = () => {
  const { data: bankAccountsResponse, isLoading, refetch } = useBankAccounts();
  const bankAccounts = bankAccountsResponse?.data || [];
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [selectedAccountId, setSelectedAccountId] = React.useState<number | string | null>(null);
  const [showDetailModal, setShowDetailModal] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const renderAccountItem = (account: UserBankAccount, index: number) => (
    <TouchableOpacity
      key={account.id}
      activeOpacity={0.85}
      onPress={() => {
        setSelectedAccountId(account.id);
        setShowDetailModal(true);
      }}
      className={`flex-row items-center justify-between py-5 ${index !== bankAccounts.length - 1 ? "border-b border-gray-100" : ""
        }`}
    >
      {/* Left Section */}
      <View className="flex-row items-center flex-1">
        {/* Bank Icon */}
        <View className="w-10 h-10 bg-white rounded-2xl items-center justify-center border border-gray-100 mr-4 shadow-sm">
          <BuildingLibraryIcon size={20} color="#334155" strokeWidth={1.5} />
        </View>

        {/* Account Info */}
        <View className="flex-1">
          {/* Account Name */}
          <Text className="text-[#0F172A] font-NunitoExtraBold text-[14px] uppercase tracking-tight">
            {account.account_name}
          </Text>

          {/* Bank Name */}
          <Text className="text-[#64748B] font-NunitoMedium text-[14px] mt-0.5">
            {account.bank_name || account.bank?.name || "Unknown Bank"}
          </Text>

          {/* Account Number */}
          <View className="flex-row items-center mt-1">
            <Text className="text-[#94A3B8] font-NunitoMedium text-[13px]">
              {account.account_number}
            </Text>

            <View className="w-1 h-1 rounded-full bg-[#9333EA] ml-2" />

            {account.is_default && (
              <View className="ml-2 px-2.5 py-0.5 bg-primary-500/10 rounded-full">
                <Text className="text-primary-500 text-[11px] font-NunitoBold">
                  Default
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Right Arrow */}
      <ChevronRightIcon size={18} color="#CBD5F5" strokeWidth={2.5} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F9FBFC]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Navbar/Back Button */}
      <View className="px-6 py-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white rounded-full items-center justify-center -ml-2 border border-gray-100 shadow-sm shadow-gray-100"
        >
          <ChevronLeftIcon size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: Platform.OS === 'android' ? 70 : 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !!bankAccounts.length}
            onRefresh={onRefresh}
            tintColor="#7C3AED"
          />
        }
      >
        {/* Header Section */}
        <View className="mb-10 mt-2">
          <Text className="text-[30px] font-NunitoExtraBold text-[#1E293B] mb-2 leading-tight">
            Withdrawal Account
          </Text>
          <Text className="text-[#64748B] font-NunitoMedium text-[16px] leading-[22px]">
            Manage your existing accounts for withdrawal and also add multiple accounts.
          </Text>
        </View>

        {isLoading && !bankAccounts.length ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : bankAccounts.length > 0 ? (
          <View className="bg-white rounded-[32px] px-5 border border-gray-100 shadow-xl shadow-gray-200/50 mb-10 overflow-hidden">
            {bankAccounts.map((account, index) => renderAccountItem(account, index))}
          </View>
        ) : (
          <View className="items-center justify-center py-16 px-6 bg-white rounded-[32px] border border-gray-100 shadow-sm mb-10">
            <View className="w-16 h-16 bg-gray-50 rounded-full items-center justify-center mb-6">
              <BuildingLibraryIcon size={32} color="#94A3B8" />
            </View>
            <Text className="text-xl font-NunitoExtraBold text-[#1E293B] text-center mb-2">
              No Withdrawal Accounts
            </Text>
            <Text className="text-[#64748B] font-NunitoMedium text-center leading-6">
              You haven't added any withdrawal accounts yet.
            </Text>
          </View>
        )}

        {/* Add Button */}
        <TouchableOpacity
          className="flex-row items-center justify-center py-5 bg-white border border-gray-200 rounded-[32px] shadow-sm shadow-gray-100"
          onPress={() => setShowAddModal(true)}
        >
          <PlusIcon size={20} color="#1E293B" strokeWidth={3} />
          <Text className="text-[#1E293B] text-[18px] font-NunitoBold ml-2">Add bank account</Text>
        </TouchableOpacity>
      </ScrollView>

      <AddBankModal
        isVisible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <BankAccountDetailsModal
        isVisible={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedAccountId(null);
        }}
        accountId={selectedAccountId}
      />
    </SafeAreaView>
  );
};

export default BankInfo;