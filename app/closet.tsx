import React, { useEffect, useState, useMemo } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  FlatList, 
  Dimensions, 
  StyleSheet, 
  Alert, 
  Modal, 
  ScrollView,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator 
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { addGarment, getAllGarments, updateGarment, deleteGarment } from "~/lib/db";
import type { Garment, ClothingType, DressCode, Warmth } from "~/lib/types";

// Color palette - Burnt Orange Theme
const colors = {
  primary: "#EA580C",      // Burnt orange
  accent: "#C2410C",       // Dark orange
  background: "#F9FAF9",   // Light background
  card: "#FFFFFF",         // White cards
  text: "#333333",         // Dark gray text
  secondary: "#F0F0F0",    // Light gray
  lightText: "#666666",    // Medium gray
  border: "#E5E5E5",       // Light border
  danger: "#E54D2E",       // Red for danger
  dirtyBg: "#FFF5F5",      // Light red background
  dirtyBorder: "#FECACA",  // Red border for dirty items
};

const SCREEN = Dimensions.get("window");
const GUTTER = 12;
const CARD_WIDTH = Math.floor((SCREEN.width - (16 * 2) - GUTTER) / 2);

const getColorValue = (color: string) => {
  const colorMap: { [key: string]: string } = {
    black: "#000000",
    white: "#f5f5f5",
    gray: "#808080",
    navy: "#000080",
    brown: "#8B4513",
    red: "#FF0000",
    pink: "#FFC0CB",
    orange: "#FFA500",
    yellow: "#FFFF00",
    gold: "#FFD700",
    blue: "#0000FF",
    lightblue: "#ADD8E6",
    green: "#008000",
    olive: "#808000",
    purple: "#800080",
    beige: "#F5F5DC",
    cream: "#FFFDD0",
    tan: "#D2B48C",
    maroon: "#800000",
    teal: "#008080"
  };
  return colorMap[color] || color;
};

export default function ClosetScreen() {
  const [items, setItems] = useState<Garment[]>([]);
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [editingGarment, setEditingGarment] = useState<Garment | null>(null);
  const [garmentName, setGarmentName] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ClothingType | "all">("all");
  const [filterDressCode, setFilterDressCode] = useState<DressCode | "all">("all");
  const [showDirtyOnly, setShowDirtyOnly] = useState(false);
  
  // Form state
  const [garmentType, setGarmentType] = useState<ClothingType>("top");
  const [selectedColors, setSelectedColors] = useState<string[]>(["black"]);
  const [warmth, setWarmth] = useState<Warmth>(2);
  const [waterResistant, setWaterResistant] = useState<0|1>(0);
  const [dressCodes, setDressCodes] = useState<DressCode[]>(["casual"]);

  const load = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const garments = await getAllGarments();
      setItems(garments);
    } catch (error: any) {
      console.error("Load garments error:", error);
      Alert.alert(
        "Closet Loading Issue", 
        "We're having trouble accessing your wardrobe right now. Please try refreshing.",
        [
          { text: "Refresh", onPress: () => load(isRefreshing) },
          { text: "OK", style: "cancel" }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterType !== "all" && item.type !== filterType) return false;
      if (filterDressCode !== "all" && !item.dressCodes.includes(filterDressCode)) return false;
      if (showDirtyOnly && !item.isDirty) return false;
      if (!searchQuery) return true;
      
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = (item.name || item.type).toLowerCase().includes(searchLower);
      const colorMatch = item.colors.some(c => c.toLowerCase().includes(searchLower));
      return nameMatch || colorMatch;
    });
  }, [items, searchQuery, filterType, filterDressCode, showDirtyOnly]);

  useEffect(() => { load(); }, []);

  const openImagePicker = async () => {
    const img = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ['images'], 
      quality: 0.8 
    });
    if (!img.canceled) {
      setSelectedImage(img.assets[0].uri);
      setShowModal(true);
    }
  };

  const handleSaveGarment = async () => {
    if (!selectedImage && !editingGarment) return;
    
    setBusy(true);
    try {
      if (editingGarment) {
        await updateGarment(editingGarment.id, {
          ...editingGarment,
          type: garmentType,
          name: garmentName || undefined,
          colors: selectedColors,
          warmth,
          waterResistant,
          dressCodes,
          imageUri: selectedImage || editingGarment.imageUri
        });
      } else {
        await addGarment({
          type: garmentType,
          name: garmentName || undefined,
          colors: selectedColors,
          warmth,
          waterResistant,
          dressCodes,
          imageUri: selectedImage,
          lastWornAt: undefined,
          timesWorn: 0,
          isDirty: false,
          favorite: false
        });
      }
      
      resetForm();
      setShowModal(false);
      await load();
    } catch (e: any) {
      console.error("Save garment error:", e);
      Alert.alert(
        "Save Failed", 
        "We couldn't save your garment right now. Please make sure you have a good connection and try again.",
        [
          { text: "Try Again", onPress: handleSaveGarment },
          { text: "Cancel", style: "cancel" }
        ]
      );
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (garment: Garment) => {
    setEditingGarment(garment);
    setGarmentType(garment.type);
    setGarmentName(garment.name || "");
    setSelectedColors(garment.colors);
    setWarmth(garment.warmth);
    setWaterResistant(garment.waterResistant);
    setDressCodes(garment.dressCodes);
    setSelectedImage("");
    setShowModal(true);
  };

  const handleDelete = async (garment: Garment) => {
    Alert.alert(
      "Delete Garment",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            await deleteGarment(garment.id);
            await load();
          }
        }
      ]
    );
  };

  const handleMarkClean = async (garment: Garment) => {
    await updateGarment(garment.id, { ...garment, isDirty: false });
    await load();
  };

  const resetForm = () => {
    setGarmentType("top");
    setSelectedColors(["black"]);
    setWarmth(2);
    setWaterResistant(0);
    setDressCodes(["casual"]);
    setGarmentName("");
    setSelectedImage("");
    setEditingGarment(null);
  };

  const allColors = [
    "black", "white", "gray", "navy", "brown",
    "red", "pink", "orange", "yellow", "gold",
    "blue", "lightblue", "green", "olive", "purple",
    "beige", "cream", "tan", "maroon", "teal"
  ];

  const onRefresh = () => {
    load(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your closet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Text style={styles.navLink}>← Today</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Closet</Text>
          <TouchableOpacity onPress={openImagePicker}>
            <Text style={styles.navLink}>＋ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search garments..."
            placeholderTextColor={colors.lightText}
            style={styles.searchInput}
          />
        </View>

        {/* Filter Section */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            <ChipRow
              label="Type"
              options={["all", "top", "bottom", "shoe", "outerwear"]}
              value={filterType}
              onChange={(v) => setFilterType(v as any)}
            />
            <ChipRow
              label="Dress Code"
              options={["all", "casual", "smart_casual", "business", "sport"]}
              value={filterDressCode}
              onChange={(v) => setFilterDressCode(v as any)}
            />
            <TouchableOpacity 
              style={[styles.dirtyToggle, showDirtyOnly && styles.dirtyToggleActive]}
              onPress={() => setShowDirtyOnly(!showDirtyOnly)}
            >
              <Text style={[styles.dirtyToggleText, showDirtyOnly && styles.dirtyToggleTextActive]}>
                🧺 Dirty Only
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Results Count */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filteredItems.length} of {items.length} items
          </Text>
        </View>

        {/* Grid */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GUTTER }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: GUTTER }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onLongPress={() => handleEdit(item)}
              activeOpacity={0.9}
              style={[
                styles.card,
                item.isDirty && styles.dirtyCard
              ]}
            >
              <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {(item.name || item.type).toLowerCase()}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.colors.join(", ")} • w{item.warmth}
                </Text>
                <Text style={styles.editHint}>Long press to edit</Text>
              </View>
              {item.isDirty && (
                <View style={styles.dirtyBadge}>
                  <Text style={styles.dirtyText}>Dirty</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items match your filters</Text>
              <TouchableOpacity style={styles.addButton} onPress={openImagePicker}>
                <Text style={styles.addButtonText}>Add your first item</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Add/Edit Modal */}
        <Modal visible={showModal} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingGarment ? "Edit Garment" : "Add New Garment"}
                </Text>
                <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.modalImage} />
              ) : editingGarment ? (
                <Image source={{ uri: editingGarment.imageUri }} style={styles.modalImage} />
              ) : null}

              <TextInput
                placeholder="Name (optional)"
                value={garmentName}
                onChangeText={setGarmentName}
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Type</Text>
              <View style={styles.typeRow}>
                {(["top", "bottom", "shoe", "outerwear"] as ClothingType[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeButton, garmentType === t && styles.typeButtonActive]}
                    onPress={() => setGarmentType(t)}
                  >
                    <Text style={[styles.typeText, garmentType === t && styles.typeTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Colors</Text>
              <View style={styles.colorGrid}>
                {allColors.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorChip,
                      { backgroundColor: getColorValue(color) },
                      selectedColors.includes(color) && styles.colorChipActive
                    ]}
                    onPress={() => {
                      if (selectedColors.includes(color)) {
                        setSelectedColors(selectedColors.filter(c => c !== color));
                      } else {
                        setSelectedColors([...selectedColors, color]);
                      }
                    }}
                  >
                    {selectedColors.includes(color) && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Warmth Level: {warmth}</Text>
              <View style={styles.warmthRow}>
                {[1, 2, 3, 4, 5].map(w => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.warmthButton, warmth === w && styles.warmthButtonActive]}
                    onPress={() => setWarmth(w as Warmth)}
                  >
                    <Text style={[styles.warmthText, warmth === w && styles.warmthTextActive]}>
                      {w}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Dress Codes</Text>
              <View style={styles.dressCodeRow}>
                {(["casual", "smart_casual", "business", "sport"] as DressCode[]).map(dc => (
                  <TouchableOpacity
                    key={dc}
                    style={[
                      styles.dressCodeButton,
                      dressCodes.includes(dc) && styles.dressCodeButtonActive
                    ]}
                    onPress={() => {
                      if (dressCodes.includes(dc)) {
                        if (dressCodes.length > 1) {
                          setDressCodes(dressCodes.filter(d => d !== dc));
                        }
                      } else {
                        setDressCodes([...dressCodes, dc]);
                      }
                    }}
                  >
                    <Text style={[
                      styles.dressCodeText,
                      dressCodes.includes(dc) && styles.dressCodeTextActive
                    ]}>
                      {dc.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.toggle, waterResistant === 1 && styles.toggleActive]}
                onPress={() => setWaterResistant(waterResistant === 1 ? 0 : 1)}
              >
                <Text style={styles.toggleText}>💧 Water Resistant</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.saveButton, busy && styles.saveButtonDisabled]} 
                  onPress={handleSaveGarment}
                  disabled={busy}
                >
                  <Text style={styles.saveButtonText}>
                    {busy ? "Saving..." : "Save Garment"}
                  </Text>
                </TouchableOpacity>

                {editingGarment && (
                  <>
                    {editingGarment.isDirty && (
                      <TouchableOpacity 
                        style={styles.cleanButton} 
                        onPress={() => {
                          handleMarkClean(editingGarment);
                          setShowModal(false);
                          resetForm();
                        }}
                      >
                        <Text style={styles.cleanButtonText}>Mark as Clean</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.deleteButton} 
                      onPress={() => {
                        handleDelete(editingGarment);
                        setShowModal(false);
                        resetForm();
                      }}
                    >
                      <Text style={styles.deleteButtonText}>Delete Item</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// Chip Row Component
function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipContainer}>
      <Text style={styles.chipLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = value === opt;
          const displayText = opt === "all" ? "All" : 
            opt.replace('_', ' ').split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(opt)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {displayText}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  navLink: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 16,
  },
  
  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  // Filters
  filterScroll: {
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterRow: {
    gap: 16,
  },
  chipContainer: {
    marginBottom: 12,
  },
  chipLabel: {
    fontSize: 12,
    color: colors.lightText,
    marginBottom: 6,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.secondary,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.card,
    fontWeight: "600",
  },
  
  dirtyToggle: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignSelf: "flex-start",
  },
  dirtyToggleActive: {
    backgroundColor: colors.danger,
  },
  dirtyToggleText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  dirtyToggleTextActive: {
    color: colors.card,
  },
  
  // Count
  countRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 13,
    color: colors.lightText,
  },
  
  // Cards
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dirtyCard: {
    backgroundColor: colors.dirtyBg,
    borderWidth: 1,
    borderColor: colors.dirtyBorder,
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH,
    backgroundColor: colors.secondary,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.lightText,
    marginBottom: 4,
  },
  editHint: {
    fontSize: 11,
    color: colors.accent,
    fontStyle: "italic",
  },
  dirtyBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dirtyBorder,
  },
  dirtyText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
  },
  
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: colors.lightText,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: colors.card,
    fontWeight: "700",
    fontSize: 16,
  },
  
  // Modal
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  modalClose: {
    fontSize: 24,
    color: colors.lightText,
    padding: 8,
  },
  modalImage: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.lightText,
    marginBottom: 12,
  },
  
  // Type Selection
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
  },
  typeText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  typeTextActive: {
    color: colors.card,
    fontWeight: "600",
  },
  
  // Color Grid
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  colorChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  colorChipActive: {
    borderColor: colors.accent,
    borderWidth: 3,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // Warmth
  warmthRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  warmthButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: "center",
  },
  warmthButtonActive: {
    backgroundColor: colors.primary,
  },
  warmthText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
  warmthTextActive: {
    color: colors.card,
  },
  
  // Dress Code
  dressCodeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  dressCodeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.secondary,
  },
  dressCodeButtonActive: {
    backgroundColor: colors.primary,
  },
  dressCodeText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  dressCodeTextActive: {
    color: colors.card,
    fontWeight: "600",
  },
  
  // Toggle
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    marginBottom: 24,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
  
  // Modal Actions
  modalActions: {
    gap: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.card,
  },
  cleanButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cleanButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.card,
  },
  deleteButton: {
    backgroundColor: colors.danger,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.card,
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.lightText,
    textAlign: "center",
  },
});