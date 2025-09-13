import { getAllGarments, updateGarment } from './db';
import { migrateImageIfNeeded, isTemporaryUri } from './imageStorage';

/**
 * Migrates all cached/temporary images to persistent storage
 * This should be run on app startup to ensure all images are safe
 */
export async function migrateAllImages() {
  try {
    console.log('Starting image migration check...');
    
    const garments = await getAllGarments();
    let migratedCount = 0;
    let failedCount = 0;
    
    for (const garment of garments) {
      if (garment.imageUri && isTemporaryUri(garment.imageUri)) {
        try {
          console.log(`Migrating image for garment ${garment.id}...`);
          const newUri = await migrateImageIfNeeded(garment.imageUri);
          
          if (newUri && newUri !== garment.imageUri) {
            // Update the database with the new persistent URI
            await updateGarment(garment.id, { imageUri: newUri });
            migratedCount++;
            console.log(`Successfully migrated image for garment ${garment.id}`);
          } else if (!newUri) {
            // Image was lost - update to empty string
            await updateGarment(garment.id, { imageUri: '' });
            failedCount++;
            console.warn(`Lost image for garment ${garment.id}`);
          }
        } catch (error) {
          console.error(`Failed to migrate image for garment ${garment.id}:`, error);
          failedCount++;
        }
      }
    }
    
    if (migratedCount > 0 || failedCount > 0) {
      console.log(`Image migration completed: ${migratedCount} migrated, ${failedCount} failed`);
      return { 
        success: true, 
        migratedCount, 
        failedCount,
        message: failedCount > 0 
          ? `Migrated ${migratedCount} images. ${failedCount} images were lost from cache.`
          : `Successfully migrated ${migratedCount} images to persistent storage.`
      };
    } else {
      console.log('No images needed migration');
      return { 
        success: true, 
        migratedCount: 0, 
        failedCount: 0,
        message: 'All images are already in persistent storage.'
      };
    }
  } catch (error) {
    console.error('Image migration failed:', error);
    return { 
      success: false, 
      migratedCount: 0, 
      failedCount: 0,
      message: 'Failed to migrate images. Please try again.'
    };
  }
}