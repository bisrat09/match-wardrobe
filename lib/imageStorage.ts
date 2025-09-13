import * as FileSystem from 'expo-file-system/legacy';
import { randomUUID } from 'expo-crypto';

// Directory for persistent image storage - this won't be cleared on app updates
const IMAGES_DIR = `${FileSystem.documentDirectory}garment_images/`;

/**
 * Ensures the images directory exists
 */
async function ensureImagesDirectory() {
  const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
}

/**
 * Copies an image from a temporary location (like image picker cache) to persistent storage
 * @param tempUri - The temporary URI from image picker
 * @returns The new persistent URI
 */
export async function saveImagePersistently(tempUri: string): Promise<string> {
  try {
    await ensureImagesDirectory();
    
    // Generate a unique filename
    const fileExtension = tempUri.split('.').pop() || 'jpg';
    const fileName = `${randomUUID()}.${fileExtension}`;
    const permanentUri = `${IMAGES_DIR}${fileName}`;
    
    // Copy the file to permanent storage
    await FileSystem.copyAsync({
      from: tempUri,
      to: permanentUri
    });
    
    return permanentUri;
  } catch (error) {
    console.error('Error saving image persistently:', error);
    throw error;
  }
}

/**
 * Deletes an image from persistent storage
 * @param imageUri - The URI of the image to delete
 */
export async function deletePersistedImage(imageUri: string): Promise<void> {
  try {
    // Only delete if it's in our managed directory
    if (imageUri.startsWith(IMAGES_DIR)) {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(imageUri);
      }
    }
  } catch (error) {
    console.error('Error deleting persisted image:', error);
    // Don't throw - image might already be deleted
  }
}

/**
 * Checks if an image URI is from cache/temp directory
 * @param uri - The image URI to check
 */
export function isTemporaryUri(uri: string): boolean {
  return uri.includes('/Cache/') || 
         uri.includes('/tmp/') || 
         uri.includes('/Temp/') ||
         uri.includes('ImagePicker/');
}

/**
 * Migrates a cached/temporary image to persistent storage if needed
 * @param uri - The current image URI
 * @returns The persistent URI (either migrated or original if already persistent)
 */
export async function migrateImageIfNeeded(uri: string): Promise<string> {
  if (!uri) return uri;
  
  // Check if it's already in persistent storage
  if (uri.startsWith(IMAGES_DIR)) {
    return uri;
  }
  
  // Check if it's a temporary URI that needs migration
  if (isTemporaryUri(uri)) {
    try {
      // Check if the temporary file still exists
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        // Migrate to persistent storage
        return await saveImagePersistently(uri);
      } else {
        // File is gone - return empty
        console.warn('Cached image no longer exists:', uri);
        return '';
      }
    } catch (error) {
      console.error('Error migrating image:', error);
      return '';
    }
  }
  
  // Return as-is for other URIs (like web URLs)
  return uri;
}

/**
 * Gets info about the images directory
 */
export async function getImagesDirectoryInfo() {
  await ensureImagesDirectory();
  const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
  
  if (dirInfo.exists && dirInfo.isDirectory) {
    const files = await FileSystem.readDirectoryAsync(IMAGES_DIR);
    let totalSize = 0;
    
    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${IMAGES_DIR}${file}`);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size;
      }
    }
    
    return {
      path: IMAGES_DIR,
      fileCount: files.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
  }
  
  return {
    path: IMAGES_DIR,
    fileCount: 0,
    totalSizeBytes: 0,
    totalSizeMB: '0'
  };
}