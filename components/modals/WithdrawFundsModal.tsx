
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { XMarkIcon } from "react-native-heroicons/outline";
import { CheckCircleIcon, PlusIcon } from "react-native-heroicons/solid";
import { NairaCurrency } from "@/utils/useCurrencyFormatter";
import CustomButton from "../CustomButton";
import { router, type Href } from "expo-router";
import { mechanicRoutes, sellerRoutes } from "@/constants/routes";
import AndroidNavBarSpacer from "../AndroidNavBarSpacer";
import { useBankAccounts, useWithdrawFunds } from "@/hooks/useUserProfile";
import AddBankModal from "@/components/modals/AddBankModal";

const { width } = Dimensions.get("window");

interface WithdrawFundsModalProps {
  isVisible: boolean;
  onClose: () => void;
  availableBalance: number;
  confirmWithdrawalRoute?: Href; // Add route prop
  userType?: 'mechanic' | 'seller' | 'driver' | 'rider'; // Add user type for dynamic routing
}

const WithdrawFundsModal = ({
  isVisible,
  onClose,
  availableBalance,
  confirmWithdrawalRoute,
  userType = 'mechanic', // Default to mechanic for backward compatibility
}: WithdrawFundsModalProps) => {
  // Auto-determine route if not provided
  const getDefaultRoute = (): Href => {
    if (confirmWithdrawalRoute) return confirmWithdrawalRoute;
    
    switch (userType) {
      case 'seller':
        return sellerRoutes.ConfirmWithdrawal;
      case 'mechanic':
      case 'driver':
      case 'rider':
      default:
        return mechanicRoutes.ConfirmWithdrawal;
    }
  };

  const withdrawalRoute = getDefaultRoute();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [showAddBankModal, setShowAddBankModal] = useState(false);

  const { data: banksResponse, isLoading: isLoadingBanks } = useBankAccounts(isVisible);
  const bankAccounts = banksResponse?.data || [];
  
  const { mutate: withdraw, isPending: isWithdrawing } = useWithdrawFunds();

  const quickAmounts = ["10,000", "20,000", "30,000", "50,000"];

  // Reset fields when modal is closed
  React.useEffect(() => {
    if (!isVisible) {
      setWithdrawAmount("");
      setSelectedAmount("");
      setDescription("");
    }
  }, [isVisible]);

  // Set default bank if available
  React.useEffect(() => {
    if (bankAccounts.length > 0 && !selectedBankAccountId) {
      setSelectedBankAccountId(String(bankAccounts[0].id));
    }
  }, [bankAccounts, selectedBankAccountId]);

  const numericAmount = parseFloat(withdrawAmount.replace(/,/g, "")) || 0;

  const handleQuickAmount = (amount: string) => {
    const num = parseFloat(amount.replace(/,/g, ""));
    if (availableBalance > 0 && num > availableBalance) {
      Alert.alert("Invalid Amount", "Amount cannot exceed available balance");
      return;
    }
    if (selectedAmount === amount) {
      setSelectedAmount("");
      setWithdrawAmount("");
    } else {
      setSelectedAmount(amount);
      setWithdrawAmount(amount);
    }
  };

  const handleWithdraw = () => {
    if (!numericAmount || numericAmount === 0) {
      Alert.alert("Amount Required", "Please enter an amount to withdraw");
      return;
    }
    if (numericAmount > availableBalance) {
      Alert.alert("Invalid Amount", "Amount cannot exceed available balance");
      return;
    }
    if (numericAmount < 1000) {
      Alert.alert("Invalid Amount", "Minimum withdrawal amount is ₦1,000");
      return;
    }
    if (!selectedBankAccountId) {
      Alert.alert("Account Required", "Please select a bank account to receive funds");
      return;
    }

    withdraw(
      {
        amount: numericAmount,
        bank_account_id: selectedBankAccountId,
        description: description || `Withdrawal of ₦${withdrawAmount}`
      },
      {
        onSuccess: () => {
          onClose(); // Close modal first
          setTimeout(() => {
            router.push(withdrawalRoute);
          }, 100);
        },
        onError: (error: any) => {
          const errMsg = error?.response?.data?.message || "Something went wrong. Please try again.";
          Alert.alert("Withdrawal Failed", errMsg);
        }
      }
    );
  };

  const formatAmount = (text: string) => {
    // Remove all non-numeric characters
    const numericValue = text.replace(/[^0-9]/g, "");

    // Add commas for thousands
    if (numericValue) {
      return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return "";
  };

  const handleAmountChange = (text: string) => {
    const formatted = formatAmount(text);
    setWithdrawAmount(formatted);
    setSelectedAmount(""); // Clear selection when typing
  };

  const handleAddBankAccount = () => {
    setShowAddBankModal(true);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        {/* Backdrop tap to dismiss */}
        <TouchableWithoutFeedback onPress={isWithdrawing ? undefined : onClose}>
          <View
            className="absolute inset-0 bg-black/50"
            style={StyleSheet.absoluteFill}
          />
        </TouchableWithoutFeedback>

        {/* Modal Sheet Card (88% height) */}
        <View
          className="bg-white rounded-t-[32px] overflow-hidden shadow-2xl"
          style={{ height: "92%" }}
        >
          {/* Drag Handle Indicator */}
          <View className="items-center pt-3 pb-1">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </View>

          {/* Header */}
          <View className="bg-white border-b border-gray-100">
            <View className="flex-row items-center justify-between px-5 py-3">
              <TouchableOpacity
                onPress={onClose}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                activeOpacity={0.7}
                disabled={isWithdrawing}
              >
                <XMarkIcon size={20} color="#374151" />
              </TouchableOpacity>
              <Text className="text-xl font-NunitoBold text-gray-900">
                Withdraw funds
              </Text>
              <View className="w-10" />
            </View>
          </View>

          {/* Main Content */}
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
          >
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Available Balance Card */}
            <View className="bg-gray-50 rounded-2xl p-4 my-4 border border-gray-100 flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-NunitoMedium text-gray-500 mb-1">
                  Available Balance
                </Text>
                <NairaCurrency
                  value={availableBalance}
                  className="text-xl font-NunitoBold text-gray-900"
                />
              </View>
              {availableBalance > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    const formatted = formatAmount(Math.floor(availableBalance).toString());
                    setWithdrawAmount(formatted);
                    setSelectedAmount("");
                  }}
                  className="bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-200"
                  activeOpacity={0.7}
                  disabled={isWithdrawing}
                >
                  <Text className="text-xs font-NunitoBold text-red-600">
                    Withdraw All
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Amount Options */}
            <View className="mb-5">
              <Text className="text-sm font-NunitoBold text-gray-900 mb-3">
                Quick Select
              </Text>
              <View className="flex-row justify-between">
                {quickAmounts.map((amount) => {
                  const isSelected = selectedAmount === amount;
                  return (
                    <TouchableOpacity
                      key={amount}
                      onPress={() => handleQuickAmount(amount)}
                      disabled={isWithdrawing}
                      className={`flex-1 mx-1 py-3 rounded-2xl items-center justify-center border ${
                        isSelected
                          ? "border-red-600 bg-red-50"
                          : "border-gray-200 bg-white"
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-sm font-NunitoBold ${
                          isSelected ? "text-red-600" : "text-gray-700"
                        }`}
                      >
                        ₦{amount}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Custom Amount Input (placed down after money options) */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-NunitoBold text-gray-900">
                  Or enter custom amount
                </Text>
                {numericAmount > availableBalance && availableBalance > 0 && (
                  <Text className="text-xs font-NunitoMedium text-red-600">
                    Exceeds balance
                  </Text>
                )}
              </View>

              <View
                className={`bg-gray-50 rounded-2xl px-4 py-3.5 flex-row items-center border ${
                  numericAmount > availableBalance && availableBalance > 0
                    ? "border-red-500 bg-red-50/20"
                    : isInputFocused
                    ? "border-red-600 bg-white"
                    : "border-gray-200"
                }`}
              >
                <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center mr-3 border border-red-100">
                  <Text className="text-lg font-NunitoBold text-red-600">₦</Text>
                </View>

                <TextInput
                  value={withdrawAmount}
                  onChangeText={handleAmountChange}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  className="flex-1 font-NunitoBold text-2xl text-gray-900 p-0"
                  maxLength={12}
                  editable={!isWithdrawing}
                />

                {withdrawAmount.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setWithdrawAmount("");
                      setSelectedAmount("");
                    }}
                    className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center ml-2"
                    activeOpacity={0.7}
                  >
                    <XMarkIcon size={16} color="#4B5563" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Helper Microcopy */}
              <View className="flex-row items-center justify-between mt-2 px-1">
                <Text className="text-xs font-NunitoMedium text-gray-400">
                  Minimum withdrawal: ₦1,000
                </Text>
                {numericAmount >= 1000 && numericAmount <= availableBalance && (
                  <Text className="text-xs font-NunitoSemiBold text-emerald-600">
                    ✓ Valid amount
                  </Text>
                )}
              </View>
            </View>

            {/* Bank Selection */}
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-NunitoBold text-gray-900">
                  Select Receiving Bank
                </Text>
                <TouchableOpacity onPress={handleAddBankAccount}>
                  <Text className="text-red-600 font-NunitoBold text-sm">Add New</Text>
                </TouchableOpacity>
              </View>

              {isLoadingBanks ? (
                <View className="py-4 items-center">
                  <Text className="text-gray-400 font-NunitoMedium">Loading accounts...</Text>
                </View>
              ) : bankAccounts.length === 0 ? (
                <TouchableOpacity 
                  onPress={handleAddBankAccount}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-6 items-center justify-center"
                >
                  <PlusIcon size={24} color="#9CA3AF" />
                  <Text className="text-gray-500 font-NunitoMedium mt-2 text-center">
                    No bank account found. Click to add one.
                  </Text>
                </TouchableOpacity>
              ) : (
                bankAccounts.map((account: any) => (
                  <TouchableOpacity
                    key={account.id}
                    onPress={() => setSelectedBankAccountId(String(account.id))}
                    disabled={isWithdrawing}
                    className={`flex-row items-center justify-between p-4 mb-3 rounded-2xl border-2 ${
                      selectedBankAccountId === String(account.id)
                        ? "border-red-600 bg-red-50"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="font-NunitoBold text-gray-900 text-base">
                        {account.bank_name}
                      </Text>
                      <Text className="text-gray-500 font-NunitoMedium text-sm">
                        {account.account_number} • {account.account_type || 'Savings'}
                      </Text>
                    </View>
                    {selectedBankAccountId === String(account.id) && (
                      <CheckCircleIcon size={24} color="#B91C1C" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Optional Description */}
            <View className="mb-10">
              <Text className="text-lg font-NunitoBold text-gray-900 mb-4">
                Description (Optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. For personal use"
                className="bg-gray-50 rounded-2xl p-4 font-NunitoMedium text-gray-900 border border-gray-100"
                multiline
                numberOfLines={2}
                editable={!isWithdrawing}
              />
            </View>

            {/* Flexible spacer */}
            <View style={{ minHeight: 40 }} />
          </ScrollView>

          <View className="px-5 pb-6 pt-4 bg-white border-t border-gray-100">
            <CustomButton 
              title={isWithdrawing ? "Processing..." : "Withdraw Now"} 
              onPress={handleWithdraw} 
              disabled={isWithdrawing || !selectedBankAccountId || !withdrawAmount || numericAmount < 1000}
              loading={isWithdrawing}
            />
            {/* Android Navigation Bar Spacer */}
            <AndroidNavBarSpacer />
          </View>
        </KeyboardAvoidingView>
        </View>
      </View>

      {/* Nesting the AddBankModal inside the main Modal to ensure it shows over it on iOS */}
      <AddBankModal 
        isVisible={showAddBankModal}
        onClose={() => setShowAddBankModal(false)}
      />
    </Modal>
  );
};

export default WithdrawFundsModal;
