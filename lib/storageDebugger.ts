import * as FileSystem from 'expo-file-system/legacy';
import { getAllGarments } from './db';

export interface StorageLocation {
  path: string;
  exists: boolean;
  fileCount: number;
  totalSizeMB: number;
  files: string[];
  isDirectory: boolean;
}

export interface StorageReport {
  environment: 'development' | 'production' | 'unknown';
  documentDirectory: string;
  cacheDirectory: string;
  garmentCount: number;
  sampleGarmentPaths: string[];
  storageLocations: StorageLocation[];
  summary: string;
}

/**
 * Comprehensive storage debugging - shows exactly where data is stored
 */
export async function generateStorageReport(): Promise<StorageReport> {
  console.log('🔍 Starting comprehensive storage analysis...');

  // Determine environment
  const isProduction = !__DEV__;
  const environment = isProduction ? 'production' : 'development';

  // Get all possible storage locations
  const possiblePaths = [
    // Document directory variations
    `${FileSystem.documentDirectory}closy/`,
    `${FileSystem.documentDirectory}closy/images/`,
    `${FileSystem.documentDirectory}garment_images/`,
    `${FileSystem.documentDirectory}images/`,
    `${FileSystem.documentDirectory}SQLite/`,

    // Cache directory variations (if available)
    ...(FileSystem.cacheDirectory ? [
      `${FileSystem.cacheDirectory}ImagePicker/`,
      `${FileSystem.cacheDirectory}Camera/`,
      `${FileSystem.cacheDirectory}ImageManipulator/`,
      `${FileSystem.cacheDirectory}SQLite/`,
      FileSystem.cacheDirectory,
    ] : []),

    // Root directories
    FileSystem.documentDirectory,
  ].filter(Boolean);

  const storageLocations: StorageLocation[] = [];

  // Analyze each location
  for (const path of possiblePaths) {
    if (!path) continue; // Skip empty paths
    try {
      const info = await FileSystem.getInfoAsync(path);

      if (info.exists) {
        let files: string[] = [];
        let fileCount = 0;
        let totalSize = 0;

        if (info.isDirectory) {
          try {
            files = await FileSystem.readDirectoryAsync(path);
            fileCount = files.length;

            // Calculate total size for first 10 files (to avoid timeout)
            for (const file of files.slice(0, 10)) {
              try {
                const fileInfo = await FileSystem.getInfoAsync(path + file);
                if (fileInfo.exists && !fileInfo.isDirectory) {
                  totalSize += fileInfo.size || 0;
                }
              } catch (e) {
                // Skip files we can't access
              }
            }
          } catch (e) {
            console.log(`⚠️ Could not read directory: ${path}`);
          }
        } else {
          // Single file
          totalSize = info.size || 0;
          fileCount = 1;
        }

        storageLocations.push({
          path: shortenPath(path || ''),
          exists: true,
          fileCount,
          totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
          files: files.slice(0, 5), // Show first 5 files
          isDirectory: info.isDirectory
        });
      }
    } catch (error) {
      // Path doesn't exist or can't be accessed
      storageLocations.push({
        path: shortenPath(path || ''),
        exists: false,
        fileCount: 0,
        totalSizeMB: 0,
        files: [],
        isDirectory: false
      });
    }
  }

  // Get database info
  const garments = await getAllGarments();
  const sampleGarmentPaths = garments.slice(0, 3).map(g => shortenPath(g.imageUri));

  // Generate summary
  const existingLocations = storageLocations.filter(l => l.exists && l.fileCount > 0);
  const totalFiles = existingLocations.reduce((sum, l) => sum + l.fileCount, 0);
  const totalSize = existingLocations.reduce((sum, l) => sum + l.totalSizeMB, 0);

  const summary = `Environment: ${environment.toUpperCase()}\n` +
    `Database: ${garments.length} garments\n` +
    `Storage: ${existingLocations.length} active locations\n` +
    `Files: ${totalFiles} total (~${totalSize.toFixed(1)} MB)`;

  return {
    environment,
    documentDirectory: FileSystem.documentDirectory || '',
    cacheDirectory: FileSystem.cacheDirectory || '',
    garmentCount: garments.length,
    sampleGarmentPaths,
    storageLocations,
    summary
  };
}

/**
 * Shorten file paths for display
 */
function shortenPath(fullPath: string): string {
  if (!fullPath) return '';

  // Replace long UUIDs and paths with shorter versions
  const parts = fullPath.split('/');

  // Keep last 3-4 meaningful parts
  if (parts.length > 4) {
    const important = parts.slice(-3);
    return '.../' + important.join('/');
  }

  return fullPath;
}

/**
 * Format storage report for display
 */
export function formatStorageReport(report: StorageReport): string {
  let output = `📊 STORAGE ANALYSIS REPORT\n\n`;
  output += `${report.summary}\n\n`;

  output += `📍 BASE DIRECTORIES:\n`;
  output += `• Documents: ${shortenPath(report.documentDirectory)}\n`;
  output += `• Cache: ${report.cacheDirectory ? shortenPath(report.cacheDirectory) : 'Not available'}\n\n`;

  if (report.sampleGarmentPaths.length > 0) {
    output += `🗂️ SAMPLE GARMENT PATHS:\n`;
    report.sampleGarmentPaths.forEach((path, i) => {
      output += `${i + 1}. ${path}\n`;
    });
    output += '\n';
  }

  output += `📁 STORAGE LOCATIONS:\n`;

  const existingLocations = report.storageLocations.filter(l => l.exists);
  const emptyLocations = report.storageLocations.filter(l => !l.exists);

  if (existingLocations.length > 0) {
    output += `\n✅ FOUND DATA:\n`;
    existingLocations.forEach(loc => {
      output += `• ${loc.path}\n`;
      output += `  Files: ${loc.fileCount}, Size: ${loc.totalSizeMB} MB\n`;
      if (loc.files.length > 0) {
        output += `  Sample: ${loc.files.slice(0, 2).join(', ')}\n`;
      }
    });
  }

  if (emptyLocations.length > 0) {
    output += `\n❌ EMPTY/MISSING:\n`;
    emptyLocations.forEach(loc => {
      output += `• ${loc.path}\n`;
    });
  }

  return output;
}