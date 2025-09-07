import * as SQLite from "expo-sqlite";
import { randomUUID } from "expo-crypto";
import type { Garment } from "./types";

const db = SQLite.openDatabaseSync("closet.db");

// Initialize database
db.execSync(
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
db.execSync(
  `CREATE TABLE IF NOT EXISTS wear_logs (
    id TEXT PRIMARY KEY NOT NULL,
    garmentIds TEXT NOT NULL,
    wornAt TEXT NOT NULL,
    weather TEXT,
    dressCode TEXT
  );`
);

export async function addGarment(g: Omit<Garment,"id"> & Partial<Pick<Garment,"id">>) {
  const id = g.id ?? randomUUID();
  try {
    await db.runAsync(
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
  const result = await db.getAllAsync<any>(`SELECT * FROM garments ORDER BY timesWorn ASC`);
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
    // Debug log to see what dress codes are actually stored
    console.log(`Garment ${r.id} type=${r.type} dressCodes=`, garment.dressCodes);
    return garment;
  });
}

export async function updateWear(
  garmentIds: string[], 
  metadata?: { weather?: any; dressCode?: string }
) {
  const nowISO = new Date().toISOString();
  
  // Update each garment's wear stats
  for (const id of garmentIds) {
    await db.runAsync(
      `UPDATE garments 
       SET timesWorn = timesWorn + 1, 
           lastWornAt = ?,
           isDirty = 1
       WHERE id = ?`,
      nowISO,
      id
    );
  }
  
  // Log the outfit in wear history
  const logId = randomUUID();
  await db.runAsync(
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

export async function clearAllGarments() {
  await db.runAsync(`DELETE FROM garments`);
  await db.runAsync(`DELETE FROM wear_logs`);
  return { success: true };
}

export async function updateAllGarmentsWithMultipleDressCodes() {
  // Update all existing garments to support multiple dress codes
  const garments = await getAllGarments();
  
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
    await db.runAsync(
      `UPDATE garments SET dressCodes = ? WHERE id = ?`,
      JSON.stringify(newDressCodes),
      garment.id
    );
  }
  
  return { success: true, updated: garments.length };
}