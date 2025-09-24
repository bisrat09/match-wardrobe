import React, { useState } from "react";
import { View, Text, Alert, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import { clearAllGarments, updateAllGarmentsWithMultipleDressCodes, exportGarments, importGarments } from "~/lib/db";
import { getImagesDirectoryInfo } from "~/lib/imageStorage";
import { copyProductionToDevSafely, checkDatabaseStatus } from "~/lib/copyProductionToDev";

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
  const [imageStorageInfo, setImageStorageInfo] = useState<any>(null);
  const [copying, setCopying] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);

  const loadImageStorageInfo = async () => {
    const info = await getImagesDirectoryInfo();
    setImageStorageInfo(info);
  };

  const loadDatabaseStatus = async () => {
    const status = await checkDatabaseStatus();
    setDbStatus(status);
  };

  const handleCopyProductionToDev = async () => {
    Alert.alert(
      "🔄 Copy Production to Dev",
      "This will safely copy all your TestFlight garments and images to the development environment. Your production data will not be modified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy Safely",
          onPress: async () => {
            setCopying(true);
            try {
              const result = await copyProductionToDevSafely();

              const message = result.errors.length > 0
                ? `✅ Copied ${result.copiedGarments} garments and ${result.copiedImages} images.\n\n⚠️ ${result.errors.length} errors:\n${result.errors.slice(0, 3).join('\n')}`
                : `✅ Successfully copied ${result.copiedGarments} garments and ${result.copiedImages} images!`;

              Alert.alert("Copy Complete", message);

              // Reload data
              await loadImageStorageInfo();
              await loadDatabaseStatus();
            } catch (error) {
              Alert.alert("❌ Copy Failed", String(error));
            } finally {
              setCopying(false);
            }
          }
        }
      ]
    );
  };

  React.useEffect(() => {
    loadImageStorageInfo();
    loadDatabaseStatus();
  }, []);

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

      if (result.canceled) return;

      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const importResult = await importGarments(fileContent);

      Alert.alert(
        "✅ Import Complete",
        `Successfully imported ${importResult.imported} garments!\n${importResult.skipped} items were skipped (duplicates).`
      );
    } catch (error: any) {
      Alert.alert("❌ Import Failed", error?.message ?? "Failed to import garments");
    }
  };

  const handleBatchImageImport = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 20,
      });

      if (result.canceled || !result.assets) return;

      setImporting(true);
      const images = result.assets;
      let importedCount = 0;

      for (let i = 0; i < images.length; i++) {
        try {
          setImportProgress({ current: i + 1, total: images.length });

          // Simple import - just add as basic garment
          const { addGarment } = await import("~/lib/db");
          const { saveImagePersistently } = await import("~/lib/imageStorage");

          const persistentUri = await saveImagePersistently(images[i].uri);

          await addGarment({
            type: "top",
            name: `Imported Item ${i + 1}`,
            colors: ["white"],
            warmth: 2,
            waterResistant: 0,
            dressCodes: ["casual"],
            imageUri: persistentUri,
            timesWorn: 0,
            isDirty: false,
            favorite: false
          });

          importedCount++;
        } catch (error) {
          console.error(`Failed to import image ${i + 1}:`, error);
        }
      }

      Alert.alert(
        "✅ Import Complete",
        `Successfully imported ${importedCount} of ${images.length} images!`
      );
    } catch (error: any) {
      Alert.alert("❌ Import Failed", error?.message ?? "Failed to import images");
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Today</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={() => router.push('/closet')} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Closet →</Text>
          </TouchableOpacity>
        </View>

        {/* Database Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🗃️ Database Status</Text>
          <Text style={styles.cardDescription}>
            Development vs Production data comparison.
          </Text>

          {dbStatus && (
            <View style={styles.infoBox}>
              <Text style={[styles.infoText, { fontWeight: 'bold', marginBottom: 8 }]}>
                📱 Production (TestFlight):
              </Text>
              <Text style={styles.infoText}>
                👔 {dbStatus.production.garments} garments
              </Text>
              <Text style={styles.infoText}>
                📷 {dbStatus.production.images} images
              </Text>

              <Text style={[styles.infoText, { fontWeight: 'bold', marginTop: 12, marginBottom: 8 }]}>
                💻 Development (Expo Go):
              </Text>
              <Text style={styles.infoText}>
                👔 {dbStatus.development.garments} garments
              </Text>
              <Text style={styles.infoText}>
                📷 {dbStatus.development.images} images
              </Text>
            </View>
          )}

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.success }]}
              onPress={handleCopyProductionToDev}
              disabled={copying}
            >
              {copying ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Copying...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>📋 Copy Production → Dev</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                loadImageStorageInfo();
                loadDatabaseStatus();
              }}
            >
              <Text style={styles.secondaryButtonText}>🔄 Refresh Status</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helpText}>
            Safely copy your TestFlight data to development environment for testing.
          </Text>
        </View>

        {/* Image Storage */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🖼️ Image Storage</Text>
          <Text style={styles.cardDescription}>
            Your images are saved in persistent storage.
          </Text>

          {imageStorageInfo && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                📁 {imageStorageInfo.fileCount} images stored
              </Text>
              <Text style={styles.infoText}>
                💾 {imageStorageInfo.totalSizeMB} MB used
              </Text>
              <Text style={[styles.infoText, { fontSize: 11, marginTop: 4, color: colors.lightText }]}>
                📍 Location: {imageStorageInfo.path.includes('closy/') ? 'closy/images/' : 'garment_images/'}
              </Text>
            </View>
          )}
        </View>

        {/* Export/Import */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 Export & Import</Text>
          <Text style={styles.cardDescription}>
            Export your wardrobe data or import from a file.
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
            Export saves your data as JSON. Import adds items from backup files.
          </Text>
        </View>

        {/* Development Tools */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛠️ Developer Tools</Text>
          <Text style={styles.cardDescription}>
            Advanced options for managing your wardrobe data.
          </Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateDressCodes}>
              <Text style={styles.primaryButtonText}>🔄 Fix Dress Codes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.danger }]} onPress={handleClearAll}>
              <Text style={styles.primaryButtonText}>🗑️ Clear All Data</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helpText}>
            Use these tools to fix data issues or start fresh.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: colors.lightText,
    marginTop: 12,
    textAlign: 'center',
  },
});