/**
 * Serverless Electron App - JSON Database Version
 * Keine nativen Module benötigt!
 */

const { app, BrowserWindow, ipcMain, Menu, Tray, dialog, shell } = require('electron');
const path = require('path');
const JsonDatabase = require('./database/json-db');

class DienstplanApp {
    constructor() {
        this.mainWindow = null;
        this.tray = null;
        this.db = null;
        this.isQuitting = false;
        
        // App Event Handlers
        app.whenReady().then(() => this.initialize());
        app.on('window-all-closed', () => this.onWindowAllClosed());
        app.on('activate', () => this.onActivate());

        // Ensure we clean up resources when quitting to avoid lingering processes
        app.on('before-quit', () => {
            try {
                this.isQuitting = true;
                if (this.tray) {
                    this.tray.destroy();
                    this.tray = null;
                }
            } catch (e) {
                console.warn('⚠️ Error during before-quit cleanup:', e.message);
            }
        });
        app.on('will-quit', () => {
            try {
                if (this.tray) {
                    this.tray.destroy();
                    this.tray = null;
                }
            } catch (e) {
                console.warn('⚠️ Error during will-quit cleanup:', e.message);
            }
        });
    }

    async initialize() {
        console.log('🚀 Starting Dienstplan OKJA App (JSON Version)...');
        
        try {
            // JSON-Datenbank initialisieren
            await this.initializeDatabase();
            
            // IPC Handlers registrieren
            this.registerIpcHandlers();
            
            // Hauptfenster erstellen
            this.createWindow();
            
            // System Tray erstellen
            this.createTray();
            
            console.log('✅ App successfully initialized');
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showErrorDialog('Initialisierung fehlgeschlagen', error.message);
        }
    }

    async initializeDatabase() {
        try {
            console.log('🔧 Initializing JSON database...');
            
            // Enable development mode reset for testing
            const isDevelopment = process.env.NODE_ENV === 'development' || 
                                  process.argv.includes('--dev') || 
                                  process.argv.includes('--reset');
            
            this.db = new JsonDatabase({ resetOnStart: isDevelopment });
            
            const stats = this.db.getStats();
            console.log('✅ JSON database initialized:', stats);
            
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            throw new Error(`Datenbank-Initialisierung fehlgeschlagen: ${error.message}`);
        }
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1000,
            minHeight: 700,
            icon: path.join(__dirname, '../frontend/public/ZeitWerk-Logo.png'),
            autoHideMenuBar: true, // Versteckt die Menüleiste (File, Edit, etc.)
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js')
            },
            show: false,
            titleBarStyle: 'default'
        });

        // Development vs Production URL
        const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
        
        if (isDev) {
            // Development: Load localhost
            this.mainWindow.loadURL('http://localhost:3000/');
            
            // Wait for page to load before opening dev tools
            this.mainWindow.webContents.once('did-finish-load', () => {
                this.mainWindow.webContents.openDevTools();
            });
        } else {
            // Production: Load built files
            const indexPath = path.join(__dirname, '../frontend/dist/index.html');
            console.log('📁 Loading production build from:', indexPath);
            this.mainWindow.loadFile(indexPath);
        }

        // Window Events
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            // Only open dev tools in development
            if (isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            console.error('❌ Page failed to load:', errorCode, errorDescription, validatedURL);
        });

        this.mainWindow.webContents.on('crashed', () => {
            console.error('💥 Renderer process crashed');
        });

        // Externe Links im Browser öffnen
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });
    }

    createTray() {
        try {
            const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
            // Wenn das Icon fehlt, Tray überspringen statt zu crashen
            try {
                this.tray = new Tray(iconPath);
            } catch (e) {
                console.warn(`⚠️ Could not create tray icon: ${e.message}. Tray will be disabled.`);
                return;
            }
            
            const contextMenu = Menu.buildFromTemplate([
                {
                    label: 'Dienstplan öffnen',
                    click: () => {
                        if (this.mainWindow) {
                            this.mainWindow.show();
                            this.mainWindow.focus();
                        } else {
                            this.createWindow();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Statistiken',
                    click: () => {
                        const stats = this.db.getStats();
                        dialog.showMessageBox(this.mainWindow, {
                            type: 'info',
                            title: 'Datenbank-Statistiken',
                            message: `Mitarbeiter: ${stats.employees}\nSchichten: ${stats.shifts}\nSchichttypen: ${stats.shiftTypes}\nDateigröße: ${stats.fileSize}`
                        });
                    }
                },
                {
                    label: 'Backup erstellen',
                    click: async () => {
                        try {
                            const backupPath = this.db.createBackup();
                            dialog.showMessageBox(this.mainWindow, {
                                type: 'info',
                                title: 'Backup erstellt',
                                message: `Backup gespeichert unter:\n${backupPath}`
                            });
                        } catch (error) {
                            this.showErrorDialog('Backup-Fehler', error.message);
                        }
                    }
                },
                {
                    label: 'Testdaten zurücksetzen',
                    click: async () => {
                        const result = await dialog.showMessageBox(this.mainWindow, {
                            type: 'warning',
                            title: 'Testdaten zurücksetzen',
                            message: 'Möchten Sie alle Daten zurücksetzen und neue Testdaten laden?\n\nAlle aktuellen Daten gehen verloren!',
                            buttons: ['Abbrechen', 'Zurücksetzen'],
                            defaultId: 0,
                            cancelId: 0
                        });
                        
                        if (result.response === 1) {
                            try {
                                this.db.reset();
                                // Refresh main window if open
                                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                                    this.mainWindow.reload();
                                }
                                dialog.showMessageBox(this.mainWindow, {
                                    type: 'info',
                                    title: 'Reset erfolgreich',
                                    message: 'Testdaten wurden erfolgreich zurückgesetzt!'
                                });
                            } catch (error) {
                                this.showErrorDialog('Reset-Fehler', error.message);
                            }
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Beenden',
                    click: () => app.quit()
                }
            ]);
            
            this.tray.setContextMenu(contextMenu);
            this.tray.setToolTip('Dienstplan OKJA App');
            
            this.tray.on('double-click', () => {
                if (this.mainWindow) {
                    this.mainWindow.show();
                    this.mainWindow.focus();
                }
            });
        } catch (error) {
            console.warn('⚠️ Could not create tray icon:', error.message);
        }
    }

    registerIpcHandlers() {
        // Authentifizierung
        ipcMain.handle('auth:login', async (event, credentials) => {
            try {
                // Einfache Demo-Authentifizierung
                const { username, password } = credentials;
                if (username === 'admin' && password === 'admin') {
                    const user = this.db.findAll('users').find(u => u.username === 'admin');
                    return {
                        success: true,
                        user: user || { id: 1, username: 'admin', role: 'ADMIN' },
                        token: 'demo-token-123'
                    };
                }
                return { success: false, message: 'Ungültige Anmeldedaten' };
            } catch (error) {
                return { success: false, message: error.message };
            }
        });

        ipcMain.handle('auth:verify', async (event, token) => {
            return { valid: token === 'demo-token-123' };
        });

        // EMPLOYEES
        ipcMain.handle('employees:getAll', async (event, organizationId) => {
            // Return ALL employees, regardless of organization
            return this.db.findAll('employees');
        });

        ipcMain.handle('employees:getById', async (event, id) => {
            return this.db.findById('employees', id);
        });

        ipcMain.handle('employees:create', async (event, employee) => {
            return this.db.create('employees', employee);
        });

        ipcMain.handle('employees:update', async (event, id, updates) => {
            return this.db.update('employees', id, updates);
        });

        ipcMain.handle('employees:delete', async (event, id) => {
            return this.db.delete('employees', id);
        });

        // SHIFTS
        ipcMain.handle('shifts:getAll', async (event, filters) => {
            if (filters && (filters.startDate || filters.endDate)) {
                return this.db.getShiftsByDateRange(
                    filters.startDate || '1900-01-01',
                    filters.endDate || '2100-12-31',
                    filters.organizationId
                );
            }
            return this.db.findAll('shifts', filters);
        });

        ipcMain.handle('shifts:getById', async (event, id) => {
            return this.db.findById('shifts', id);
        });

        ipcMain.handle('shifts:create', async (event, shift) => {
            return this.db.create('shifts', shift);
        });

        ipcMain.handle('shifts:update', async (event, id, updates) => {
            return this.db.update('shifts', id, updates);
        });

        ipcMain.handle('shifts:delete', async (event, id) => {
            return this.db.delete('shifts', id);
        });

        ipcMain.handle('shifts:getByEmployee', async (event, employeeId, startDate, endDate) => {
            return this.db.getEmployeeShifts(employeeId, startDate, endDate);
        });

        // SHIFT TYPES
        ipcMain.handle('shift-types:getAll', async (event, organizationId) => {
            return this.db.findAll('shiftTypes', organizationId ? { organizationId } : {});
        });

        ipcMain.handle('shift-types:getById', async (event, id) => {
            return this.db.findById('shiftTypes', id);
        });

        ipcMain.handle('shift-types:create', async (event, shiftType) => {
            return this.db.create('shiftTypes', shiftType);
        });

        ipcMain.handle('shift-types:update', async (event, id, updates) => {
            return this.db.update('shiftTypes', id, updates);
        });

        ipcMain.handle('shift-types:delete', async (event, id) => {
            return this.db.delete('shiftTypes', id);
        });

        // ORGANIZATIONS
        ipcMain.handle('db:getOrganizations', async () => {
            return this.db.findAll('organizations');
        });

        ipcMain.handle('db:getOrganizationById', async (event, id) => {
            return this.db.findById('organizations', id);
        });

        ipcMain.handle('db:createOrganization', async (event, organization) => {
            return this.db.create('organizations', organization);
        });

        ipcMain.handle('db:updateOrganization', async (event, id, updates) => {
            return this.db.update('organizations', id, updates);
        });

        ipcMain.handle('db:deleteOrganization', async (event, id) => {
            return this.db.delete('organizations', id);
        });

        ipcMain.handle('dialog:showConfirmation', async (event, title, message) => {
            const result = await dialog.showMessageBox(this.mainWindow, {
                type: 'question',
                buttons: ['Abbrechen', 'Bestätigen'],
                defaultId: 1,
                cancelId: 0,
                title: title,
                message: message,
            });
            // Nach dem Schliessen des Dialogs den Fokus auf das Hauptfenster wiederherstellen.
            if (this.mainWindow) {
                this.mainWindow.focus();
            }
            return result.response === 1; // true if 'Bestätigen' was clicked
        });

        // HOLIDAY MANAGEMENT IPC HANDLERS
        ipcMain.handle('holidays:getAll', async (event, filters = {}) => {
            try {
                return await this.db.getHolidays(filters);
            } catch (error) {
                console.error('❌ Error getting holidays:', error);
                throw error;
            }
        });

        ipcMain.handle('holidays:loadFromAPI', async (event, state, fromYear, toYear) => {
            try {
                // Importiere holiday-loader mit try-catch für bessere Fehlerbehandlung
                let getGermanHolidays;
                try {
                    const holidayLoader = require('./utils/holiday-loader');
                    getGermanHolidays = holidayLoader.getGermanHolidays;
                } catch (requireError) {
                    console.error('❌ Could not load holiday-loader:', requireError);
                    return {
                        success: false,
                        error: 'Holiday-Loader Modul konnte nicht geladen werden: ' + requireError.message
                    };
                }

                const holidays = [];

                for (let year = fromYear; year <= toYear; year++) {
                    console.log(`📅 Loading holidays for ${state} ${year}...`);
                    const yearHolidays = await getGermanHolidays(year, state);
                    holidays.push(...yearHolidays);
                }

                // Save to database
                await this.db.insertHolidays(holidays);
                await this.db.updateHolidayCacheInfo(state, fromYear, toYear, holidays.length);

                console.log(`✅ Successfully loaded ${holidays.length} holidays for ${state} (${fromYear}-${toYear})`);
                return {
                    success: true,
                    count: holidays.length,
                    fromYear,
                    toYear,
                    state
                };
            } catch (error) {
                console.error('❌ Error loading holidays from API:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        ipcMain.handle('holidays:getCacheInfo', async (event, state = null) => {
            try {
                if (state) {
                    return await this.db.getHolidayCacheInfo(state);
                } else {
                    return await this.db.getAllHolidayCacheInfo();
                }
            } catch (error) {
                console.error('❌ Error getting holiday cache info:', error);
                throw error;
            }
        });

        ipcMain.handle('holidays:clearCache', async (event, state = null, year = null) => {
            try {
                const result = await this.db.clearHolidayCache(state, year);
                return result;
            } catch (error) {
                console.error('❌ Error clearing holiday cache:', error);
                return { success: false, message: 'Fehler beim Löschen der Feiertage' };
            }
        });

        // Database Reset Handler
        ipcMain.handle('db:reset', async () => {
            try {
                const result = await this.db.resetToDefaults();
                return result;
            } catch (error) {
                console.error('❌ Error resetting database:', error);
                return { success: false, message: 'Fehler beim Zurücksetzen der Datenbank' };
            }
        });

        // UTILITIES
        ipcMain.handle('app:getVersion', async () => {
            return app.getVersion();
        });

        ipcMain.handle('app:showFolder', async () => {
            shell.showItemInFolder(this.db.dbPath);
        });

        ipcMain.handle('db:stats', async () => {
            return this.db.getStats();
        });

        ipcMain.handle('db:backup', async () => {
            return this.db.createBackup();
        });

        ipcMain.handle('db:importBackup', async (event) => {
            try {
                const result = await dialog.showOpenDialog(this.mainWindow, {
                    title: 'Backup-Datei auswählen',
                    filters: [
                        { name: 'JSON Backup Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ],
                    properties: ['openFile']
                });

                if (result.canceled || result.filePaths.length === 0) {
                    return { success: false, message: 'Import abgebrochen' };
                }

                const backupPath = result.filePaths[0];
                return await this.db.importBackup(backupPath);
            } catch (error) {
                console.error('IPC Error - importBackup:', error);
                throw error;
            }
        });

        ipcMain.handle('db:importBackupFromData', async (event, backupData) => {
            try {
                return await this.db.importBackupFromData(backupData);
            } catch (error) {
                console.error('IPC Error - importBackupFromData:', error);
                throw error;
            }
        });

        // Generic save dialog (referenced by renderer)
        ipcMain.handle('dialog:saveFile', async (event, options = {}) => {
            try {
                const result = await dialog.showSaveDialog(this.mainWindow, {
                    title: 'Datei speichern',
                    defaultPath: options.defaultPath || 'export.csv',
                    filters: options.filters || [
                        { name: 'Alle Dateien', extensions: ['*'] }
                    ],
                    ...options
                });
                return result; // { canceled, filePath }
            } catch (error) {
                console.error('IPC Error - dialog:saveFile', error);
                return { canceled: true, error: error.message };
            }
        });

        // File write helper (text / utf-8)
        const fs = require('fs');
        ipcMain.handle('file:write', async (event, filePath, content) => {
            if (!filePath) {
                return { success: false, message: 'Kein Dateipfad angegeben' };
            }
            try {
                fs.writeFileSync(filePath, content, 'utf8');
                return { success: true, path: filePath };
            } catch (error) {
                console.error('IPC Error - file:write', error);
                return { success: false, message: error.message };
            }
        });

        // =============================
        // DATABASE PATH MANAGEMENT
        // =============================

        // Get current database path information
        ipcMain.handle('db:getPathInfo', async () => {
            try {
                return this.db.getDatabasePathInfo();
            } catch (error) {
                console.error('IPC Error - db:getPathInfo', error);
                return { error: error.message };
            }
        });

        // Set custom database path
        ipcMain.handle('db:setCustomPath', async (event, newPath, copyExisting = true) => {
            try {
                console.log('🔧 IPC - Setting custom database path:', newPath);
                const result = await this.db.setCustomDatabasePath(newPath, copyExisting);
                console.log('✅ IPC - Custom path set:', result);
                return result;
            } catch (error) {
                console.error('❌ IPC Error - db:setCustomPath', error);
                return { success: false, error: error.message };
            }
        });

        // Reset to default database path
        ipcMain.handle('db:resetPath', async (event, copyToDefault = true) => {
            try {
                console.log('🔧 IPC - Resetting database path to default');
                const result = await this.db.resetDatabasePath(copyToDefault);
                console.log('✅ IPC - Path reset:', result);
                return result;
            } catch (error) {
                console.error('❌ IPC Error - db:resetPath', error);
                return { success: false, error: error.message };
            }
        });

        // Validate database path
        ipcMain.handle('db:validatePath', async (event, testPath) => {
            try {
                return this.db.validateDatabasePath(testPath);
            } catch (error) {
                console.error('IPC Error - db:validatePath', error);
                return { valid: false, error: error.message };
            }
        });

        // Sync databases between primary and fallback
        ipcMain.handle('db:sync', async () => {
            try {
                console.log('🔄 IPC - Syncing databases');
                const result = await this.db.syncDatabases();
                console.log('✅ IPC - Sync completed:', result);
                return result;
            } catch (error) {
                console.error('❌ IPC Error - db:sync', error);
                return { success: false, error: error.message };
            }
        });

        // Show directory picker for database location
        ipcMain.handle('dialog:openDirectory', async () => {
            try {
                const result = await dialog.showOpenDialog(this.mainWindow, {
                    title: 'Datenbankordner auswählen',
                    defaultPath: require('os').homedir(),
                    properties: ['openDirectory', 'createDirectory'],
                    buttonLabel: 'Ordner auswählen'
                });
                
                if (result.canceled) {
                    return { canceled: true };
                }
                
                return { 
                    canceled: false, 
                    path: result.filePaths[0] 
                };
                
            } catch (error) {
                console.error('IPC Error - dialog:openDirectory', error);
                return { canceled: true, error: error.message };
            }
        });

        console.log('📡 IPC handlers registered');
    }

    onWindowAllClosed() {
        if (process.platform !== 'darwin') {
            // Destroy tray explicitly before quitting to prevent process from lingering on Windows
            try {
                if (this.tray) {
                    this.tray.destroy();
                    this.tray = null;
                }
            } catch (e) {
                console.warn('⚠️ Error destroying tray on window-all-closed:', e.message);
            }
            app.quit();
            // Fallback: force exit after a short delay if something keeps the loop alive
            setTimeout(() => {
                if (!this.isQuitting) return;
                try {
                    app.exit(0);
                } catch {}
            }, 1000);
        }
    }

    onActivate() {
        if (BrowserWindow.getAllWindows().length === 0) {
            this.createWindow();
        }
    }

    showErrorDialog(title, message) {
        dialog.showErrorBox(title, message);
    }
}

// App starten
new DienstplanApp();
