import * as SQLite from "expo-sqlite";
import { randomUUID } from "expo-crypto";
import type { Garment } from "./types";

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Async database initialization with caching
async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  if (!initPromise) {
    initPromise = initializeDatabase();
  }

  return initPromise;
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    // Add small delay to ensure app is fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // CRITICAL: Use separate databases for dev vs production to prevent data loss
    const isDev = __DEV__ || process.env.NODE_ENV === 'development';
    const dbName = isDev ? "closet_dev.db" : "closet.db";
    console.log(`⚠️ Using database: ${dbName} (isDev: ${isDev})`);
    const database = SQLite.openDatabaseSync(dbName);
    
    // Initialize database tables
    database.execSync(
      `CREATE TABLE IF NOT EXISTS garments (
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
      );`
    );

    // Create wear logs table for tracking outfit history
    database.execSync(
      `CREATE TABLE IF NOT EXISTS wear_logs (
        id TEXT PRIMARY KEY NOT NULL,
        garmentIds TEXT NOT NULL,
        wornAt TEXT NOT NULL,
        weather TEXT,
        dressCode TEXT
      );`
    );
    
    db = database;
    return database;
  } catch (error) {
    console.error("Database initialization failed:", error);
    // Return a mock database that won't crash the app
    throw error;
  }
}

export async function addGarment(g: Omit<Garment,"id"> & Partial<Pick<Garment,"id">>) {
  const id = g.id ?? randomUUID();
  try {
    const database = await getDatabase();
    await database.runAsync(
      `INSERT INTO garments
       (id, type, name, colors, warmth, waterResistant, dressCodes, imageUri, lastWornAt, timesWorn, isDirty, favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, 
      g.type, 
      g.name ?? null,
      JSON.stringify(g.colors ?? []),
      g.warmth,
      g.waterResistant,
      JSON.stringify(g.dressCodes ?? ["casual"]),
      g.imageUri,
      g.lastWornAt ?? null,
      g.timesWorn ?? 0,
      g.isDirty ? 1 : 0,
      g.favorite ? 1 : 0
    );
  } catch (error) {
    throw error;
  }
}

export async function getAllGarments(): Promise<Garment[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<any>(`SELECT * FROM garments ORDER BY timesWorn ASC`);
  return result.map(r => {
    const garment = {
      id: r.id,
      type: r.type,
      name: r.name ?? undefined,
      colors: JSON.parse(r.colors || "[]"),
      warmth: r.warmth,
      waterResistant: r.waterResistant,
      dressCodes: JSON.parse(r.dressCodes || '["casual"]'),
      imageUri: r.imageUri,
      lastWornAt: r.lastWornAt ?? undefined,
      timesWorn: r.timesWorn ?? 0,
      isDirty: r.isDirty === 1,
      favorite: r.favorite === 1
    };
    return garment;
  });
}

export async function updateWear(
  garmentIds: string[], 
  metadata?: { weather?: any; dressCode?: string }
) {
  const nowISO = new Date().toISOString();
  
  // Update each garment's wear stats with smart dirty logic
  const database = await getDatabase();
  for (const id of garmentIds) {
    // Get garment type to determine if it should get dirty
    const garment = await database.getFirstAsync<{type: string, timesWorn: number}>(
      'SELECT type, timesWorn FROM garments WHERE id = ?', 
      id
    );
    
    // Smart dirty logic: shoes don't get dirty on single wear, other items do
    let shouldMarkDirty = 1;
    if (garment?.type === 'shoe') {
      // Shoes only get dirty after multiple wears or specific conditions
      shouldMarkDirty = 0; // Keep shoes clean unless manually marked
    }
    
    await database.runAsync(
      `UPDATE garments 
       SET timesWorn = timesWorn + 1, 
           lastWornAt = ?,
           isDirty = ?
       WHERE id = ?`,
      nowISO,
      shouldMarkDirty,
      id
    );
  }
  
  // Log the outfit in wear history
  const logId = randomUUID();
  await database.runAsync(
    `INSERT INTO wear_logs (id, garmentIds, wornAt, weather, dressCode)
     VALUES (?, ?, ?, ?, ?)`,
    logId,
    JSON.stringify(garmentIds),
    nowISO,
    metadata?.weather ? JSON.stringify(metadata.weather) : null,
    metadata?.dressCode ?? null
  );
  
  return { success: true, logId };
}

export async function markAllGarmentsClean(): Promise<{success: boolean, count: number}> {
  // Get count of dirty items first
  const database = await getDatabase();
  const dirtyCount = await database.getFirstAsync<{count: number}>(
    'SELECT COUNT(*) as count FROM garments WHERE isDirty = 1'
  );
  
  // Mark all dirty garments as clean
  await database.runAsync(
    'UPDATE garments SET isDirty = 0 WHERE isDirty = 1'
  );
  
  return { 
    success: true, 
    count: dirtyCount?.count ?? 0 
  };
}

export async function updateGarment(id: string, updates: Partial<Omit<Garment, "id">>) {
  const updateFields: string[] = [];
  const values: any[] = [];
  
  if (updates.type !== undefined) {
    updateFields.push("type = ?");
    values.push(updates.type);
  }
  if (updates.name !== undefined) {
    updateFields.push("name = ?");
    values.push(updates.name || null);
  }
  if (updates.colors !== undefined) {
    updateFields.push("colors = ?");
    values.push(JSON.stringify(updates.colors));
  }
  if (updates.warmth !== undefined) {
    updateFields.push("warmth = ?");
    values.push(updates.warmth);
  }
  if (updates.waterResistant !== undefined) {
    updateFields.push("waterResistant = ?");
    values.push(updates.waterResistant);
  }
  if (updates.dressCodes !== undefined) {
    updateFields.push("dressCodes = ?");
    values.push(JSON.stringify(updates.dressCodes));
  }
  if (updates.imageUri !== undefined) {
    updateFields.push("imageUri = ?");
    values.push(updates.imageUri);
  }
  if (updates.isDirty !== undefined) {
    updateFields.push("isDirty = ?");
    values.push(updates.isDirty ? 1 : 0);
  }
  if (updates.favorite !== undefined) {
    updateFields.push("favorite = ?");
    values.push(updates.favorite ? 1 : 0);
  }
  
  if (updateFields.length === 0) {
    return { success: false, error: "No fields to update" };
  }
  
  values.push(id); // Add id for WHERE clause
  
  try {
    const database = await getDatabase();
    await database.runAsync(
      `UPDATE garments SET ${updateFields.join(", ")} WHERE id = ?`,
      ...values
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to update garment:", error);
    return { success: false, error };
  }
}

export async function deleteGarment(id: string) {
  try {
    const database = await getDatabase();
    await database.runAsync(`DELETE FROM garments WHERE id = ?`, id);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete garment:", error);
    return { success: false, error };
  }
}

export async function clearAllGarments() {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM garments`);
  await database.runAsync(`DELETE FROM wear_logs`);
  return { success: true };
}

export async function updateAllImagePaths(): Promise<number> {
  const database = await getDatabase();
  const OLD_DIR = 'garment_images/';
  const NEW_DIR = 'closy/images/';

  // Update all garments with old image paths to new paths
  const result = await database.runAsync(
    `UPDATE garments
     SET imageUri = REPLACE(imageUri, ?, ?)
     WHERE imageUri LIKE ?`,
    [OLD_DIR, NEW_DIR, '%' + OLD_DIR + '%']
  );

  return result.changes;
}

export async function updateAllGarmentsWithMultipleDressCodes() {
  // Update all existing garments to support multiple dress codes
  const garments = await getAllGarments();
  const database = await getDatabase();
  
  for (const garment of garments) {
    let newDressCodes: string[] = ["casual"]; // Start with casual
    
    // Add smart_casual for versatile items
    if (garment.type === "top" || garment.type === "bottom") {
      newDressCodes.push("smart_casual");
      
      // Add sport for athletic tops and bottoms
      if (garment.warmth <= 2) {
        newDressCodes.push("sport");
      }
      
      // Add business for more formal items
      if (garment.colors.some(c => ["black", "white", "gray", "navy", "brown"].includes(c.toLowerCase()))) {
        newDressCodes.push("business");
      }
    }
    
    // Shoes get dress codes based on their characteristics
    if (garment.type === "shoe") {
      // Determine shoe type based on color and warmth
      const formalColors = ["black", "brown", "navy"];
      const isFormalShoe = garment.colors.some(c => formalColors.includes(c.toLowerCase())) && garment.warmth >= 2;
      const isCasualShoe = garment.warmth <= 2 || garment.colors.some(c => ["white", "gray", "blue", "red"].includes(c.toLowerCase()));
      
      if (isFormalShoe) {
        // Formal shoes: business and smart_casual only
        newDressCodes.push("smart_casual");
        newDressCodes.push("business");
      } else if (isCasualShoe) {
        // Casual/athletic shoes: casual, sport, maybe smart_casual
        newDressCodes.push("sport");
        newDressCodes.push("smart_casual");
      } else {
        // Default: versatile shoes
        newDressCodes.push("smart_casual");
        newDressCodes.push("sport");
      }
    }
    
    // Update the garment
    await database.runAsync(
      `UPDATE garments SET dressCodes = ? WHERE id = ?`,
      JSON.stringify(newDressCodes),
      garment.id
    );
  }
  
  return { success: true, updated: garments.length };
}

// Export all garments to JSON
export async function exportGarments(): Promise<string> {
  const garments = await getAllGarments();
  const database = await getDatabase();
  const wearLogs = await database.getAllAsync<any>(`SELECT * FROM wear_logs ORDER BY wornAt DESC`);
  
  const exportData = {
    version: 1,
    exportDate: new Date().toISOString(),
    garmentCount: garments.length,
    garments,
    wearLogs
  };
  
  return JSON.stringify(exportData, null, 2);
}

// Import garments from JSON
export async function importGarments(jsonData: string): Promise<{ imported: number, skipped: number }> {
  try {
    const data = JSON.parse(jsonData);
    const database = await getDatabase();
    
    if (!data.garments || !Array.isArray(data.garments)) {
      throw new Error("Invalid import data format");
    }
    
    let imported = 0;
    let skipped = 0;
    
    for (const garment of data.garments) {
      try {
        // Check if garment already exists
        const existing = await database.getFirstAsync<any>(
          `SELECT id FROM garments WHERE id = ?`,
          garment.id
        );
        
        if (existing) {
          skipped++;
          continue;
        }
        
        await addGarment(garment);
        imported++;
      } catch (error) {
        console.error(`Failed to import garment ${garment.id}:`, error);
        skipped++;
      }
    }
    
    // Import wear logs if present
    if (data.wearLogs && Array.isArray(data.wearLogs)) {
      for (const log of data.wearLogs) {
        try {
          await database.runAsync(
            `INSERT OR IGNORE INTO wear_logs (id, garmentIds, wornAt, weather, dressCode) 
             VALUES (?, ?, ?, ?, ?)`,
            log.id,
            log.garmentIds,
            log.wornAt,
            log.weather,
            log.dressCode
          );
        } catch (error) {
          console.error(`Failed to import wear log:`, error);
        }
      }
    }
    
    return { imported, skipped };
  } catch (error) {
    throw new Error(`Import failed: ${error}`);
  }
}

// Debug function to check actual database count
export async function getGarmentCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{count: number}>(`SELECT COUNT(*) as count FROM garments`);
  return result?.count || 0;
}