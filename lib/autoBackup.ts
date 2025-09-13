import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportGarments, importGarments } from './db';
import { getImagesDirectoryInfo } from './imageStorage';

// Backup directory in documents (persists across updates)
const BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;
const LAST_BACKUP_KEY = '@closy_last_backup';
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_BACKUPS = 7; // Keep last 7 days

/**
 * Ensures backup directory exists
 */
async function ensureBackupDirectory() {
  const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
}

/**
 * Creates an automatic backup
 */
export async function createAutoBackup(): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    await ensureBackupDirectory();
    
    // Export garment data
    const jsonData = await exportGarments();
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `auto-backup-${timestamp}.json`;
    const backupPath = `${BACKUP_DIR}${filename}`;
    
    // Write backup file
    await FileSystem.writeAsStringAsync(backupPath, jsonData);
    
    // Update last backup time
    await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    
    // Clean old backups
    await cleanOldBackups();
    
    console.log(`✅ Auto-backup created: ${filename}`);
    return { success: true, path: backupPath };
  } catch (error) {
    console.error('Auto-backup failed:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Removes backups older than MAX_BACKUPS days
 */
async function cleanOldBackups() {
  try {
    const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
    
    // Sort files by date (newest first)
    const backupFiles = files
      .filter(f => f.startsWith('auto-backup-'))
      .sort()
      .reverse();
    
    // Delete old backups
    if (backupFiles.length > MAX_BACKUPS) {
      const toDelete = backupFiles.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        await FileSystem.deleteAsync(`${BACKUP_DIR}${file}`, { idempotent: true });
        console.log(`🗑️ Deleted old backup: ${file}`);
      }
    }
  } catch (error) {
    console.error('Failed to clean old backups:', error);
  }
}

/**
 * Checks if backup is needed and creates one if necessary
 */
export async function checkAndCreateBackup(): Promise<boolean> {
  try {
    const lastBackup = await AsyncStorage.getItem(LAST_BACKUP_KEY);
    
    if (!lastBackup) {
      // No backup exists, create one
      console.log('📦 No backup found, creating first backup...');
      const result = await createAutoBackup();
      return result.success;
    }
    
    const lastBackupTime = new Date(lastBackup).getTime();
    const now = Date.now();
    
    if (now - lastBackupTime > BACKUP_INTERVAL) {
      // Time for a new backup
      console.log('📦 Creating daily backup...');
      const result = await createAutoBackup();
      return result.success;
    }
    
    return true; // Backup is recent enough
  } catch (error) {
    console.error('Backup check failed:', error);
    return false;
  }
}

/**
 * Gets the most recent backup
 */
export async function getLatestBackup(): Promise<{ path: string; date: string } | null> {
  try {
    await ensureBackupDirectory();
    const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
    
    const backupFiles = files
      .filter(f => f.startsWith('auto-backup-'))
      .sort()
      .reverse();
    
    if (backupFiles.length === 0) {
      return null;
    }
    
    const latest = backupFiles[0];
    const date = latest.replace('auto-backup-', '').replace('.json', '');
    
    return {
      path: `${BACKUP_DIR}${latest}`,
      date
    };
  } catch (error) {
    console.error('Failed to get latest backup:', error);
    return null;
  }
}

/**
 * Restores from the most recent backup
 */
export async function restoreFromLatestBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const latest = await getLatestBackup();
    
    if (!latest) {
      return { success: false, message: 'No backup found' };
    }
    
    const backupData = await FileSystem.readAsStringAsync(latest.path);
    const result = await importGarments(backupData);
    
    return {
      success: true,
      message: `Restored from ${latest.date}: ${result.imported} items`
    };
  } catch (error) {
    console.error('Restore failed:', error);
    return { success: false, message: String(error) };
  }
}

/**
 * Gets backup status information
 */
export async function getBackupStatus(): Promise<{
  hasBackup: boolean;
  lastBackupDate?: string;
  backupCount: number;
  totalSize: number;
}> {
  try {
    await ensureBackupDirectory();
    
    const lastBackup = await AsyncStorage.getItem(LAST_BACKUP_KEY);
    const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
    const backupFiles = files.filter(f => f.startsWith('auto-backup-'));
    
    let totalSize = 0;
    for (const file of backupFiles) {
      const info = await FileSystem.getInfoAsync(`${BACKUP_DIR}${file}`);
      if (info.exists && 'size' in info) {
        totalSize += info.size;
      }
    }
    
    return {
      hasBackup: backupFiles.length > 0,
      lastBackupDate: lastBackup || undefined,
      backupCount: backupFiles.length,
      totalSize
    };
  } catch (error) {
    console.error('Failed to get backup status:', error);
    return {
      hasBackup: false,
      backupCount: 0,
      totalSize: 0
    };
  }
}