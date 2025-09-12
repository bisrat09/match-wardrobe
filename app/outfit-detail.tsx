import React from "react";
import { View, Text, ScrollView, Image, Button, StyleSheet, Alert, Dimensions } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { updateWear } from "~/lib/db";

const { width: screenWidth } = Dimensions.get('window');

export default function OutfitDetailScreen() {
  const params = useLocalSearchParams();
  
  // Parse the outfit data from params
  const outfit = params.outfit ? JSON.parse(params.outfit as string) : null;
  const weather = params.weather ? JSON.parse(params.weather as string) : null;
  const dressCode = params.dressCode as string;

  if (!outfit) {
    return (
      <View style={styles.container}>
        <Text>No outfit data available</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const handleWearOutfit = async () => {
    const garmentIds = [
      outfit.top.id,
      outfit.bottom.id,
      outfit.shoe.id,
      ...(outfit.outerwear ? [outfit.outerwear.id] : [])
    ];
    
    try {
      await updateWear(garmentIds, { weather, dressCode });
      Alert.alert(
        "Outfit Logged!", 
        "This outfit has been marked as worn. Clothing items are marked as dirty (shoes stay clean).",
        [
          { text: "OK", onPress: () => router.push('/') }
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to log outfit");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Outfit Details</Text>
      
      {/* Full-size garment images */}
      <View style={styles.itemSection}>
        <Text style={styles.itemLabel}>Top</Text>
        <Image source={{ uri: outfit.top.imageUri }} style={styles.fullImage} />
        <View style={styles.itemDetails}>
          <Text style={styles.detailText}>Type: {outfit.top.type}</Text>
          <Text style={styles.detailText}>Colors: {outfit.top.colors.join(", ")}</Text>
          <Text style={styles.detailText}>Warmth: {outfit.top.warmth}/5</Text>
        </View>
      </View>

      <View style={styles.itemSection}>
        <Text style={styles.itemLabel}>Bottom</Text>
        <Image source={{ uri: outfit.bottom.imageUri }} style={styles.fullImage} />
        <View style={styles.itemDetails}>
          <Text style={styles.detailText}>Type: {outfit.bottom.type}</Text>
          <Text style={styles.detailText}>Colors: {outfit.bottom.colors.join(", ")}</Text>
          <Text style={styles.detailText}>Warmth: {outfit.bottom.warmth}/5</Text>
        </View>
      </View>

      {outfit.outerwear && (
        <View style={styles.itemSection}>
          <Text style={styles.itemLabel}>Outerwear</Text>
          <Image source={{ uri: outfit.outerwear.imageUri }} style={styles.fullImage} />
          <View style={styles.itemDetails}>
            <Text style={styles.detailText}>Type: {outfit.outerwear.type}</Text>
            <Text style={styles.detailText}>Colors: {outfit.outerwear.colors.join(", ")}</Text>
            <Text style={styles.detailText}>Warmth: {outfit.outerwear.warmth}/5</Text>
          </View>
        </View>
      )}

      <View style={styles.itemSection}>
        <Text style={styles.itemLabel}>Shoes</Text>
        <Image source={{ uri: outfit.shoe.imageUri }} style={styles.fullImage} />
        <View style={styles.itemDetails}>
          <Text style={styles.detailText}>Type: {outfit.shoe.type}</Text>
          <Text style={styles.detailText}>Colors: {outfit.shoe.colors.join(", ")}</Text>
          <Text style={styles.detailText}>Warmth: {outfit.shoe.warmth}/5</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <View style={styles.button}>
          <Button title="Wear This Outfit" onPress={handleWearOutfit} color="#007AFF" />
        </View>
        <View style={styles.button}>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },
  itemSection: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  itemLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  fullImage: {
    width: screenWidth - 40,
    height: screenWidth - 40,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    marginBottom: 10,
  },
  itemDetails: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  button: {
    marginBottom: 10,
  },
});