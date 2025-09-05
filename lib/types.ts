export type ClothingType = "top"|"bottom"|"outerwear"|"shoe"|"accessory";
export type DressCode = "casual"|"smart_casual"|"business"|"sport";
export type Warmth = 1|2|3|4|5;

export interface Garment {
  id: string;
  type: ClothingType;
  name?: string;
  colors: string[];
  warmth: Warmth;
  waterResistant: 0|1;
  dressCodes: DressCode[];
  imageUri: string;
  lastWornAt?: string;
  timesWorn?: number;
  isDirty?: boolean;
  favorite?: boolean;
}

export interface Weather {
  tempC: number;
  chanceOfRain: number; // 0..1
  windKph: number;
  isSnow: boolean;
}