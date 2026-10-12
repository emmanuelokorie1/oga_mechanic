import React from "react";
import { View, Text, TouchableOpacity, Image, Linking } from "react-native";
import { CheckIcon } from "react-native-heroicons/outline";
import { Message, formatMessageTimestamp } from "@/utils/chatUtils";

interface ChatMessageProps {
  item: Message;
}

const handleOpenFileUrl = (url?: string) => {
  if (!url) return;
  if (/^https?:\/\//i.test(url)) {
    Linking.openURL(url).catch(() => {});
  }
};

const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ item }) => (
  <View className={`mb-4 ${item.isSent ? "items-end" : "items-start"}`}>
    <View
      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
        item.isSent ? "bg-primary-500" : "bg-gray-200"
      }`}
    >
      {item.messageType === "image" && item.fileUrl ? (
        <TouchableOpacity onPress={() => handleOpenFileUrl(item.fileUrl)}>
          <Image
            source={{ uri: item.fileUrl }}
            className="w-48 h-48 rounded-xl mb-1 bg-black/10"
            resizeMode="cover"
          />
        </TouchableOpacity>
      ) : (item.messageType === "file" || item.messageType === "document") && item.fileUrl ? (
        <TouchableOpacity 
          onPress={() => handleOpenFileUrl(item.fileUrl)}
          className="flex-row items-center bg-black/10 p-2.5 rounded-xl mb-1"
        >
          <View className="w-8 h-8 bg-black/5 rounded-full items-center justify-center mr-2">
            <Text className="text-sm">📄</Text>
          </View>
          <Text 
            className={`text-sm font-semibold underline flex-1 ${
              item.isSent ? "text-white" : "text-blue-600"
            }`}
            numberOfLines={1}
          >
            Attachment
          </Text>
        </TouchableOpacity>
      ) : null}
      
      {!!item.text && (
        <Text
          className={`text-base leading-6 font-NunitoMedium ${
            item.isSent ? "text-white" : "text-gray-800"
          }`}
        >
          {typeof item.text === 'string'
            ? item.text
            : typeof (item.text as any)?.content === 'string'
            ? (item.text as any).content
            : typeof (item.text as any)?.text === 'string'
            ? (item.text as any).text
            : ''}
        </Text>
      )}
    </View>
    <View className={`flex-row items-center mt-1 px-2 ${item.isSent ? "justify-end" : "justify-start"}`}>
      <Text className="text-xs text-gray-500 mr-1">{formatMessageTimestamp(item.timestamp)}</Text>
      {item.isSent && (
        <View className="flex-row items-center ml-1">
          {item.status === 'sending' && (
            <Text className="text-[10px] text-gray-400 italic">Sending...</Text>
          )}
          {(item.status === 'read' || item.is_read || item.read) ? (
            <View className="flex-row">
              <CheckIcon size={12} color="#3B82F6" />
              <CheckIcon size={12} color="#3B82F6" style={{ marginLeft: -8 }} />
            </View>
          ) : item.status === 'delivered' ? (
            <View className="flex-row">
              <CheckIcon size={12} color="#9CA3AF" />
              <CheckIcon size={12} color="#9CA3AF" style={{ marginLeft: -8 }} />
            </View>
          ) : item.status === 'sent' ? (
            <CheckIcon size={12} color="#9CA3AF" />
          ) : null}
        </View>
      )}
    </View>
  </View>
));

export default ChatMessage; 