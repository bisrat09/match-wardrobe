import React, { useEffect, useState } from "react";
import { View, Text, Button, FlatList, Alert, Modal, ScrollView, TouchableOpacity, Image, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { addGarment, getAllGarments, updateGarment, deleteGarment } from "~/lib/db";
import type { Garment, ClothingType, DressCode, Warmth } from "~/lib/types";
import GarmentCard from "~/components/GarmentCard";

const getColorValue = (color: string) => {
  const colorMap: { [key: string]: string } = {
    black: "#000000",
    white: "#f5f5f5", // Light gray so it's visible with border
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
  
  // Filter state
  const [filterType, setFilterType] = useState<ClothingType | "all">("all");
  const [filterDressCode, setFilterDressCode] = useState<DressCode | "all">("all");
  const [showDirtyOnly, setShowDirtyOnly] = useState(false);
  const [searchText, setSearchText] = useState("");
  
  // Form state
  const [garmentType, setGarmentType] = useState<ClothingType>("top");
  const [selectedColors, setSelectedColors] = useState<string[]>(["black"]);
  const [warmth, setWarmth] = useState<Warmth>(2);
  const [waterResistant, setWaterResistant] = useState<0|1>(0);
  const [dressCodes, setDressCodes] = useState<DressCode[]>(["casual"]);

  const load = async () => setItems(await getAllGarments());
  
  const filteredItems = items.filter(item => {
    // Type filter
    if (filterType !== "all" && item.type !== filterType) return false;
    
    // Dress code filter
    if (filterDressCode !== "all" && !item.dressCodes.includes(filterDressCode)) return false;
    
    // Dirty filter
    if (showDirtyOnly && !item.isDirty) return false;
    
    // Search filter
    if (searchText && !(item.name || item.type).toLowerCase().includes(searchText.toLowerCase())) return false;
    
    return true;
  });
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

  const resetForm = () => {
    setGarmentType("top");
    setSelectedColors(["black"]);
    setWarmth(2);
    setWaterResistant(0);
    setDressCodes(["casual"]);
    setSelectedImage("");
    setGarmentName("");
    setEditingGarment(null);
  };

  const saveGarment = async () => {
    if (!selectedImage && !editingGarment) return;
    
    setBusy(true);
    try {
      if (editingGarment) {
        // Update existing garment
        await updateGarment(editingGarment.id, {
          type: garmentType,
          name: garmentName || undefined,
          colors: selectedColors,
          warmth,
          waterResistant,
          dressCodes,
          imageUri: selectedImage
        });
      } else {
        // Add new garment
        await addGarment({
          type: garmentType,
          name: garmentName || undefined,
          colors: selectedColors,
          warmth,
          waterResistant,
          dressCodes,
          imageUri: selectedImage
        });
      }
      await load();
      setShowModal(false);
      resetForm();
    } catch(e:any) {
      Alert.alert(editingGarment ? "Update" : "Add", e?.message ?? "Failed to save garment");
    } finally { 
      setBusy(false); 
    }
  };

  const handleEditGarment = (garment: Garment) => {
    setEditingGarment(garment);
    setGarmentType(garment.type);
    setGarmentName(garment.name || "");
    setSelectedColors(garment.colors);
    setWarmth(garment.warmth);
    setWaterResistant(garment.waterResistant);
    setDressCodes(garment.dressCodes);
    setSelectedImage(garment.imageUri);
    setShowModal(true);
  };

  const handleDeleteGarment = async (garment: Garment) => {
    Alert.alert(
      "Delete Garment",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGarment(garment.id);
              await load();
              setShowModal(false);
              resetForm();
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to delete garment");
            }
          }
        }
      ]
    );
  };

  const pickNewImage = async () => {
    const img = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ['images'], 
      quality: 0.8 
    });
    if (!img.canceled) {
      setSelectedImage(img.assets[0].uri);
    }
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center" }}>
        <Text style={{ fontSize:22, fontWeight:"600" }}>Closet</Text>
        <Button title="Add Item" onPress={openImagePicker} />
      </View>
      
      <View style={{ flexDirection:"row", gap:12, marginTop:12, justifyContent:"center" }}>
        <Button title="Today" onPress={() => router.push('/')} />
        <Button title="Settings" onPress={() => router.push('/settings')} />
      </View>
      
      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search garments..."
        placeholderTextColor="#999"
      />
      
      {/* Filter Row */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {/* Type Filter */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Type:</Text>
          {(["all", "top", "bottom", "shoe", "outerwear"] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.filterButton, filterType === type && styles.selectedFilter]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[styles.filterText, filterType === type && styles.selectedFilterText]}>
                {type === "all" ? "All" : type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Dress Code Filter */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Dress:</Text>
          {(["all", "casual", "smart_casual", "business", "sport"] as const).map(code => (
            <TouchableOpacity
              key={code}
              style={[styles.filterButton, filterDressCode === code && styles.selectedFilter]}
              onPress={() => setFilterDressCode(code)}
            >
              <Text style={[styles.filterText, filterDressCode === code && styles.selectedFilterText]}>
                {code === "all" ? "All" : code.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Dirty Filter */}
        <TouchableOpacity
          style={[styles.filterButton, showDirtyOnly && styles.selectedFilter]}
          onPress={() => setShowDirtyOnly(!showDirtyOnly)}
        >
          <Text style={[styles.filterText, showDirtyOnly && styles.selectedFilterText]}>
            🧺 Dirty
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </View>
      
      {/* Results Counter */}
      <Text style={styles.resultsText}>
        {filteredItems.length} of {items.length} items
        {searchText && ` matching "${searchText}"`}
      </Text>
      
      <FlatList
        data={filteredItems}
        keyExtractor={(g)=>g.id}
        numColumns={2}
        columnWrapperStyle={{ gap:12 }}
        contentContainerStyle={{ gap:12, paddingTop:12 }}
        renderItem={({ item }) => (
          <GarmentCard 
            garment={item}
            onLongPress={() => handleEditGarment(item)}
          />
        )}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingGarment ? "Edit Garment" : "Add Garment Details"}</Text>
            
            {selectedImage && (
              <TouchableOpacity onPress={pickNewImage}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <Text style={styles.changeImageText}>Tap to change image</Text>
              </TouchableOpacity>
            )}

            {/* Name Field */}
            <Text style={styles.sectionTitle}>Name (optional)</Text>
            <TextInput
              style={styles.nameInput}
              value={garmentName}
              onChangeText={setGarmentName}
              placeholder="Enter garment name..."
              placeholderTextColor="#999"
            />

            {/* Type Selector */}
            <Text style={styles.sectionTitle}>Type</Text>
            <View style={styles.typeRow}>
              {(["top", "bottom", "shoe", "outerwear"] as ClothingType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, garmentType === type && styles.selectedType]}
                  onPress={() => setGarmentType(type)}
                >
                  <Text style={[styles.typeText, garmentType === type && styles.selectedTypeText]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color Selector */}
            <Text style={styles.sectionTitle}>Colors</Text>
            <View style={styles.colorGrid}>
              {[
                // Neutrals
                "black", "white", "gray", "navy", "brown",
                "beige", "cream", "tan", 
                // Bright colors
                "red", "pink", "orange", "yellow", "gold",
                "blue", "lightblue", "green", "olive", "purple",
                "maroon", "teal"
              ].map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton, 
                    { backgroundColor: getColorValue(color) },
                    selectedColors.includes(color) && styles.selectedColor
                  ]}
                  onPress={() => {
                    if (selectedColors.includes(color)) {
                      setSelectedColors(prev => prev.filter(c => c !== color));
                    } else {
                      setSelectedColors(prev => [...prev, color]);
                    }
                  }}
                />
              ))}
            </View>

            {/* Warmth Selector */}
            <Text style={styles.sectionTitle}>Warmth Level (1-5)</Text>
            <View style={styles.warmthRow}>
              {([1, 2, 3, 4, 5] as Warmth[]).map(level => (
                <TouchableOpacity
                  key={level}
                  style={[styles.warmthButton, warmth === level && styles.selectedWarmth]}
                  onPress={() => setWarmth(level)}
                >
                  <Text style={[styles.warmthText, warmth === level && styles.selectedWarmthText]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dress Codes */}
            <Text style={styles.sectionTitle}>Dress Codes</Text>
            <View style={styles.dressCodeRow}>
              {(["casual", "smart_casual", "business", "sport"] as DressCode[]).map(code => (
                <TouchableOpacity
                  key={code}
                  style={[styles.dressCodeButton, dressCodes.includes(code) && styles.selectedDressCode]}
                  onPress={() => {
                    if (dressCodes.includes(code)) {
                      setDressCodes(prev => prev.filter(c => c !== code));
                    } else {
                      setDressCodes(prev => [...prev, code]);
                    }
                  }}
                >
                  <Text style={[styles.dressCodeText, dressCodes.includes(code) && styles.selectedDressCodeText]}>
                    {code.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Water Resistant */}
            <View style={styles.toggleRow}>
              <Text style={styles.sectionTitle}>Water Resistant</Text>
              <TouchableOpacity
                style={[styles.toggle, waterResistant ? styles.toggleActive : null]}
                onPress={() => setWaterResistant(waterResistant ? 0 : 1)}
              >
                <Text style={[styles.toggleText, waterResistant ? styles.toggleActiveText : null]}>
                  {waterResistant ? "Yes" : "No"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <Button title="Cancel" onPress={() => { setShowModal(false); resetForm(); }} />
              {editingGarment && editingGarment.isDirty && (
                <Button 
                  title="Mark Clean" 
                  color="#28a745"
                  onPress={async () => {
                    try {
                      await updateGarment(editingGarment.id, { isDirty: false });
                      await load();
                      Alert.alert("Success", "Item marked as clean!");
                    } catch (e: any) {
                      Alert.alert("Error", e?.message ?? "Failed to mark item clean");
                    }
                  }}
                />
              )}
              {editingGarment && (
                <Button 
                  title="Delete" 
                  color="red"
                  onPress={() => handleDeleteGarment(editingGarment)} 
                />
              )}
              <Button 
                title={busy ? "Saving..." : editingGarment ? "Update" : "Save"} 
                onPress={saveGarment} 
                disabled={busy || selectedColors.length === 0 || dressCodes.length === 0}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalContent: {
    padding: 16,
    paddingTop: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    alignSelf: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedType: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  typeText: {
    color: "#333",
    textTransform: "capitalize",
  },
  selectedTypeText: {
    color: "white",
  },
  colorRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  colorButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#ddd",
    margin: 2,
  },
  selectedColor: {
    borderColor: "#007AFF",
    borderWidth: 3,
  },
  warmthRow: {
    flexDirection: "row",
    gap: 8,
  },
  warmthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedWarmth: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  warmthText: {
    color: "#333",
    fontWeight: "500",
  },
  selectedWarmthText: {
    color: "white",
  },
  dressCodeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  dressCodeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedDressCode: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  dressCodeText: {
    color: "#333",
    fontSize: 12,
    textTransform: "capitalize",
  },
  selectedDressCodeText: {
    color: "white",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toggleActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  toggleText: {
    color: "#333",
  },
  toggleActiveText: {
    color: "white",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 24,
    justifyContent: "space-around",
  },
  nameInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  changeImageText: {
    textAlign: "center",
    color: "#007AFF",
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    marginTop: 12,
  },
  filterContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginTop: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  filterRow: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
    color: "#333",
    minWidth: 40,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#ddd",
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedFilter: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  filterText: {
    fontSize: 13,
    color: "#333",
    textTransform: "capitalize",
    fontWeight: "500",
  },
  selectedFilterText: {
    color: "white",
  },
  resultsText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
});