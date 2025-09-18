import * as FileSystem from 'expo-file-system';
import { addGarment } from './db';
import { randomUUID } from 'expo-crypto';

/**
 * Recovery system to rebuild database from orphaned images
 * This creates garment records for images that exist but have no database entries
 */
export async function recoverFromOrphanedImages(): Promise<{ recovered: number; failed: number }> {
  try {
    console.log('🔍 Starting image recovery process...');
    
    // Get the persistent images directory
    const imagesDir = FileSystem.documentDirectory + 'garment_images/';
    
    // Check if the directory exists
    const dirInfo = await FileSystem.getInfoAsync(imagesDir);
    if (!dirInfo.exists) {
      console.log('❌ No images directory found');
      return { recovered: 0, failed: 0 };
    }
    
    // List all image files
    const imageFiles = await FileSystem.readDirectoryAsync(imagesDir);
    console.log(`📁 Found ${imageFiles.length} image files`);
    
    let recovered = 0;
    let failed = 0;
    
    for (const filename of imageFiles) {
      try {
        const imageUri = imagesDir + filename;
        
        // Create a basic garment record with sensible defaults
        const garment = {
          id: randomUUID(),
          type: 'top' as const, // Default to top, user can edit later
          name: `Recovered Item ${recovered + 1}`,
          colors: ['black'], // Default color
          warmth: 2, // Medium warmth
          waterResistant: 0,
          dressCodes: ['casual'] as const,
          imageUri: imageUri,
          lastWornAt: undefined,
          timesWorn: 0,
          isDirty: false,
          favorite: false
        };
        
        await addGarment(garment);
        recovered++;
        console.log(`✅ Recovered garment ${recovered}: ${filename}`);
        
      } catch (error) {
        console.error(`❌ Failed to recover ${filename}:`, error);
        failed++;
      }
    }
    
    console.log(`🎉 Recovery complete: ${recovered} recovered, ${failed} failed`);
    return { recovered, failed };
    
  } catch (error) {
    console.error('💥 Recovery process failed:', error);
    throw error;
  }
}

/**
 * Check how many orphaned images exist (images without database records)
 */
export async function checkOrphanedImages(): Promise<{ imageCount: number; garmentCount: number }> {
  try {
    const imagesDir = FileSystem.documentDirectory + 'garment_images/';
    const dirInfo = await FileSystem.getInfoAsync(imagesDir);
    
    if (!dirInfo.exists) {
      return { imageCount: 0, garmentCount: 0 };
    }
    
    const imageFiles = await FileSystem.readDirectoryAsync(imagesDir);
    
    // Get current garment count from database
    const { getAllGarments } = await import('./db');
    const garments = await getAllGarments();
    
    return { 
      imageCount: imageFiles.length, 
      garmentCount: garments.length 
    };
    
  } catch (error) {
    console.error('Failed to check orphaned images:', error);
    return { imageCount: 0, garmentCount: 0 };
  }
}