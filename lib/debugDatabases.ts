import * as SQLite from "expo-sqlite";
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Advanced debugging to find ALL databases and inspect their contents
 * This will help us locate your real 110 garments
 */
export async function debugAllDatabases(): Promise<{
  databases: Array<{
    name: string;
    path: string;
    garmentCount: number;
    garmentNames: string[];
    sampleData: string[];
  }>;
  directories: Array<{
    path: string;
    imageCount: number;
    sampleImages: string[];
  }>;
}> {
  const results = {
    databases: [] as any[],
    directories: [] as any[]
  };

  console.log("🔍 Starting comprehensive database and storage debugging...");

  // 1. Check all possible database names
  const possibleDbNames = [
    "closet.db",
    "closet_dev.db",
    "closet_prod.db",
    "closet_production.db",
    "match-wardrobe.db",
    "wardrobe.db",
    "garments.db",
    "database.db"
  ];

  for (const dbName of possibleDbNames) {
    try {
      console.log(`📊 Checking database: ${dbName}`);
      const db = SQLite.openDatabaseSync(dbName);

      // Check if garments table exists
      const tables = db.getAllSync(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='garments'
      `) as any[];

      if (tables.length > 0) {
        // Get garment count
        const countResult = db.getFirstSync(`SELECT COUNT(*) as count FROM garments`) as any;
        const garmentCount = countResult?.count || 0;

        // Get sample garment names to identify the database contents
        const garments = db.getAllSync(`
          SELECT name, type, colors FROM garments
          ORDER BY id LIMIT 10
        `) as any[];

        const garmentNames = garments.map(g => g.name || g.type).filter(Boolean);

        // Check if this looks like sample data
        const sampleDataIndicators = [
          "Gray Sweatpants", "Blue Jeans", "Running Shoes", "Red Polo",
          "Black T-Shirt", "White Shirt", "Imported Item", "Recovered Item"
        ];

        const sampleData = garmentNames.filter(name =>
          sampleDataIndicators.some(sample =>
            name.toLowerCase().includes(sample.toLowerCase())
          )
        );

        results.databases.push({
          name: dbName,
          path: `SQLite database: ${dbName}`,
          garmentCount,
          garmentNames: garmentNames.slice(0, 5), // First 5 names
          sampleData
        });

        console.log(`✅ Found ${garmentCount} garments in ${dbName}`);
        if (sampleData.length > 0) {
          console.log(`⚠️ Contains sample data: ${sampleData.join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`❌ Could not access ${dbName}:`, error);
    }
  }

  // 2. Check all possible image directories
  const possibleImageDirs = [
    `${FileSystem.documentDirectory}garment_images/`,
    `${FileSystem.documentDirectory}closy/images/`,
    `${FileSystem.documentDirectory}images/`,
    `${FileSystem.documentDirectory}wardrobe/`,
    `${FileSystem.documentDirectory}closet/`,
    `${FileSystem.cacheDirectory}ImagePicker/`,
    `${FileSystem.cacheDirectory}garment_images/`,
  ];

  for (const dirPath of possibleImageDirs) {
    try {
      console.log(`📁 Checking directory: ${dirPath}`);
      const dirInfo = await FileSystem.getInfoAsync(dirPath);

      if (dirInfo.exists && dirInfo.isDirectory) {
        const files = await FileSystem.readDirectoryAsync(dirPath);
        const imageFiles = files.filter(f =>
          f.toLowerCase().endsWith('.jpg') ||
          f.toLowerCase().endsWith('.jpeg') ||
          f.toLowerCase().endsWith('.png')
        );

        results.directories.push({
          path: dirPath,
          imageCount: imageFiles.length,
          sampleImages: imageFiles.slice(0, 3) // First 3 filenames
        });

        console.log(`✅ Found ${imageFiles.length} images in ${dirPath}`);
      }
    } catch (error) {
      console.log(`❌ Could not access ${dirPath}:`, error);
    }
  }

  // 3. Special check: Try to find databases by file system search
  try {
    console.log("🔍 Searching document directory for .db files...");
    const docFiles = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
    const dbFiles = docFiles.filter(f => f.endsWith('.db'));

    console.log("📋 Found .db files:", dbFiles);

    for (const dbFile of dbFiles) {
      if (!possibleDbNames.includes(dbFile)) {
        console.log(`🆕 Found additional database: ${dbFile}`);
        // Add to our check list
        try {
          const db = SQLite.openDatabaseSync(dbFile);
          const tables = db.getAllSync(`
            SELECT name FROM sqlite_master WHERE type='table'
          `) as any[];

          console.log(`📊 Tables in ${dbFile}:`, tables.map(t => t.name));
        } catch (error) {
          console.log(`❌ Could not read ${dbFile}:`, error);
        }
      }
    }
  } catch (error) {
    console.log("❌ Could not search document directory:", error);
  }

  console.log("🔍 Debugging complete!");
  return results;
}

/**
 * Check if current database connection is using the right one
 */
export async function debugCurrentDatabase(): Promise<{
  isDev: boolean;
  dbName: string;
  garmentCount: number;
  sampleGarmentNames: string[];
}> {
  try {
    // This will use the same logic as our main app
    const isDev = __DEV__ || process.env.NODE_ENV === 'development';
    const dbName = isDev ? "closet_dev.db" : "closet.db";

    console.log(`🎯 Current app is using: ${dbName} (isDev: ${isDev})`);

    const db = SQLite.openDatabaseSync(dbName);
    const countResult = db.getFirstSync(`SELECT COUNT(*) as count FROM garments`) as any;
    const garmentCount = countResult?.count || 0;

    const garments = db.getAllSync(`
      SELECT name, type FROM garments LIMIT 5
    `) as any[];

    const sampleGarmentNames = garments.map(g => g.name || g.type);

    return {
      isDev,
      dbName,
      garmentCount,
      sampleGarmentNames
    };
  } catch (error) {
    console.error("Error checking current database:", error);
    return {
      isDev: false,
      dbName: "unknown",
      garmentCount: 0,
      sampleGarmentNames: []
    };
  }
}