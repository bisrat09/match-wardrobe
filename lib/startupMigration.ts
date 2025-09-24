import { migrateToClosyDirectory } from './imageStorage';
import { updateAllImagePaths } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MIGRATION_KEY = '@closy/migration_v1_completed';

/**
 * Runs one-time migration to new closy/ directory structure
 * This ensures images survive Expo updates
 */
export async function runStartupMigration(): Promise<void> {
  try {
    // Check if migration has already been completed
    const migrationCompleted = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrationCompleted === 'true') {
      console.log('Migration already completed, skipping');
      return;
    }

    console.log('Starting migration to closy/ directory structure...');

    // Step 1: Move images from old directory to new
    const migratedImages = await migrateToClosyDirectory();
    console.log(`Migrated ${migratedImages} images to closy/images/`);

    // Step 2: Update database paths
    const updatedRecords = await updateAllImagePaths();
    console.log(`Updated ${updatedRecords} database records with new paths`);

    // Mark migration as completed
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during startup migration:', error);
    // Don't throw - app should still start even if migration fails
  }
}