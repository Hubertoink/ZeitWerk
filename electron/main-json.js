/**
 * Serverless Electron App - JSON Database Version
 * Keine nativen Module benötigt!
 */

const { app, BrowserWindow, ipcMain, Menu, Tray, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const JsonDatabase = require('./database/json-db');
const holidayUtil = require('./utils/holiday-loader');
const DatabaseConfig = require('./database/database-config');

// Note: Low-GPU mode is handled in renderer theme (reducing visual effects)

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
    app.on('before-quit', () => this.onBeforeQuit());
    app.on('quit', () => this.onQuit());
    }

    async initialize() {
        console.log('🚀 Starting Dienstplan OKJA App (JSON Version)...');
        
        try {
            // JSON-Datenbank initialisieren
            await this.initializeDatabase();
            // Database path manager
            this.dbConfig = new DatabaseConfig();
            
            // IPC Handlers registrieren
            this.registerIpcHandlers();
            this.registerDatabasePathIpc();
            this.registerHolidayIpcHandlers();
            
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
            icon: path.join(__dirname, 'assets', 'icon.png'),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                // Preload bridges IPC-backed API for serverless JSON mode
                preload: path.join(__dirname, 'preload-serverless.js')
            },
            show: false,
            titleBarStyle: 'default',
            autoHideMenuBar: true
        });

        // Development vs Production URL
        const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
        if (isDev) {
            // Load localhost with explicit base path
            this.mainWindow.loadURL('http://localhost:3000/');
            
            // Wait for page to load before opening dev tools
            this.mainWindow.webContents.once('did-finish-load', () => {
                this.mainWindow.webContents.openDevTools();
            });
        } else {
            this.mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
            // Remove menu bar entirely in production
            try {
                Menu.setApplicationMenu(null);
                this.mainWindow.setMenuBarVisibility(false);
            } catch (_) { /* ignore */ }
        }

        // Window Events
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            if (isDev) {
                // Open dev tools only in development
                this.mainWindow.webContents.openDevTools();
            }
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Debug: Log all page events
        this.mainWindow.webContents.on('did-start-loading', () => {
            console.log('🔄 Page started loading...');
        });

        this.mainWindow.webContents.on('did-finish-load', () => {
            console.log('✅ Page finished loading');
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
            this.tray = new Tray(iconPath);
            
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
        // App controls
        ipcMain.handle('app:close', async () => {
            this.isQuitting = true;
            app.quit();
            return true;
        });
        ipcMain.handle('app:minimize', async () => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.minimize();
                return true;
            }
            return false;
        });
        ipcMain.handle('app:maximize', async () => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                if (this.mainWindow.isMaximized()) this.mainWindow.unmaximize(); else this.mainWindow.maximize();
                return true;
            }
            return false;
        });
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

        ipcMain.handle('db:reset', async () => {
            this.db.reset();
            return { success: true };
        });

    // File dialogs and writing for exports
        ipcMain.handle('dialog:saveFile', async (event, options = {}) => {
            try {
                const result = await dialog.showSaveDialog(this.mainWindow, {
                    title: options.title || 'Datei speichern',
                    defaultPath: options.defaultPath || 'export.xls',
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

    const fsp = fs.promises;
        ipcMain.handle('fs:writeFile', async (event, filePath, content, options = {}) => {
            try {
                if (!filePath) throw new Error('filePath is required');
                const encoding = options.base64 ? 'base64' : (options.encoding || 'utf8');
                await fsp.writeFile(filePath, content, { encoding });
                return { success: true };
            } catch (error) {
                console.error('IPC Error - fs:writeFile', error);
                return { success: false, message: error.message };
            }
        });

        // Read file and return a data URL (async)
        const extToMime = (ext) => {
            switch ((ext || '').toLowerCase()) {
                case '.png': return 'image/png';
                case '.jpg':
                case '.jpeg': return 'image/jpeg';
                case '.gif': return 'image/gif';
                case '.webp': return 'image/webp';
                default: return 'application/octet-stream';
            }
        };

        ipcMain.handle('fs:readFileAsDataUrl', async (_event, absolutePath) => {
            try {
                if (!absolutePath) return { success: false, dataUrl: '' };
                const abs = path.isAbsolute(absolutePath) ? absolutePath : path.resolve(absolutePath);
                const buf = await fs.promises.readFile(abs);
                const mime = extToMime(path.extname(abs));
                const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
                return { success: true, dataUrl };
            } catch (e) {
                return { success: false, dataUrl: '' };
            }
        });

        // Read file and return a data URL (sync) for simple avatar src usage
        ipcMain.on('fs:readFileAsDataUrlSync', (event, absolutePath) => {
            try {
                if (!absolutePath) { event.returnValue = ''; return; }
                const abs = path.isAbsolute(absolutePath) ? absolutePath : path.resolve(absolutePath);
                const buf = fs.readFileSync(abs);
                const mime = extToMime(path.extname(abs));
                const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
                event.returnValue = dataUrl;
            } catch (e) {
                event.returnValue = '';
            }
        });

        // Photos: import and store in app userData/photos
        ipcMain.handle('photos:import', async () => {
            try {
                const result = await dialog.showOpenDialog(this.mainWindow, {
                    title: 'Mitarbeiterfoto auswählen',
                    properties: ['openFile'],
                    filters: [
                        { name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
                        { name: 'Alle Dateien', extensions: ['*'] }
                    ]
                });
                if (result.canceled || result.filePaths.length === 0) {
                    return { success: false, message: 'Auswahl abgebrochen' };
                }
                const sourcePath = result.filePaths[0];
                const photosDir = path.join(app.getPath('userData'), 'photos');
                await fs.promises.mkdir(photosDir, { recursive: true });
                const ext = path.extname(sourcePath).toLowerCase();
                const base = path.basename(sourcePath, ext).replace(/[^a-zA-Z0-9_-]+/g, '_');
                const ts = Date.now();
                const targetName = `${base}_${ts}${ext || '.png'}`;
                const targetPath = path.join(photosDir, targetName);
                await fs.promises.copyFile(sourcePath, targetPath);
                const fileUrl = pathToFileURL(targetPath).toString();
                return { success: true, path: targetPath, fileUrl, filename: targetName };
            } catch (error) {
                console.error('IPC Error - photos:import', error);
                return { success: false, message: error.message };
            }
        });

        // App settings persistence (for settings needed by main process)
        const getAppSettingsPath = () => path.join(app.getPath('userData'), 'app-settings.json');
        const readAppSettings = async () => {
            try {
                const p = getAppSettingsPath();
                if (!fs.existsSync(p)) return {};
                const raw = await fsp.readFile(p, 'utf8');
                return JSON.parse(raw || '{}');
            } catch (e) {
                console.warn('⚠️ readAppSettings failed:', e.message);
                return {};
            }
        };
        const writeAppSettings = async (data) => {
            try {
                const p = getAppSettingsPath();
                await fsp.mkdir(path.dirname(p), { recursive: true });
                await fsp.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
                return { success: true };
            } catch (e) {
                console.error('❌ writeAppSettings failed:', e);
                return { success: false, message: e.message };
            }
        };

        ipcMain.handle('appSettings:get', async () => {
            return await readAppSettings();
        });

        ipcMain.handle('appSettings:set', async (event, patch = {}) => {
            const current = await readAppSettings();
            // Shallow merge top-level and UI sub-tree to avoid wiping other categories
            const next = {
                ...current,
                ...patch,
                ui: { ...(current.ui || {}), ...(patch.ui || {}) }
            };
            const res = await writeAppSettings(next);
            return res.success ? next : { ...next, error: res.message };
        });

        ipcMain.handle('app:relaunch', async () => {
            try {
                // Ensure windows are closed to avoid lingering state
                const wins = BrowserWindow.getAllWindows();
                wins.forEach(w => {
                    try { w.removeAllListeners(); } catch (_) {}
                    try { w.destroy(); } catch (_) {}
                });

                // Relaunch with current working directory and args (robust on Windows)
                const execPath = process.execPath;
                const args = process.argv.slice(1).filter(a => a !== '--relaunch');
                app.relaunch({ execPath, args: args.concat(['--relaunch']) });

                // Use quit() instead of exit() to allow Electron to shutdown cleanly
                app.quit();
                return { success: true };
            } catch (e) {
                return { success: false, message: e.message };
            }
        });

        console.log('📡 IPC handlers registered');
    }

    registerDatabasePathIpc() {
        // Directory dialog helper
        ipcMain.handle('dialog:selectDirectory', async () => {
            try {
                const result = await dialog.showOpenDialog(this.mainWindow, {
                    properties: ['openDirectory']
                });
                if (result.canceled) return { canceled: true };
                return { canceled: false, path: result.filePaths[0] };
            } catch (e) {
                return { canceled: true, error: e.message };
            }
        });

        // Path info
        ipcMain.handle('dbPath:getInfo', async () => {
            try {
                const info = this.dbConfig.getPathInfo();
                // Enrich with DB stats
                const stats = this.db.getStats();
                return { ...info, stats };
            } catch (e) {
                console.error('dbPath:getInfo failed', e);
                throw e;
            }
        });

        // Validate path
        ipcMain.handle('dbPath:validate', async (event, testPath) => {
            return this.dbConfig.validatePath(testPath);
        });

        // Set custom path
        ipcMain.handle('dbPath:setCustom', async (event, newPath, copyExisting = true) => {
            try {
                const res = await this.dbConfig.setCustomPath(newPath, copyExisting);
                return res;
            } catch (e) {
                return { success: false, error: e.message };
            }
        });

        // Reset to default
        ipcMain.handle('dbPath:reset', async (event, copyToDefault = true) => {
            try {
                const res = await this.dbConfig.resetToDefault(copyToDefault);
                return res;
            } catch (e) {
                return { success: false, error: e.message };
            }
        });

        // Sync databases
        ipcMain.handle('dbPath:sync', async () => {
            try {
                await this.dbConfig.syncDatabases();
                return { success: true, message: 'Synchronisation abgeschlossen' };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });
    }
    
    // Insert after registering existing handlers
    // Add holidays IPC handlers (basic, serverless)
    registerHolidayIpcHandlers() {
        // Basic holiday provider using fallback calculation to avoid renderer warnings
        ipcMain.handle('holidays:get', async (event, filters = {}) => {
            try {
                const { startDate, endDate, state } = filters || {};
                const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
                const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), 11, 31);
                const startYear = start.getFullYear();
                const endYear = end.getFullYear();
                let all = [];
                for (let y = startYear; y <= endYear; y++) {
                    const yearHolidays = holidayUtil.getBasicGermanHolidays(y);
                    all = all.concat(yearHolidays);
                }
                const filtered = all.filter(h => {
                    const d = new Date(h.date);
                    return d >= start && d <= end;
                }).map(h => ({ ...h, state: state || h.state }));
                return filtered;
            } catch (e) {
                console.warn('⚠️ holidays:get failed in main process:', e.message);
                return [];
            }
        });
    }

    onWindowAllClosed() {
        if (process.platform !== 'darwin') {
            app.quit();
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

    onBeforeQuit() {
        this.isQuitting = true;
        try {
            if (this.tray) {
                this.tray.destroy();
                this.tray = null;
            }
        } catch (e) {
            // ignore
        }
    }

    onQuit() {
        // Fallback to ensure process exits if any dangling handles exist
        if (process.platform === 'win32') {
            setTimeout(() => {
                if (!app.isReady()) return; // already exiting
                try { process.exit(0); } catch (_) {}
            }, 100);
        }
    }
}

// App starten
new DienstplanApp();
