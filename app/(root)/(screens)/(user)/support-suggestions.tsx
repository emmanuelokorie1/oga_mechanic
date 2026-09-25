import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ShoppingCartIcon,
  WrenchScrewdriverIcon,
  UserCircleIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  PlusIcon,
  TruckIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  BoltIcon,
} from "react-native-heroicons/outline";
import { LinearGradient } from "expo-linear-gradient";
import { routes } from "@/constants/routes";
import { useNotificationWebSocket } from "@/hooks/useNotificationWebSocket";
import { icons, images } from "@/constants";
import { useQuery } from "@tanstack/react-query";
import { supportAPI } from "@/lib/api/support";
import { format } from "date-fns";

const { width } = Dimensions.get("window");

/* ---------------- SKELETON LOADER ---------------- */

const TicketSkeletonCard = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  return (
    <Animated.View style={[{ opacity }, styles.skeletonCard]}>
      <View style={styles.skeletonRow}>
        <View style={[styles.skeletonBar, { width: "60%" }]} />
        <View style={styles.skeletonBadge} />
      </View>
      <View style={[styles.skeletonRow, { marginTop: 12 }]}>
        <View style={[styles.skeletonBar, { width: "40%", height: 10, backgroundColor: "#f1f5f9" }]} />
        <View style={styles.skeletonChevron} />
      </View>
    </Animated.View>
  );
};

const TicketsSkeleton = () => (
  <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
    <View style={[styles.skeletonRow, { marginBottom: 24 }]}>
      <View style={[styles.skeletonBar, { width: 160, height: 22 }]} />
      <View style={styles.skeletonNewBtn} />
    </View>
    {[1, 2, 3].map((i) => <TicketSkeletonCard key={i} />)}
  </View>
);

/* ---------------- SUGGESTION CHIP ---------------- */

const SuggestionChip = ({ label, icon: Icon, color, onPress }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 10 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.chipContainer}
      >
        {Icon && (
          <View style={[styles.chipIcon, { backgroundColor: color + "18" }]}>
            <Icon size={15} color={color} />
          </View>
        )}
        <Text style={styles.chipLabel} numberOfLines={1}>{label}</Text>
        <ChevronRightIcon size={14} color="#CBD5E1" />
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ---------------- CATEGORY SECTION ---------------- */

const CategorySection = ({ category, onSuggestionPress }: any) => {
  const Icon = category.icon;

  return (
    <View style={styles.categoryContainer}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIconBg, { backgroundColor: category.bgColor }]}>
          <Icon size={20} color={category.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <Text style={styles.categorySubtitle}>{category.suggestions.length} topics</Text>
        </View>
      </View>

      <View style={styles.chipsGrid}>
        {category.suggestions.map((item: string, index: number) => (
          <SuggestionChip
            key={index}
            label={item}
            icon={category.icon}
            color={category.color}
            onPress={() => onSuggestionPress(item)}
          />
        ))}
      </View>
    </View>
  );
};

/* ---------------- LIVE CHAT TAB ---------------- */

/* ---------------- PREMIUM TICKET CARD ---------------- */

const TicketCard = ({ chat, onPress }: any) => {
  const statusColor = chat.status === 'open' ? '#10b981' : chat.status === 'in_progress' ? '#f59e0b' : '#94a3b8';
  const statusBg = chat.status === 'open' ? '#ecfdf5' : chat.status === 'in_progress' ? '#fffbeb' : '#f8fafc';

  // Last message preview logic
  const lastMsg = chat.last_message?.content || "No messages yet";
  const unreadCount = chat.unread_count || 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.premiumCard}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardSubjectContainer}>
          <Text style={styles.premiumSubject} numberOfLines={1}>{chat.subject || "Support Request"}</Text>
          <View style={[styles.premiumStatusBadge, { backgroundColor: statusBg }]}>
            <View style={[styles.premiumStatusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.premiumStatusText, { color: statusColor }]}>
              {chat.status?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.lastMessagePreview} numberOfLines={1}>
          {lastMsg}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.premiumDate}>
          {chat.created_at ? format(new Date(chat.created_at), "MMM d · h:mm a") : "Recently"}
        </Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCountText}>{unreadCount}</Text>
          </View>
        )}
        <ChevronRightIcon size={14} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );
};

const LiveChatTab = ({ isConnected }: { isConnected: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isConnected]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["support-conversations"],
    queryFn: () => supportAPI.getConversations(),
    staleTime: 0,
    retry: 2,
    refetchOnMount: true,
  });

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const conversations = data?.results?.data || [];

  if (isLoading) {
    return <TicketsSkeleton />;
  }

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
      <View style={styles.liveChatHeader}>
        <View>
          <Text style={styles.liveChatTitle}>Active Tickets</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <Text style={styles.liveChatSubtitle}>
              {conversations.length} total thread{conversations.length !== 1 ? 's' : ''}
            </Text>
            {isConnected && (
              <View style={styles.liveIndicatorContainer}>
                <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.liveIndicatorText}>Live Sync</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push(routes.chatSpecialist as any)}
          style={styles.plusFab}
        >
          <PlusIcon size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {conversations.length > 0 ? (
        <View style={{ gap: 16 }}>
          {conversations.map((chat: any) => (
            <TicketCard
              key={chat.id}
              chat={chat}
              onPress={() => router.push({
                pathname: routes.chatSpecialist as any,
                params: { roomId: chat.id },
              })}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <ChatBubbleOvalLeftEllipsisIcon size={36} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>No tickets yet</Text>
          <Text style={styles.emptySubtitle}>
            Our specialists are online and ready to help you with anything you need.
          </Text>
          <TouchableOpacity
            onPress={() => router.push(routes.chatSpecialist as any)}
            style={styles.startChatBtn}
          >
            <Text style={styles.startChatText}>Start a Conversation</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/* ---------------- MAIN SCREEN ---------------- */

const SupportSuggestions = () => {
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'support' | 'live-chat'>(params.activeTab === 'chat' ? 'live-chat' : 'support');
  // Bug 10 fix: use the actual WebSocket connection state instead of hardcoded true.
  // Previously, the status badge always showed "Connected" regardless of network.
  const { isConnected } = useNotificationWebSocket({});

  const handleSuggestionPress = (text: string) => {
    router.push({
      pathname: routes.chatSpecialist as any,
      params: { prefill: text },
    });
  };

  const categories = [
    {
      id: "marketplace",
      title: "Buying & Selling",
      icon: ShoppingCartIcon,
      color: "#3B82F6",
      bgColor: "#EFF6FF",
      suggestions: [
        "I need to contact a seller",
        "How do I confirm my car purchase?",
        "I received a wrong spare part",
        "I'd like to request a refund",
      ],
    },
    {
      id: "rentals",
      title: "Rentals & Towing",
      icon: BoltIcon,
      color: "#F59E0B",
      bgColor: "#FFFBEB",
      suggestions: [
        "I need help with a car rental",
        "My towing service is delayed",
        "I want to extend my rental duration",
        "How do I book a towing van?",
      ],
    },
    {
      id: "repairs",
      title: "Mechanic Repairs",
      icon: WrenchScrewdriverIcon,
      color: "#10B981",
      bgColor: "#ECFDF5",
      suggestions: [
        "I need to book a mechanic",
        "What are your service prices?",
        "My repair is taking too long",
        "I have a warranty question",
      ],
    },
    {
      id: "logistics",
      title: "Delivery & Logistics",
      icon: TruckIcon,
      color: "#8B5CF6",
      bgColor: "#F5F3FF",
      suggestions: [
        "Where is my delivery?",
        "I want to change my delivery address",
        "My package arrived damaged",
        "I need to track my parts delivery",
      ],
    },
    {
      id: "account",
      title: "App & Account",
      icon: UserCircleIcon,
      color: "#6B7280",
      bgColor: "#F9FAFB",
      suggestions: [
        "I want to reset my password",
        "I need to change my phone number",
        "I want to report a bug",
        "Help with my profile settings",
      ],
    },
    {
      id: "security",
      title: "Safety & Security",
      icon: ShieldCheckIcon,
      color: "#EF4444",
      bgColor: "#FEF2F2",
      suggestions: [
        "I think my account was compromised",
        "I want to report suspicious activity",
        "Help with two-factor authentication",
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <StatusBar style="dark" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeftIcon size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Center</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* TABS */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('support')}
            style={[styles.tab, activeTab === 'support' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'support' && styles.tabTextActive]}>
              Support
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('live-chat')}
            style={[styles.tab, activeTab === 'live-chat' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'live-chat' && styles.tabTextActive]}>
              Live Chat
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {activeTab === 'support' ? (
          <>
            {/* HERO GRADIENT */}
            <LinearGradient
              colors={["#FFF1F2", "#FFF8F8", "#FFFFFF"]}
              style={styles.hero}
            >
              <View style={styles.heroEmoji}>
                <Image
                  source={icons.customerService}
                  resizeMode="contain"
                  style={{
                    width: 85,
                    height: 85,
                    marginRight: width * 0.04,
                  }}
                />
              </View>
              <Text style={styles.heroTitle}>How can we{"\n"}<Text style={styles.heroAccent}>help you today?</Text></Text>
              <Text style={styles.heroSubtitle}>
                Tap any topic below to instantly start a conversation with a specialist.
              </Text>
            </LinearGradient>

            {/* QUICK ACTION STRIP */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: "#EFF6FF" }]}
                onPress={() => handleSuggestionPress("I need help with my order")}
              >
                <ShoppingCartIcon size={20} color="#3B82F6" />
                <Text style={[styles.quickActionText, { color: "#3B82F6" }]}>Orders</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: "#FFFBEB" }]}
                onPress={() => handleSuggestionPress("I need to book a mechanic")}
              >
                <WrenchScrewdriverIcon size={20} color="#F59E0B" />
                <Text style={[styles.quickActionText, { color: "#F59E0B" }]}>Repairs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: "#ECFDF5" }]}
                onPress={() => router.push(routes.chatSpecialist as any)}
              >
                <BoltIcon size={20} color="#10B981" />
                <Text style={[styles.quickActionText, { color: "#10B981" }]}>Live Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: "#FEF2F2" }]}
                onPress={() => handleSuggestionPress("I want to report an issue with my account")}
              >
                <ShieldCheckIcon size={20} color="#EF4444" />
                <Text style={[styles.quickActionText, { color: "#EF4444" }]}>Security</Text>
              </TouchableOpacity>
            </View>

            {/* CATEGORIES */}
            <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
              <Text style={styles.sectionLabel}>Browse by Topic</Text>
              {categories.map((cat) => (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  onSuggestionPress={handleSuggestionPress}
                />
              ))}
            </View>

            {/* CTA CARD */}
            <View style={styles.ctaCard}>
              <LinearGradient
                colors={["#D30309", "#ff4444"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={{ fontSize: 32 }}>🎧</Text>
                <Text style={styles.ctaTitle}>Need direct help?</Text>
                <Text style={styles.ctaSubtitle}>
                  Our specialists are available to chat with you in real time.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push(routes.chatSpecialist as any)}
                  style={styles.ctaButton}
                >
                  <Text style={styles.ctaButtonText}>Open Live Chat</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </>
        ) : (
          <LiveChatTab isConnected={isConnected} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, backgroundColor: '#f8fafc', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito-ExtraBold', color: '#111827' },

  tabsWrapper: { paddingHorizontal: 20, marginBottom: 4 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 16, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#94a3b8' },
  tabTextActive: { color: '#111827' },

  hero: { marginHorizontal: 20, marginTop: 12, borderRadius: 24, padding: 24, alignItems: 'center' },
  heroEmoji: { width: 64, height: 64, backgroundColor: '#fff', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#D30309', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
  heroTitle: { fontSize: 24, fontFamily: 'Nunito-ExtraBold', color: '#111827', textAlign: 'center', lineHeight: 34 },
  heroAccent: { color: '#D30309' },
  heroSubtitle: { fontSize: 14, fontFamily: 'Nunito-Medium', color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 22 },

  quickActions: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, gap: 10 },
  quickAction: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, gap: 6 },
  quickActionText: { fontSize: 11, fontFamily: 'Nunito-Bold' },

  sectionLabel: { fontSize: 16, fontFamily: 'Nunito-Bold', color: '#374151', marginBottom: 16, marginTop: 8 },

  categoryContainer: { marginBottom: 20, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  categoryIconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  categoryTitle: { fontFamily: 'Nunito-Bold', fontSize: 15, color: '#111827' },
  categorySubtitle: { fontFamily: 'Nunito-Medium', fontSize: 12, color: '#94a3b8', marginTop: 1 },
  chipsGrid: { padding: 12, paddingTop: 10 },

  chipContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  chipIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  chipLabel: { flex: 1, fontFamily: 'Nunito-Medium', fontSize: 14, color: '#374151' },

  ctaCard: { marginHorizontal: 20, marginTop: 24, borderRadius: 24, overflow: 'hidden' },
  ctaGradient: { padding: 28, alignItems: 'center' },
  ctaTitle: { fontFamily: 'Nunito-ExtraBold', fontSize: 22, color: '#fff', marginTop: 12, textAlign: 'center' },
  ctaSubtitle: { fontFamily: 'Nunito-Medium', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 8, textAlign: 'center', lineHeight: 22 },
  ctaButton: { marginTop: 20, backgroundColor: '#fff', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
  ctaButtonText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: '#D30309' },

  // Tickets
  liveChatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  liveChatTitle: { fontFamily: 'Nunito-ExtraBold', fontSize: 22, color: '#111827' },
  liveChatSubtitle: { fontFamily: 'Nunito-Medium', fontSize: 13, color: '#94a3b8' },
  plusFab: { width: 44, height: 44, backgroundColor: '#D30309', borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#D30309', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 2 },

  liveIndicatorContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  liveIndicatorText: { fontSize: 10, fontFamily: 'Nunito-ExtraBold', color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5 },

  premiumCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  cardHeader: { marginBottom: 12 },
  cardSubjectContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  premiumSubject: { flex: 1, fontFamily: 'Nunito-ExtraBold', fontSize: 16, color: '#111827', marginRight: 12 },
  premiumStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  premiumStatusDot: { width: 5, height: 5, borderRadius: 2.5 },
  premiumStatusText: { fontFamily: 'Nunito-Bold', fontSize: 10, letterSpacing: 0.2 },

  cardBody: { marginBottom: 16 },
  lastMessagePreview: { fontFamily: 'Nunito-Medium', fontSize: 14, color: '#64748b', lineHeight: 20 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  premiumDate: { fontFamily: 'Nunito-Bold', fontSize: 12, color: '#94a3b8', flex: 1 },
  unreadBadge: { backgroundColor: '#ef4444', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 12 },
  unreadCountText: { color: '#fff', fontSize: 10, fontFamily: 'Nunito-ExtraBold' },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, backgroundColor: '#f8fafc', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontFamily: 'Nunito-ExtraBold', fontSize: 20, color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontFamily: 'Nunito-Medium', fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  startChatBtn: { marginTop: 28, backgroundColor: '#D30309', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
  startChatText: { fontFamily: 'Nunito-Bold', fontSize: 15, color: '#fff' },

  // Skeletons
  skeletonCard: { backgroundColor: '#fff', padding: 18, borderRadius: 18, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skeletonBar: { height: 14, backgroundColor: '#e2e8f0', borderRadius: 8 },
  skeletonBadge: { width: 56, height: 24, backgroundColor: '#f1f5f9', borderRadius: 12 },
  skeletonChevron: { width: 16, height: 16, backgroundColor: '#f1f5f9', borderRadius: 8 },
  skeletonNewBtn: { width: 80, height: 36, backgroundColor: '#f1f5f9', borderRadius: 18 },
});

export default SupportSuggestions;