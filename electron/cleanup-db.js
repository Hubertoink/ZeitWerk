const JsonDatabase = require('./database/json-db');

async function cleanup() {
  console.log('🧹 Starting database cleanup...');
  try {
    // The JsonDatabase class now handles the environment check internally
    const db = new JsonDatabase({ resetOnStart: false });
    
    console.log('🗑️ Clearing all holidays from the database...');
    const deletedCount = await db.clearHolidays();
    console.log(`✅ Successfully deleted ${deletedCount} holiday entries.`);

  } catch (error) {
    console.error('❌ An error occurred during database cleanup:', error);
    process.exit(1); // Exit with an error code
  }
}

cleanup();
