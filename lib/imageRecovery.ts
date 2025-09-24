import * as FileSystem from 'expo-file-system/legacy';
import { addGarment } from './db';
import { randomUUID } from 'expo-crypto';
import type { DressCode } from './types';

/**
 * Recovery system to rebuild database from orphaned images
 * This creates garment records for images that exist but have no database entries
 */
export async function recoverFromOrphanedImages(): Promise<{ recovered: number; failed: number }> {
  try {
    console.log('🔍 Starting comprehensive image recovery process...');

    let allImageFiles: { uri: string; filename: string }[] = [];

    // Check multiple possible locations
    const possibleLocations = [
      FileSystem.documentDirectory + 'garment_images/',
      FileSystem.documentDirectory + 'closy/images/',
      FileSystem.cacheDirectory ? FileSystem.cacheDirectory + 'ImagePicker/' : '',
      FileSystem.cacheDirectory ? FileSystem.cacheDirectory + 'Camera/' : '',
      FileSystem.cacheDirectory || '',
      // Check numbered cache directories (common pattern)
      FileSystem.cacheDirectory ? FileSystem.cacheDirectory + 'ImageManipulator/' : '',
    ].filter(dir => dir !== '');

    console.log('🔍 Scanning multiple directories for images...');

    for (const dir of possibleLocations) {
      try {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (dirInfo.exists && dirInfo.isDirectory) {
          const files = await FileSystem.readDirectoryAsync(dir);
          console.log(`📁 Found ${files.length} files in ${dir.split('/').slice(-2).join('/')}`);

          // Filter for image files
          const imageFiles = files.filter(f =>
            f.toLowerCase().endsWith('.jpg') ||
            f.toLowerCase().endsWith('.jpeg') ||
            f.toLowerCase().endsWith('.png') ||
            f.toLowerCase().endsWith('.heic')
          );

          for (const file of imageFiles) {
            // Skip placeholder images
            if (file.includes('placeholder') || file.includes('purple')) {
              continue;
            }
            allImageFiles.push({
              uri: dir + file,
              filename: file
            });
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not access ${dir.split('/').slice(-2).join('/')}`);
      }
    }

    console.log(`📸 Found ${allImageFiles.length} total image files across all locations`);

    if (allImageFiles.length === 0) {
      return { recovered: 0, failed: 0 };
    }

    // Get existing garments to avoid duplicates
    const existingGarments = await import('./db').then(m => m.getAllGarments());
    const existingImageUris = new Set(existingGarments.map(g => g.imageUri));

    let recovered = 0;
    let failed = 0;

    for (const imageFile of allImageFiles) {
      try {
        // Skip if this image is already linked to a garment
        if (existingImageUris.has(imageFile.uri)) {
          console.log(`⏭️ Skipping ${imageFile.filename} - already linked`);
          continue;
        }

        // Create a basic garment record with sensible defaults
        const garment = {
          id: randomUUID(),
          type: 'top' as const, // Default to top, user can edit later
          name: `Recovered Item ${recovered + 1}`,
          colors: ['black'], // Default color
          warmth: 2 as const, // Medium warmth
          waterResistant: 0 as const,
          dressCodes: ['casual'] as DressCode[],
          imageUri: imageFile.uri,
          lastWornAt: undefined,
          timesWorn: 0,
          isDirty: false,
          favorite: false
        };

        await addGarment(garment);
        recovered++;
        console.log(`✅ Recovered garment ${recovered}: ${imageFile.filename}`);

      } catch (error) {
        console.error(`❌ Failed to recover ${imageFile.filename}:`, error);
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
    let totalImageCount = 0;
    const existingImageUris = new Set<string>();

    // Check multiple possible locations
    const possibleLocations = [
      FileSystem.documentDirectory + 'garment_images/',
      FileSystem.documentDirectory + 'closy/images/',
      FileSystem.cacheDirectory ? FileSystem.cacheDirectory + 'ImagePicker/' : '',
      FileSystem.cacheDirectory ? FileSystem.cacheDirectory + 'Camera/' : '',
      FileSystem.cacheDirectory || '',
      FileSystem.cacheDirectory ? FileSystem.cacheDirectory + 'ImageManipulator/' : '',
    ].filter(dir => dir !== '');

    console.log('🔍 Checking all possible image locations...');

    for (const dir of possibleLocations) {
      try {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (dirInfo.exists && dirInfo.isDirectory) {
          const files = await FileSystem.readDirectoryAsync(dir);

          // Filter for actual image files
          const imageFiles = files.filter(f => {
            const lower = f.toLowerCase();
            return (lower.endsWith('.jpg') ||
                   lower.endsWith('.jpeg') ||
                   lower.endsWith('.png') ||
                   lower.endsWith('.heic')) &&
                   !f.includes('placeholder') &&
                   !f.includes('purple');
          });

          if (imageFiles.length > 0) {
            console.log(`📁 Found ${imageFiles.length} real images in ${dir.split('/').slice(-2).join('/')}`);
            // Count unique images by adding full paths to Set
            imageFiles.forEach(f => existingImageUris.add(dir + f));
          }
        }
      } catch (error) {
        // Silent fail for directories we can't access
      }
    }

    totalImageCount = existingImageUris.size;

    // Get current garment count from database
    const { getAllGarments } = await import('./db');
    const garments = await getAllGarments();

    // Filter out placeholder garments (those with purple square images)
    const realGarments = garments.filter(g =>
      !g.imageUri.includes('placeholder') &&
      !g.imageUri.includes('purple')
    );

    console.log(`📊 Total: ${totalImageCount} real images found, ${realGarments.length} real garments in database`);
    console.log(`🟣 Placeholder garments: ${garments.length - realGarments.length}`);

    return {
      imageCount: totalImageCount,
      garmentCount: realGarments.length
    };

  } catch (error) {
    console.error('Failed to check orphaned images:', error);
    return { imageCount: 0, garmentCount: 0 };
  }
}