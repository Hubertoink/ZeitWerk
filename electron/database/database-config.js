/**
 * Datenbank-Konfiguration für benutzerdefinierten Datenbankpfad
 * Verwaltet primären und Fallback-Pfad mit automatischer Synchronisation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class DatabaseConfig {
    constructor() {
        this.userDataPath = this.getUserDataPath();
        this.configPath = path.join(this.userDataPath, 'database-config.json');
        this.defaultDbName = 'dienstplan-data.json';
        this.fallbackDbPath = path.join(this.userDataPath, this.defaultDbName);
        
        this.config = this.loadConfig();
        this.ensureDirectories();
    }

    getUserDataPath() {
        try {
            const { app } = require('electron');
            return app.getPath('userData');
        } catch (error) {
            const appName = 'ZeitWerk';
            if (process.platform === 'win32') {
                return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName);
            } else if (process.platform === 'darwin') {
                return path.join(os.homedir(), 'Library', 'Application Support', appName);
            } else {
                return path.join(os.homedir(), '.config', appName);
            }
        }
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                console.log('📂 Database config loaded:', config);
                return {
                    customPath: config.customPath || null,
                    useCustomPath: config.useCustomPath || false,
                    autoBackup: config.autoBackup !== false, // Default true
                    syncMode: config.syncMode || 'bidirectional', // 'bidirectional', 'primary-only', 'fallback-only'
                    lastSync: config.lastSync || null,
                    ...config
                };
            }
        } catch (error) {
            console.error('❌ Error loading database config:', error);
        }
        
        // Default configuration
        return {
            customPath: null,
            useCustomPath: false,
            autoBackup: true,
            syncMode: 'bidirectional',
            lastSync: null
        };
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            console.log('💾 Database config saved:', this.config);
        } catch (error) {
            console.error('❌ Error saving database config:', error);
            throw new Error(`Konfiguration konnte nicht gespeichert werden: ${error.message}`);
        }
    }

    ensureDirectories() {
        // Ensure userData directory exists
        if (!fs.existsSync(this.userDataPath)) {
            fs.mkdirSync(this.userDataPath, { recursive: true });
        }

        // Ensure custom directory exists if set
        if (this.config.useCustomPath && this.config.customPath) {
            try {
                const customDir = path.dirname(this.getCustomDbPath());
                if (!fs.existsSync(customDir)) {
                    fs.mkdirSync(customDir, { recursive: true });
                }
            } catch (error) {
                console.warn('⚠️ Could not create custom directory, falling back to default');
                this.config.useCustomPath = false;
            }
        }
    }

    getCustomDbPath() {
        if (!this.config.customPath) return null;
        return path.join(this.config.customPath, this.defaultDbName);
    }

    /**
     * Bestimmt den aktuell zu verwendenden Datenbankpfad
     * Mit automatischem Fallback bei Problemen
     */
    getCurrentDbPath() {
        if (!this.config.useCustomPath || !this.config.customPath) {
            return this.fallbackDbPath;
        }

        const customDbPath = this.getCustomDbPath();
        
        try {
            // Test if custom path is accessible
            const customDir = path.dirname(customDbPath);
            
            // Check if directory exists and is writable
            if (!fs.existsSync(customDir)) {
                console.warn('⚠️ Custom directory does not exist, creating...');
                fs.mkdirSync(customDir, { recursive: true });
            }
            
            // Test write access
            const testFile = path.join(customDir, '.zeitwerk-test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            
            console.log('✅ Using custom database path:', customDbPath);
            return customDbPath;
            
        } catch (error) {
            console.warn('⚠️ Custom path not accessible, falling back to default:', error.message);
            // Temporarily disable custom path but don't save config
            return this.fallbackDbPath;
        }
    }

    /**
     * Konfiguriert einen neuen benutzerdefinierten Datenbankpfad
     */
    async setCustomPath(newPath, copyExisting = true) {
        try {
            if (!newPath || !path.isAbsolute(newPath)) {
                throw new Error('Ungültiger Pfad: Absoluter Pfad erforderlich');
            }

            // Ensure directory exists
            if (!fs.existsSync(newPath)) {
                fs.mkdirSync(newPath, { recursive: true });
            }

            // Test write access
            const testFile = path.join(newPath, '.zeitwerk-test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);

            const newDbPath = path.join(newPath, this.defaultDbName);
            const currentDbPath = this.getCurrentDbPath();

            // Copy existing database if requested and exists
            if (copyExisting && currentDbPath && fs.existsSync(currentDbPath)) {
                console.log('📋 Copying existing database to new location...');
                await this.copyDatabase(currentDbPath, newDbPath);
                console.log('✅ Database copied successfully');
            }

            // Update configuration
            this.config.customPath = newPath;
            this.config.useCustomPath = true;
            this.config.lastSync = new Date().toISOString();
            this.saveConfig();

            // Create backup at fallback location
            if (this.config.autoBackup && newDbPath !== this.fallbackDbPath) {
                await this.createSyncBackup(newDbPath, this.fallbackDbPath);
            }

            return {
                success: true,
                newPath: newDbPath,
                message: 'Datenbankpfad erfolgreich geändert'
            };

        } catch (error) {
            console.error('❌ Error setting custom path:', error);
            throw new Error(`Pfad konnte nicht gesetzt werden: ${error.message}`);
        }
    }

    /**
     * Kehrt zum Standard-Datenbankpfad zurück
     */
    async resetToDefault(copyToDefault = true) {
        try {
            const currentDbPath = this.getCurrentDbPath();
            
            if (copyToDefault && currentDbPath && fs.existsSync(currentDbPath)) {
                console.log('📋 Copying current database to default location...');
                await this.copyDatabase(currentDbPath, this.fallbackDbPath);
            }

            this.config.customPath = null;
            this.config.useCustomPath = false;
            this.config.lastSync = new Date().toISOString();
            this.saveConfig();

            return {
                success: true,
                newPath: this.fallbackDbPath,
                message: 'Zu Standard-Datenbankpfad zurückgekehrt'
            };

        } catch (error) {
            console.error('❌ Error resetting to default:', error);
            throw new Error(`Zurücksetzen fehlgeschlagen: ${error.message}`);
        }
    }

    /**
     * Synchronisiert Datenbanken zwischen primärem und Fallback-Pfad
     */
    async syncDatabases() {
        if (!this.config.autoBackup || !this.config.useCustomPath) {
            return;
        }

        try {
            const primaryPath = this.getCustomDbPath();
            const fallbackPath = this.fallbackDbPath;

            if (!primaryPath || primaryPath === fallbackPath) {
                return;
            }

            // Determine which is newer
            const primaryExists = fs.existsSync(primaryPath);
            const fallbackExists = fs.existsSync(fallbackPath);

            if (!primaryExists && !fallbackExists) {
                return; // Nothing to sync
            }

            if (primaryExists && !fallbackExists) {
                await this.createSyncBackup(primaryPath, fallbackPath);
            } else if (!primaryExists && fallbackExists) {
                await this.createSyncBackup(fallbackPath, primaryPath);
            } else {
                // Both exist, sync newer to older
                const primaryStat = fs.statSync(primaryPath);
                const fallbackStat = fs.statSync(fallbackPath);

                if (primaryStat.mtime > fallbackStat.mtime) {
                    await this.createSyncBackup(primaryPath, fallbackPath);
                } else if (fallbackStat.mtime > primaryStat.mtime) {
                    await this.createSyncBackup(fallbackPath, primaryPath);
                }
            }

            this.config.lastSync = new Date().toISOString();
            this.saveConfig();

        } catch (error) {
            console.error('❌ Database sync failed:', error);
        }
    }

    /**
     * Kopiert eine Datenbankdatei
     */
    async copyDatabase(sourcePath, targetPath) {
        return new Promise((resolve, reject) => {
            const sourceStream = fs.createReadStream(sourcePath);
            const targetStream = fs.createWriteStream(targetPath);

            sourceStream.on('error', reject);
            targetStream.on('error', reject);
            targetStream.on('finish', resolve);

            sourceStream.pipe(targetStream);
        });
    }

    /**
     * Erstellt ein Sync-Backup (mit Timestamps)
     */
    async createSyncBackup(sourcePath, targetPath) {
        try {
            // Create backup with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = targetPath.replace('.json', `-backup-${timestamp}.json`);
            
            // If target exists, create backup first
            if (fs.existsSync(targetPath)) {
                await this.copyDatabase(targetPath, backupPath);
                console.log('📋 Created backup:', backupPath);
            }
            
            // Copy source to target
            await this.copyDatabase(sourcePath, targetPath);
            console.log('✅ Database synchronized:', sourcePath, '->', targetPath);
            
        } catch (error) {
            console.error('❌ Sync backup failed:', error);
            throw error;
        }
    }

    /**
     * Holt Statistiken über die Datenbankpfade
     */
    getPathInfo() {
        const currentPath = this.getCurrentDbPath();
        const customPath = this.getCustomDbPath();
        
        const info = {
            currentPath,
            fallbackPath: this.fallbackDbPath,
            customPath,
            useCustomPath: this.config.useCustomPath,
            autoBackup: this.config.autoBackup,
            lastSync: this.config.lastSync,
            pathExists: fs.existsSync(currentPath),
            pathSize: 0,
            fallbackExists: fs.existsSync(this.fallbackDbPath),
            fallbackSize: 0
        };

        try {
            if (info.pathExists) {
                info.pathSize = fs.statSync(currentPath).size;
            }
            if (info.fallbackExists) {
                info.fallbackSize = fs.statSync(this.fallbackDbPath).size;
            }
        } catch (error) {
            console.error('Error getting path stats:', error);
        }

        return info;
    }

    /**
     * Validiert Pfad-Zugriff
     */
    validatePath(testPath) {
        try {
            if (!testPath || !path.isAbsolute(testPath)) {
                return { valid: false, error: 'Ungültiger Pfad: Absoluter Pfad erforderlich' };
            }

            // Test directory creation
            if (!fs.existsSync(testPath)) {
                fs.mkdirSync(testPath, { recursive: true });
            }

            // Test write access
            const testFile = path.join(testPath, '.zeitwerk-test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);

            return { valid: true };

        } catch (error) {
            return { 
                valid: false, 
                error: `Pfad nicht zugänglich: ${error.message}` 
            };
        }
    }
}

module.exports = DatabaseConfig;
