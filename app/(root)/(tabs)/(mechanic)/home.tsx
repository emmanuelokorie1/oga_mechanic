
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  BackHandler,
  Alert,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LAYOUT } from "@/constants/units";
import OrderCard, { Order } from "@/components/OrderCard";
import { router, useFocusEffect } from "expo-router";
import { icons } from "@/constants";
import { usePrimaryUserProfile, useMechanicProfile } from "@/hooks/useUserProfile";
import { useProfileStore } from "@/hooks/useProfileStore";
import { mechanicRoutes } from "@/constants/routes";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Navbar from "@/components/Navbar";
import MechanicActionConfirmationModal, { MechanicActionType } from "@/components/modals/MechanicActionConfirmationModal";
import { useRepairRequests, useAcceptRepairRequest, useDeclineRepairRequest, useMechanicAnalytics } from "@/hooks/useRepairRequests";
import { useQuery } from "@tanstack/react-query";
import { mechanicAPI } from "@/lib/api/mechanic";
import { getApiErrorMessage } from "@/utils/errorMessages";
import AnimatedErrorCard from "@/components/AnimatedErrorCard";
import { useVehicleMakes } from "@/hooks/useVehicleMakes";
import ProfileCompletionModal from "@/components/modals/ProfileCompletionModal";
import KYCBanner from "@/components/KYCBanner";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";
import BiddingCarousel from "@/components/bidding/BiddingCarousel";
import { usePrefetchShop } from "@/hooks/useProducts";

import SpecialistIconBtn from "@/components/SpecialistIconBtn";
import { useMechanicOrderNotifications } from "@/hooks/useMechanicOrderNotifications";
import { useNotificationWebSocket } from "@/hooks/useNotificationWebSocket";
import { registerPushNotificationsAndSyncDevice } from "@/services/notificationService";
import Toast from 'react-native-toast-message';
import { useNotificationStore } from "@/stores/notificationStore";
import { NewOrderBanner, MechanicRequestItem } from "@/components/NewOrderBanner";
import { 
  ExclamationCircleIcon, 
  ChevronRightIcon, 
  ClockIcon,
  ShieldCheckIcon,
  AdjustmentsVerticalIcon,
  SparklesIcon,
} from "react-native-heroicons/outline";

// Metric Card Skeleton Loader
const MetricCardSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();

    return () => shimmer.stop();
  }, []);

  const shimmerStyle = useMemo(() => ({
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    }),
  }), [shimmerAnim]);

  return (
    <View
      className="flex-1 bg-white rounded-xl border border-gray-100 py-3 px-2 items-center justify-between"
      style={{ minHeight: 112 }}
    >
      <Animated.View style={[shimmerStyle]} className="h-3.5 bg-gray-200 rounded w-3/4 mb-1" />
      <Animated.View style={[shimmerStyle]} className="h-7 bg-gray-200 rounded w-10 my-1" />
      <Animated.View style={[shimmerStyle]} className="h-3 bg-gray-200 rounded w-2/3 mt-1" />
    </View>
  );
};

// Order Card Skeleton Loader
const OrderCardSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();

    return () => shimmer.stop();
  }, []);

  const shimmerStyle = useMemo(() => ({
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    }),
  }), [shimmerAnim]);

  return (
    <View className="bg-white mb-4 p-4 rounded-[.4rem] border border-gray-200">
      {/* Header skeleton */}
      <View className="flex-row justify-between items-start mb-3">
        <Animated.View style={[shimmerStyle]} className="h-5 bg-gray-300 rounded w-2/3" />
        <Animated.View style={[shimmerStyle]} className="h-4 bg-gray-300 rounded w-16" />
      </View>

      {/* Car type skeleton */}
      <Animated.View style={[shimmerStyle]} className="h-4 bg-gray-300 rounded mb-2 w-1/2" />

      {/* Car issue skeleton */}
      <Animated.View style={[shimmerStyle]} className="h-4 bg-gray-300 rounded mb-4 w-3/4" />

      {/* Buttons skeleton */}
      <View className="flex-row space-x-3 gap-3">
        <Animated.View style={[shimmerStyle]} className="flex-1 h-12 bg-gray-300 rounded-[.4rem]" />
        <Animated.View style={[shimmerStyle]} className="flex-1 h-12 bg-gray-300 rounded-[.4rem]" />
      </View>
    </View>
  );
};

// ── Metric Card ──────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: number;
  sublabel: string;
  accentColor?: string;
}

const MetricCard = ({ label, value, sublabel, accentColor = '#D30309' }: MetricCardProps) => (
  <View
    className="flex-1 bg-white rounded-xl border border-gray-200 items-center justify-between py-2.5 px-1.5 shadow-sm"
    style={{ minHeight: 112 }}
  >
    <View style={{ minHeight: 26, justifyContent: 'center', alignItems: 'center' }}>
      <Text
        numberOfLines={2}
        className="text-[10px] font-NunitoBold text-slate-500 uppercase tracking-wide text-center"
      >
        {label}
      </Text>
    </View>
    {/* accentColor must stay inline — Tailwind can't resolve dynamic color values at runtime */}
    <Text
      style={{
        fontSize: 22,
        fontFamily: 'NunitoExtraBold',
        color: accentColor,
        lineHeight: 26,
        marginVertical: 2,
      }}
    >
      {value}
    </Text>
    <View style={{ minHeight: 26, justifyContent: 'center', alignItems: 'center' }}>
      <Text
        numberOfLines={2}
        className="text-[10px] font-NunitoMedium text-slate-500 text-center leading-tight"
      >
        {sublabel}
      </Text>
    </View>
  </View>
);

import { useDoubleBackToExit } from "@/hooks/useDoubleBackToExit";

const MechanicHome = () => {
  useDoubleBackToExit();
  usePrefetchShop();

  const primaryProfile = usePrimaryUserProfile();
  const mechanicProfile = useMechanicProfile(true); // Always enabled on mechanic home

  const profileData = (mechanicProfile.data || primaryProfile.data) as any;
  const profileLoading = mechanicProfile.isLoading && !mechanicProfile.data; // Only show strictly loading if we have no data
  const isMechanic = true;

  // ── Notifications ──────────────────────────────────────────────────────────
  // Sync push device token on mount (deduplicated globally)
  useEffect(() => {
    registerPushNotificationsAndSyncDevice();
  }, []);

  const isProfileComplete = useProfileStore((state) => state.isProfileComplete);
  const setIsProfileComplete = useProfileStore((state) => state.setIsProfileComplete);
  const isNewSwitch = useProfileStore((state) => state.isNewSwitch);
  const setIsNewSwitch = useProfileStore((state) => state.setIsNewSwitch);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeOrders, setActiveOrders] = useState<MechanicRequestItem[]>([]);

  const hasShownModalRef = useRef(false);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);

  // Check profile status on load
  useEffect(() => {
    if (profileData && !profileLoading) {
      const isComplete = profileData.data?.kyc?.is_complete ?? false;
      setIsProfileComplete(isComplete);
      
      const isApproved = profileData.data?.mechanic_profile?.is_approved ?? false;
      const isPending = isComplete && !isApproved;
      
      // ONLY show automatically if we just switched roles and it's not complete
      if (isNewSwitch && !isComplete && !hasShownModalRef.current) {
        // Start timer only if not already started
        if (!timerIdRef.current) {
          timerIdRef.current = setTimeout(() => {
            setShowProfileModal(true);
            hasShownModalRef.current = true;
            setIsNewSwitch(false); // Reset the switch flag
            timerIdRef.current = null;
          }, 3000); // Reduced to 3 seconds
        }
      } else if (!isNewSwitch) {
          // If not a new switch, make sure timer is cleared
          if (timerIdRef.current) {
              clearTimeout(timerIdRef.current);
              timerIdRef.current = null;
          }
      }
    }

    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [profileData, profileLoading, setIsProfileComplete, isNewSwitch]);

  const isComplete = Boolean(profileData?.data?.kyc?.is_complete || profileData?.kyc?.is_complete);
  const isApproved = Boolean(profileData?.data?.mechanic_profile?.is_approved || profileData?.mechanic_profile?.is_approved);
  const isRejected = Boolean(
    isComplete &&
    profileData?.data?.kyc?.is_rejected === true
  );
  const isPendingApproval = isComplete && !isApproved && !isRejected;

  // ── Queries & State ────────────────────────────────────────────────────────
  // Fetch repair requests from API (all requests; WebSocket delivers real-time updates)
  const {
    data: repairRequestsData,
    isLoading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests
  } = useRepairRequests(undefined, isMechanic);

  // Query for vehicle expertise
  const {
    data: expertiseData,
    isLoading: isExpertiseLoading,
    refetch: refetchExpertise
  } = useQuery({
    queryKey: ["vehicleExpertise"],
    queryFn: () => mechanicAPI.getVehicleExpertise(),
    enabled: !!isMechanic,
    staleTime: 5 * 60 * 1000,
  });

  const expertise = expertiseData?.results || expertiseData?.data || (Array.isArray(expertiseData) ? expertiseData : []);

  // Fetch mechanic analytics from API
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics
  } = useMechanicAnalytics(isMechanic);

  // ── Screen Focus & AppState Re-validation ──────────────────────────────────
  const refetchRequestsRef = useRef(refetchRequests);
  refetchRequestsRef.current = refetchRequests;

  const refetchAnalyticsRef = useRef(refetchAnalytics);
  refetchAnalyticsRef.current = refetchAnalytics;

  const refetchExpertiseRef = useRef(refetchExpertise);
  refetchExpertiseRef.current = refetchExpertise;

  // Auto-refresh requests & analytics once when returning to this tab
  useFocusEffect(
    useCallback(() => {
      refetchRequestsRef.current();
      refetchAnalyticsRef.current();
      refetchExpertiseRef.current();
    }, [])
  );

  // Auto-refresh when bringing the app to foreground from background/sleep
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refetchRequestsRef.current();
        refetchAnalyticsRef.current();
        refetchExpertiseRef.current();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Fetch vehicle makes to resolve make/model names
  const { data: vehicleMakes } = useVehicleMakes();

  // Helper function to get make name from ID
  const getMakeName = (makeId: string | number) => {
    if (!vehicleMakes || !makeId) return '';
    const make = vehicleMakes.find((m) => m.id.toString() === makeId.toString());
    return make?.name || `Make ID: ${makeId}`;
  };

  // Helper function to get model name from ID
  const getModelName = (makeId: string | number, modelId: string | number) => {
    if (!vehicleMakes || !makeId || !modelId) return '';
    const make = vehicleMakes.find((m) => m.id.toString() === makeId.toString());
    const model = make?.models?.find((m) => m.id.toString() === modelId.toString());
    return model?.name || `Model ID: ${modelId}`;
  };

  // Helper to test if a string is a raw UUID
  const isUuidLike = (val?: string | null): boolean => {
    if (!val) return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val.trim()) || val.length >= 26;
  };

  const inFlightDetailRequests = useRef<Set<string>>(new Set());
  const lastDetailFetchMap = useRef<Map<string, number>>(new Map());

  const fetchAndHydrateOrderDetail = useCallback((targetId?: string | null) => {
    if (!targetId || targetId === 'undefined' || !isUuidLike(targetId)) return;
    const now = Date.now();
    const lastFetch = lastDetailFetchMap.current.get(targetId) || 0;
    if (inFlightDetailRequests.current.has(targetId) || now - lastFetch < 4000) {
      return;
    }

    inFlightDetailRequests.current.add(targetId);
    lastDetailFetchMap.current.set(targetId, now);

    mechanicAPI.getRepairRequestDetail(targetId)
      .then((res: any) => {
        const detail = res?.data || res;
        if (detail && detail.id) {
          const resolvedCust = detail.customer
            ? `${detail.customer.first_name || ''} ${detail.customer.last_name || ''}`.trim()
            : detail.customer_name;
          const detailMake = detail.vehicle_make ? (isNaN(Number(detail.vehicle_make)) ? String(detail.vehicle_make) : getMakeName(detail.vehicle_make)) : '';
          const detailModel = detail.vehicle_model ? (isNaN(Number(detail.vehicle_model)) ? String(detail.vehicle_model) : getModelName(detail.vehicle_make, detail.vehicle_model)) : '';

          setActiveOrders((prev) =>
            prev.map((o) => {
              if (o.id !== targetId) return o;
              return {
                ...o,
                customerName: (resolvedCust && resolvedCust !== 'Customer Breakdown Request' ? resolvedCust : o.customerName),
                customerPhone: detail.customer?.phone_number || detail.phone_number || o.customerPhone,
                vehicleMake: detailMake || o.vehicleMake,
                vehicleModel: detailModel || o.vehicleModel,
                vehicleYear: detail.vehicle_year || detail.year || o.vehicleYear,
                serviceAddress: detail.service_address || detail.address || detail.location || o.serviceAddress,
                problemDescription: detail.problem_description || detail.issue_description || o.problemDescription,
                estimatedCost: detail.estimated_cost ?? o.estimatedCost,
                serviceType: (detail.service_name || (!isUuidLike(detail.service_type) ? detail.service_type : null)) || o.serviceType,
                orderNumber: detail.order_number || o.orderNumber,
              };
            })
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        inFlightDetailRequests.current.delete(targetId);
      });
  }, [getMakeName, getModelName]);

  // ── Real-time Notifications (WebSocket) ──────────────────────────────────
  useNotificationWebSocket({
    enabled: isMechanic,
    triggerPush: true,
    onNewOrder: (order) => {
      console.log("🚀 Real-time order received via WebSocket:", order);
      // Resolve the true Repair Request UUID:
      // Note: Backend notification records often pass the Notification DB row ID (e.g. 329) as `id`,
      // while the actual Repair Request UUID is in `related_object_id`, `repair_request_id`, etc.
      const candidateIds = [
        order?.repair_request_id,
        order?.related_object_id,
        order?.repair_request,
        order?.data?.repair_request_id,
        order?.data?.related_object_id,
        order?.data?.repair_request,
        order?.data?.id,
        order?.notification?.related_object_id,
        order?.notification?.repair_request_id,
        order?.notification?.related_id,
        order?.order_id,
        order?.request_id,
        order?.id,
      ].filter(Boolean);

      // 1. Check if any candidate is a genuine UUID
      const uuidCandidate = candidateIds.find((id) => isUuidLike(String(id)));

      // 2. Check if the order matches any item in repairRequestsData cache
      const cachedOrdersList = Array.isArray(repairRequestsData)
        ? repairRequestsData
        : Array.isArray(repairRequestsData?.data)
        ? repairRequestsData.data
        : Array.isArray(repairRequestsData?.results)
        ? repairRequestsData.results
        : [];

      const cachedMatch = cachedOrdersList.find((item: any) => {
        if (!item?.id) return false;
        if (uuidCandidate && String(item.id) === String(uuidCandidate)) return true;
        return candidateIds.some(
          (cand) => String(cand) === String(item.id) || String(cand) === String(item.order_number)
        );
      });

      // If we found a cached match with a UUID id, use that UUID!
      const resolvedUuid = uuidCandidate
        ? String(uuidCandidate)
        : cachedMatch?.id && isUuidLike(String(cachedMatch.id))
        ? String(cachedMatch.id)
        : String(candidateIds[0] || Date.now());

      const orderId = resolvedUuid;

      // Resolve make & model names if IDs are passed
      const rawMake = order?.vehicle_make || order?.make || cachedMatch?.vehicle_make;
      const rawModel = order?.vehicle_model || order?.model || cachedMatch?.vehicle_model;
      const makeName = rawMake ? (isNaN(Number(rawMake)) ? String(rawMake) : getMakeName(rawMake)) : '';
      const modelName = rawModel ? (isNaN(Number(rawModel)) ? String(rawModel) : getModelName(rawMake, rawModel)) : '';

      const matchedCustName = cachedMatch?.customer
        ? `${cachedMatch.customer.first_name || ''} ${cachedMatch.customer.last_name || ''}`.trim()
        : cachedMatch?.customer_name;

      const customerName =
        matchedCustName ||
        order?.customer_name ||
        (order?.customer
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
          : '');

      // Sanitize raw UUID service type names (e.g. "Service: e1131629-...")
      const rawServiceType = order?.service_type || order?.service_name || cachedMatch?.service_name || '';
      const sanitizedServiceType = isUuidLike(rawServiceType) ? 'Express Repair' : (rawServiceType || 'Express Repair');

      const rawProblem =
        order?.problem_description ||
        order?.issue_description ||
        order?.description ||
        cachedMatch?.problem_description ||
        cachedMatch?.issue_description ||
        '';
      const cleanProblem = isUuidLike(rawProblem) ? '' : rawProblem;

      const formattedOrder: MechanicRequestItem = {
        id: orderId,
        orderNumber:
          order?.order_number ||
          cachedMatch?.order_number ||
          (order?.id && !isUuidLike(String(order.id)) ? String(order.id) : (orderId.length > 5 ? orderId.slice(-5) : orderId)),
        customerName: customerName || 'Customer Breakdown Request',
        customerPhone: order?.customer?.phone_number || order?.phone_number || cachedMatch?.customer?.phone_number || '',
        vehicleMake: makeName,
        vehicleModel: modelName,
        vehicleYear: order?.vehicle_year || order?.year || cachedMatch?.vehicle_year || '',
        serviceType: sanitizedServiceType,
        serviceAddress:
          order?.service_address ||
          order?.address ||
          order?.location ||
          cachedMatch?.service_address ||
          'Customer Breakdown Location',
        problemDescription: cleanProblem,
        estimatedCost: order?.estimated_cost ?? order?.cost ?? cachedMatch?.estimated_cost ?? null,
        eta: order?.eta || 'Immediate • ~12 mins',
        urgency: order?.urgency || 'Express delivery',
        createdAt: order?.created_at || new Date().toISOString(),
        raw: {
          ...order,
          resolvedUuid: orderId,
        },
      };

      setActiveOrders((prev) => {
        const exists = prev.some((o) => o.id === orderId);
        if (exists) {
          return prev.map((o) => (o.id === orderId ? formattedOrder : o));
        }
        return [formattedOrder, ...prev];
      });

      // 2. Asynchronously fetch full repair request detail to hydrate all missing vehicle & customer fields (deduplicated)
      fetchAndHydrateOrderDetail(orderId);
    },
    onOrderRemoved: (orderId) => {
      setActiveOrders((prev) => prev.filter((o) => o.id !== String(orderId)));
    },
    onRepairUpdate: (orderId, _status, _data) => {
      const targetId = orderId ? String(orderId) : null;
      fetchAndHydrateOrderDetail(targetId);
    },
  });

  // ── Auto-sync active order banner with freshly fetched repairRequestsData ──
  useEffect(() => {
    if (!repairRequestsData || activeOrders.length === 0) return;
    const ordersArray = Array.isArray(repairRequestsData)
      ? repairRequestsData
      : Array.isArray(repairRequestsData?.data)
      ? repairRequestsData.data
      : Array.isArray(repairRequestsData?.results)
      ? repairRequestsData.results
      : [];

    if (ordersArray.length === 0) return;

    setActiveOrders((prevOrders) =>
      prevOrders.map((active) => {
        const match = ordersArray.find((item: any) => String(item.id) === String(active.id));
        if (!match) return active;

        const custName = match.customer
          ? `${match.customer.first_name || ''} ${match.customer.last_name || ''}`.trim()
          : match.customer_name;
        const make = match.vehicle_make ? (isNaN(Number(match.vehicle_make)) ? String(match.vehicle_make) : getMakeName(match.vehicle_make)) : '';
        const model = match.vehicle_model ? (isNaN(Number(match.vehicle_model)) ? String(match.vehicle_model) : getModelName(match.vehicle_make, match.vehicle_model)) : '';

        return {
          ...active,
          customerName: custName || active.customerName,
          customerPhone: match.customer?.phone_number || active.customerPhone,
          vehicleMake: make || active.vehicleMake,
          vehicleModel: model || active.vehicleModel,
          vehicleYear: match.vehicle_year || active.vehicleYear,
          serviceAddress: match.service_address || match.address || active.serviceAddress,
          problemDescription: match.problem_description || match.issue_description || active.problemDescription,
          estimatedCost: match.estimated_cost ?? active.estimatedCost,
          serviceType: (match.service_name || (!isUuidLike(match.service_type) ? match.service_type : null)) || active.serviceType,
        };
      })
    );
  }, [repairRequestsData]);

  // Mutations for accepting/declining requests
  const acceptRequestMutation = useAcceptRepairRequest();
  const declineRequestMutation = useDeclineRepairRequest();

  // State for confirmation modal
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<MechanicActionType | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Transform API data to match OrderCard interface
  const currentOrders: Order[] = (() => {
    try {
      if (!repairRequestsData) {
        return [];
      }

      const rawOrdersArray = Array.isArray(repairRequestsData)
        ? repairRequestsData
        : Array.isArray(repairRequestsData.data)
        ? repairRequestsData.data
        : Array.isArray(repairRequestsData.results)
        ? repairRequestsData.results
        : [];

      // Prioritize pending orders at the top, then newest by date
      const ordersArray = [...rawOrdersArray].sort((a: any, b: any) => {
        const isAPending = a.status === 'pending';
        const isBPending = b.status === 'pending';
        if (isAPending && !isBPending) return -1;
        if (!isAPending && isBPending) return 1;
        return new Date(b.created_at || b.requested_at || 0).getTime() - new Date(a.created_at || a.requested_at || 0).getTime();
      });

      return ordersArray.map((request: any) => {
        // Get customer name
        const customerName = request.customer
          ? `${request.customer.first_name || ''} ${request.customer.last_name || ''}`.trim() || 'Unknown Customer'
          : 'Unknown Customer';

        // Get phone number
        const phoneNumber = request.customer?.phone_number || 'N/A';

        // Get vehicle make and model names
        const makeId = request.vehicle_make;
        const modelId = request.vehicle_model;
        const makeName = getMakeName(makeId);
        const modelName = getModelName(makeId, modelId);
        const carType = `${makeName} ${modelName}`.trim() || 'Unknown Vehicle';

        // Map API status to Order status
        const mapStatus = (status: string): Order['status'] => {
          switch (status) {
            case 'pending':
              return 'current';
            case 'accepted':
            case 'in_transit':
            case 'arrived':
            case 'in_progress':
              return 'ongoing';
            case 'completed':
              return 'completed';
            case 'declined':
            case 'cancelled':
              return 'declined';
            default:
              return 'current';
          }
        };

        return {
          id: request.id?.toString() || '',
          clientName: customerName,
          phoneNumber: phoneNumber,
          carType: carType,
          carIssue: request.problem_description || request.issue_description || 'Repair needed',
          estimatedCost: request.estimated_cost ?? null,
          status: mapStatus(request.status || 'pending'),
          apiStatus: request.status || 'pending', // Actual API status for display
        };
      });
    } catch (error) {
      console.error('Error transforming orders data:', error);
      return [];
    }
  })();

  // Helper to ensure an order ID is always converted to its true Repair Request UUID
  const resolveRepairRequestUuid = (rawId: string | null | undefined): string => {
    if (!rawId) return '';
    const strId = String(rawId);
    if (isUuidLike(strId)) return strId;

    // 1. Look in activeOrders
    const activeOrder = activeOrders.find((o) => o.id === strId || o.orderNumber === strId);
    if (activeOrder) {
      if (activeOrder.raw?.resolvedUuid && isUuidLike(activeOrder.raw.resolvedUuid)) {
        return String(activeOrder.raw.resolvedUuid);
      }
      const rawCandidates = [
        activeOrder.raw?.repair_request_id,
        activeOrder.raw?.related_object_id,
        activeOrder.raw?.repair_request,
        activeOrder.raw?.data?.repair_request_id,
        activeOrder.raw?.data?.related_object_id,
        activeOrder.raw?.notification?.related_object_id,
        activeOrder.raw?.order_id,
        activeOrder.raw?.request_id,
        activeOrder.raw?.data?.id,
      ].filter(Boolean);
      const found = rawCandidates.find((c) => isUuidLike(String(c)));
      if (found) return String(found);
    }

    // 2. Look in repairRequestsData cache
    const rawOrdersArray = Array.isArray(repairRequestsData)
      ? repairRequestsData
      : Array.isArray(repairRequestsData?.data)
      ? repairRequestsData.data
      : Array.isArray(repairRequestsData?.results)
      ? repairRequestsData.results
      : [];

    const foundInCache = rawOrdersArray.find((item: any) => {
      return (
        String(item.id) === strId ||
        String(item.order_number) === strId ||
        String(item.notification_id) === strId ||
        String(item.repair_request_id) === strId
      );
    });
    if (foundInCache?.id && isUuidLike(String(foundInCache.id))) {
      return String(foundInCache.id);
    }

    // 3. Fallback to top pending repair request in cache
    const pendingOrders = rawOrdersArray.filter((o: any) => o.status === 'pending' && isUuidLike(String(o.id)));
    if (pendingOrders.length > 0) {
      return String(pendingOrders[0].id);
    }

    return strId;
  };

  const openActionConfirmation = (action: MechanicActionType, orderId: string) => {
    const targetId = resolveRepairRequestUuid(orderId);
    setActionType(action);
    setSelectedOrderId(targetId);
    setActionModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedOrderId || !actionType) return;
    const targetOrderId = resolveRepairRequestUuid(selectedOrderId);

    try {
      if (actionType === 'accept') {
        await acceptRequestMutation.mutateAsync(targetOrderId);
        console.log("Request accepted:", targetOrderId);

        // Show immediate visual confirmation
        Toast.show({
          type: 'success',
          text1: 'Request Accepted ✅',
          text2: 'Opening job details...',
        });
        useNotificationStore.getState().showNotification(
          'Request Accepted ✅',
          'You have accepted this repair request. Opening job details...',
          'success',
          { related_object_id: targetOrderId, orderId: targetOrderId, status: 'accepted' }
        );

        setActionModalVisible(false);
        setActionType(null);
        setSelectedOrderId(null);
        setActiveOrders((prev) => prev.filter((o) => o.id !== targetOrderId && o.id !== selectedOrderId));

        // Immediately route to the order details screen for seamless transit & workflow
        router.push({
          pathname: mechanicRoutes.orderDetails,
          params: { orderId: targetOrderId },
        });
        return;
      } else if (actionType === 'decline') {
        await declineRequestMutation.mutateAsync(targetOrderId);
        console.log("Request declined:", targetOrderId);

        Toast.show({
          type: 'info',
          text1: 'Request Declined',
          text2: 'Repair request removed from your queue.',
        });
        useNotificationStore.getState().showNotification(
          'Request Declined',
          'You have declined this repair request.',
          'info'
        );
      }

      setActionModalVisible(false);
      setActionType(null);
      setSelectedOrderId(null);
      setActiveOrders((prev) => prev.filter((o) => o.id !== targetOrderId && o.id !== selectedOrderId));
    } catch (error: any) {
      console.error("Error processing action:", error);
      setActionModalVisible(false);
      setActionType(null);
      setSelectedOrderId(null);
      refetchRequests();

      // Extract raw API error message safely
      const apiData = error?.response?.data;
      const rawApiMsg =
        (typeof apiData?.message === 'string' ? apiData.message : null) ||
        (typeof apiData?.detail === 'string' ? apiData.detail : null) ||
        (typeof apiData?.error === 'string' ? apiData.error : null) ||
        (Array.isArray(apiData?.non_field_errors) ? String(apiData.non_field_errors[0]) : null) ||
        (typeof error?.message === 'string' ? error.message : '');

      const lowerMsg = (rawApiMsg || '').toLowerCase();
      const status = error?.response?.status;

      // Truly taken or cancelled orders
      const isAlreadyTaken =
        lowerMsg.includes('already accepted') ||
        lowerMsg.includes('already taken') ||
        lowerMsg.includes('accepted by another') ||
        lowerMsg.includes('assigned to another') ||
        lowerMsg.includes('already assigned') ||
        lowerMsg.includes('no longer available') ||
        (lowerMsg.includes('cancelled') && !lowerMsg.includes('cancellation')) ||
        status === 404 ||
        status === 410;

      if (isAlreadyTaken) {
        Alert.alert(
          "Request Unavailable",
          "This repair request has already been accepted by another specialist or cancelled."
        );
      } else {
        const friendlyMsg = getApiErrorMessage(error, 'general');
        Alert.alert(
          actionType === 'accept' ? "Cannot Accept Request" : "Action Failed",
          rawApiMsg || friendlyMsg || "This request could not be processed. Please refresh."
        );
      }
    }
  };

  const handleCancelActionModal = () => {
    setActionModalVisible(false);
    setActionType(null);
    setSelectedOrderId(null);
  };

  const handleAccept = (orderId: string) => {
    if (!isProfileComplete || isPendingApproval) {
      setShowProfileModal(true);
      return;
    }
    const resolvedId = resolveRepairRequestUuid(orderId);
    openActionConfirmation('accept', resolvedId);
  };

  const handleDecline = (orderId: string) => {
    if (!isProfileComplete || isPendingApproval) {
      setShowProfileModal(true);
      return;
    }
    const resolvedId = resolveRepairRequestUuid(orderId);
    openActionConfirmation('decline', resolvedId);
  };

  const handleView = (orderId: string) => {
    if (!isProfileComplete || isPendingApproval) {
      setShowProfileModal(true);
      return;
    }
    const resolvedId = resolveRepairRequestUuid(orderId);
    router.push({
      pathname: mechanicRoutes.orderDetails,
      params: {
        orderId: resolvedId,
      },
    });
  };


  // ── Analytics Computation ──────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const rawData = analyticsData?.data || analyticsData || {};
    const summary = rawData.summary || {};
    const ratings = rawData.ratings || {};
    const timeWindow = rawData.time_window || {};
    const breakdown = rawData.breakdown || {};
    const statusCounts = breakdown.requests_by_status || {};

    const totalRequests = Number(summary.total_repair_requests || 0);

    // Completed: include verified jobs which count as completed in the workflow
    const completedRequests =
      Number(summary.completed_repair_requests || 0) +
      Number(statusCounts.verify_completed || 0) +
      Number(statusCounts.completed || 0);

    // In-progress / Active: accepted + in_transit + arrived + in_progress
    const inProgressRequests =
      Number(summary.in_progress_repair_requests || 0) +
      Number(statusCounts.in_progress || 0) +
      Number(statusCounts.accepted || 0) +
      Number(statusCounts.in_transit || 0) +
      Number(statusCounts.arrived || 0);

    // Cancelled / Declined
    const cancelledRequests =
      Number(summary.cancelled_repair_requests || 0) +
      Number(statusCounts.cancelled || 0) +
      Number(statusCounts.declined || 0);

    // Completion Rate
    const completionRate = totalRequests > 0
      ? Math.round((completedRequests / totalRequests) * 100)
      : Number(summary.completion_rate || 0);

    // Distinct metrics
    const distinctCustomers = Number(summary.distinct_customers || 0);
    const distinctMakes = Number(summary.distinct_vehicle_makes || 0);
    const distinctModels = Number(summary.distinct_vehicle_models || 0);

    // Time window
    const last7Days = Number(timeWindow.last_7_days_requests || 0);
    const last30Days = Number(timeWindow.last_30_days_requests || 0);

    // Ratings
    const avgRating = Number(ratings.avg_rating || 0);
    const totalReviews = Number(ratings.total_reviews || 0);
    const ratingDist = ratings.rating_distribution || {};

    // Top Vehicle Makes & Models
    const topMakes = Array.isArray(breakdown.top_vehicle_makes) ? breakdown.top_vehicle_makes : [];
    const topModels = Array.isArray(breakdown.top_vehicle_models) ? breakdown.top_vehicle_models : [];

    return {
      totalRequests,
      completedRequests,
      inProgressRequests,
      cancelledRequests,
      completionRate,
      distinctCustomers,
      distinctMakes,
      distinctModels,
      last7Days,
      last30Days,
      avgRating,
      totalReviews,
      ratingDist,
      topMakes,
      topModels,
    };
  }, [analyticsData]);

  const averageRating = analytics.avgRating;
  const totalReviews = String(analytics.totalReviews);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar style="dark" />
      
      <NewOrderBanner 
        orders={activeOrders} 
        onClose={() => setActiveOrders([])}
        onDismissOrder={(orderId) => {
          setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
        }}
        onView={(order) => {
          setActiveOrders((prev) => prev.filter((o) => o.id !== order.id));
          if (order.id) {
            handleView(order.id);
          }
        }}
        onAccept={(orderId) => {
          setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
          handleAccept(orderId);
        }}
        onDecline={(orderId) => {
          setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
          handleDecline(orderId);
        }}
      />

      {/* Floating Chat Specialist */}
      <View style={{ position: 'absolute', bottom: LAYOUT.SCROLL_PADDING_BOTTOM - 5, right: 20, zIndex: 1000 }}>
        <SpecialistIconBtn isFloating={true} />
      </View>

      {/* Sticky Navbar */}
      <View className="px-5">
        <Navbar />
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: LAYOUT.SCROLL_PADDING_BOTTOM,
        }}
        refreshControl={
          <RefreshControl
            refreshing={requestsLoading || analyticsLoading || isExpertiseLoading}
            onRefresh={() => {
              refetchRequests();
              refetchAnalytics();
              refetchExpertise();
            }}
            colors={['#D30309']}
            tintColor="#D30309"
          />
        }
      >
        <AnimatedPageContainer animationType="fadeInDown" duration={500}>

          <View className="py-4">
          <KYCBanner isVisible={!profileLoading && (!isComplete || isPendingApproval || isRejected)} role="mechanic" isPending={isPendingApproval} isRejected={isRejected} />

          {/* Promo Cards: Buy Spare Parts & Buy a Car */}
          <BiddingCarousel containerPadding={20} fallbackVariant="mechanic" />

          {/* Metrics */}
          <View style={{ flexDirection: "row", gap: 8 }} className="py-4">
            {analyticsLoading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                <MetricCard
                  label="Total Requests"
                  value={analytics.totalRequests}
                  sublabel={analytics.last7Days > 0 ? `${analytics.last7Days} this week` : "received"}
                  accentColor="#0F172A"
                />
                <MetricCard
                  label="Completed"
                  value={analytics.completedRequests}
                  sublabel={analytics.completionRate > 0 ? `${analytics.completionRate}% rate` : "tasks finished"}
                  accentColor="#16A34A"
                />
                <MetricCard
                  label="In Progress"
                  value={analytics.inProgressRequests}
                  sublabel={analytics.inProgressRequests > 0 ? "active tasks" : "ready for jobs"}
                  accentColor="#D30309"
                />
              </>
            )}
          </View>

          {/* Compact Rating Strip with Customer Reach */}
          {!analyticsLoading && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(mechanicRoutes.reviews as any)}
              className="flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-4"
            >
              <View className="flex-row items-center gap-3">
                <Text style={{ fontSize: 28, fontFamily: 'NunitoExtraBold', color: '#0F172A' }}>
                  {averageRating > 0 ? averageRating.toFixed(1) : '0'}
                </Text>
                <View>
                  <View className="flex-row gap-0.5 mb-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <MaterialCommunityIcons
                        key={s}
                        name={s <= Math.round(averageRating) ? 'star' : 'star-outline'}
                        size={14}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[11px] font-NunitoMedium text-slate-400">
                      {totalReviews} review{Number(totalReviews) !== 1 ? 's' : ''}
                    </Text>
                    {analytics.distinctCustomers > 0 && (
                      <Text className="text-[11px] font-NunitoBold text-emerald-600">
                        • {analytics.distinctCustomers} customer{analytics.distinctCustomers !== 1 ? 's' : ''} served
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-[12px] font-NunitoBold text-primary-500">See all</Text>
                <ChevronRightIcon size={14} color="#D30309" />
              </View>
            </TouchableOpacity>
          )}

          {/* Top Vehicle Makes Serviced */}
          {!analyticsLoading && analytics.topMakes.length > 0 && (
            <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2.5">
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name="car-wrench" size={16} color="#D30309" />
                  <Text className="text-xs font-NunitoExtraBold text-gray-900 ml-1.5 uppercase tracking-wider">
                    Vehicle Specialization
                  </Text>
                </View>
                <Text className="text-[10px] font-NunitoBold text-gray-400">
                  {analytics.distinctMakes} {analytics.distinctMakes === 1 ? 'brand' : 'brands'} handled
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {analytics.topMakes.map((item: any, idx: number) => {
                  const makeName = getMakeName(item.make) || `Make #${item.make}`;
                  return (
                    <View
                      key={idx}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mr-2.5 flex-row items-center"
                    >
                      <Text className="text-xs font-NunitoBold text-gray-800">
                        {makeName}
                      </Text>
                      <View className="ml-2 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                        <Text className="text-[10px] font-NunitoExtraBold text-[#D30309]">
                          {item.count} {item.count === 1 ? 'job' : 'jobs'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Repair Requests Section */}
          <View>
            <View className="flex-row items-center justify-between my-4">
              <TouchableOpacity
                activeOpacity={0.8}
                onLongPress={() => {
                  if (__DEV__) {
                    // Quick test trigger to preview multiple requests modal in dev
                    setActiveOrders([
                      {
                        id: '17899',
                        orderNumber: '17899',
                        customerName: 'Preston Mechanics Hub',
                        vehicleMake: 'Toyota',
                        vehicleModel: 'Camry LE',
                        vehicleYear: '2019',
                        serviceAddress: '8502 Preston Rd. Inglewood, Maine 98380',
                        problemDescription: 'Alternator fault, vehicle stalling in traffic',
                        estimatedCost: 25000,
                        eta: '10.50am',
                        urgency: 'Express delivery',
                      },
                      {
                        id: '21184',
                        orderNumber: '21184',
                        customerName: 'Sarah Jenkins',
                        vehicleMake: 'Mercedes-Benz',
                        vehicleModel: 'C300',
                        vehicleYear: '2022',
                        serviceAddress: '2118 Thornridge Cir. Syracuse, Connecticut 35624',
                        problemDescription: 'Coolant hose burst, roadside breakdown assistance',
                        estimatedCost: 35000,
                        eta: 'Immediate • ~8 mins',
                        urgency: 'Express delivery',
                      },
                    ]);
                  }
                }}
              >
                <Text className="text-lg font-NunitoBold text-gray-900">
                  Recent Repair Requests
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router?.push("./order")}>
                <Text className="text-red-600 font-NunitoBold">View All</Text>
              </TouchableOpacity>
            </View>

            {/* Loading State */}
            {requestsLoading && (
              <View className="">
                {[1, 2, 3].map((index) => (
                  <OrderCardSkeleton key={`skeleton-${index}`} />
                ))}
              </View>
            )}

            {/* Error State */}
            {requestsError && !requestsLoading && (
              <AnimatedErrorCard
                emoji="🔧"
                title="No repair requests available"
                message="No repair requests found at the moment. Pull down to refresh or check back later!"
                gradientColors={['#FEF2F2', '#FECACA', '#FCA5A5']}
                textColor="text-red-800"
                actionButton={{
                  text: "Refresh",
                  onPress: () => refetchRequests(),
                  backgroundColor: "#DC2626"
                }}
              />
            )}

            {/* Success State - Show Orders */}
            {!requestsLoading && !requestsError && currentOrders.length > 0 && (
              <View className="">
                {currentOrders.slice(0, 3).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    type="current"
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    onView={handleView}
                  />
                ))}
              </View>
            )}

            {/* Empty State */}
            {!requestsLoading && !requestsError && currentOrders.length === 0 && (
              <AnimatedErrorCard
                emoji="🚗"
                title="No repair requests yet"
                message="You'll see repair requests from customers here. Pull down to refresh!"
                gradientColors={['#F0F9FF', '#E0F2FE', '#BAE6FD']}
                textColor="text-blue-800"
              />
            )}
          </View>

          {/* <View className="h-10" /> */}
          </View>
        </AnimatedPageContainer>
      </ScrollView>

      {/* Action Confirmation Modal */}
      <MechanicActionConfirmationModal
        visible={actionModalVisible}
        actionType={actionType}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelActionModal}
        isLoading={acceptRequestMutation.isPending || declineRequestMutation.isPending}
      />

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isVisible={showProfileModal}
        roleName="mechanic"
        onComplete={() => setShowProfileModal(false)}
        onClose={() => setShowProfileModal(false)}
        isPending={isPendingApproval}
      />
    </SafeAreaView>
  );
};

export default MechanicHome;