
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { images } from "@/constants";
import { routes } from "@/constants/routes";
import BackArrowBtn from "@/components/BackArrowBtn";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  userAPI,
  getUserVehiclePrimaryImageUrl,
  getUserVehicleGalleryUrls,
} from "@/lib/api/user";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  CalendarIcon,
  PencilSquareIcon,
  TrashIcon,
  CogIcon,
  DocumentTextIcon,
  MapPinIcon,
  ClockIcon,
  FunnelIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  PhoneIcon,
  EnvelopeIcon,
} from "react-native-heroicons/outline";
import { CheckIcon } from "react-native-heroicons/solid";
import { LinearGradient } from "expo-linear-gradient";
import SuccessModal from "@/components/modals/SuccessModal";
import DeleteCarModal from "@/components/modals/DeleteCarModal";

function formatApiDate(iso?: string | null): string | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeVehicleStatus(status: unknown): "Active" | "Inactive" {
  const s = status != null ? String(status).toLowerCase() : "";
  if (s === "inactive" || s === "deactivated") return "Inactive";
  return "Active";
}

function dashIfEmpty(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "—";
  return String(value).trim();
}

interface CarDetails {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  vin: string;
  status: "Active" | "Inactive";
  image: any;
  /** Primary vehicle image URL from API (prefers front_ when present) */
  imageUri?: string | null;
  /** All gallery URLs, ordered by image id */
  galleryUris?: string[];
  color: string;
  mileage: number | null;
  fuelType: string | null;
  lastService: string;
  nextService: string;
  location: string | null;
  createdAtLabel: string | null;
  updatedAtLabel: string | null;
  insurance: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
    status: "Active" | "Expired";
  };
  subscription: {
    plan: string;
    price: number;
    status: "Active" | "Inactive";
    nextRenewal: string;
    paymentMethod: string;
  };
  contact: {
    phone: string;
    email: string;
  };
}

const CarDetail = () => {
  const params = useLocalSearchParams();
  const carId = params.carId as string;
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successConfig, setSuccessConfig] = useState({
    title: "",
    message: "",
  });

  // Fetch car data from API
  const {
    data: carDataResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["userCar", carId],
    queryFn: () => userAPI.getCarById(carId),
    enabled: !!carId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Transform API (GET …/my-vehicles/:id/ returns envelope; getCarById unwraps to the vehicle object)
  const raw = carDataResponse as Record<string, any> | undefined;
  const carData: CarDetails | null = raw
    ? (() => {
        const make = String(raw.make ?? raw.car_make ?? "").trim();
        const model = String(raw.model ?? raw.car_model ?? "").trim();
        const name =
          make && model
            ? `${make} ${model}`
            : String(raw.name ?? "Unknown Car").trim() || "Unknown Car";
        const year =
          typeof raw.year === "number"
            ? raw.year
            : typeof raw.car_year === "number"
              ? raw.car_year
              : parseInt(String(raw.year ?? raw.car_year ?? ""), 10) ||
                new Date().getFullYear();
        const plateRaw =
          raw.license_plate != null && String(raw.license_plate).trim() !== ""
            ? String(raw.license_plate).trim()
            : raw.plateNumber;
        const vinRaw =
          raw.vin != null && String(raw.vin).trim() !== ""
            ? String(raw.vin).trim()
            : null;
        const mileageOk =
          typeof raw.mileage === "number" && !Number.isNaN(raw.mileage)
            ? raw.mileage
            : null;
        const fuel =
          raw.fuel_type || raw.fuelType
            ? String(raw.fuel_type || raw.fuelType).trim()
            : null;
        const loc =
          raw.location != null && String(raw.location).trim() !== ""
            ? String(raw.location).trim()
            : null;

        return {
          id: String(raw.id ?? carId),
          name,
          make: make || "—",
          model: model || "—",
          year,
          plateNumber:
            plateRaw != null && String(plateRaw).trim() !== ""
              ? String(plateRaw).trim()
              : "N/A",
          vin: vinRaw ?? "N/A",
          status: normalizeVehicleStatus(raw.status),
          image: null,
          imageUri:
            getUserVehiclePrimaryImageUrl(raw) ||
            (typeof raw.image === "string" && raw.image.startsWith("http")
              ? raw.image
              : null),
          galleryUris: getUserVehicleGalleryUrls(raw),
          color: raw.color || "#1F2937",
          mileage: mileageOk,
          fuelType: fuel,
          lastService: raw.last_service || raw.lastService || "N/A",
          nextService: raw.next_service || raw.nextService || "N/A",
          location: loc,
          createdAtLabel: formatApiDate(raw.created_at),
          updatedAtLabel: formatApiDate(raw.updated_at),
          insurance: {
            provider: raw.insurance?.provider || "N/A",
            policyNumber:
              raw.insurance?.policy_number ||
              raw.insurance?.policyNumber ||
              "N/A",
            expiryDate:
              raw.insurance?.expiry_date ||
              raw.insurance?.expiryDate ||
              "N/A",
            status: raw.insurance?.status || "Active",
          },
          subscription: {
            plan: raw.subscription?.plan || "N/A",
            price: raw.subscription?.price ?? 0,
            status: raw.subscription?.status || "Inactive",
            nextRenewal:
              raw.subscription?.next_renewal ||
              raw.subscription?.nextRenewal ||
              "N/A",
            paymentMethod:
              raw.subscription?.payment_method ||
              raw.subscription?.paymentMethod ||
              "N/A",
          },
          contact: {
            phone: raw.contact?.phone || "",
            email: raw.contact?.email || "",
          },
        };
      })()
    : null;

  const [heroUri, setHeroUri] = useState<string | null>(null);
  const galleryKey = carData?.galleryUris?.join("|") ?? "";
  useEffect(() => {
    if (!carData) {
      setHeroUri(null);
      return;
    }
    setHeroUri(carData.imageUri ?? carData.galleryUris?.[0] ?? null);
  }, [carId, carData?.imageUri, galleryKey]);

  const showServiceSection = !!(
    raw?.last_service ||
    raw?.next_service ||
    raw?.lastService ||
    raw?.nextService
  );
  const showInsuranceSection = !!(
    raw?.insurance && typeof raw.insurance === "object"
  );
  const showSubscriptionSection = !!(
    raw?.subscription && typeof raw.subscription === "object"
  );
  const showContactSection = !!(
    raw?.contact &&
    typeof raw.contact === "object" &&
    (String(raw.contact.phone ?? "").trim() !== "" ||
      String(raw.contact.email ?? "").trim() !== "")
  );

  const handleEditCar = () => {
    if (!carId) return;
    router.push({
      pathname: routes.addCar,
      params: { carId: String(carId) },
    });
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (carId: string) => userAPI.deleteCar(carId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userCars"] });
      setSuccessConfig({
        title: "Car Deleted!",
        message: `Car has been permanently deleted from your account.`,
      });
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "Failed to delete car. Please try again.";
      setSuccessConfig({
        title: "Error",
        message: errorMessage,
      });
      setShowSuccessModal(true);
    },
  });

  const handleConfirmDelete = () => {
    if (carId) {
      deleteMutation.mutate(carId);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    if (successConfig.title === "Car Deleted!") {
      router.back();
    }
  };

  const handleManageSubscription = () => {
    console.log("Navigate to manage subscription");
    // Navigate to subscription management screen
  };

  const handleViewPaymentHistory = () => {
    console.log("Navigate to payment history");
    // Navigate to payment history screen
  };

  const { width: screenWidth } = Dimensions.get("window");
  const FallbackImage = images.carFront;

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <LoadingSpinner
          message="Loading car details..."
          subMessage="Please wait while we fetch the information"
          size="medium"
          logoSize={32}
        />
      </SafeAreaView>
    );
  }

  // Show error state
  if (error || !carData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100">
          <BackArrowBtn />
          <Text className="text-xl font-NunitoBold text-gray-900 ml-4">
            Car Details
          </Text>
        </View>
        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-xl font-NunitoBold text-gray-900 mb-2">
            Unable to load car details
          </Text>
          <Text className="text-gray-500 text-center">
            {error instanceof Error ? error.message : "Please try again later"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Enhanced Header */}
      <LinearGradient
        colors={["#FFFFFF", "#F8FAFC"]}
        className="border-b border-gray-100"
      >
        <View className="flex-row items-center justify-between px-5 py-4">
          <BackArrowBtn />
          <View className="flex-1 items-center">
            <Text className="text-xl font-NunitoBold text-gray-900">
              Car Details
            </Text>
            <Text className="text-sm text-gray-500 font-NunitoMedium">
              Vehicle Information
            </Text>
          </View>
          <View className="w-6" />
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Enhanced Car Image */}
        <View className="px-5 pt-6">
          <View className="relative">
            <LinearGradient
              colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.3)"]}
              className="absolute inset-0 z-10 rounded-2xl"
            />
            <View
              className="w-full h-72 rounded-2xl items-center justify-center overflow-hidden"
              style={{ backgroundColor: (carData?.color || "#F3F4F6") + "20" }}
            >
              {heroUri ?? carData.imageUri ? (
                <Image
                  source={{ uri: (heroUri ?? carData.imageUri) as string }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Image 
                  source={FallbackImage} 
                  style={{ width: screenWidth * 0.8, height: 200 }} 
                  resizeMode="contain" 
                />
              )}
            </View>
            {/* Status Badge */}
            <View className="absolute top-4 right-4 z-20">
              <View
                className={`px-3 py-1 rounded-full ${
                  carData.status === "Active" ? "bg-green-500" : "bg-red-500"
                }`}
              >
                <Text className="text-xs font-NunitoBold text-white">
                  {carData.status}
                </Text>
              </View>
            </View>
            {/* Car Color Indicator */}
            <View className="absolute bottom-4 left-4 z-20">
              <View
                className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: carData.color }}
              />
            </View>
          </View>
          {carData.galleryUris && carData.galleryUris.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
            >
              {carData.galleryUris.map((uri) => {
                const active = (heroUri ?? carData.imageUri) === uri;
                return (
                  <TouchableOpacity
                    key={uri}
                    onPress={() => setHeroUri(uri)}
                    activeOpacity={0.85}
                    className={`rounded-xl border-2 overflow-hidden ${
                      active ? "border-primary-500" : "border-gray-200"
                    }`}
                  >
                    <Image
                      source={{ uri }}
                      className="w-16 h-16"
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        {/* Enhanced Quick Actions */}
        <View className="px-5 mb-6">
          <Text className="text-lg font-NunitoBold text-gray-900 mb-4">
            Quick Actions
          </Text>
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={handleEditCar}
              className="flex-1 bg-blue-600 py-4 px-6 rounded-xl flex-row items-center justify-center shadow-lg"
              style={{
                shadowColor: "#2563EB",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <PencilSquareIcon size={20} color="#FFFFFF" />
              <Text className="text-white font-NunitoBold text-base ml-2">
                Edit Car
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              className="flex-1 bg-white border-2 border-red-500 py-4 px-6 rounded-xl flex-row items-center justify-center shadow-lg"
              style={{
                shadowColor: "#EF4444",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <TrashIcon size={20} color="#EF4444" />
              <Text className="text-red-500 font-NunitoBold text-base ml-2">
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Car Information Section */}
        <View className="mx-5 mb-6 bg-white rounded-2xl p-6 shadow-lg">
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 bg-primary-100 rounded-xl mr-4 items-center justify-center">
              <DocumentTextIcon size={20} color="#D30309" />
            </View>
            <View>
              <Text className="text-xl font-NunitoBold text-gray-900">
                Vehicle Information
              </Text>
              <Text className="text-sm text-gray-500 font-NunitoMedium">
                Car details and specifications
              </Text>
            </View>
          </View>

          <View className="space-y-4">
            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-100 rounded-lg mr-3 items-center justify-center">
                  <Text className="text-blue-600 text-xs font-NunitoBold">
                    🚗
                  </Text>
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  Vehicle
                </Text>
              </View>
              <Text
                className="text-gray-900 font-NunitoBold text-right flex-1 ml-3"
                numberOfLines={2}
              >
                {carData.name}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-slate-100 rounded-lg mr-3 items-center justify-center">
                  <Text className="text-slate-600 text-xs font-NunitoBold">M</Text>
                </View>
                <Text className="text-gray-700 font-NunitoMedium">Make</Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">{carData.make}</Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-slate-100 rounded-lg mr-3 items-center justify-center">
                  <Text className="text-slate-600 text-xs font-NunitoBold">D</Text>
                </View>
                <Text className="text-gray-700 font-NunitoMedium">Model</Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">{carData.model}</Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-green-100 rounded-lg mr-3 items-center justify-center">
                  <Text className="text-green-600 text-xs font-NunitoBold">
                    📅
                  </Text>
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  Year
                </Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">
                {carData.year}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-purple-100 rounded-lg mr-3 items-center justify-center">
                  <Text className="text-purple-600 text-xs font-NunitoBold">
                    🔢
                  </Text>
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  License plate
                </Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">
                {carData.plateNumber}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-orange-100 rounded-lg mr-3 items-center justify-center">
                  <Text className="text-orange-600 text-xs font-NunitoBold">
                    🔍
                  </Text>
                </View>
                <Text className="text-gray-700 font-NunitoMedium">VIN</Text>
              </View>
              <Text
                className="text-gray-900 font-NunitoBold text-sm text-right flex-1 ml-2"
                numberOfLines={2}
              >
                {carData.vin}
              </Text>
            </View>

            {carData.createdAtLabel ? (
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-cyan-100 rounded-lg mr-3 items-center justify-center">
                    <ClockIcon size={16} color="#0891B2" />
                  </View>
                  <Text className="text-gray-700 font-NunitoMedium">Added</Text>
                </View>
                <Text className="text-gray-900 font-NunitoBold text-xs text-right flex-1 ml-2">
                  {carData.createdAtLabel}
                </Text>
              </View>
            ) : null}

            {carData.updatedAtLabel ? (
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-teal-100 rounded-lg mr-3 items-center justify-center">
                    <ClockIcon size={16} color="#0D9488" />
                  </View>
                  <Text className="text-gray-700 font-NunitoMedium">Last updated</Text>
                </View>
                <Text className="text-gray-900 font-NunitoBold text-xs text-right flex-1 ml-2">
                  {carData.updatedAtLabel}
                </Text>
              </View>
            ) : null}

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-indigo-100 rounded-lg mr-3 items-center justify-center">
                  <Text className="text-indigo-600 text-xs font-NunitoBold">
                    📊
                  </Text>
                </View>
                <Text className="text-gray-700 font-NunitoMedium">Mileage</Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">
                {carData.mileage != null
                  ? `${Number(carData.mileage).toLocaleString()} km`
                  : "—"}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-yellow-100 rounded-lg mr-3 items-center justify-center">
                  <FunnelIcon size={16} color="#EAB308" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  Fuel Type
                </Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">
                {dashIfEmpty(carData.fuelType)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-red-100 rounded-lg mr-3 items-center justify-center">
                  <MapPinIcon size={16} color="#EF4444" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  Location
                </Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold text-right flex-1 ml-2">
                {dashIfEmpty(carData.location)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-emerald-100 rounded-lg mr-3 items-center justify-center">
                  <ShieldCheckIcon size={16} color="#10B981" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">Status</Text>
              </View>
              <View
                className={`px-3 py-1 rounded-full ${
                  carData.status === "Active" ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <Text
                  className={`text-xs font-NunitoBold ${
                    carData.status === "Active"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {carData.status}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {showServiceSection ? (
        <View className="mx-5 mb-6 bg-white rounded-2xl p-6 shadow-lg">
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 bg-blue-100 rounded-xl mr-4 items-center justify-center">
              <WrenchScrewdriverIcon size={20} color="#3B82F6" />
            </View>
            <View>
              <Text className="text-xl font-NunitoBold text-gray-900">
                Service Information
              </Text>
              <Text className="text-sm text-gray-500 font-NunitoMedium">
                Maintenance and service history
              </Text>
            </View>
          </View>

          <View className="space-y-4">
            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-orange-100 rounded-lg mr-3 items-center justify-center">
                  <ClockIcon size={16} color="#F97316" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  Last Service
                </Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">
                {carData.lastService}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-green-100 rounded-lg mr-3 items-center justify-center">
                  <CalendarIcon size={16} color="#10B981" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  Next Service
                </Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">
                {carData.nextService}
              </Text>
            </View>
          </View>
        </View>
        ) : null}

        {showInsuranceSection ? (
        <View className="mx-5 mb-6 bg-white rounded-2xl p-6 shadow-lg">
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 bg-emerald-100 rounded-xl mr-4 items-center justify-center">
              <ShieldCheckIcon size={20} color="#10B981" />
            </View>
            <View>
              <Text className="text-xl font-NunitoBold text-gray-900">
                Insurance Details
              </Text>
              <Text className="text-sm text-gray-500 font-NunitoMedium">
                Policy and coverage information
              </Text>
            </View>
          </View>

          <View className="space-y-4">
            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-100 rounded-lg mr-3 items-center justify-center">
                  <Text className="text-blue-600 text-xs font-NunitoBold">
                    🏢
                  </Text>
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  Provider
                </Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">
                {carData.insurance.provider}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-purple-100 rounded-lg mr-3 items-center justify-center">
                  <Text className="text-purple-600 text-xs font-NunitoBold">
                    📋
                  </Text>
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  Policy Number
                </Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold text-sm">
                {carData.insurance.policyNumber}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-red-100 rounded-lg mr-3 items-center justify-center">
                  <CalendarIcon size={16} color="#EF4444" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  Expiry Date
                </Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">
                {carData.insurance.expiryDate}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-emerald-100 rounded-lg mr-3 items-center justify-center">
                  <ShieldCheckIcon size={16} color="#10B981" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">Status</Text>
              </View>
              <View
                className={`px-3 py-1 rounded-full ${
                  carData.insurance.status === "Active"
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                <Text
                  className={`text-xs font-NunitoBold ${
                    carData.insurance.status === "Active"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {carData.insurance.status}
                </Text>
              </View>
            </View>
          </View>
        </View>
        ) : null}

        {showSubscriptionSection ? (
        <View className="mx-5 mb-6 bg-white rounded-2xl p-6 shadow-lg">
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 bg-primary-100 rounded-xl mr-4 items-center justify-center">
              <CreditCardIcon size={20} color="#D30309" />
            </View>
            <View>
              <Text className="text-xl font-NunitoBold text-gray-900">
                Subscription Details
              </Text>
              <Text className="text-sm text-gray-500 font-NunitoMedium">
                Plan and payment information
              </Text>
            </View>
          </View>

          <View className="space-y-4">
            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-primary-100 rounded-lg mr-3 items-center justify-center">
                  <Text className="text-primary-600 text-xs font-NunitoBold">
                    💎
                  </Text>
                </View>
                <Text className="text-gray-700 font-NunitoMedium">Plan</Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">
                {carData.subscription.plan} – ₦
                {carData.subscription.price.toLocaleString()}/month
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-green-100 rounded-lg mr-3 items-center justify-center">
                  <ShieldCheckIcon size={16} color="#10B981" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">Status</Text>
              </View>
              <View className="flex-row items-center">
                <Text
                  className={`font-NunitoBold mr-2 ${
                    carData.subscription.status === "Active"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {carData.subscription.status}
                </Text>
                {carData.subscription.status === "Active" && (
                  <View className="w-5 h-5 bg-green-500 rounded-full items-center justify-center">
                    <CheckIcon size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </View>

            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-100 rounded-lg mr-3 items-center justify-center">
                  <CalendarIcon size={16} color="#3B82F6" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  Next Renewal
                </Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">
                {carData.subscription.nextRenewal}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-purple-100 rounded-lg mr-3 items-center justify-center">
                  <CreditCardIcon size={16} color="#8B5CF6" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">
                  Payment Method
                </Text>
              </View>
              <Text className="text-gray-900 font-NunitoBold">
                {carData.subscription.paymentMethod}
              </Text>
            </View>
          </View>
        </View>
        ) : null}

        {showContactSection ? (
        <View className="mx-5 mb-6 bg-white rounded-2xl p-6 shadow-lg">
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 bg-indigo-100 rounded-xl mr-4 items-center justify-center">
              <PhoneIcon size={20} color="#6366F1" />
            </View>
            <View>
              <Text className="text-xl font-NunitoBold text-gray-900">
                Contact Information
              </Text>
              <Text className="text-sm text-gray-500 font-NunitoMedium">
                Support and assistance
              </Text>
            </View>
          </View>

          <View className="space-y-4">
            <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-green-100 rounded-lg mr-3 items-center justify-center">
                  <PhoneIcon size={16} color="#10B981" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">Phone</Text>
              </View>
              <Text className="text-primary-600 font-NunitoBold">
                {carData.contact.phone}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-100 rounded-lg mr-3 items-center justify-center">
                  <EnvelopeIcon size={16} color="#3B82F6" />
                </View>
                <Text className="text-gray-700 font-NunitoMedium">Email</Text>
              </View>
              <Text className="text-primary-600 font-NunitoBold">
                {carData.contact.email}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        ) : null}

        {/* Enhanced Actions */}
        {/* <View className="mx-5 mb-8">
          <Text className="text-lg font-NunitoBold text-gray-900 mb-4">
            More
          </Text>

          <View className="space-y-3">
            {showSubscriptionSection ? (
              <TouchableOpacity
                onPress={handleManageSubscription}
                className="flex-row items-center justify-between py-4 px-4 bg-primary-50 rounded-xl border border-primary-200"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-primary-100 rounded-lg mr-4 items-center justify-center">
                    <CogIcon size={20} color="#D30309" />
                  </View>
                  <View>
                    <Text className="text-gray-900 font-NunitoBold text-base">
                      Manage Subscription
                    </Text>
                    <Text className="text-gray-500 font-NunitoMedium text-sm">
                      Update plan or payment method
                    </Text>
                  </View>
                </View>
                <View className="w-6 h-6 bg-primary-100 rounded-full items-center justify-center">
                  <Text className="text-primary-600 text-xs font-NunitoBold">
                    →
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={handleViewPaymentHistory}
              className="flex-row items-center justify-between py-4 px-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-gray-100 rounded-lg mr-4 items-center justify-center">
                  <DocumentTextIcon size={20} color="#6B7280" />
                </View>
                <View>
                  <Text className="text-gray-900 font-NunitoBold text-base">
                    Payment History
                  </Text>
                  <Text className="text-gray-500 font-NunitoMedium text-sm">
                    View all transactions
                  </Text>
                </View>
              </View>
              <View className="w-6 h-6 bg-gray-100 rounded-full items-center justify-center">
                <Text className="text-gray-600 text-xs font-NunitoBold">→</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View> */}

        {/* Bottom spacing */}
        <View className="h-20" />
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <DeleteCarModal
        isVisible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        carName={carData.name}
      />

      {/* Success Modal */}
      <SuccessModal
        isVisible={showSuccessModal}
        onClose={handleSuccessClose}
        title={successConfig.title}
        message={successConfig.message}
      />
    </SafeAreaView>
  );
};

export default CarDetail;
