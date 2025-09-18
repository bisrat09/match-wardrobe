import { addGarment } from './db';
import type { ClothingType, DressCode } from './types';

// Sample garment data for testing
const sampleGarments = [
  // Tops
  { type: 'top' as ClothingType, name: 'White T-Shirt', colors: ['white'], warmth: 1, dressCodes: ['casual'] as DressCode[], waterResistant: false },
  { type: 'top' as ClothingType, name: 'Black Dress Shirt', colors: ['black'], warmth: 2, dressCodes: ['business', 'smart_casual'] as DressCode[], waterResistant: false },
  { type: 'top' as ClothingType, name: 'Blue Oxford Shirt', colors: ['blue'], warmth: 2, dressCodes: ['business', 'smart_casual'] as DressCode[], waterResistant: false },
  { type: 'top' as ClothingType, name: 'Gray Hoodie', colors: ['gray'], warmth: 3, dressCodes: ['casual', 'sport'] as DressCode[], waterResistant: false },
  { type: 'top' as ClothingType, name: 'Red Polo', colors: ['red'], warmth: 1, dressCodes: ['casual', 'smart_casual'] as DressCode[], waterResistant: false },
  { type: 'top' as ClothingType, name: 'Green Sweater', colors: ['green'], warmth: 3, dressCodes: ['casual', 'smart_casual'] as DressCode[], waterResistant: false },
  
  // Bottoms
  { type: 'bottom' as ClothingType, name: 'Blue Jeans', colors: ['blue'], warmth: 2, dressCodes: ['casual'] as DressCode[], waterResistant: false },
  { type: 'bottom' as ClothingType, name: 'Black Dress Pants', colors: ['black'], warmth: 2, dressCodes: ['business', 'smart_casual'] as DressCode[], waterResistant: false },
  { type: 'bottom' as ClothingType, name: 'Khaki Chinos', colors: ['brown'], warmth: 2, dressCodes: ['casual', 'smart_casual'] as DressCode[], waterResistant: false },
  { type: 'bottom' as ClothingType, name: 'Gray Sweatpants', colors: ['gray'], warmth: 2, dressCodes: ['casual', 'sport'] as DressCode[], waterResistant: false },
  { type: 'bottom' as ClothingType, name: 'Navy Shorts', colors: ['navy'], warmth: 1, dressCodes: ['casual', 'sport'] as DressCode[], waterResistant: false },
  
  // Shoes
  { type: 'shoe' as ClothingType, name: 'White Sneakers', colors: ['white'], warmth: 1, dressCodes: ['casual', 'sport'] as DressCode[], waterResistant: false },
  { type: 'shoe' as ClothingType, name: 'Black Dress Shoes', colors: ['black'], warmth: 1, dressCodes: ['business', 'smart_casual'] as DressCode[], waterResistant: false },
  { type: 'shoe' as ClothingType, name: 'Brown Loafers', colors: ['brown'], warmth: 1, dressCodes: ['casual', 'smart_casual'] as DressCode[], waterResistant: false },
  { type: 'shoe' as ClothingType, name: 'Running Shoes', colors: ['gray', 'orange'], warmth: 1, dressCodes: ['sport', 'casual'] as DressCode[], waterResistant: false },
  
  // Outerwear
  { type: 'outerwear' as ClothingType, name: 'Black Leather Jacket', colors: ['black'], warmth: 3, dressCodes: ['casual', 'smart_casual'] as DressCode[], waterResistant: true },
  { type: 'outerwear' as ClothingType, name: 'Navy Blazer', colors: ['navy'], warmth: 2, dressCodes: ['business', 'smart_casual'] as DressCode[], waterResistant: false },
  { type: 'outerwear' as ClothingType, name: 'Rain Jacket', colors: ['yellow'], warmth: 2, dressCodes: ['casual', 'sport'] as DressCode[], waterResistant: true },
  { type: 'outerwear' as ClothingType, name: 'Winter Coat', colors: ['gray'], warmth: 5, dressCodes: ['casual', 'business'] as DressCode[], waterResistant: true },
];

// Function to add sample data to database
export async function addSampleData() {
  console.log('Adding sample garments to database...');
  let added = 0;
  
  for (const garment of sampleGarments) {
    try {
      // Create a placeholder image URI that will display a colored box
      // Using a data URI to avoid file system dependencies
      const placeholderImage = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
      
      // Create garment object in the correct format for addGarment
      const garmentData = {
        type: garment.type,
        name: garment.name,
        colors: garment.colors,
        warmth: garment.warmth,
        waterResistant: garment.waterResistant ? 1 : 0,
        dressCodes: garment.dressCodes,
        imageUri: placeholderImage,
        timesWorn: 0,
        isDirty: false,
        favorite: false,
        lastWornAt: undefined
      };
      
      // Use the existing addGarment function with correct format
      await addGarment(garmentData);
      
      added++;
      console.log(`Added: ${garment.name}`);
    } catch (error) {
      console.error(`Failed to add ${garment.name}:`, error);
    }
  }
  
  console.log(`Successfully added ${added} garments to database`);
  return added;
}