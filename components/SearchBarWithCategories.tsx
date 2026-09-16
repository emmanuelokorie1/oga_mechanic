
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import PriceRangeSlider from "./PriceRangeSlider";
import { useVehicleOptions } from "@/hooks/mechanic/useVehicleOptions";
import SelectField from "@/components/forms/SelectField";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface CategoryOption {
  name: string;
  id: number | null;
  sub_categories?: Array<{ name: string; id: number }>;
}

interface SearchBarWithCategoriesProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string, categoryId?: number | null) => void;
  categories: CategoryOption[];
  onFilterPress?: () => void;
  minPrice?: string;
  maxPrice?: string;
  onPriceChange?: (field: "min" | "max", value: string) => void;
  onApplySearch?: (categoryId?: number | null) => void;
  onResetSearch?: () => void;
  isSearching?: boolean;
}

// ─────────────────────────────────────────────
// Chip helpers
// ─────────────────────────────────────────────
const ACTIVE_COLOR = "#D30309";
const ACTIVE_TEXT = "#fff";
const IDLE_BG = "#F3F4F6";
const IDLE_TEXT = "#374151";
const PARENT_IDLE_BG = "#EFF6FF"; // light-blue tint for parents that have children
const PARENT_IDLE_TEXT = "#1D4ED8";

const Chip = ({
  label,
  isSelected,
  isParent,
  hasChildren,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  isParent?: boolean;
  hasChildren?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={{
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      backgroundColor: isSelected
        ? ACTIVE_COLOR
        : isParent && hasChildren
        ? PARENT_IDLE_BG
        : IDLE_BG,
    }}
  >
    <Text
      style={{
        fontSize: 13,
        fontFamily: isSelected ? "Nunito-Bold" : "Nunito-SemiBold",
        color: isSelected
          ? ACTIVE_TEXT
          : isParent && hasChildren
          ? PARENT_IDLE_TEXT
          : IDLE_TEXT,
        marginRight: hasChildren ? 3 : 0,
      }}
    >
      {label}
    </Text>
    {hasChildren && (
      <ChevronRightIcon
        size={12}
        color={isSelected ? ACTIVE_TEXT : PARENT_IDLE_TEXT}
        style={{ transform: [{ rotate: isSelected ? "90deg" : "0deg" }] }}
      />
    )}
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
const SearchBarWithCategories = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  minPrice = "",
  maxPrice = "",
  onPriceChange,
  onApplySearch,
  onResetSearch,
  isSearching = false,
}: SearchBarWithCategoriesProps) => {
  // ── Filter modal ──
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  // ── Model modal ──
  const [showModelModal, setShowModelModal] = useState(false);
  const [localMake, setLocalMake] = useState<string>("");
  const [localModel, setLocalModel] = useState<string>("");
  
  const {
    vehicleMakeOptions,
    vehicleModelOptions,
    vehicleMakesLoading,
  } = useVehicleOptions(localMake);

  // ── Which parent is expanded (to show sub-category row) ──
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  // ── Animate sub-category row in/out ──
  const subRowHeight = useRef(new Animated.Value(0)).current;
  const subRowOpacity = useRef(new Animated.Value(0)).current;

  const activeSubCategories = useMemo(() => {
    if (!expandedParent) return [];
    const parent = categories.find((c) => c.name === expandedParent);
    return parent?.sub_categories ?? [];
  }, [expandedParent, categories]);

  // ── Auto-expand parent if selectedCategory is a sub-category ──
  useEffect(() => {
    if (!selectedCategory || selectedCategory === "All") return;

    // Check if current selection is a child of any parent
    const parent = categories.find(cat => 
      cat.sub_categories?.some(sub => sub.name === selectedCategory)
    );

    if (parent) {
      setExpandedParent(parent.name);
    } else {
      // If the selected category itself has children (is a parent), expand it too
      const selfIsParent = categories.find(cat => 
        cat.name === selectedCategory && (cat.sub_categories?.length ?? 0) > 0
      );
      if (selfIsParent) {
        setExpandedParent(selfIsParent.name);
      }
    }
  }, [selectedCategory, categories]);

  useEffect(() => {
    const hasChildren = activeSubCategories.length > 0;
    Animated.parallel([
      Animated.timing(subRowHeight, {
        toValue: hasChildren ? 48 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(subRowOpacity, {
        toValue: hasChildren ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeSubCategories]);

  const hasPriceFilter = !!minPrice || !!maxPrice;

  // ── Category press handlers ──
  const handleMainCategoryPress = useCallback(
    (cat: CategoryOption) => {
      const hasSubs = (cat.sub_categories?.length ?? 0) > 0;

      if (cat.name === "All") {
        setExpandedParent(null);
        setSelectedCategory("All", null);
        onApplySearch?.(null);
        return;
      }

      if (hasSubs) {
        if (expandedParent === cat.name) {
          // Collapse — go back to "All"
          setExpandedParent(null);
          setSelectedCategory("All", null);
          onApplySearch?.(null);
        } else {
          // Expand this parent; filter by parent ID so products update
          setExpandedParent(cat.name);
          setSelectedCategory(cat.name, cat.id);
          onApplySearch?.(cat.id);
        }
      } else {
        setExpandedParent(null);
        setSelectedCategory(cat.name, cat.id);
        onApplySearch?.(cat.id);
      }
    },
    [expandedParent, setSelectedCategory, onApplySearch]
  );

  const handleSubCategoryPress = useCallback(
    (sub: { name: string; id: number }) => {
      setSelectedCategory(sub.name, sub.id);
      onApplySearch?.(sub.id);
    },
    [setSelectedCategory, onApplySearch]
  );

  // ── Filter modal handlers ──
  const handleOpenFilter = () => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    onPriceChange?.("min", localMin);
    onPriceChange?.("max", localMax);
    setShowFilterModal(false);
    onApplySearch?.();
  };

  const handleResetFilter = () => {
    setLocalMin("");
    setLocalMax("");
    onPriceChange?.("min", "");
    onPriceChange?.("max", "");
    setShowFilterModal(false);
    onResetSearch?.();
  };

  // ── Model modal handlers ──
  const handleOpenModel = () => {
    setShowModelModal(true);
  };

  const handleApplyModel = () => {
    // Find the model name using the localModel id
    const model = vehicleModelOptions.find(m => m.value === localModel);
    const modelName = model ? model.label : "";
    
    // Find the make name
    const make = vehicleMakeOptions.find(m => m.value === localMake);
    const makeName = make ? make.label : "";

    const queryStr = `${makeName} ${modelName}`.trim();
    if (queryStr) {
      setSearchQuery(queryStr);
      // Trigger search if needed, but debouncing will handle it
      onApplySearch?.();
    }
    setShowModelModal(false);
  };

  const handleResetModel = () => {
    setLocalMake("");
    setLocalModel("");
    setShowModelModal(false);
    onResetSearch?.();
  };

  // ── Render helpers ──
  const renderMainCat = useCallback(
    ({ item }: { item: CategoryOption }) => {
      const hasSubs = (item.sub_categories?.length ?? 0) > 0;
      const isSelected =
        selectedCategory === item.name ||
        (expandedParent === item.name);
      return (
        <Chip
          label={item.name}
          isSelected={isSelected}
          isParent={hasSubs}
          hasChildren={hasSubs}
          onPress={() => handleMainCategoryPress(item)}
        />
      );
    },
    [selectedCategory, expandedParent, handleMainCategoryPress]
  );

  const renderSubCat = useCallback(
    ({ item }: { item: { name: string; id: number } }) => {
      const isSelected = selectedCategory === item.name;
      return (
        <Chip
          label={item.name}
          isSelected={isSelected}
          onPress={() => handleSubCategoryPress(item)}
        />
      );
    },
    [selectedCategory, handleSubCategoryPress]
  );

  return (
    <View style={{ marginBottom: 8 }}>
      {/* ── Search bar ── */}
      <View style={{ paddingHorizontal: 12, marginBottom: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F9FAFB",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            paddingHorizontal: 14,
            paddingVertical: 11,
          }}
        >
          {isSearching ? (
            <ActivityIndicator
              size="small"
              color={ACTIVE_COLOR}
              style={{ marginRight: 10 }}
            />
          ) : (
            <MagnifyingGlassIcon
              size={20}
              color="#9CA3AF"
              style={{ marginRight: 10 }}
            />
          )}

          <TextInput
            style={{
              flex: 1,
              fontSize: 15,
              color: "#111827",
              fontFamily: "Nunito-Medium",
            }}
            placeholder="Search cars, spare parts…"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              activeOpacity={0.7}
              style={{ marginRight: 8 }}
            >
              <XMarkIcon size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Filter button */}
          <TouchableOpacity
            onPress={handleOpenFilter}
            activeOpacity={0.7}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: hasPriceFilter ? ACTIVE_COLOR : "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AdjustmentsHorizontalIcon
              size={18}
              color={hasPriceFilter ? "#fff" : "#6B7280"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main category row ── */}
      <FlatList
        data={categories}
        renderItem={renderMainCat}
        keyExtractor={(item) => item.id?.toString() ?? item.name}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 2 }}
        initialNumToRender={10}
        ListFooterComponent={
          <Chip
            label="Model"
            isSelected={false}
            onPress={handleOpenModel}
          />
        }
      />

      {/* ── Sub-category row (animated) ── */}
      <Animated.View
        style={{
          height: subRowHeight,
          opacity: subRowOpacity,
          overflow: "hidden",
          marginTop: 6,
          paddingHorizontal: 12,
          backgroundColor: "#F0F9FF",
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: "#BFDBFE",
          justifyContent: "center",
        }}
      >
        <FlatList
          data={activeSubCategories}
          renderItem={renderSubCat}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 6 }}
          initialNumToRender={10}
        />
      </Animated.View>

      {/* ── Active price filter pill ── */}
      {hasPriceFilter && (
        <View style={{ paddingHorizontal: 12, marginTop: 8 }}>
          <TouchableOpacity
            onPress={handleResetFilter}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              backgroundColor: "#FEF2F2",
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: "#FCA5A5",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: "#DC2626",
                fontFamily: "Nunito-Bold",
                marginRight: 4,
              }}
            >
              Price: {minPrice ? `₦${minPrice}` : "any"} –{" "}
              {maxPrice ? `₦${maxPrice}` : "any"}
            </Text>
            <XMarkIcon size={13} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Price filter bottom-sheet modal ── */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        />
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: "#E5E7EB",
              borderRadius: 2,
              alignSelf: "center",
              marginBottom: 20,
            }}
          />

          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito-ExtraBold",
              color: "#111827",
              marginBottom: 10,
            }}
          >
            Filter by Price
          </Text>

          {/* Visual Slider */}
          <View style={{ marginBottom: 15 }}>
            <PriceRangeSlider
              min={0}
              max={1000000}
              initialMin={parseInt(localMin) || 0}
              initialMax={parseInt(localMax) || 1000000}
              onValueChange={(low, high) => {
                setLocalMin(low.toString());
                setLocalMax(high.toString());
              }}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                  fontFamily: "Nunito-SemiBold",
                  marginBottom: 6,
                }}
              >
                Min Price (₦)
              </Text>
              <TextInput
                value={localMin}
                onChangeText={setLocalMin}
                placeholder="e.g. 5000"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#111827",
                  backgroundColor: "#F9FAFB",
                }}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                  fontFamily: "Nunito-SemiBold",
                  marginBottom: 6,
                }}
              >
                Max Price (₦)
              </Text>
              <TextInput
                value={localMax}
                onChangeText={setLocalMax}
                placeholder="e.g. 500000"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#111827",
                  backgroundColor: "#F9FAFB",
                }}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={handleResetFilter}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: "Nunito-Bold", color: "#374151" }}>
                Reset
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleApplyFilter}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: ACTIVE_COLOR,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: "Nunito-Bold", color: "#fff" }}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* ── Model filter bottom-sheet modal ── */}
      <Modal
        visible={showModelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModelModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
          activeOpacity={1}
          onPress={() => setShowModelModal(false)}
        />
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: "80%",
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: "#E5E7EB",
              borderRadius: 2,
              alignSelf: "center",
              marginBottom: 20,
            }}
          />

          <Text
            style={{
              fontSize: 18,
              fontFamily: "Nunito-ExtraBold",
              color: "#111827",
              marginBottom: 10,
            }}
          >
            Filter by Model
          </Text>

          <View style={{ marginBottom: 16 }}>
            <SelectField
              name="vehicleMake"
              label="Brand"
              placeholder={vehicleMakesLoading ? "Loading brands..." : "Select vehicle brand"}
              options={vehicleMakeOptions}
              value={localMake}
              onValueChange={(value) => {
                setLocalMake(value);
                setLocalModel(''); // Reset model when make changes
              }}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <SelectField
              name="vehicleModel"
              label="Model"
              placeholder={localMake ? "Select car model" : "Select brand first"}
              options={vehicleModelOptions}
              value={localModel}
              onValueChange={setLocalModel}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={handleResetModel}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: "Nunito-Bold", color: "#374151" }}>
                Reset
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleApplyModel}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: ACTIVE_COLOR,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: "Nunito-Bold", color: "#fff" }}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SearchBarWithCategories;
