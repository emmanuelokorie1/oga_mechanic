import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
  Pressable,
} from "react-native";
import {
  XMarkIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  CreditCardIcon,
  UserIcon,
  TrashIcon,
  StarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useBankAccount,
  useDeleteBankAccount,
  useUpdateBankAccount,
} from "@/hooks/useUserProfile";

import AndroidNavBarSpacer from "../AndroidNavBarSpacer";
import { showToast } from "@/utils/toastUtils";

interface BankAccountDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  accountId: number | string | null;
}

const BankAccountDetailsModal = ({
  isVisible,
  onClose,
  accountId,
}: BankAccountDetailsModalProps) => {
  const insets = useSafeAreaInsets();
  const { data: response, isLoading, error: fetchError } = useBankAccount(
    accountId!,
    isVisible && !!accountId
  );

  const account = response?.data;

  const [error, setError] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showDefaultConfirm, setShowDefaultConfirm] = React.useState(false);

  const deleteMutation = useDeleteBankAccount();
  const updateMutation = useUpdateBankAccount();

  const handleDelete = () => {
    setError(null);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    deleteMutation.mutate(accountId!, {
      onSuccess: () => {
        showToast.success("Bank account deleted successfully");
        onClose();
      },
      onError: (err: any) => {
        const errorData = err.response?.data;
        let message: any = "Failed to delete account";
        if (Array.isArray(errorData)) {
          message = errorData[0];
        } else if (typeof errorData === "object" && errorData !== null) {
          message =
            errorData.message ||
            errorData.detail ||
            errorData.non_field_errors?.[0] ||
            Object.values(errorData)[0];
          if (Array.isArray(message)) message = message[0];
        }
        setError(typeof message === "string" ? message : "An unexpected error occurred");
      },
    });
  };

  const handleSetDefault = () => {
    setError(null);
    setShowDefaultConfirm(true);
  };

  const confirmSetDefault = () => {
    setShowDefaultConfirm(false);
    updateMutation.mutate(
      {
        id: accountId!,
        data: { is_default: true },
      },
      {
        onSuccess: () => {
          showToast.success("Set as default account successfully");
        },
        onError: (err: any) => {
          const errorData = err.response?.data;
          let message: any = "Failed to update account";
          if (Array.isArray(errorData)) {
            message = errorData[0];
          } else if (typeof errorData === "object" && errorData !== null) {
            message =
              errorData.message ||
              errorData.detail ||
              errorData.non_field_errors?.[0] ||
              Object.values(errorData)[0];
            if (Array.isArray(message)) message = message[0];
          }
          setError(typeof message === "string" ? message : "An unexpected error occurred");
        },
      }
    );
  };

  const DetailItem = ({ label, value, icon: Icon, color = "#64748B" }: any) => (
    <View className="flex-row items-center py-4 border-b border-gray-100 last:border-b-0">
      <View className="w-11 h-11 bg-gray-50 rounded-xl items-center justify-center mr-4 border border-gray-100">
        <Icon size={20} color={color} strokeWidth={1.5} />
      </View>

      <View className="flex-1">
        <Text className="text-gray-400 font-NunitoMedium text-[12px]">
          {label}
        </Text>

        <Text className="text-[#0F172A] font-NunitoBold text-[15px] mt-0.5">
          {value || "—"}
        </Text>
      </View>
    </View>
  );

  const ActionConfirmationModal = ({ 
    visible, 
    onClose, 
    onConfirm, 
    title, 
    description, 
    icon: Icon, 
    confirmText = "Yes, proceed",
    themeColor = "#7C3AED",
    iconBg = "#F5F3FF",
    iconColor = "white",
    titleColor = "#0F172A"
  }: any) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center px-6">
        <View className="bg-white rounded-[40px] p-8 items-center">
          <View className="w-10 h-1.5 bg-gray-200 rounded-full mb-6" />
          
          <View 
            className="w-16 h-16 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: iconBg }}
          >
            <Icon size={30} color={iconColor} strokeWidth={2.5} />
          </View>

          <Text 
            className="text-[20px] font-NunitoExtraBold mb-3 text-center"
            style={{ color: titleColor }}
          >
            {title}
          </Text>
          
          <Text className="text-[#64748B] font-NunitoMedium text-[16px] text-center mb-8 leading-6 px-4">
            {description}
          </Text>

          <TouchableOpacity
            onPress={onConfirm}
            className="w-full py-4 rounded-3xl mb-3 items-center"
            style={{ backgroundColor: themeColor }}
          >
            <Text className="text-white font-NunitoBold text-[17px]">
              {confirmText}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            className="w-full py-4 rounded-3xl items-center bg-gray-100"
          >
            <Text className="text-gray-600 font-NunitoBold text-[17px]">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/60 justify-end">
        {/* Backdrop tap to dismiss */}
        <Pressable className="flex-1" onPress={onClose} />

        {/* Modal Sheet Card */}
        <View
          className="bg-white rounded-t-[32px] overflow-hidden shadow-2xl"
          style={{
            maxHeight: "92%",
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          {/* Drag Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <Text className="text-lg font-NunitoExtraBold text-[#0F172A]">
              Account Details
            </Text>

            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
              activeOpacity={0.7}
            >
              <XMarkIcon size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text className="mt-4 text-gray-500 font-NunitoMedium">
                Fetching details...
              </Text>
            </View>
          ) : fetchError ? (
            <View className="py-16 items-center justify-center px-10">
              <Text className="text-red-500 font-NunitoBold text-center mb-2">
                Error loading details
              </Text>

              <TouchableOpacity
                onPress={onClose}
                className="mt-6 bg-gray-100 px-6 py-3 rounded-xl"
              >
                <Text className="text-gray-700 font-NunitoBold">Go Back</Text>
              </TouchableOpacity>
            </View>
          ) : account ? (
            <ScrollView
              className="px-6 pt-6"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Error Banner */}
              {error && (
                <View className="mb-6 bg-red-50 p-4 rounded-2xl border border-red-100 flex-row items-start">
                  <ExclamationTriangleIcon size={20} color="#DC2626" />

                  <View className="flex-1 ml-3">
                    <Text className="text-red-800 font-NunitoBold text-[15px]">
                      Action Error
                    </Text>

                    <Text className="text-red-600 font-NunitoMedium text-[14px]">
                      {error}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => setError(null)}>
                    <XMarkIcon size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Account Header */}
              <View className="items-center mb-8">
                <View className="w-20 h-20 bg-violet-50 rounded-[28px] items-center justify-center border border-violet-100 shadow-sm">
                  <BuildingLibraryIcon size={38} color="#7C3AED" />
                </View>

                <Text className="text-[#0F172A] font-NunitoExtraBold text-[20px] mt-4 uppercase text-center">
                  {account.account_name}
                </Text>

                <Text className="text-gray-500 font-NunitoMedium text-[14px] mt-1">
                  {account.bank_name || account.bank?.name}
                </Text>

                {account.is_default && (
                  <View className="mt-2.5 flex-row items-center bg-violet-50 px-3 py-1 rounded-full border border-violet-100">
                    <StarIcon size={14} color="#7C3AED" strokeWidth={2} />

                    <Text className="text-violet-600 text-[12px] font-NunitoBold ml-1">
                      Default Account
                    </Text>
                  </View>
                )}
              </View>

              {/* Set Default Button */}
              {!account.is_default && (
                <TouchableOpacity
                  onPress={handleSetDefault}
                  className="mb-6 flex-row items-center justify-center bg-violet-600 py-3.5 rounded-2xl shadow-sm"
                  disabled={updateMutation.isPending}
                  activeOpacity={0.8}
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <StarIcon size={18} color="white" strokeWidth={2} />
                      <Text className="text-white font-NunitoBold text-[15px] ml-2">
                        Set as Default Account
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Details Card */}
              <View className="bg-white rounded-3xl border border-gray-100 px-5 py-2 mb-6 shadow-sm">
                <DetailItem
                  label="Bank Name"
                  value={account.bank_name || account.bank?.name}
                  icon={BuildingLibraryIcon}
                  color="#7C3AED"
                />

                <DetailItem
                  label="Account Number"
                  value={account.account_number}
                  icon={CreditCardIcon}
                  color="#3B82F6"
                />

                <DetailItem
                  label="Account Holder"
                  value={account.account_name}
                  icon={UserIcon}
                  color="#EC4899"
                />

                <DetailItem
                  label="Verification Status"
                  value={account.is_verified ? "Verified" : "Pending Verification"}
                  icon={CheckCircleIcon}
                  color={account.is_verified ? "#10B981" : "#F59E0B"}
                />
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={handleDelete}
                className="flex-row items-center justify-center py-3.5 rounded-2xl border border-red-200 bg-red-50"
                disabled={deleteMutation.isPending}
                activeOpacity={0.8}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <TrashIcon size={18} color="#DC2626" strokeWidth={2} />
                    <Text className="text-red-600 font-NunitoBold text-[15px] ml-2">
                      Remove Bank Account
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <AndroidNavBarSpacer />
            </ScrollView>
          ) : null}

          <ActionConfirmationModal
            visible={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={confirmDelete}
            title="Remove bank account"
            description="Are you sure you want to remove this bank account?"
            icon={TrashIcon}
            themeColor="#D30309"
            iconBg="#D30309"
            iconColor="white"
            titleColor="#D30309"
          />

          <ActionConfirmationModal
            visible={showDefaultConfirm}
            onClose={() => setShowDefaultConfirm(false)}
            onConfirm={confirmSetDefault}
            title="Switch withdrawal account"
            description="Are you sure you want to make this account your default account for withdrawals?"
            icon={ArrowPathIcon}
            themeColor="#7C3AED"
            iconBg="#F5F3FF"
            iconColor="#7C3AED"
            titleColor="#0F172A"
          />
        </View>
      </View>
    </Modal>
  );
};

export default BankAccountDetailsModal;