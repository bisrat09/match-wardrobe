import * as SQLite from "expo-sqlite";
import * as FileSystem from 'expo-file-system/legacy';
import { randomUUID } from 'expo-crypto';

/**
 * SAFE function to copy production data to dev environment
 * This allows testing with real data without affecting production
 */
export async function copyProductionToDevSafely(): Promise<{
  copiedGarments: number;
  copiedImages: number;
  errors: string[]
}> {
  const errors: string[] = [];
  let copiedGarments = 0;
  let copiedImages = 0;

  try {
    console.log("🔄 Starting safe production → dev copy...");

    // 1. Open BOTH databases (read-only access to production)
    const prodDb = SQLite.openDatabaseSync("closet.db");
    const devDb = SQLite.openDatabaseSync("closet_dev.db");

    // 2. Ensure dev database has tables
    devDb.execSync(`
      CREATE TABLE IF NOT EXISTS garments (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        name TEXT,
        colors TEXT NOT NULL,
        warmth INTEGER NOT NULL,
        waterResistant INTEGER NOT NULL,
        dressCodes TEXT NOT NULL,
        imageUri TEXT NOT NULL,
        lastWornAt TEXT,
        timesWorn INTEGER DEFAULT 0,
        isDirty INTEGER DEFAULT 0,
        favorite INTEGER DEFAULT 0
      );
    `);

    devDb.execSync(`
      CREATE TABLE IF NOT EXISTS wear_logs (
        id TEXT PRIMARY KEY NOT NULL,
        garmentIds TEXT NOT NULL,
        wornAt TEXT NOT NULL,
        dressCode TEXT
      );
    `);

    // 3. Read ALL garments from production (READ-ONLY)
    const productionGarments = prodDb.getAllSync(`
      SELECT * FROM garments ORDER BY id
    `) as any[];

    console.log(`📖 Found ${productionGarments.length} garments in production`);

    // 4. Setup directories
    const DEV_IMAGES_DIR = `${FileSystem.documentDirectory}closy/images/`;
    const dirInfo = await FileSystem.getInfoAsync(DEV_IMAGES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DEV_IMAGES_DIR, { intermediates: true });
    }

    // 5. Copy each garment and its image
    for (const garment of productionGarments) {
      try {
        let newImageUri = garment.imageUri;

        // Copy image file if it exists and is a file URI
        if (garment.imageUri && garment.imageUri.startsWith('file://')) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(garment.imageUri);
            if (fileInfo.exists) {
              // Generate new filename for dev environment
              const fileExtension = garment.imageUri.split('.').pop() || 'jpg';
              const newFileName = `${randomUUID()}.${fileExtension}`;
              newImageUri = `${DEV_IMAGES_DIR}${newFileName}`;

              // Copy the actual image file
              await FileSystem.copyAsync({
                from: garment.imageUri,
                to: newImageUri
              });

              copiedImages++;
              console.log(`📷 Copied image: ${newFileName}`);
            } else {
              console.warn(`⚠️ Image not found: ${garment.imageUri}`);
              errors.push(`Image not found: ${garment.name || garment.type}`);
            }
          } catch (imageError) {
            console.error(`❌ Failed to copy image for ${garment.name}:`, imageError);
            errors.push(`Image copy failed: ${garment.name || garment.type}`);
            // Keep original URI as fallback
          }
        }

        // Insert garment into dev database with new image path
        devDb.runSync(`
          INSERT OR REPLACE INTO garments (
            id, type, name, colors, warmth, waterResistant,
            dressCodes, imageUri, lastWornAt, timesWorn, isDirty, favorite
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          garment.id,
          garment.type,
          garment.name,
          garment.colors,
          garment.warmth,
          garment.waterResistant,
          garment.dressCodes,
          newImageUri,
          garment.lastWornAt,
          garment.timesWorn || 0,
          garment.isDirty || 0,
          garment.favorite || 0
        ]);

        copiedGarments++;

        if (copiedGarments % 10 === 0) {
          console.log(`📦 Copied ${copiedGarments}/${productionGarments.length} garments...`);
        }

      } catch (garmentError) {
        console.error(`❌ Failed to copy garment ${garment.name}:`, garmentError);
        errors.push(`Garment copy failed: ${garment.name || garment.type}`);
      }
    }

    // 6. Copy wear logs if they exist
    try {
      const wearLogs = prodDb.getAllSync(`SELECT * FROM wear_logs`) as any[];
      console.log(`📊 Found ${wearLogs.length} wear logs`);

      for (const log of wearLogs) {
        devDb.runSync(`
          INSERT OR REPLACE INTO wear_logs (id, garmentIds, wornAt, dressCode)
          VALUES (?, ?, ?, ?)
        `, [log.id, log.garmentIds, log.wornAt, log.dressCode]);
      }
    } catch (wearLogError) {
      console.warn("⚠️ No wear logs to copy (table might not exist)");
    }

    console.log(`✅ Copy complete: ${copiedGarments} garments, ${copiedImages} images`);

    return {
      copiedGarments,
      copiedImages,
      errors
    };

  } catch (error) {
    console.error("💥 Copy operation failed:", error);
    errors.push(`Critical error: ${String(error)}`);

    return {
      copiedGarments: 0,
      copiedImages: 0,
      errors
    };
  }
}

/**
 * Check what data exists in both production and dev databases
 */
export async function checkDatabaseStatus(): Promise<{
  production: { garments: number; images: number };
  development: { garments: number; images: number };
}> {
  try {
    const prodDb = SQLite.openDatabaseSync("closet.db");
    const devDb = SQLite.openDatabaseSync("closet_dev.db");

    // Count production garments
    const prodCount = prodDb.getFirstSync(`SELECT COUNT(*) as count FROM garments`) as any;

    // Count dev garments (might not have table yet)
    let devCount = { count: 0 };
    try {
      devCount = devDb.getFirstSync(`SELECT COUNT(*) as count FROM garments`) as any;
    } catch {
      // Table doesn't exist yet
    }

    // Count actual image files
    const DEV_IMAGES_DIR = `${FileSystem.documentDirectory}closy/images/`;
    let devImageCount = 0;
    try {
      const dirInfo = await FileSystem.getInfoAsync(DEV_IMAGES_DIR);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(DEV_IMAGES_DIR);
        devImageCount = files.length;
      }
    } catch {
      // Directory doesn't exist
    }

    // For production images, check both old and new locations
    let prodImageCount = 0;
    const oldDir = `${FileSystem.documentDirectory}garment_images/`;
    const newDir = `${FileSystem.documentDirectory}closy/images/`;

    for (const dir of [oldDir, newDir]) {
      try {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (dirInfo.exists) {
          const files = await FileSystem.readDirectoryAsync(dir);
          prodImageCount += files.length;
        }
      } catch {
        // Directory doesn't exist
      }
    }

    return {
      production: {
        garments: prodCount.count || 0,
        images: prodImageCount
      },
      development: {
        garments: devCount.count || 0,
        images: devImageCount
      }
    };

  } catch (error) {
    console.error("Error checking database status:", error);
    return {
      production: { garments: 0, images: 0 },
      development: { garments: 0, images: 0 }
    };
  }
}