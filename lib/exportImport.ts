import * as SQLite from "expo-sqlite";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from "react-native";

/**
 * Export the current database for backup or transfer
 * This will export whichever database the app is currently using
 */
export async function exportCurrentDatabase(): Promise<void> {
  try {
    console.log("📤 Starting database export...");

    // Get the current database based on environment
    const isDev = __DEV__ || process.env.NODE_ENV === 'development';
    const dbName = isDev ? "closet_dev.db" : "closet.db";
    const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

    // Check if database exists
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    if (!dbInfo.exists) {
      Alert.alert("Error", `Database ${dbName} not found`);
      return;
    }

    // Get garment count for the export filename
    const db = SQLite.openDatabaseSync(dbName);
    const countResult = db.getFirstSync(`SELECT COUNT(*) as count FROM garments`) as any;
    const garmentCount = countResult?.count || 0;

    // Create a copy with timestamp and garment count
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 10);
    const exportName = `closet_${garmentCount}items_${timestamp}.db`;
    const exportPath = `${FileSystem.documentDirectory}${exportName}`;

    // Copy database to export location
    await FileSystem.copyAsync({
      from: dbPath,
      to: exportPath
    });

    console.log("✅ Database copied to:", exportPath);

    // Share the database file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(exportPath, {
        UTI: 'public.database',
        dialogTitle: 'Export Closet Database'
      });
    } else {
      Alert.alert("Error", "Sharing is not available on this device");
    }

    Alert.alert(
      "Export Complete",
      `Database with ${garmentCount} garments exported successfully.`,
      [
        { text: "OK", style: "default" }
      ]
    );

  } catch (error) {
    console.error("Export error:", error);
    Alert.alert("Export Failed", "Could not export database");
  }
}

/**
 * Import a database from the TestFlight/Production app
 * Allows user to pick a database file and import it
 */
export async function importDatabaseFromFile(): Promise<boolean> {
  try {
    // Let user pick a database file
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/octet-stream',
    });

    if (result.canceled) {
      console.log("Import cancelled");
      return false;
    }

    const fileUri = result.assets[0].uri;
    console.log("📥 Starting database import from:", fileUri);

    // Determine target database based on environment
    const isDev = __DEV__ || process.env.NODE_ENV === 'development';
    const targetDbName = isDev ? "closet_dev.db" : "closet.db";
    const targetDbPath = `${FileSystem.documentDirectory}SQLite/${targetDbName}`;

    // Backup current database first
    const backupPath = `${FileSystem.documentDirectory}SQLite/${targetDbName}_backup_${Date.now()}.db`;

    const targetDbInfo = await FileSystem.getInfoAsync(targetDbPath);
    if (targetDbInfo.exists) {
      await FileSystem.copyAsync({
        from: targetDbPath,
        to: backupPath
      });
      console.log("✅ Current database backed up to:", backupPath);
    }

    // Ensure SQLite directory exists
    const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
    const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
    }

    // Copy imported database to target
    await FileSystem.copyAsync({
      from: fileUri,
      to: targetDbPath
    });

    // Verify the imported database
    const db = SQLite.openDatabaseSync(targetDbName);
    const countResult = db.getFirstSync(`SELECT COUNT(*) as count FROM garments`) as any;
    const garmentCount = countResult?.count || 0;

    console.log(`✅ Database imported successfully with ${garmentCount} garments`);

    Alert.alert(
      "Import Complete",
      `Successfully imported ${garmentCount} garments. Please restart the app to see changes.`,
      [
        { text: "OK", style: "default" }
      ]
    );

    return true;

  } catch (error) {
    console.error("Import error:", error);
    Alert.alert("Import Failed", "Could not import database. Make sure you selected a valid Closy database file.");
    return false;
  }
}

/**
 * Quick function to copy production to dev for testing
 * Only works if both databases exist locally
 */
export async function copyProductionToDev(): Promise<boolean> {
  try {
    const prodDbPath = `${FileSystem.documentDirectory}SQLite/closet.db`;
    const devDbPath = `${FileSystem.documentDirectory}SQLite/closet_dev.db`;

    // Check if production database exists
    const prodInfo = await FileSystem.getInfoAsync(prodDbPath);
    if (!prodInfo.exists) {
      console.log("Production database not found");
      return false;
    }

    // Backup dev database
    const backupPath = `${FileSystem.documentDirectory}SQLite/closet_dev_backup_${Date.now()}.db`;
    const devInfo = await FileSystem.getInfoAsync(devDbPath);
    if (devInfo.exists) {
      await FileSystem.copyAsync({
        from: devDbPath,
        to: backupPath
      });
    }

    // Copy production to dev
    await FileSystem.copyAsync({
      from: prodDbPath,
      to: devDbPath
    });

    console.log("✅ Copied production database to development");
    return true;

  } catch (error) {
    console.error("Copy error:", error);
    return false;
  }
}