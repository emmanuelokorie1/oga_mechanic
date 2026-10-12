import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
  Animated,
  Alert,
  Pressable,
  Keyboard,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient"; // Recommended for better visuals
import BackArrowBtn from "@/components/BackArrowBtn";
import { 
  PaperAirplaneIcon, 
  PhoneIcon, 
  PaperClipIcon, 
  UserIcon 
} from "react-native-heroicons/outline";
import ChatMessage from "@/components/cards/ChatMessage";
import { Message } from "@/utils/chatUtils";

interface Participant {
  name: string;
  phone: string;
  avatar?: any;
  isOnline?: boolean;
  lastSeen?: string;
}

interface ChatScreenProps {
  participant: Participant;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  isTyping?: boolean;
  isLoadingHistory?: boolean;
  initialText?: string;
  headerSubtitle?: string;
  onCall?: () => void;
  onReconnect?: () => void;
  showAttachmentButton?: boolean;
  onAttachFile?: (file: { uri: string; name: string; mimeType: string; size?: number }) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const ChatScreen: React.FC<ChatScreenProps> = ({
  participant,
  messages = [],
  onSendMessage,
  onTyping,
  isTyping = false,
  isLoadingHistory = false,
  initialText,
  headerSubtitle = "Chat",
  onCall,
  onReconnect,
  showAttachmentButton = true,
  onAttachFile,
  onLoadMore,
  hasMore = false,
}) => {
  const [inputText, setInputText] = useState(initialText || "");
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Animations
  const typingOpacity = useRef(new Animated.Value(0)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;

  // Smooth typing indicator
  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(typingOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      typingOpacity.setValue(0);
    }
  }, [isTyping]);

  const lastMessageIdRef = useRef<string | null>(null);

  // Auto-scroll to bottom only when NEW messages arrive at the bottom
  useEffect(() => {
    if (messages.length > 0 && !isLoadingHistory) {
      const lastMessage = messages[messages.length - 1];
      const hasNewMessageAtBottom = lastMessage.id !== lastMessageIdRef.current;
      
      if (hasNewMessageAtBottom) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
      lastMessageIdRef.current = lastMessage.id.toString();
    }
  }, [messages, isTyping, isLoadingHistory]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyTypingRef = useRef(false);

  // Clean up typing indicator on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isCurrentlyTypingRef.current) {
        onTyping?.(false);
      }
    };
  }, [onTyping]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      // Clear typing status immediately when message is sent
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (isCurrentlyTypingRef.current) {
        isCurrentlyTypingRef.current = false;
        onTyping?.(false);
      }

      onSendMessage(inputText.trim());
      setInputText("");

      // Button press animation
      Animated.sequence([
        Animated.timing(sendButtonScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.timing(sendButtonScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleTyping = (text: string) => {
    setInputText(text);

    if (text.trim().length > 0) {
      if (!isCurrentlyTypingRef.current) {
        isCurrentlyTypingRef.current = true;
        onTyping?.(true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Automatically reset typing status after 2.5s of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        isCurrentlyTypingRef.current = false;
        onTyping?.(false);
        typingTimeoutRef.current = null;
      }, 2500);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (isCurrentlyTypingRef.current) {
        isCurrentlyTypingRef.current = false;
        onTyping?.(false);
      }
    }
  };

  const handleAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (onAttachFile) {
          onAttachFile({
            uri: file.uri,
            name: file.name,
            mimeType: file.mimeType || "application/octet-stream",
            size: file.size,
          });
        }
      }
    } catch (err) {
      console.error("Error picking document:", err);
      Alert.alert("Error", "Could not pick a file.");
    }
  };

  const renderTypingIndicator = () => (
    <View className="mb-6 pl-4">
      <View className="bg-gray-100 rounded-3xl rounded-bl-2xl px-5 py-3.5 flex-row items-center gap-x-1.5 w-20">
        <Animated.View 
          style={{ opacity: typingOpacity }}
          className="w-2 h-2 bg-gray-500 rounded-full" 
        />
        <Animated.View 
          style={{ opacity: typingOpacity }}
          className="w-2 h-2 bg-gray-500 rounded-full" 
        />
        <Animated.View 
          style={{ opacity: typingOpacity }}
          className="w-2 h-2 bg-gray-500 rounded-full" 
        />
      </View>
    </View>
  );

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <ChatMessage item={item} />
  ), []);

  const MessageSkeletonBubble = ({ isSent, width: w }: { isSent: boolean; width: number }) => {
    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.9, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, []);

    return (
      <View style={{ alignItems: isSent ? 'flex-end' : 'flex-start', marginBottom: 14, paddingHorizontal: 16 }}>
        <Animated.View
          style={{
            opacity: pulseAnim,
            height: 44,
            width: w,
            borderRadius: 22,
            backgroundColor: isSent ? '#fde8e8' : '#e2e8f0',
          }}
        />
        <Animated.View
          style={{
            opacity: pulseAnim,
            height: 10,
            width: w * 0.45,
            borderRadius: 8,
            backgroundColor: '#e2e8f0',
            marginTop: 4,
            alignSelf: isSent ? 'flex-end' : 'flex-start',
          }}
        />
      </View>
    );
  };

  const ChatSkeleton = () => (
    <View style={{ flex: 1, paddingTop: 16, paddingBottom: 100 }}>
      <MessageSkeletonBubble isSent={false} width={220} />
      <MessageSkeletonBubble isSent={true}  width={160} />
      <MessageSkeletonBubble isSent={false} width={260} />
      <MessageSkeletonBubble isSent={true}  width={200} />
      <MessageSkeletonBubble isSent={false} width={190} />
      <MessageSkeletonBubble isSent={true}  width={240} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top", "bottom"]}>
        <View style={{ flex: 1 }}>
          {/* Unified Header - Kept outside KeyboardAvoidingView for stability */}
          <View className="bg-white border-b border-gray-100 shadow-sm">
            <View className="flex-row items-center px-4 py-3">
              <BackArrowBtn />
              
              <View className="flex-1 flex-row items-center ml-2">
                {/* Avatar with Status indicator */}
                <View className="relative">
                  <View className="w-11 h-11 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                    {/* ... Avatar render logic ... */}
                    {typeof participant.avatar === "string" ? (
                      <Image
                        source={{ uri: participant.avatar }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : typeof participant.avatar === "number" ? (
                      <Image
                        source={participant.avatar}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : participant.avatar ? (
                      React.createElement(participant.avatar, { width: 44, height: 44 })
                    ) : (
                      <View className="w-full h-full bg-gray-100 items-center justify-center">
                        <UserIcon size={24} color="#64748b" />
                      </View>
                    )}
                  </View>
                  {participant.isOnline && (
                    <View className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                  )}
                </View>

                {/* Info Column */}
                <View className="ml-3 flex-1">
                  <Text className="text-base font-bold text-gray-900 leading-tight" numberOfLines={1}>
                    {participant.name}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    {isTyping ? (
                      <Animated.Text 
                        style={{ opacity: typingOpacity }}
                        className="text-[11px] font-bold text-emerald-600"
                      >
                        is typing...
                      </Animated.Text>
                    ) : (
                      <Text className={`text-[11px] font-semibold ${participant.isOnline ? "text-emerald-600" : "text-gray-500"}`}>
                        {participant.isOnline ? "• Online" : (participant.lastSeen ? `Last seen ${participant.lastSeen}` : headerSubtitle)}
                      </Text>
                    )}
                    {!participant.isOnline && participant.phone && (
                      <>
                        <Text className="text-[11px] text-gray-300 mx-1">|</Text>
                        <Text className="text-[11px] text-gray-500 font-medium">{participant.phone}</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {onCall && (
                <TouchableOpacity 
                  onPress={onCall}
                  className="w-10 h-10 bg-green-50 rounded-full items-center justify-center active:bg-green-100"
                >
                  <PhoneIcon size={20} color="#10b981" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 80}
          >

          {/* Messages Area */}
          {isLoadingHistory && messages.length === 0 ? (
            <ChatSkeleton />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id.toString()}
              style={{ flex: 1, backgroundColor: "#f8fafc" }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 100,
              }}
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              windowSize={10}
              removeClippedSubviews={true}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={hasMore ? (
                <TouchableOpacity 
                  onPress={onLoadMore}
                  style={{ alignSelf: 'center', marginVertical: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 20 }}
                >
                  <Text style={{ fontFamily: 'Nunito-Bold', fontSize: 13, color: '#64748b' }}>
                    {isLoadingHistory ? 'Loading history...' : 'Load previous messages'}
                  </Text>
                </TouchableOpacity>
              ) : <View style={{ height: 16 }} />}
              ListFooterComponent={isTyping ? renderTypingIndicator : <View style={{ height: 30 }} />}
            />
          )}

          {/* Input Area - Modern & Smooth */}
          <View 
            className="bg-white border-t border-gray-100 px-4 pt-3 pb-8"
            style={{ marginBottom: Platform.OS === 'android' ? 10 : 0 }}
          >
            <View className="flex-row items-end gap-x-3">
              {/* Attachment Button */}
              {showAttachmentButton && (
                <TouchableOpacity
                  onPress={handleAttachment}
                  className="w-11 h-11 bg-gray-100 rounded-2xl items-center justify-center active:bg-gray-200 transition-colors"
                  activeOpacity={0.7}
                >
                  <PaperClipIcon size={22} color="#64748b" />
                </TouchableOpacity>
              )}

              {/* Message Input */}
              <View className="flex-1">
                <TextInput
                  ref={inputRef}
                  value={inputText}
                  onChangeText={handleTyping}
                  placeholder="Type a message..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  maxLength={1000}
                  style={{
                    backgroundColor: "#f1f5f9",
                    borderRadius: 24,
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    fontSize: 16,
                    lineHeight: 22,
                    maxHeight: 130,
                    minHeight: 48,
                    color: "#0f172a",
                  }}
                  autoCapitalize="sentences"
                  autoCorrect={true}
                />
              </View>

              {/* Send Button with Scale Animation */}
              <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
                <TouchableOpacity
                  onPress={handleSendMessage}
                  disabled={!inputText.trim()}
                  className="w-11 h-11 rounded-2xl items-center justify-center"
                  style={{
                    backgroundColor: inputText.trim() ? "#D30309" : "#e2e8f0",
                  }}
                  activeOpacity={0.85}
                >
                  <PaperAirplaneIcon
                    size={20}
                    color={inputText.trim() ? "#fff" : "#94a3b8"}
                    style={{ transform: [{ rotate: "-35deg" }] }}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;