const fs = require('fs');
const path = require('path');

console.log('🧹 ZeitWerk Cleanup: Entferne nicht mehr benötigte Dateien...\n');

// Liste der zu entfernenden Dateien und Ordner
const filesToRemove = [
  // Backend komplett
  'backend/',
  
  // Electron SQLite-spezifische Dateien
  'electron/database/sqlite-manager.js',
  'electron/database/schema.sql', 
  'electron/database/seed-data.js',
  
  // Leere/Unused Electron-Dateien
  'electron/main-serverless.js',
  'electron/preload-serverless.js',
  
  // Frontend Debug/Test-Dateien
  'frontend/src/debug-api-test.ts',
  'frontend/src/components/ApiTest.tsx',
  'frontend/src/components/ApiServiceTest.tsx',
  'frontend/src/components/ElectronTest.tsx',
  'frontend/src/App-simple.tsx',
  
  // Veraltete Frontend-Dateien
  'frontend/src/utils/holidays-old.ts',
  'frontend/src/utils/holidays-new.ts',
  'frontend/src/store/slices/shiftTypeSlice-new.ts',
  'frontend/src/store/slices/shiftTypeSlice-fixed.ts',
  
  // Root-Level Entwicklungsdateien
  'handleCopyWeek-fix.ts',
  'fix-weekview.js',
  'electron-builder-json.js',
  'test-backup.json',
  'check-localstorage.html',
  
  // Dokumentations-Duplikate
  'CLEANUP-ANALYSE.md',
  'COMPLETE-INSTALLER-GUIDE.md',
  'DISTRIBUTION-ANLEITUNG.md', 
  'DISTRIBUTION-READY.md',
  'ZEITWERK-DISTRIBUTION.md',
  'INSTALLATION-ANLEITUNG.md'
];

let deletedCount = 0;
let errorCount = 0;

function deleteFileOrDir(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ Ordner entfernt: ${filePath}`);
      } else {
        fs.unlinkSync(fullPath);
        console.log(`✅ Datei entfernt: ${filePath}`);
      }
      deletedCount++;
    } else {
      console.log(`ℹ️  Nicht gefunden (bereits entfernt?): ${filePath}`);
    }
  } catch (error) {
    console.log(`❌ Fehler beim Entfernen von ${filePath}:`, error.message);
    errorCount++;
  }
}

// Dateien/Ordner entfernen
filesToRemove.forEach(deleteFileOrDir);

console.log(`\n🎉 Cleanup abgeschlossen!`);
console.log(`✅ ${deletedCount} Dateien/Ordner entfernt`);
if (errorCount > 0) {
  console.log(`❌ ${errorCount} Fehler aufgetreten`);
}
console.log('\n📝 Nächste Schritte:');
console.log('1. Prisma-Dependencies aus package.json entfernen');
console.log('2. npm install ausführen');
console.log('3. Build testen');
