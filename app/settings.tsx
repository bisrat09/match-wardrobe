import React, { useState } from "react";
import { View, Text, Alert, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import { clearAllGarments, updateAllGarmentsWithMultipleDressCodes, exportGarments, importGarments, getAllGarments, updateGarment } from "~/lib/db";

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
  success: "#059669",      // Green for success
};

export default function SettingsScreen() {
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const handleClearAll = () => {
    Alert.alert(
      "Clear All Garments",
      "This will delete all your garments and wear history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllGarments();
              Alert.alert("✅ Success", "All garments have been cleared.");
            } catch (error: any) {
              Alert.alert("❌ Error", error?.message ?? "Failed to clear garments");
            }
          }
        }
      ]
    );
  };

  const handleUpdateDressCodes = async () => {
    try {
      const result = await updateAllGarmentsWithMultipleDressCodes();
      Alert.alert(
        "🎉 Success!", 
        `Updated ${result.updated} garments with multiple dress codes. Now try switching between casual/business/sport modes!`
      );
    } catch (error: any) {
      Alert.alert("❌ Error", error?.message ?? "Failed to update garments");
    }
  };

  const handleExport = async () => {
    try {
      const jsonData = await exportGarments();
      const filename = `closy-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonData);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Closy Data'
        });
      } else {
        Alert.alert("📱 Export Complete", `Data saved to ${filename}`);
      }
    } catch (error: any) {
      Alert.alert("❌ Export Failed", error?.message ?? "Failed to export garments");
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });
      
      if (result.assets && result.assets[0]) {
        const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
        const importResult = await importGarments(fileContent);
        
        Alert.alert(
          "📦 Import Complete",
          `Imported ${importResult.imported} garments.\nSkipped ${importResult.skipped} existing items.`
        );
      }
    } catch (error: any) {
      Alert.alert("❌ Import Failed", error?.message ?? "Failed to import garments");
    }
  };

  const handleBatchImageImport = async () => {
    try {
      // Get all garments without images
      const garments = await getAllGarments();
      const garmentsWithoutImages = garments.filter(g => !g.imageUri || g.imageUri === "");
      
      if (garmentsWithoutImages.length === 0) {
        Alert.alert("No garments need images", "All your garments already have images.");
        return;
      }

      Alert.alert(
        "Batch Import Images",
        `Found ${garmentsWithoutImages.length} garments without images.\n\nYou can select multiple photos at once (up to 100 on iOS).\n\nPhotos will be assigned to garments in order.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Select Photos",
            onPress: async () => {
              setImporting(true);
              setImportProgress({ current: 0, total: garmentsWithoutImages.length });
              
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  allowsMultipleSelection: true,
                  quality: 0.8,
                  selectionLimit: Math.min(garmentsWithoutImages.length, 100)
                });

                if (!result.canceled && result.assets) {
                  const numPhotos = result.assets.length;
                  const numToUpdate = Math.min(numPhotos, garmentsWithoutImages.length);
                  
                  for (let i = 0; i < numToUpdate; i++) {
                    setImportProgress({ current: i + 1, total: numToUpdate });
                    await updateGarment(garmentsWithoutImages[i].id, {
                      imageUri: result.assets[i].uri
                    });
                  }
                  
                  Alert.alert(
                    "✅ Import Complete",
                    `Successfully added ${numToUpdate} images to your garments.${numToUpdate < garmentsWithoutImages.length ? `\n\n${garmentsWithoutImages.length - numToUpdate} garments still need images.` : ''}`
                  );
                }
              } catch (error: any) {
                Alert.alert("Error", error?.message ?? "Failed to import images");
              } finally {
                setImporting(false);
                setImportProgress({ current: 0, total: 0 });
              }
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to check garments");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={styles.navLink}>← Today</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity onPress={() => router.push('/closet')}>
          <Text style={styles.navLink}>Closet ⌕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Quick Navigation */}
        <View style={styles.quickNavCard}>
          <Text style={styles.cardTitle}>Quick Navigation</Text>
          <View style={styles.quickNavRow}>
            <TouchableOpacity style={styles.quickNavButton} onPress={() => router.push('/')}>
              <Text style={styles.quickNavIcon}>📅</Text>
              <Text style={styles.quickNavText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickNavButton} onPress={() => router.push('/closet')}>
              <Text style={styles.quickNavIcon}>👔</Text>
              <Text style={styles.quickNavText}>Closet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Backup & Restore */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💾 Backup & Restore</Text>
          <Text style={styles.cardDescription}>
            Keep your wardrobe data safe with backup and restore options.
          </Text>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.success }]} onPress={handleExport}>
              <Text style={styles.primaryButtonText}>📤 Export Wardrobe</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={handleImport}>
              <Text style={styles.secondaryButtonText}>📥 Import Wardrobe</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: colors.primary }]} 
              onPress={handleBatchImageImport}
              disabled={importing}
            >
              {importing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>
                    {importProgress.current}/{importProgress.total} Images...
                  </Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>🖼️ Batch Add Images</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.helpText}>
            Export creates a JSON backup of all your garments and wear history.
          </Text>
        </View>

        {/* Development Tools */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔧 Developer Tools</Text>
          <Text style={styles.cardDescription}>
            Advanced options for managing your wardrobe data.
          </Text>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateDressCodes}>
              <Text style={styles.primaryButtonText}>🔄 Fix Dress Codes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={() => {
              Alert.alert(
                "Manual Category Review",
                "To fix categories manually:\n\n1. Go to Closet screen\n2. Use the Type filter to see items by category\n3. Long-press any item to edit and change its type\n\nThis gives you full control over categorization instead of unreliable auto-detection.",
                [
                  { text: "Got it", style: "default" },
                  { 
                    text: "Go to Closet", 
                    onPress: () => router.push('/closet')
                  }
                ]
              );
            }}>
              <Text style={styles.primaryButtonText}>👔 Manual Category Review</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={async () => {
              Alert.alert(
                "Image Migration Required",
                "Your images were stored in the old Expo cache which is no longer accessible after the upgrade. You have two options:\n\n1. Re-add images manually from your photo library\n2. Clear all garments and start fresh",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Clear Images Only", 
                    onPress: async () => {
                      const { getAllGarments, updateGarment } = await import("~/lib/db");
                      const garments = await getAllGarments();
                      let cleared = 0;
                      for (const g of garments) {
                        if (g.imageUri) {
                          await updateGarment(g.id, { imageUri: "" });
                          cleared++;
                        }
                      }
                      Alert.alert("Images Cleared", `Removed ${cleared} broken image references. You can now re-add photos from your library.`);
                    }
                  },
                  { 
                    text: "Clear All Data", 
                    style: "destructive",
                    onPress: handleClearAll
                  }
                ]
              );
            }}>
              <Text style={styles.primaryButtonText}>🔧 Fix Broken Images</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.dangerButton]} onPress={handleClearAll}>
              <Text style={styles.dangerButtonText}>🗑️ Clear All Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Future Features */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚀 Coming Soon</Text>
          <Text style={styles.cardDescription}>
            Features we're working on for future updates.
          </Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📍</Text>
              <Text style={styles.featureText}>Custom location settings</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🔔</Text>
              <Text style={styles.featureText}>Morning outfit notifications</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>👔</Text>
              <Text style={styles.featureText}>Default dress code preferences</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureText}>Outfit history and analytics</Text>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.infoCard}>
          <Text style={styles.appName}>Closy</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.description}>
            Your smart wardrobe companion for weather-based outfit suggestions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  
  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  
  quickNavCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  
  cardDescription: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 20,
    lineHeight: 20,
  },
  
  // Quick Navigation
  quickNavRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickNavButton: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.secondary,
    borderRadius: 12,
  },
  quickNavIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickNavText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  
  // Buttons
  buttonGroup: {
    gap: 12,
    marginBottom: 16,
  },
  
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.card,
  },
  
  secondaryButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  
  dangerButton: {
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.card,
  },
  
  helpText: {
    fontSize: 12,
    color: colors.lightText,
    fontStyle: "italic",
  },
  
  // Feature List
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 24,
  },
  featureText: {
    fontSize: 14,
    color: colors.lightText,
    flex: 1,
  },
  
  // App Info
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    marginBottom: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: colors.lightText,
    textAlign: "center",
    lineHeight: 20,
  },
});