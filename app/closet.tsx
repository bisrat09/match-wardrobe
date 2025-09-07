import React, { useEffect, useState } from "react";
import { View, Text, Button, FlatList, Alert, Modal, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { addGarment, getAllGarments } from "~/lib/db";
import type { Garment, ClothingType, DressCode, Warmth } from "~/lib/types";
import GarmentCard from "~/components/GarmentCard";

export default function ClosetScreen() {
  const [items, setItems] = useState<Garment[]>([]);
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  
  // Form state
  const [garmentType, setGarmentType] = useState<ClothingType>("top");
  const [selectedColors, setSelectedColors] = useState<string[]>(["black"]);
  const [warmth, setWarmth] = useState<Warmth>(2);
  const [waterResistant, setWaterResistant] = useState<0|1>(0);
  const [dressCodes, setDressCodes] = useState<DressCode[]>(["casual"]);

  const load = async () => setItems(await getAllGarments());
  useEffect(() => { load(); }, []);

  const openImagePicker = async () => {
    const img = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
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
  };

  const saveGarment = async () => {
    if (!selectedImage) return;
    
    setBusy(true);
    try {
      await addGarment({
        type: garmentType,
        colors: selectedColors,
        warmth,
        waterResistant,
        dressCodes,
        imageUri: selectedImage
      });
      await load();
      setShowModal(false);
      resetForm();
    } catch(e:any) {
      Alert.alert("Add", e?.message ?? "Failed to add garment");
    } finally { 
      setBusy(false); 
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
      <FlatList
        data={items}
        keyExtractor={(g)=>g.id}
        numColumns={2}
        columnWrapperStyle={{ gap:12 }}
        contentContainerStyle={{ gap:12, paddingTop:12 }}
        renderItem={({ item }) => <GarmentCard garment={item} />}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Garment Details</Text>
            
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            )}

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
            <View style={styles.colorRow}>
              {["black", "white", "gray", "blue", "red", "green", "yellow", "brown"].map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton, 
                    { backgroundColor: color === "white" ? "#f0f0f0" : color },
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
              <Button title="Cancel" onPress={() => setShowModal(false)} />
              <Button 
                title={busy ? "Saving..." : "Save"} 
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
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ddd",
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
});