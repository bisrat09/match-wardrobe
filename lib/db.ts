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
  return result.map(r => ({
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
  }));
}