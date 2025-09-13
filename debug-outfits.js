// Debug script to check outfit suggestions
const { openDatabaseSync } = require('expo-sqlite');

const db = openDatabaseSync('closet.db');

// Get all garments
console.log('=== ALL GARMENTS ===');
const allGarments = db.getAllSync('SELECT id, type, name, colors FROM garments ORDER BY type');
allGarments.forEach(g => {
  const colors = JSON.parse(g.colors || '[]');
  console.log(`${g.type.padEnd(10)} | ${(g.name || 'unnamed').padEnd(20)} | ${colors.join(', ')}`);
});

// Check for red items specifically
console.log('\n=== RED ITEMS ===');
const redItems = allGarments.filter(g => {
  const colors = JSON.parse(g.colors || '[]');
  return colors.some(c => c.toLowerCase().includes('red') || c.toLowerCase().includes('burgundy') || c.toLowerCase().includes('maroon'));
});

redItems.forEach(g => {
  const colors = JSON.parse(g.colors || '[]');
  console.log(`Type: ${g.type} | Name: ${g.name || 'unnamed'} | Colors: ${colors.join(', ')} | ID: ${g.id}`);
});

// Check dress codes for red items
console.log('\n=== RED ITEMS WITH DRESS CODES ===');
const redWithDressCodes = db.getAllSync(
  'SELECT id, type, name, colors, dressCodes FROM garments WHERE id IN (' + 
  redItems.map(() => '?').join(',') + ')',
  ...redItems.map(g => g.id)
);

redWithDressCodes.forEach(g => {
  const colors = JSON.parse(g.colors || '[]');
  const dressCodes = JSON.parse(g.dressCodes || '[]');
  console.log(`Type: ${g.type} | Name: ${g.name || 'unnamed'} | Colors: ${colors.join(', ')} | Dress Codes: ${dressCodes.join(', ')}`);
});