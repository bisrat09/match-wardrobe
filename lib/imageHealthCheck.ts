import * as FileSystem from 'expo-file-system/legacy';
import { getAllGarments, updateGarment } from './db';
import { migrateImageIfNeeded, saveImagePersistently } from './imageStorage';
import { Alert } from 'react-native';

export interface HealthCheckResult {
  totalGarments: number;
  garmentsWithImages: number;
  missingImages: number;
  repairedImages: number;
  failedRepairs: number;
  errors: string[];
}

/**
 * Performs a comprehensive health check on all garment images
 */
export async function performImageHealthCheck(silent: boolean = false): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    totalGarments: 0,
    garmentsWithImages: 0,
    missingImages: 0,
    repairedImages: 0,
    failedRepairs: 0,
    errors: []
  };

  try {
    console.log('🏥 Starting image health check...');
    const garments = await getAllGarments();
    result.totalGarments = garments.length;

    for (const garment of garments) {
      // Skip garments without image URIs
      if (!garment.imageUri || garment.imageUri.trim() === '') {
        result.missingImages++;
        continue;
      }

      try {
        // Check if the image file exists
        const fileInfo = await FileSystem.getInfoAsync(garment.imageUri);
        
        if (!fileInfo.exists) {
          console.log(`❌ Image missing for ${garment.id}: ${garment.imageUri}`);
          result.missingImages++;
          
          // Try to recover from cache or temp
          if (garment.imageUri.includes('/Cache/') || garment.imageUri.includes('/tmp/')) {
            // This is a cached URI that might be recoverable
            const newUri = await tryRecoverImage(garment.imageUri);
            if (newUri) {
              await updateGarment(garment.id, { imageUri: newUri });
              result.repairedImages++;
              console.log(`✅ Recovered image for ${garment.id}`);
            } else {
              // Clear the invalid URI
              await updateGarment(garment.id, { imageUri: '' });
              result.failedRepairs++;
              result.errors.push(`Could not recover image for ${garment.name || garment.type}`);
            }
          } else {
            // Non-cache URI that's missing - clear it
            await updateGarment(garment.id, { imageUri: '' });
            result.failedRepairs++;
          }
        } else {
          // Image exists - check if it needs migration
          if (garment.imageUri.includes('/Cache/') || garment.imageUri.includes('/tmp/')) {
            console.log(`⚠️ Migrating cached image for ${garment.id}`);
            const newUri = await migrateImageIfNeeded(garment.imageUri);
            if (newUri && newUri !== garment.imageUri) {
              await updateGarment(garment.id, { imageUri: newUri });
              result.repairedImages++;
              console.log(`✅ Migrated image for ${garment.id}`);
            }
          }
          result.garmentsWithImages++;
        }
      } catch (error) {
        console.error(`Error checking image for ${garment.id}:`, error);
        result.errors.push(`Error checking ${garment.name || garment.type}: ${error}`);
      }
    }

    // Report results
    const message = `Health Check Complete:
- ${result.garmentsWithImages}/${result.totalGarments} images OK
- ${result.repairedImages} images recovered
- ${result.missingImages} images missing`;

    console.log(message);

    if (!silent && (result.repairedImages > 0 || result.missingImages > 0)) {
      Alert.alert(
        '🏥 Image Health Check',
        message,
        [
          { text: 'OK' }
        ]
      );
    }

    return result;
  } catch (error) {
    console.error('Health check failed:', error);
    result.errors.push(`Health check failed: ${error}`);
    return result;
  }
}

/**
 * Attempts to recover an image from various locations
 */
async function tryRecoverImage(originalUri: string): Promise<string | null> {
  // Try common cache locations
  const possibleLocations = [
    originalUri,
    originalUri.replace('/Cache/', '/tmp/'),
    originalUri.replace('/tmp/', '/Cache/'),
    // Add more potential locations if needed
  ];

  for (const location of possibleLocations) {
    try {
      const info = await FileSystem.getInfoAsync(location);
      if (info.exists) {
        // Found it! Migrate to persistent storage
        return await saveImagePersistently(location);
      }
    } catch (error) {
      // Continue to next location
    }
  }

  return null;
}

/**
 * Quick check that runs on app start
 */
export async function quickImageCheck(): Promise<number> {
  try {
    const garments = await getAllGarments();
    let issues = 0;

    for (const garment of garments) {
      if (garment.imageUri && garment.imageUri.trim() !== '') {
        // Quick check if file exists
        const info = await FileSystem.getInfoAsync(garment.imageUri);
        if (!info.exists) {
          issues++;
        }
      }
    }

    if (issues > 0) {
      console.log(`⚠️ Found ${issues} missing images - run health check to repair`);
    }

    return issues;
  } catch (error) {
    console.error('Quick check failed:', error);
    return 0;
  }
}