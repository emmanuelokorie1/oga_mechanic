import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { XMarkIcon, StarIcon } from 'react-native-heroicons/solid';
import { StarIcon as StarIconOutline } from 'react-native-heroicons/outline';
import CustomButton from '@/components/CustomButton';
import TextArea from '@/components/forms/TextArea';

interface ProductReviewModalProps {
  visible: boolean;
  onClose: () => void;
  productName?: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  isLoading?: boolean;
}

const ProductReviewModal: React.FC<ProductReviewModalProps> = ({
  visible,
  onClose,
  productName,
  onSubmit,
  isLoading = false,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Comment Required', 'Please provide a comment for your review.');
      return;
    }

    try {
      await onSubmit(rating, comment.trim());
      // Reset form on success
      setRating(0);
      setComment('');
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/50 justify-end "
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="bg-white rounded-t-3xl min-h-[70%]">
            {/* Header */}
            <View className="flex-row items-center justify-between p-5 border-b border-gray-200">
              <Text className="text-xl font-NunitoBold text-gray-900">
                Review Product
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                className="w-8 h-8 items-center justify-center"
              >
                <XMarkIcon size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="flex-1" 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View className="p-5">
                {productName && (
                  <Text className="text-base font-NunitoMedium text-gray-700 mb-4">
                    How was the {productName}?
                  </Text>
                )}

                {/* Star Rating Selection */}
                <View className="mb-6">
                  <Text className="text-sm font-NunitoBold text-gray-700 mb-3">
                    Rating *
                  </Text>
                  <View className="flex-row items-center justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        activeOpacity={0.7}
                        className="p-2"
                      >
                        {star <= rating ? (
                          <StarIcon size={40} color="#FBBF24" />
                        ) : (
                          <StarIconOutline size={40} color="#D1D5DB" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {rating > 0 && (
                    <Text className="text-center text-sm font-NunitoMedium text-gray-600 mt-2">
                      {rating === 1 && 'Poor'}
                      {rating === 2 && 'Fair'}
                      {rating === 3 && 'Good'}
                      {rating === 4 && 'Very Good'}
                      {rating === 5 && 'Excellent'}
                    </Text>
                  )}
                </View>

                {/* Comment TextArea */}
                <View className="mb-4">
                  <TextArea
                    label="Your Review *"
                    placeholder="Share your experience with this product..."
                    value={comment}
                    onChangeText={setComment}
                    rows={5}
                  />
                </View>

                {/* Submit Button */}
                <CustomButton
                  title="Submit Review"
                  onPress={handleSubmit}
                  bgVariant="primary"
                  className=""
                  disabled={isLoading || rating === 0 || !comment.trim()}
                  loading={isLoading}
                />
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default ProductReviewModal;
