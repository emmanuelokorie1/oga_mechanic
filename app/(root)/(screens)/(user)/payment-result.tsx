
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import BackArrowBtn from "@/components/BackArrowBtn";
import { routes } from "@/constants/routes";
import { NairaCurrency } from "@/utils/useCurrencyFormatter";
import { useVerifyPayment } from "@/hooks/usePayment";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  EnvelopeIcon,
} from "react-native-heroicons/solid";

const { width } = Dimensions.get("window");

// ─── Status Config ────────────────────────────────────────────────────────────

type StatusKey = "success" | "failed" | "pending" | "verifying";

interface StatusConfig {
  gradientColors: readonly [string, string, string];
  accentColor: string;
  iconBg: string;
  pillBg: string;
  pillText: string;
  badgeLabel: string;
  title: string;
  ctaPrimary: string;
  ctaPrimaryBg: readonly [string, string];
  ctaSecondary?: string;
  footerIcon: "envelope" | "info";
  footerText: string;
}

const STATUS_MAP: Record<StatusKey, StatusConfig> = {
  success: {
    gradientColors: ["#f0fdf4", "#dcfce7", "#ffffff"],
    accentColor: "#16a34a",
    iconBg: "#bbf7d0",
    pillBg: "#dcfce7",
    pillText: "#15803d",
    badgeLabel: "Paid",
    title: "Payment Successful",
    ctaPrimary: "Keep Shopping",
    ctaPrimaryBg: ["#16a34a", "#15803d"],
    ctaSecondary: "View Orders",
    footerIcon: "envelope",
    footerText: "A receipt has been sent to your email",
  },
  failed: {
    gradientColors: ["#fff1f2", "#ffe4e6", "#ffffff"],
    accentColor: "#dc2626",
    iconBg: "#fecaca",
    pillBg: "#fee2e2",
    pillText: "#b91c1c",
    badgeLabel: "Failed",
    title: "Payment Failed",
    ctaPrimary: "Try Again",
    ctaPrimaryBg: ["#dc2626", "#b91c1c"],
    footerIcon: "info",
    footerText: "Contact support if the issue persists",
  },
  pending: {
    gradientColors: ["#fffbeb", "#fef3c7", "#ffffff"],
    accentColor: "#d97706",
    iconBg: "#fde68a",
    pillBg: "#fef3c7",
    pillText: "#92400e",
    badgeLabel: "Pending",
    title: "Awaiting Confirmation",
    ctaPrimary: "Go Home",
    ctaPrimaryBg: ["#d97706", "#b45309"],
    footerIcon: "info",
    footerText: "We'll notify you when your payment clears",
  },
  verifying: {
    gradientColors: ["#eff6ff", "#dbeafe", "#ffffff"],
    accentColor: "#2563eb",
    iconBg: "#bfdbfe",
    pillBg: "#dbeafe",
    pillText: "#1d4ed8",
    badgeLabel: "Verifying",
    title: "Verifying Payment",
    ctaPrimary: "",
    ctaPrimaryBg: ["#2563eb", "#1d4ed8"],
    footerIcon: "info",
    footerText: "Please keep this screen open",
  },
};

// ─── Dot Row (receipt divider) ────────────────────────────────────────────────

const DashedDivider = ({ color }: { color: string }) => (
  <View style={styles.dashedRow}>
    {Array.from({ length: 28 }).map((_: any, i: number) => (
      <View key={i} style={[styles.dot, { backgroundColor: color }]} />
    ))}
  </View>
);

// ─── Receipt Row ──────────────────────────────────────────────────────────────

const ReceiptRow = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <View style={styles.receiptRow}>
    <Text style={styles.receiptLabel}>{label}</Text>
    <Text
      style={[styles.receiptValue, mono && styles.receiptMono]}
      numberOfLines={1}
      ellipsizeMode="middle"
    >
      {value}
    </Text>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const PaymentResult = () => {
  const params = useLocalSearchParams();

  const initialStatus = params.status as string;
  const orderId = params.orderId as string;
  const totalAmount = params.totalAmount as string;
  const paymentReference = params.paymentReference as string;
  const initialMessage = params.message as string;

  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState(initialMessage);
  const [isVerifying, setIsVerifying] = useState(
    initialStatus === "pending" && !!paymentReference
  );

  const { data: verificationData, isLoading, error, refetch } = useVerifyPayment(
    paymentReference,
    { enabled: initialStatus === "pending" && !!paymentReference }
  );

  // ── Animations ──
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [status]);

  useEffect(() => {
    if (isVerifying || isLoading) {
      // Pulse loop for icon while loading
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isVerifying, isLoading]);

  useEffect(() => {
    if (verificationData?.data) {
      const ps = verificationData.data.payment_status?.toLowerCase();
      if (["success", "paid", "successful"].includes(ps)) {
        setStatus("success");
        setMessage("Your payment has been verified successfully!");
      } else if (["failed", "cancelled"].includes(ps)) {
        setStatus("failed");
        setMessage(
          verificationData.data.gateway_response || "Payment was not completed."
        );
      }
      setIsVerifying(false);
    } else if (error) {
      setIsVerifying(false);
    }
  }, [verificationData, error]);

  const resolvedKey: StatusKey =
    isVerifying || isLoading
      ? "verifying"
      : status === "success"
      ? "success"
      : status === "pending"
      ? "pending"
      : "failed";

  const cfg = STATUS_MAP[resolvedKey];

  const isSuccess = resolvedKey === "success";
  const isFailed = resolvedKey === "failed";
  const isPending = resolvedKey === "pending";
  const isVerifyingState = resolvedKey === "verifying";

  const handleContinue = () => {
    if (isSuccess) router.replace(routes?.home);
    else router.replace(routes?.cart);
  };

  const handleViewOrders = () => router.push({
    pathname: routes?.orderConfirmation,
    params: { id: orderId, totalAmount }
  });

  return (
    <LinearGradient
      colors={cfg.gradientColors}
      style={styles.root}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <BackArrowBtn />
          <Text style={styles.headerTitle}>
            {isSuccess
              ? "Payment Success"
              : isFailed
              ? "Payment Failed"
              : "Payment Status"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero Icon ── */}
          <Animated.View
            style={[
              styles.heroWrap,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: Animated.multiply(scaleAnim, pulseAnim) },
                ],
              },
            ]}
          >
            {/* Outer ring */}
            <View
              style={[
                styles.iconRingOuter,
                { borderColor: cfg.accentColor + "22" },
              ]}
            >
              {/* Inner circle */}
              <View
                style={[styles.iconRingInner, { backgroundColor: cfg.iconBg }]}
              >
                {isVerifyingState ? (
                  <ActivityIndicator size={36} color={cfg.accentColor} />
                ) : isSuccess ? (
                  <CheckCircleIcon size={52} color={cfg.accentColor} />
                ) : isPending ? (
                  <ClockIcon size={52} color={cfg.accentColor} />
                ) : (
                  <XCircleIcon size={52} color={cfg.accentColor} />
                )}
              </View>
            </View>
          </Animated.View>

          {/* ── Title & Message ── */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              alignItems: "center",
              paddingHorizontal: 24,
              marginBottom: 32,
            }}
          >
            <Text style={[styles.heroTitle, { color: cfg.accentColor }]}>
              {cfg.title}
            </Text>
            <Text style={styles.heroMessage}>
              {isVerifyingState
                ? "Syncing with your bank — please stay on this page."
                : message ||
                  (isSuccess
                    ? "Great news! Your transaction went through smoothly."
                    : isFailed
                    ? "Something went wrong. Please try a different payment method."
                    : "We're waiting for confirmation from your bank.")}
            </Text>
          </Animated.View>

          {/* ── Receipt Card ── */}
          {orderId && (
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Card header */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Transaction Receipt</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: cfg.pillBg },
                  ]}
                >
                  <View
                    style={[
                      styles.badgeDot,
                      { backgroundColor: cfg.accentColor },
                    ]}
                  />
                  <Text style={[styles.badgeText, { color: cfg.pillText }]}>
                    {cfg.badgeLabel}
                  </Text>
                </View>
              </View>

              {/* Rows */}
              <ReceiptRow label="Order ID" value={orderId} mono />
              {paymentReference && (
                <ReceiptRow
                  label="Reference"
                  value={paymentReference}
                  mono
                />
              )}

              {/* Dashed divider */}
              <View style={{ marginVertical: 16 }}>
                <DashedDivider color="#e5e7eb" />
              </View>

              {/* Amount */}
              {totalAmount && (
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Total Amount</Text>
                  <NairaCurrency
                    value={parseFloat(totalAmount)}
                    className="text-2xl font-black text-gray-900"
                  />
                </View>
              )}

              {/* Ticket notch effect */}
              <View style={styles.notchLeft} />
              <View style={styles.notchRight} />
            </Animated.View>
          )}

          {/* ── CTA Buttons ── */}
          {!isVerifyingState && (
            <Animated.View
              style={[
                styles.ctaWrap,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {isSuccess && (
                <TouchableOpacity
                  onPress={handleViewOrders}
                  style={styles.btnOutline}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnOutlineText}>View Orders</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleContinue}
                activeOpacity={0.8}
                style={styles.btnPrimaryWrap}
              >
                <LinearGradient
                  colors={cfg.ctaPrimaryBg}
                  style={styles.btnPrimary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.btnPrimaryText}>{cfg.ctaPrimary}</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Footer hint */}
              <View style={styles.footer}>
                {cfg.footerIcon === "envelope" ? (
                  <EnvelopeIcon size={14} color="#9ca3af" />
                ) : (
                  <InformationCircleIcon size={14} color="#9ca3af" />
                )}
                <Text style={styles.footerText}>{cfg.footerText}</Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_RADIUS = 28;

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Nunito-ExtraBold",
    color: "#111827",
    letterSpacing: -0.3,
  },

  scroll: {
    paddingBottom: 40,
    alignItems: "center",
  },

  // Hero
  heroWrap: {
    marginTop: 24,
    marginBottom: 28,
    alignItems: "center",
  },
  iconRingOuter: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRingInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },

  heroTitle: {
    fontSize: 26,
    fontFamily: "Nunito-ExtraBold",
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: "center",
  },
  heroMessage: {
    fontSize: 15,
    fontFamily: "Nunito-Medium",
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
  },

  // Card
  card: {
    backgroundColor: "#ffffff",
    borderRadius: CARD_RADIUS,
    marginHorizontal: 20,
    padding: 24,
    width: width - 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 28,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Nunito-ExtraBold",
    color: "#111827",
    letterSpacing: -0.2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Nunito-Bold",
    letterSpacing: 0.2,
  },

  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  receiptLabel: {
    fontSize: 12,
    fontFamily: "Nunito-Medium",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  receiptValue: {
    fontSize: 13,
    fontFamily: "Nunito-Bold",
    color: "#374151",
    maxWidth: "55%",
    textAlign: "right",
  },
  receiptMono: {
    fontFamily: "Nunito-Bold",
    letterSpacing: -0.2,
  },

  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 15,
    fontFamily: "Nunito-ExtraBold",
    color: "#111827",
  },

  dashedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dot: {
    width: 4,
    height: 2,
    borderRadius: 1,
    opacity: 0.5,
  },

  // Ticket notches
  notchLeft: {
    position: "absolute",
    left: -14,
    bottom: 82,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0fdf4", // matches gradient — overridden per instance
  },
  notchRight: {
    position: "absolute",
    right: -14,
    bottom: 82,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0fdf4",
  },

  // CTAs
  ctaWrap: {
    width: width - 40,
    gap: 12,
  },
  btnOutline: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  btnOutlineText: {
    fontSize: 16,
    fontFamily: "Nunito-Bold",
    color: "#374151",
  },
  btnPrimaryWrap: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  btnPrimary: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  btnPrimaryText: {
    fontSize: 17,
    fontFamily: "Nunito-ExtraBold",
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Nunito-Medium",
    color: "#9ca3af",
  },
});

export default PaymentResult;