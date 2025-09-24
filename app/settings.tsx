import React, { useState } from "react";
import { View, Text, Alert, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import { clearAllGarments, updateAllGarmentsWithMultipleDressCodes, exportGarments, importGarments, getAllGarments } from "~/lib/db";
import { getImagesDirectoryInfo } from "~/lib/imageStorage";
import { checkOrphanedImages, recoverFromOrphanedImages } from "~/lib/imageRecovery";
import { generateStorageReport, formatStorageReport } from "~/lib/storageDebugger";
import { copyProductionToDevSafely, checkDatabaseStatus } from "~/lib/copyProductionToDev";
import { debugAllDatabases, debugCurrentDatabase } from "~/lib/debugDatabases";
import { exportCurrentDatabase, importDatabaseFromFile } from "~/lib/exportImport";

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
  const [recovering, setRecovering] = useState(false);

  const loadImageStorageInfo = async () => {
    const info = await getImagesDirectoryInfo();
    setImageStorageInfo(info);
  };

  const loadDatabaseStatus = async () => {
    const status = await checkDatabaseStatus();
    setDbStatus(status);
  };

  const handleCheckOrphanedImages = async () => {
    setRecovering(true);
    try {
      const orphanCheck = await checkOrphanedImages();
      const currentGarments = await getAllGarments();
      const orphanedCount = Math.max(0, orphanCheck.imageCount - currentGarments.length);

      if (orphanedCount > 0) {
        Alert.alert(
          "🔍 Orphaned Images Found",
          `Found ${orphanedCount} images without garment records.\n\nTotal images: ${orphanCheck.imageCount}\nCurrent garments: ${currentGarments.length}\n\nYou can recover these as new garments.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "✅ No Orphaned Images",
          `All images are properly linked to garments.\n\nImages: ${orphanCheck.imageCount}\nGarments: ${currentGarments.length}`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert("❌ Check Failed", String(error));
    } finally {
      setRecovering(false);
    }
  };

  const handleRecoverImages = async () => {
    setRecovering(true);
    try {
      const orphanCheck = await checkOrphanedImages();
      const currentGarments = await getAllGarments();
      const orphanedCount = Math.max(0, orphanCheck.imageCount - currentGarments.length);

      if (orphanedCount === 0) {
        Alert.alert(
          "ℹ️ Nothing to Recover",
          "No orphaned images found. All your images are already linked to garments.",
          [{ text: "OK" }]
        );
        return;
      }

      Alert.alert(
        "🚀 Recover Orphaned Images",
        `Found ${orphanedCount} orphaned images.\n\nThis will create new garment records with default properties that you can edit later.\n\nContinue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Recover All",
            onPress: async () => {
              try {
                const result = await recoverFromOrphanedImages();
                Alert.alert(
                  "🎉 Recovery Complete!",
                  `Successfully recovered ${result.recovered} garments!\n\n${result.failed > 0 ? `Failed: ${result.failed}` : 'All images recovered successfully.'}\n\nRefresh your closet to see the recovered items.`,
                  [
                    {
                      text: "Go to Closet",
                      onPress: () => router.push('/closet')
                    },
                    { text: "Stay Here" }
                  ]
                );

                // Reload storage info
                await loadImageStorageInfo();
                await loadDatabaseStatus();
              } catch (error) {
                Alert.alert("❌ Recovery Failed", String(error));
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert("❌ Error", String(error));
    } finally {
      setRecovering(false);
    }
  };

  const handleStorageAnalysis = async () => {
    setRecovering(true);
    try {
      const report = await generateStorageReport();
      const formatted = formatStorageReport(report);

      Alert.alert(
        "📊 Storage Analysis Report",
        formatted,
        [
          {
            text: "Copy to Console",
            onPress: () => {
              console.log("=== STORAGE ANALYSIS REPORT ===");
              console.log(formatted);
              console.log("=== RAW DATA ===");
              console.log(JSON.stringify(report, null, 2));
            }
          },
          { text: "Close" }
        ]
      );
    } catch (error) {
      Alert.alert("❌ Analysis Failed", String(error));
    } finally {
      setRecovering(false);
    }
  };

  const handleDebugDatabases = async () => {
    setCopying(true);
    try {
      console.log("🔍 Starting comprehensive database debugging...");
      const debugResults = await debugAllDatabases();
      const currentDb = await debugCurrentDatabase();

      let message = `🔍 DEBUGGING RESULTS:\n\n`;
      message += `📱 Current App Database:\n`;
      message += `- Using: ${currentDb.dbName} (Dev: ${currentDb.isDev})\n`;
      message += `- Contains: ${currentDb.garmentCount} garments\n`;
      message += `- Sample names: ${currentDb.sampleGarmentNames.slice(0, 2).join(', ')}\n\n`;

      message += `🗃️ All Found Databases:\n`;
      debugResults.databases.forEach(db => {
        message += `- ${db.name}: ${db.garmentCount} garments\n`;
        if (db.sampleData.length > 0) {
          message += `  ⚠️ Contains sample data\n`;
        }
      });

      message += `\n📁 Image Directories:\n`;
      debugResults.directories.forEach(dir => {
        const shortPath = dir.path.split('/').slice(-2).join('/');
        message += `- ${shortPath}: ${dir.imageCount} images\n`;
      });

      Alert.alert(
        "🔍 Database Debug Results",
        message,
        [
          { text: "Copy Console Logs", onPress: () => {
            console.log("=== FULL DEBUG RESULTS ===");
            console.log("Current Database:", currentDb);
            console.log("All Databases:", debugResults.databases);
            console.log("All Directories:", debugResults.directories);
          }},
          { text: "OK" }
        ]
      );
    } catch (error) {
      Alert.alert("❌ Debug Failed", String(error));
    } finally {
      setCopying(false);
    }
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
              style={[styles.primaryButton, { backgroundColor: colors.danger }]}
              onPress={handleDebugDatabases}
              disabled={copying}
            >
              {copying ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Debugging...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>🔍 DEBUG: Find Real Data</Text>
              )}
            </TouchableOpacity>

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
            🔍 DEBUG finds where your real 110 garments are stored.
            📋 Copy safely transfers data between environments.
          </Text>
        </View>

        {/* Image Storage */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🖼️ Image Storage & Recovery</Text>
          <Text style={styles.cardDescription}>
            Your images are saved in persistent storage. Recover lost garments from orphaned images.
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

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              onPress={handleCheckOrphanedImages}
              disabled={recovering}
            >
              {recovering ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Checking...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>🔍 Check for Lost Images</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.success }]}
              onPress={handleRecoverImages}
              disabled={recovering}
            >
              {recovering ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Recovering...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>🚀 Recover Lost Garments</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleStorageAnalysis}
              disabled={recovering}
            >
              {recovering ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Analyzing...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>📊 Analyze Storage Locations</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.helpText}>
            If you've lost garments but still have images, use recovery to restore them.
          </Text>
        </View>

        {/* Export/Import */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 Export & Import Database</Text>
          <Text style={styles.cardDescription}>
            Transfer your wardrobe between TestFlight and Development.
          </Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={exportCurrentDatabase}
            >
              <Text style={styles.primaryButtonText}>📤 Export Database</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.success }]}
              onPress={importDatabaseFromFile}
            >
              <Text style={styles.primaryButtonText}>📥 Import Database File</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.success }]} onPress={handleExport}>
              <Text style={styles.primaryButtonText}>📤 Export JSON</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleImport}>
              <Text style={styles.secondaryButtonText}>📥 Import JSON</Text>
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