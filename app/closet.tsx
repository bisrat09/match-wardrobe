import React, { useEffect, useState, useMemo } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Dimensions, 
  StyleSheet, 
  Alert, 
  Modal, 
  ScrollView,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator 
} from "react-native";
import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { addGarment, getAllGarments, updateGarment, deleteGarment, markAllGarmentsClean, getGarmentCount } from "~/lib/db";
import type { Garment, ClothingType, DressCode, Warmth } from "~/lib/types";
import GarmentCard from "~/components/GarmentCard";
import { saveImagePersistently, deletePersistedImage } from "~/lib/imageStorage";
import { migrateAllImages } from "~/lib/imageMigration";
// import { checkAndCreateBackup } from "~/lib/autoBackup"; // REMOVED: Destructive
import { performImageHealthCheck } from "~/lib/imageHealthCheck";

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

import { COLOR_PALETTE, COLOR_NAMES, getColorValue } from '~/lib/colorExtraction';
import { analyzeImageColors, pickColorFromPoint, getSuggestedPalette } from '~/lib/colorAnalysis';

export default function ClosetScreen() {
  const [items, setItems] = useState<Garment[]>([]);
  const [dbCount, setDbCount] = useState<number>(0);
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
  
  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
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
      // Run maintenance tasks on first load only
      if (!isRefreshing && items.length === 0) {
        // REMOVED: All automatic backup and recovery functions were destructive
        // No automatic operations on startup
        //   console.log(`Health check: ${healthCheck.repairedImages} repaired, ${healthCheck.missingImages} missing`);
        // }
        
        // 3. DISABLED - Migration also uses deprecated API
        // const migrationResult = await migrateAllImages();
        // if (migrationResult.failedCount > 0) {
        //   Alert.alert(
        //     "Image Recovery",
        //     migrationResult.message,
        //     [{ text: "OK" }]
        //   );
        // }
      }
      
      const garments = await getAllGarments();
      const actualDbCount = await getGarmentCount();
      
      setDbCount(actualDbCount);
      console.log(`🔍 Database query: ${garments.length} items returned, ${actualDbCount} total in DB`);
      
      // DISABLED - Check for orphaned images uses deprecated API
      // if (garments.length === 0 && !isRefreshing) {
      //   try {
      //     console.log("🔍 No garments found, checking for orphaned images...");
      //     const { checkOrphanedImages, recoverFromOrphanedImages } = await import("~/lib/imageRecovery");
      //     const orphanCheck = await checkOrphanedImages();
      //     
      //     if (orphanCheck.imageCount > 0) {
      //       console.log(`Found ${orphanCheck.imageCount} orphaned images, attempting recovery...`);
      //       const recoveryResult = await recoverFromOrphanedImages();
      //       
      //       if (recoveryResult.recovered > 0) {
      //         console.log(`✅ Auto-recovered ${recoveryResult.recovered} garments!`);
      //         Alert.alert(
      //           "🎉 Data Recovered!",
      //           `Automatically recovered ${recoveryResult.recovered} garments from orphaned images!\n\nYour wardrobe is back!`,
      //           [{ text: "Amazing!", style: "default" }]
      //         );
      //         
      //         // Reload the garments after recovery
      //         const recoveredGarments = await getAllGarments();
      //         setItems(recoveredGarments);
      //         return; // Exit early, we've got our data
      //       }
      //     }
      //   } catch (error) {
      //     console.error("Auto-recovery failed:", error);
      //   }
      // }
      
      setItems(garments);
      console.log(`📊 Loaded ${garments.length} garments from database`);
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
    const filtered = items.filter(item => {
      if (filterType !== "all" && item.type !== filterType) return false;
      if (filterDressCode !== "all" && !item.dressCodes.includes(filterDressCode)) return false;
      if (showDirtyOnly && !item.isDirty) return false;
      if (!searchQuery) return true;
      
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = (item.name || item.type).toLowerCase().includes(searchLower);
      const colorMatch = item.colors.some(c => c.toLowerCase().includes(searchLower));
      return nameMatch || colorMatch;
    });
    console.log(`🔍 Filtered: ${filtered.length} of ${items.length} items shown`);
    return filtered;
  }, [items, searchQuery, filterType, filterDressCode, showDirtyOnly]);

  useEffect(() => { load(); }, []);

  const openImagePicker = async () => {
    // Simple add flow - no recovery check
    const img = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8
    });
    if (!img.canceled) {
      setSelectedImage(img.assets[0].uri);
      setShowModal(true);
      // Auto-analyze colors from the image
      analyzeColors(img.assets[0].uri);
    }
  };

  const handleSaveGarment = async () => {
    if (!selectedImage && !editingGarment) return;
    
    setBusy(true);
    try {
      let finalImageUri: string;
      
      if (editingGarment) {
        // Handle image for editing
        if (selectedImage) {
          // User selected a new image - save it persistently
          finalImageUri = await saveImagePersistently(selectedImage);
          // Delete the old image if it was in our managed storage
          if (editingGarment.imageUri !== selectedImage) {
            await deletePersistedImage(editingGarment.imageUri);
          }
        } else {
          // Keep the existing image
          finalImageUri = editingGarment.imageUri;
        }
        
        await updateGarment(editingGarment.id, {
          type: garmentType,
          name: garmentName || undefined,
          colors: selectedColors,
          warmth,
          waterResistant,
          dressCodes,
          imageUri: finalImageUri,
          // Don't update these fields - keep existing values
          // isDirty, favorite, lastWornAt, timesWorn are not being edited
        });
      } else {
        // Handle image for new garment - save persistently
        finalImageUri = await saveImagePersistently(selectedImage);
        
        await addGarment({
          type: garmentType,
          name: garmentName || undefined,
          colors: selectedColors,
          warmth,
          waterResistant,
          dressCodes,
          imageUri: finalImageUri,
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
    setSelectedImage(null as any); // Use null instead of empty string to preserve original image
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
            // Delete the persisted image file
            await deletePersistedImage(garment.imageUri);
            // Delete from database
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

  const handleBulkClean = async () => {
    const dirtyCount = items.filter(item => item.isDirty).length;
    
    if (dirtyCount === 0) {
      Alert.alert("No Dirty Items", "All your garments are already clean!");
      return;
    }

    Alert.alert(
      "Clean All Dirty Items",
      `This will mark all ${dirtyCount} dirty items as clean and make them available for outfit selection. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Clean ${dirtyCount} Items`,
          style: "default",
          onPress: async () => {
            try {
              const result = await markAllGarmentsClean();
              await load(); // Refresh the list
              Alert.alert(
                "✨ All Clean!",
                `Successfully cleaned ${result.count} items. They're now available for your outfits!`,
                [{ text: "Perfect!", style: "default" }]
              );
            } catch (error) {
              Alert.alert("Error", "Failed to clean items. Please try again.");
            }
          }
        }
      ]
    );
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedItems(new Set()); // Clear selection when toggling mode
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAllItems = () => {
    const allIds = new Set(filteredItems.map(item => item.id));
    setSelectedItems(allIds);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleBulkDelete = async () => {
    const selectedCount = selectedItems.size;
    
    if (selectedCount === 0) {
      Alert.alert("No Items Selected", "Please select items to delete first.");
      return;
    }

    Alert.alert(
      "Delete Multiple Items",
      `Are you sure you want to permanently delete ${selectedCount} selected ${selectedCount === 1 ? 'item' : 'items'}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Delete ${selectedCount} Items`,
          style: "destructive",
          onPress: async () => {
            try {
              // Delete all selected items
              for (const itemId of selectedItems) {
                await deleteGarment(itemId);
              }
              
              // Clear selection and exit multi-select mode
              setSelectedItems(new Set());
              setIsMultiSelectMode(false);
              
              // Refresh the list
              await load();
              
              Alert.alert(
                "Items Deleted",
                `Successfully deleted ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'}.`,
                [{ text: "OK", style: "default" }]
              );
            } catch (error) {
              Alert.alert("Error", "Failed to delete some items. Please try again.");
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setGarmentType("top");
    setSelectedColors(["black"]);
    setWarmth(2);
    setWaterResistant(0);
    setDressCodes(["casual"]);
    setGarmentName("");
    setSelectedImage(null as any);
    setEditingGarment(null);
  };

  const allColors = COLOR_NAMES;
  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);
  const [isAnalyzingColors, setIsAnalyzingColors] = useState(false);
  const [eyedropperActive, setEyedropperActive] = useState(false);

  const onRefresh = () => {
    load(true);
  };

  // Analyze colors from selected image
  const analyzeColors = async (imageUri: string) => {
    setIsAnalyzingColors(true);
    try {
      const extractedColors = await analyzeImageColors(imageUri);
      if (extractedColors.length > 0) {
        // Set extracted colors as selected
        setSelectedColors(extractedColors);

        // Get suggested palette
        const suggestions = getSuggestedPalette(extractedColors);
        setSuggestedColors(suggestions);
      }
    } catch (error) {
      console.error('Error analyzing colors:', error);
    } finally {
      setIsAnalyzingColors(false);
    }
  };

  // Handle eyedropper color pick
  const handleEyedropper = async (nativeEvent: any) => {
    if (!eyedropperActive || !selectedImage) return;

    try {
      const { locationX, locationY } = nativeEvent;
      const pickedColor = await pickColorFromPoint(
        selectedImage,
        locationX,
        locationY,
        300, // image width in modal
        300  // image height in modal
      );

      if (pickedColor && !selectedColors.includes(pickedColor)) {
        setSelectedColors([...selectedColors, pickedColor]);
      }

      setEyedropperActive(false);
    } catch (error) {
      console.error('Error picking color:', error);
      setEyedropperActive(false);
    }
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
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.push('/')}>
              <Text style={styles.navLink}>← Today</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <View>
              <Text style={styles.title}>Closet</Text>
              <Text style={{ fontSize: 12, color: colors.lightText, textAlign: 'center' }}>
                {filteredItems.length} {filteredItems.length !== items.length ? `of ${items.length} ` : ''}items
                {dbCount !== items.length && ` (DB: ${dbCount})`}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={toggleMultiSelectMode}
              style={styles.selectButton}
              testID="select-button"
            >
              <Text style={[styles.navLink, isMultiSelectMode && styles.activeNavLink]}>
                {isMultiSelectMode ? "Cancel" : "Select"}
              </Text>
            </TouchableOpacity>
            {!isMultiSelectMode && (
              <TouchableOpacity onPress={openImagePicker}>
                <Text style={styles.navLink}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
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

        {/* Results Count & Bulk Actions */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {isMultiSelectMode 
              ? `${selectedItems.size} selected of ${filteredItems.length} items`
              : `${filteredItems.length} of ${items.length} items`
            }
          </Text>
          {isMultiSelectMode ? (
            <View style={styles.multiSelectActions}>
              <TouchableOpacity 
                style={styles.selectAllButton} 
                onPress={selectAllItems}
              >
                <Text style={styles.selectAllText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={clearSelection}
              >
                <Text style={styles.clearText}>None</Text>
              </TouchableOpacity>
              {selectedItems.size > 0 && (
                <TouchableOpacity 
                  style={styles.multiDeleteButton} 
                  onPress={handleBulkDelete}
                >
                  <Text style={styles.multiDeleteText}>🗑️ Delete ({selectedItems.size})</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            items.filter(item => item.isDirty).length > 0 && (
              <TouchableOpacity 
                style={styles.bulkCleanButton} 
                onPress={handleBulkClean}
              >
                <Text style={styles.bulkCleanText}>
                  🧺➜✨ Clean All ({items.filter(item => item.isDirty).length})
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Grid - using ScrollView to bypass FlatList rendering issues */}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items match your filters</Text>
              <TouchableOpacity style={styles.addButton} onPress={openImagePicker}>
                <Text style={styles.addButtonText}>Add your first item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GUTTER }}>
              {filteredItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    if (isMultiSelectMode) {
                      toggleItemSelection(item.id);
                    } else {
                      handleEdit(item);
                    }
                  }}
                  onLongPress={() => {
                    if (!isMultiSelectMode) {
                      handleEdit(item);
                    }
                  }}
                  style={[
                    styles.garmentWrapper,
                    { width: (SCREEN.width - 32 - GUTTER) / 2 },
                    isMultiSelectMode && selectedItems.has(item.id) && styles.selectedGarment
                  ]}
                >
                  <GarmentCard 
                    garment={item} 
                    onLongPress={() => !isMultiSelectMode && handleEdit(item)}
                  />
                  {isMultiSelectMode && (
                    <View style={styles.selectionOverlay}>
                      <View style={[
                        styles.selectionCheckbox,
                        selectedItems.has(item.id) && styles.selectedCheckbox
                      ]}>
                        {selectedItems.has(item.id) && (
                          <Text style={styles.selectionCheckmark}>✓</Text>
                        )}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

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
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    onPress={handleEyedropper}
                    activeOpacity={eyedropperActive ? 1 : 0.7}
                  >
                    <Image source={{ uri: selectedImage }} style={styles.modalImage} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null as any)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.eyedropperButton,
                      eyedropperActive && styles.eyedropperActive
                    ]}
                    onPress={() => setEyedropperActive(!eyedropperActive)}
                  >
                    <Text style={styles.eyedropperText}>
                      {eyedropperActive ? '🎯' : '💧'}
                    </Text>
                  </TouchableOpacity>
                  {isAnalyzingColors && (
                    <View style={styles.analyzingOverlay}>
                      <Text style={styles.analyzingText}>Analyzing colors...</Text>
                    </View>
                  )}
                </View>
              ) : editingGarment ? (
                <View style={{ position: 'relative' }}>
                  <Image source={{ uri: editingGarment.imageUri }} style={styles.modalImage} />
                  <TouchableOpacity
                    style={styles.replaceImageButton}
                    onPress={openImagePicker}
                  >
                    <Text style={styles.replaceImageText}>Replace Image</Text>
                  </TouchableOpacity>
                </View>
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

              {/* Suggested Colors */}
              {suggestedColors.length > 0 && (
                <View style={styles.suggestedSection}>
                  <Text style={styles.suggestedLabel}>Suggested:</Text>
                  <View style={styles.suggestedColors}>
                    {suggestedColors.map(color => (
                      <TouchableOpacity
                        key={`suggested-${color}`}
                        style={[
                          styles.suggestedChip,
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
                </View>
              )}

              {/* Expanded Color Palette */}
              <ScrollView style={styles.colorScrollView} showsVerticalScrollIndicator={false}>
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
              </ScrollView>

              {/* Selected Colors Display */}
              {selectedColors.length > 0 && (
                <View style={styles.selectedColorsRow}>
                  <Text style={styles.selectedLabel}>Selected ({selectedColors.length}):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.selectedColors}>
                      {selectedColors.map(color => (
                        <View
                          key={`selected-${color}`}
                          style={[
                            styles.selectedColorChip,
                            { backgroundColor: getColorValue(color) }
                          ]}
                        />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

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
    </>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 50,
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
  activeNavLink: {
    color: colors.danger,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  selectButton: {
    marginRight: 20,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countText: {
    fontSize: 13,
    color: colors.lightText,
  },
  bulkCleanButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexShrink: 1,
  },
  bulkCleanText: {
    fontSize: 12,
    color: colors.card,
    fontWeight: "600",
  },
  multiSelectActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  selectAllButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectAllText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600",
  },
  clearButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clearText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600",
  },
  multiDeleteButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  multiDeleteText: {
    fontSize: 11,
    color: colors.card,
    fontWeight: "600",
  },
  
  // Multi-select visual feedback
  garmentWrapper: {
    position: "relative",
  },
  selectedGarment: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  selectionOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
  },
  selectionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.card,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCheckbox: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectionCheckmark: {
    color: colors.card,
    fontSize: 14,
    fontWeight: "bold",
  },
  
  // Cards (styles moved to GarmentCard component)
  
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
  replaceImageButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  replaceImageText: {
    color: colors.card,
    fontWeight: '600',
    fontSize: 14,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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

  // Color Extraction & Eyedropper
  eyedropperButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  eyedropperActive: {
    backgroundColor: colors.primary,
  },
  eyedropperText: {
    fontSize: 20,
  },
  analyzingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  analyzingText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: "600",
  },

  // Suggested Colors
  suggestedSection: {
    marginBottom: 16,
  },
  suggestedLabel: {
    fontSize: 12,
    color: colors.lightText,
    marginBottom: 8,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  suggestedColors: {
    flexDirection: "row",
    gap: 8,
  },
  suggestedChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Color Scroll View
  colorScrollView: {
    maxHeight: 200,
    marginBottom: 16,
  },

  // Selected Colors Display
  selectedColorsRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
  },
  selectedLabel: {
    fontSize: 12,
    color: colors.lightText,
    marginBottom: 8,
    fontWeight: "600",
  },
  selectedColors: {
    flexDirection: "row",
    gap: 6,
  },
  selectedColorChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.card,
  },
});