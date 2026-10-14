import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  XMarkIcon,
  StarIcon as StarIconSolid,
  TrashIcon,
  CheckCircleIcon as CheckCircleIconSolid,
  SparklesIcon as SparklesIconSolid,
} from 'react-native-heroicons/solid';
import {
  StarIcon as StarIconOutline,
  UserIcon,
} from 'react-native-heroicons/outline';
import * as Haptics from 'expo-haptics';

interface MechanicReviewModalProps {
  visible: boolean;
  onClose: () => void;
  mechanicId: string;
  mechanicName?: string;
  mechanicImage?: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  isLoading?: boolean;
  initialRating?: number;
  initialComment?: string;
  isEdit?: boolean;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
}

interface ReviewTag {
  id: string;
  label: string;
  textToAppend: string;
}

const REVIEW_TAGS: ReviewTag[] = [
  { id: 'ontime', label: '⚡️ On Time', textToAppend: 'Arrived exactly on time' },
  { id: 'pro', label: '🛠 Professional', textToAppend: 'Friendly and professional service' },
  { id: 'pricing', label: '💰 Fair Pricing', textToAppend: 'Honest and fair pricing' },
  { id: 'speed', label: '🚀 Fast Turnaround', textToAppend: 'Quick and efficient turnaround' },
  { id: 'diagnostic', label: '🔍 Accurate Diagnosis', textToAppend: 'Accurate vehicle diagnostic' },
  { id: 'clean', label: '✨ Clean Work', textToAppend: 'Kept everything clean and tidy' },
  { id: 'recommend', label: '⭐️ Highly Recommended', textToAppend: 'Highly recommended specialist' },
];

const RATING_SENTIMENTS: Record<number, { text: string; bg: string; border: string; textCol: string }> = {
  5: { text: 'Exceptional Work! 🤩', bg: 'bg-emerald-50', border: 'border-emerald-200', textCol: 'text-emerald-700' },
  4: { text: 'Very Good Service! 😊', bg: 'bg-green-50', border: 'border-green-200', textCol: 'text-green-700' },
  3: { text: 'Good Experience 🙂', bg: 'bg-amber-50', border: 'border-amber-200', textCol: 'text-amber-700' },
  2: { text: 'Fair Experience 😐', bg: 'bg-orange-50', border: 'border-orange-200', textCol: 'text-orange-700' },
  1: { text: 'Needs Improvement 😕', bg: 'bg-red-50', border: 'border-red-200', textCol: 'text-red-700' },
  0: { text: 'Tap stars above to rate', bg: 'bg-gray-50', border: 'border-gray-200', textCol: 'text-gray-500' },
};

const MechanicReviewModal: React.FC<MechanicReviewModalProps> = ({
  visible,
  onClose,
  mechanicId,
  mechanicName,
  mechanicImage,
  onSubmit,
  isLoading = false,
  initialRating = 0,
  initialComment = '',
  isEdit = false,
  onDelete,
  isDeleting = false,
}) => {
  const [rating, setRating] = useState<number>(initialRating);
  const [comment, setComment] = useState<string>(initialComment);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setRating(initialRating || 0);
      setComment(initialComment || '');
      // Detect any tags already present in initialComment
      const initialMatches = REVIEW_TAGS
        .filter((tag) => (initialComment || '').toLowerCase().includes(tag.textToAppend.toLowerCase()))
        .map((tag) => tag.id);
      setSelectedTagIds(initialMatches);
    }
  }, [visible, initialRating, initialComment]);

  const handleRatingSelect = (selectedStar: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRating(selectedStar);
  };

  const handleTagToggle = (tag: ReviewTag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isAlreadySelected = selectedTagIds.includes(tag.id);

    if (isAlreadySelected) {
      // Remove tag
      setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id));
      // Remove text snippet from comment if present
      const regex = new RegExp(`(,\\s*)?${tag.textToAppend}|${tag.textToAppend}(\\.\\s*)?`, 'gi');
      const updated = comment.replace(regex, '').replace(/,\s*,/g, ',').replace(/^,\s*|\s*,\s*$/g, '').trim();
      setComment(updated);
    } else {
      // Add tag
      setSelectedTagIds((prev) => [...prev, tag.id]);
      const trimmed = comment.trim();
      if (!trimmed) {
        setComment(tag.textToAppend);
      } else if (!trimmed.toLowerCase().includes(tag.textToAppend.toLowerCase())) {
        const punctuation = trimmed.endsWith('.') || trimmed.endsWith('!') ? ' ' : ', ';
        setComment(`${trimmed}${punctuation}${tag.textToAppend}`);
      }
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please tap a star rating before submitting.');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Feedback Required', 'Please provide a short comment explaining your rating.');
      return;
    }

    try {
      await onSubmit(rating, comment.trim());
      onClose();
    } catch (error) {
      // Error handled by parent component
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete();
              onClose();
            } catch (error) {
              // Handled by parent
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    setRating(initialRating || 0);
    setComment(initialComment || '');
    setSelectedTagIds([]);
    onClose();
  };

  const sentiment = RATING_SENTIMENTS[rating] || RATING_SENTIMENTS[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/60 justify-end"
      >
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={handleClose}
        />

        <View className="bg-white rounded-t-[36px] max-h-[88%] pb-8 shadow-2xl">
          {/* Pull Indicator */}
          <View className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <View className="flex-1 mr-4">
              <Text className="text-xl font-NunitoExtraBold text-gray-900">
                {isEdit ? 'Edit Your Review' : 'Rate & Review'}
              </Text>
              <Text className="text-xs font-NunitoMedium text-gray-400 mt-0.5">
                {isEdit ? 'Update your rating & comments' : 'Share your service experience'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center active:scale-95"
            >
              <XMarkIcon size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-6"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingVertical: 18 }}
          >
            {/* Specialist Profile Card */}
            {mechanicName && (
              <View className="flex-row items-center bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 mb-5">
                <View className="w-12 h-12 rounded-xl bg-gray-200 items-center justify-center overflow-hidden mr-3.5 border border-gray-200">
                  {mechanicImage ? (
                    <Image
                      source={{ uri: mechanicImage }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <UserIcon size={24} color="#9CA3AF" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-NunitoBold text-gray-400 uppercase tracking-widest">
                    Service Specialist
                  </Text>
                  <Text className="text-base font-NunitoExtraBold text-gray-900 leading-5" numberOfLines={1}>
                    {mechanicName}
                  </Text>
                </View>
                <View className="flex-row items-center px-2 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                  <CheckCircleIconSolid size={12} color="#059669" />
                  <Text className="text-[10px] font-NunitoBold text-emerald-700 ml-1">Verified</Text>
                </View>
              </View>
            )}

            {/* Star Rating Selector Card */}
            <View className="bg-gradient-to-b from-amber-50/60 to-white p-5 rounded-3xl border border-amber-200/70 mb-5 items-center">
              <Text className="text-[11px] font-NunitoBold text-amber-800 uppercase tracking-widest mb-3">
                Select Your Rating
              </Text>

              {/* 5 Stars */}
              <View className="flex-row items-center justify-center space-x-2 my-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => handleRatingSelect(star)}
                    activeOpacity={0.7}
                    className="p-1.5 active:scale-90"
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    {star <= rating ? (
                      <StarIconSolid size={42} color="#F59E0B" />
                    ) : (
                      <StarIconOutline size={42} color="#CBD5E1" strokeWidth={1.8} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sentiment Pill */}
              <View className={`mt-3 px-3.5 py-1.5 rounded-full border ${sentiment.bg} ${sentiment.border}`}>
                <Text className={`text-xs font-NunitoBold ${sentiment.textCol}`}>
                  {sentiment.text}
                </Text>
              </View>
            </View>

            {/* Quick Review Tags */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <SparklesIconSolid size={15} color="#D30309" />
                  <Text className="text-[11px] font-NunitoBold text-gray-500 uppercase tracking-widest ml-1.5">
                    Quick Feedback Tags
                  </Text>
                </View>
                <Text className="text-[10px] font-NunitoMedium text-gray-400">Tap to include</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
                contentContainerStyle={{ paddingRight: 10 }}
              >
                {REVIEW_TAGS.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      onPress={() => handleTagToggle(tag)}
                      activeOpacity={0.75}
                      className={`mr-2 px-3.5 py-2 rounded-2xl border flex-row items-center ${
                        isSelected
                          ? 'bg-red-50 border-red-500'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {isSelected && (
                        <CheckCircleIconSolid size={13} color="#D30309" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        className={`text-xs font-NunitoBold ${
                          isSelected ? 'text-red-700' : 'text-gray-700'
                        }`}
                      >
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Detailed Feedback Textarea */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-NunitoBold text-gray-700">Detailed Feedback</Text>
                <Text className="text-[11px] font-NunitoMedium text-gray-400">
                  {comment.length} / 500
                </Text>
              </View>

              <View
                className={`bg-gray-50/90 rounded-2xl border p-3.5 min-h-[120px] ${
                  isFocused ? 'border-red-500 bg-white ring-1 ring-red-100' : 'border-gray-200'
                }`}
              >
                <TextInput
                  value={comment}
                  onChangeText={(val) => {
                    if (val.length <= 500) setComment(val);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Share details about punctuality, diagnosis accuracy, or vehicle performance..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="font-NunitoMedium text-sm text-gray-900 flex-1 leading-5"
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View className="space-y-3">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading || isDeleting || rating === 0 || !comment.trim()}
                activeOpacity={0.85}
                className={`py-4 rounded-2xl flex-row items-center justify-center shadow-md ${
                  rating === 0 || !comment.trim() || isLoading
                    ? 'bg-red-300 shadow-none'
                    : 'bg-[#D30309] shadow-red-200'
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <StarIconSolid size={18} color="#FFFFFF" />
                    <Text className="text-white font-NunitoBold text-base ml-2">
                      {isEdit ? 'Save Changes' : 'Submit Review'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {isEdit && onDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={isLoading || isDeleting}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-center py-3.5 px-4 rounded-2xl bg-red-50 border border-red-100 mt-2"
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <TrashIcon size={17} color="#DC2626" />
                      <Text className="text-red-600 font-NunitoBold text-sm ml-2">
                        Delete Review
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default MechanicReviewModal;
