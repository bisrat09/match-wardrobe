// Emergency Data Recovery Script
// Run this in the project directory with: node recovery-script.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Emergency Data Recovery Script');
console.log('================================');

// Check if we can find the database file
const possibleDbPaths = [
  'ExpoSQLiteDB/closet.db',
  '.expo/data/closet.db',
  'closet.db'
];

console.log('Looking for database file...');
for (const dbPath of possibleDbPaths) {
  if (fs.existsSync(dbPath)) {
    console.log(`✅ Found database at: ${dbPath}`);
  } else {
    console.log(`❌ Not found: ${dbPath}`);
  }
}

// Check for image files
const imagePaths = [
  'Documents/garment_images',
  '.expo/data/garment_images',
  'garment_images'
];

console.log('\nLooking for image files...');
for (const imgPath of imagePaths) {
  if (fs.existsSync(imgPath)) {
    const files = fs.readdirSync(imgPath);
    console.log(`✅ Found ${files.length} images at: ${imgPath}`);
    console.log(`Sample files: ${files.slice(0, 3).join(', ')}...`);
  } else {
    console.log(`❌ Not found: ${imgPath}`);
  }
}

console.log('\n🚨 Hot reload is not working properly.');
console.log('📱 Please try these steps in your simulator:');
console.log('1. Shake device (Cmd+Ctrl+Z on iOS Simulator)');
console.log('2. Tap "Reload" from developer menu');
console.log('3. Go back to Settings and try the "🔧 Fix Broken Images" button again');
console.log('\nOr force restart the app completely.');