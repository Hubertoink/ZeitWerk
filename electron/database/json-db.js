/**
 * JSON-basierte Datenbank für Serverless Electron App
 * Keine native Module benötigt - funktioniert überall!
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const DatabaseConfig = require('./database-config');

// Function to get the user data path
function getUserDataPath() {
    try {
        // Try to get from Electron
        const { app } = require('electron');
        return app.getPath('userData');
    } catch (error) {
        // Running in Node.js, not Electron - create platform-specific path
        console.log('Running in Node.js environment. Using platform-specific user data path.');
        
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

class JsonDatabase {
    constructor(options = {}) {
        // Initialize database configuration manager
        this.dbConfig = new DatabaseConfig();
        
        // Get the correct database path (custom or fallback)
        this.dbPath = this.dbConfig.getCurrentDbPath();
        console.log(`📂 Database path: ${this.dbPath}`);
        
        // Ensure the directory exists
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`📂 Created database directory: ${dbDir}`);
        }
        
        this.options = {
            resetOnStart: process.env.NODE_ENV === 'development' || options.resetOnStart || false,
            ...options
        };
        this.data = {
            employees: [],
            shifts: [],
            shiftTypes: [],
            organizations: [],
            users: [],
            holidays: [],
            holidayCacheInfo: []
        };
        
        if (this.options.resetOnStart) {
            console.log('🔄 Development mode: Resetting data on startup');
            this.reset();
        } else {
            this.load();
            this.seedInitialData();
        }

        // Perform database synchronization if enabled
        this.dbConfig.syncDatabases().catch(error => {
            console.warn('⚠️ Database sync warning:', error.message);
        });
    }

    // Daten laden
    load() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const fileContent = fs.readFileSync(this.dbPath, 'utf8');
                const loadedData = JSON.parse(fileContent);
                
                // Ensure all required arrays exist for backward compatibility
                this.data = {
                    employees: loadedData.employees || [],
                    shifts: loadedData.shifts || [],
                    shiftTypes: loadedData.shiftTypes || [],
                    organizations: loadedData.organizations || [],
                    users: loadedData.users || [],
                    holidays: loadedData.holidays || [],
                    holidayCacheInfo: loadedData.holidayCacheInfo || []
                };
                
                // Migration: Stelle sicher, dass alle Organisationen openingHours haben
                this.migrateOrganizationsOpeningHours();
                // Migration: Abwesenheiten sind ganztägig und zählen nicht zur Arbeitszeit
                this.migrateAbsenceShiftTypesFlags();
                
                console.log('📂 JSON-Datenbank geladen:', this.dbPath);
            } else {
                console.log('📂 Neue JSON-Datenbank erstellt:', this.dbPath);
                this.save();
            }
        } catch (error) {
            console.error('❌ Fehler beim Laden der Datenbank:', error);
            // Bei Fehler zurück zu leerer Datenbank
            this.data = {
                employees: [],
                shifts: [],
                shiftTypes: [],
                organizations: [],
                users: [],
                holidays: [],
                holidayCacheInfo: []
            };
        }
    }

    // Migration für bestehende Organisationen ohne openingHours
    migrateOrganizationsOpeningHours() {
        let migrationNeeded = false;
        
        this.data.organizations = this.data.organizations.map(org => {
            if (!org.openingHours) {
                console.log(`🔄 Migration: Füge openingHours zu Organisation "${org.name}" hinzu`);
                migrationNeeded = true;
                return {
                    ...org,
                    openingHours: {
                        monday: { open: "14:00", close: "20:00", closed: false },
                        tuesday: { open: "14:00", close: "20:00", closed: false },
                        wednesday: { open: "14:00", close: "20:00", closed: false },
                        thursday: { open: "14:00", close: "20:00", closed: false },
                        friday: { open: "14:00", close: "22:00", closed: false },
                        saturday: { closed: true },
                        sunday: { closed: true }
                    }
                };
            }
            return org;
        });
        
        if (migrationNeeded) {
            console.log('💾 Speichere migrierte Organisationen...');
            this.save();
        }
    }

    // Migration: ensure absence types are all-day and non-counting
    migrateAbsenceShiftTypesFlags() {
        let changed = false;
        this.data.shiftTypes = (this.data.shiftTypes || []).map(st => {
            if (st && st.category === 'absence') {
                const next = {
                    ...st,
                    isAllDay: st.isAllDay !== undefined ? st.isAllDay : true,
                    countsTowardHours: st.countsTowardHours !== undefined ? st.countsTowardHours : false,
                    startTime: st.startTime || '00:00',
                    endTime: st.endTime || '23:59'
                };
                if (next !== st) changed = true;
                return next;
            }
            return st;
        });
        if (changed) {
            console.log('🔄 Migration: Abwesenheits-Schichttypen auf ganztägig/nicht-zählend aktualisiert');
            this.save();
        }
    }

    // Daten speichern
    save() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
            console.log('💾 Datenbank gespeichert');
        } catch (error) {
            console.error('❌ Fehler beim Speichern:', error);
            throw error;
        }
    }

    // Initiale Testdaten
    seedInitialData() {
        // IMMER Standard-Schichttypen erstellen, wenn sie fehlen
        if (this.data.shiftTypes.length === 0) {
            console.log('🌱 Standard-Schichttypen werden erstellt...');
            this.data.shiftTypes = [
                { id: 1, name: 'Frühschicht', startTime: '06:00', endTime: '14:00', color: '#4CAF50', organizationId: 1, isActive: true, category: 'regular', priority: 1, countsTowardHours: true },
                { id: 2, name: 'Spätschicht', startTime: '14:00', endTime: '22:00', color: '#2196F3', organizationId: 1, isActive: true, category: 'regular', priority: 1, countsTowardHours: true },
                { id: 3, name: 'Abendschicht', startTime: '18:00', endTime: '23:59', color: '#9C27B0', organizationId: 1, isActive: true, category: 'regular', priority: 1, countsTowardHours: true },
                { id: 4, name: 'Urlaub', startTime: '00:00', endTime: '23:59', color: '#4CAF50', organizationId: 1, isActive: true, category: 'absence', priority: 10, isAllDay: true, countsTowardHours: false },
                { id: 5, name: 'Krankheit', startTime: '00:00', endTime: '23:59', color: '#F44336', organizationId: 1, isActive: true, category: 'absence', priority: 10, isAllDay: true, countsTowardHours: false },
                { id: 6, name: 'Tagdienst', startTime: '09:00', endTime: '17:00', color: '#FF9800', organizationId: 1, isActive: true, category: 'regular', priority: 1, countsTowardHours: true },
                { id: 7, name: 'Veranstaltung', startTime: '18:00', endTime: '23:00', color: '#FF5722', organizationId: 1, isActive: true, category: 'event', priority: 5, countsTowardHours: true },
                { id: 8, name: 'Wochenendöffnung', startTime: '14:00', endTime: '20:00', color: '#795548', organizationId: 1, isActive: true, category: 'event', priority: 5, countsTowardHours: true },
                { id: 9, name: 'Sonderöffnung', startTime: '16:00', endTime: '21:00', color: '#607D8B', organizationId: 1, isActive: true, category: 'event', priority: 5, countsTowardHours: true }
            ];
        }

        if (this.data.employees.length === 0) {
            console.log('🌱 Initiale Daten werden erstellt...');

            // Drei Test-Mitarbeiter für die Demo-Organisation
            this.data.employees = [
                {
                    id: 1,
                    firstName: 'Max',
                    lastName: 'Mustermann',
                    email: 'max@jugendhaus.de',
                    phone: '+49 123 456789',
                    employeeNumber: 'MA001',
                    position: 'Jugendarbeiter',
                    department: 'Offener Bereich',
                    hireDate: '2023-01-15',
                    organizationId: 1,
                    isActive: true
                },
                {
                    id: 2,
                    firstName: 'Anna',
                    lastName: 'Schmidt',
                    email: 'anna@jugendhaus.de',
                    phone: '+49 123 456790',
                    employeeNumber: 'MA002',
                    position: 'Sozialpädagogin',
                    department: 'Beratung',
                    hireDate: '2023-03-10',
                    organizationId: 1,
                    isActive: true
                },
                {
                    id: 3,
                    firstName: 'Tom',
                    lastName: 'Weber',
                    email: 'tom@jugendhaus.de',
                    phone: '+49 123 456791',
                    employeeNumber: 'MA003',
                    position: 'Einrichtungsleitung',
                    department: 'Verwaltung',
                    hireDate: '2022-09-01',
                    organizationId: 1,
                    isActive: true
                }
            ];

            // Eine Test-Organisation für den Start
            this.data.organizations = [
                {
                    id: 1,
                    name: 'Jugendhaus Demo',
                    description: 'Demo-Organisation für ZeitWerk',
                    color: '#2196F3',
                    isActive: false,
                    openingHours: {
                        monday: { open: "14:00", close: "20:00", closed: false },
                        tuesday: { open: "14:00", close: "20:00", closed: false },
                        wednesday: { open: "14:00", close: "20:00", closed: false },
                        thursday: { open: "14:00", close: "20:00", closed: false },
                        friday: { open: "14:00", close: "22:00", closed: false },
                        saturday: { closed: true },
                        sunday: { closed: true }
                    },
                    specialOpenings: []
                }
            ];

            // Initiale Schichten: KEINE automatischen Schichten beim Reset
            this.data.shifts = [];

            // Admin-User
            this.data.users = [
                {
                    id: 1,
                    username: 'admin',
                    email: 'admin@jugendhaus.de',
                    role: 'ADMIN',
                    organizationId: 1,
                    isActive: true
                }
            ];

            this.save();
            console.log(`✅ Initiale Daten erstellt: ${this.data.employees.length} Mitarbeiter, ${this.data.shiftTypes.length} Schichttypen (keine automatischen Schichten)`);
            console.log(`📊 Aktuelle Datenbank: ${this.data.shifts.length} Schichten insgesamt`);
        }
    }

    // Generic CRUD Methoden
    generateId(table) {
        const items = this.data[table] || [];
        return items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
    }

    create(table, item) {
      if (!this.data[table]) {
        throw new Error(`Tabelle ${table} existiert nicht`);
      }

      // Spezifische Logik für das Erstellen von Schichten
      if (table === 'shifts') {
        const shiftType = this.data.shiftTypes.find(st => st.id === item.type_id);
        
        // Nur 'reguläre' Schichten auf Duplikate prüfen
        if (shiftType && shiftType.category === 'regular') {
          const existingRegularShift = this.data.shifts.find(s => {
            const existingShiftType = this.data.shiftTypes.find(st => st.id === s.type_id);
            return s.employee_id === item.employee_id &&
                   s.date === item.date &&
                   existingShiftType && 
                   existingShiftType.category === 'regular';
          });

          if (existingRegularShift) {
            throw new Error('Für diesen Tag ist bereits eine reguläre Schicht geplant. Reguläre Schichten können nicht doppelt vergeben werden.');
          }
        }
        // Abwesenheiten (Urlaub, Krankheit) können über reguläre Schichten gelegt werden.
      }
      
      const newItem = {
        id: this.generateId(table),
        ...item
      };
      
      this.data[table].push(newItem);
      this.save();
      return newItem;
    }

    findAll(table, filters = {}) {
        if (!this.data[table]) {
            throw new Error(`Tabelle ${table} existiert nicht`);
        }

        let items = [...this.data[table]];

        // Filter anwenden
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                items = items.filter(item => item[key] === value);
            }
        });

        return items;
    }

    findById(table, id) {
        if (!this.data[table]) {
            throw new Error(`Tabelle ${table} existiert nicht`);
        }

        return this.data[table].find(item => item.id === parseInt(id));
    }

    update(table, id, updates) {
        if (!this.data[table]) {
            throw new Error(`Tabelle ${table} existiert nicht`);
        }

        const index = this.data[table].findIndex(item => item.id === parseInt(id));
        if (index === -1) {
            throw new Error(`Item mit ID ${id} nicht gefunden`);
        }

        this.data[table][index] = { ...this.data[table][index], ...updates };
        this.save();
        return this.data[table][index];
    }

    delete(table, id) {
        if (!this.data[table]) {
            throw new Error(`Tabelle ${table} existiert nicht`);
        }

        const index = this.data[table].findIndex(item => item.id === parseInt(id));
        if (index === -1) {
            throw new Error(`Item mit ID ${id} nicht gefunden`);
        }

        const deleted = this.data[table].splice(index, 1)[0];
        this.save();
        return deleted;
    }

    // Spezielle Methoden für komplexe Abfragen
    getShiftsByDateRange(startDate, endDate, organizationId) {
        return this.data.shifts.filter(shift => {
            const shiftDate = shift.date;
            const inRange = shiftDate >= startDate && shiftDate <= endDate;
            const inOrg = !organizationId || shift.organizationId === organizationId;
            return inRange && inOrg;
        });
    }

    getEmployeeShifts(employeeId, startDate, endDate) {
        return this.data.shifts.filter(shift => {
            const shiftDate = shift.date;
            const isEmployee = shift.employeeId === parseInt(employeeId);
            const inRange = (!startDate || shiftDate >= startDate) && 
                           (!endDate || shiftDate <= endDate);
            return isEmployee && inRange;
        });
    }

    // Statistiken
    getStats() {
        return {
            employees: this.data.employees.length,
            shifts: this.data.shifts.length,
            shiftTypes: this.data.shiftTypes.length,
            organizations: this.data.organizations.length,
            users: this.data.users.length,
            dbPath: this.dbPath,
            fileSize: fs.existsSync(this.dbPath) ? 
                (fs.statSync(this.dbPath).size / 1024).toFixed(2) + ' KB' : '0 KB'
        };
    }

    // Shifts grouped by year (for cleanup UI)
    getShiftYears() {
        try {
            const counts = new Map();
            for (const s of this.data.shifts || []) {
                const y = new Date(s.date).getFullYear();
                if (!Number.isFinite(y)) continue;
                counts.set(y, (counts.get(y) || 0) + 1);
            }
            return Array.from(counts.entries())
                .map(([year, count]) => ({ year, count }))
                .sort((a, b) => b.year - a.year);
        } catch (e) {
            return [];
        }
    }

    // Purge shifts for a specific year; returns number deleted
    purgeShiftsByYear(year) {
        try {
            const y = parseInt(year, 10);
            if (!y || !Number.isFinite(y)) return 0;
            const before = this.data.shifts.length;
            this.data.shifts = (this.data.shifts || []).filter(s => {
                const sy = new Date(s.date).getFullYear();
                return sy !== y;
            });
            const deleted = before - this.data.shifts.length;
            if (deleted > 0) this.save();
            return deleted;
        } catch (e) {
            console.error('purgeShiftsByYear failed', e);
            return 0;
        }
    }

    // Backup erstellen
    createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(path.dirname(this.dbPath), `backup-${timestamp}.json`);
        fs.copyFileSync(this.dbPath, backupPath);
        return backupPath;
    }

    // Backup importieren
    importBackup(backupPath) {
        try {
            // Backup der aktuellen Datenbank erstellen
            const currentBackupPath = this.createBackup();
            console.log('📂 Aktuelle Datenbank gesichert:', currentBackupPath);

            // Backup-Datei laden und validieren
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            
            return this.importBackupFromData(backupData, currentBackupPath);
        } catch (error) {
            console.error('❌ Fehler beim Importieren des Backups:', error);
            throw new Error(`Import fehlgeschlagen: ${error.message}`);
        }
    }

    // Backup aus Daten importieren (für Browser-Upload)
    importBackupFromData(backupData, existingBackupPath = null) {
        try {
            // Backup der aktuellen Datenbank erstellen (falls nicht schon vorhanden)
            const currentBackupPath = existingBackupPath || this.createBackup();
            console.log('📂 Aktuelle Datenbank gesichert:', currentBackupPath);

            // Struktur validieren
            const requiredTables = ['employees', 'shifts', 'shiftTypes', 'organizations', 'users'];
            for (const table of requiredTables) {
                if (!Array.isArray(backupData[table])) {
                    throw new Error(`Ungültige Backup-Struktur: ${table} fehlt oder ist kein Array`);
                }
            }

            // Daten importieren
            this.data = backupData;
            this.save();
            
            console.log('✅ Backup erfolgreich importiert aus Browser-Upload');
            console.log(`📊 Importierte Daten: ${this.data.employees.length} Mitarbeiter, ${this.data.shifts.length} Schichten, ${this.data.shiftTypes.length} Schichttypen`);
            
            return {
                success: true,
                message: `Backup erfolgreich importiert. ${this.data.employees.length} Mitarbeiter, ${this.data.shifts.length} Schichten wiederhergestellt.`,
                backupPath: currentBackupPath
            };
        } catch (error) {
            console.error('❌ Fehler beim Importieren der Backup-Daten:', error);
            throw new Error(`Import fehlgeschlagen: ${error.message}`);
        }
    }

    // Datenbank zurücksetzen
    reset() {
        this.data = {
            employees: [],
            shifts: [],
            shiftTypes: [],
            organizations: [],
            users: [],
            holidays: [],
            holidayCacheInfo: []
        };
        this.seedInitialData();
        this.save(); // Daten nach Reset speichern
        console.log('🔄 Datenbank zurückgesetzt und gespeichert');
    }

    // =============================
    // HOLIDAY MANAGEMENT METHODS
    // =============================

    async getHolidays(filters = {}) {
        try {
            let holidays = [...this.data.holidays];

            if (filters.year) {
                holidays = holidays.filter(h => new Date(h.date).getFullYear() === filters.year);
            }

            // State filter:
            // - If a specific state (e.g., 'BY') is requested, return holidays for that state
            //   plus nationwide ones (where state is null/undefined).
            // - If state is 'ALL' or not provided, do NOT filter by state so that
            //   both nationwide and all state-specific holidays are returned.
            if (filters.state) {
                const requestedState = String(filters.state).toUpperCase();
                if (requestedState !== 'ALL') {
                    holidays = holidays.filter(h => {
                        const holidayState = h.state ? String(h.state).toUpperCase() : null;
                        return !holidayState || holidayState === requestedState;
                    });
                }
            }

            if (filters.startDate && filters.endDate) {
                holidays = holidays.filter(h => h.date >= filters.startDate && h.date <= filters.endDate);
            }

            return holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
        } catch (error) {
            console.error('❌ Failed to get holidays:', error);
            throw error;
        }
    }

    async insertHolidays(holidays) {
        try {
            // Deduplicate incoming holidays by (date, name, state)
            const normalizeState = (s) => (s === undefined || s === null) ? 'ALL' : s;
            const toKey = (h) => `${h.date}|${h.name}|${normalizeState(h.state)}`;
            const uniqueIncomingMap = new Map();
            for (const h of holidays) {
                uniqueIncomingMap.set(toKey(h), h);
            }
            const uniqueIncoming = Array.from(uniqueIncomingMap.values());

            // Remove exact duplicates already present in DB (same date+name+state)
            const incomingKeys = new Set(uniqueIncoming.map(toKey));
            this.data.holidays = this.data.holidays.filter(existing => !incomingKeys.has(toKey(existing)));

            // Insert new unique holidays
            const toInsert = uniqueIncoming.map(holiday => ({
                id: Date.now() + Math.random(),
                date: holiday.date,
                name: holiday.name,
                type: holiday.type || 'public',
                state: holiday.state,
                year: new Date(holiday.date).getFullYear(),
                created_at: new Date().toISOString()
            }));

            this.data.holidays.push(...toInsert);

            this.save();
            console.log(`✅ Inserted ${toInsert.length} holidays`);
            return true;
        } catch (error) {
            console.error('❌ Failed to insert holidays:', error);
            throw error;
        }
    }

    async getHolidayCacheInfo(state = 'ALL') {
        try {
            return this.data.holidayCacheInfo.find(info => info.state === state) || null;
        } catch (error) {
            console.error('❌ Failed to get holiday cache info:', error);
            return null;
        }
    }

    async clearHolidayCache(state = null, year = null) {
        try {
            // Stelle sicher, dass holidayCacheInfo existiert
            if (!this.data.holidayCacheInfo) {
                this.data.holidayCacheInfo = [];
            }

            if (state && year) {
                // Lösche Feiertage für einen spezifischen State und Jahr
                this.data.holidays = this.data.holidays.filter(holiday => 
                    !(holiday.state === state && holiday.year === year)
                );
                console.log(`✅ Cleared holidays for ${state} ${year}`);
            } else if (state) {
                // Lösche alle Feiertage für einen State
                this.data.holidays = this.data.holidays.filter(holiday => holiday.state !== state);
                console.log(`✅ Cleared all holidays for ${state}`);
            } else {
                // „Alle Feiertage löschen“ soll nur bundesweite (state=null/ALL) behalten
                this.data.holidays = this.data.holidays.filter(holiday => !holiday.state || holiday.state === 'ALL');
                console.log(`✅ Cleared all state-specific holidays; kept nationwide holidays`);
            }

            // Lösche/aktualisiere auch die Cache-Info
            if (state) {
                // Wenn ein spezifischer State bereinigt wird, entferne dessen Cache-Info
                this.data.holidayCacheInfo = this.data.holidayCacheInfo.filter(info => info.state !== state);
            } else {
                // Beim globalen Clear: nur bundesweite Cache-Info behalten
                this.data.holidayCacheInfo = this.data.holidayCacheInfo.filter(info => info.state === 'ALL' || !info.state);
            }

            this.save();
            return { success: true, message: 'Feiertage erfolgreich gelöscht' };
        } catch (error) {
            console.error('❌ Failed to clear holiday cache:', error);
            return { success: false, message: 'Fehler beim Löschen der Feiertage' };
        }
    }

    async updateHolidayCacheInfo(state, fromYear, toYear, totalHolidays) {
        try {
            // Entferne existierende Info für diesen State
            this.data.holidayCacheInfo = this.data.holidayCacheInfo.filter(info => info.state !== state);

            // Füge neue Info hinzu
            this.data.holidayCacheInfo.push({
                id: Date.now() + Math.random(),
                state,
                last_updated: new Date().toISOString(),
                cached_from_year: fromYear,
                cached_to_year: toYear,
                total_holidays: totalHolidays
            });

            this.save();
            console.log(`✅ Updated holiday cache info for ${state}: ${fromYear}-${toYear} (${totalHolidays} holidays)`);
            return true;
        } catch (error) {
            console.error('❌ Failed to update holiday cache info:', error);
            throw error;
        }
    }

    async clearHolidays(state = null, year = null) {
        try {
            const initialCount = this.data.holidays.length;

            if (state === null && year === null) {
                // Wenn keine Argumente übergeben werden, alle Feiertage löschen
                this.data.holidays = [];
            } else {
                // Bestehende Filterlogik beibehalten
                this.data.holidays = this.data.holidays.filter(holiday => {
                    if (state && holiday.state !== state) return true;
                    if (year && holiday.year !== year) return true;
                    return false;
                });
            }

            const deletedCount = initialCount - this.data.holidays.length;

            // Update auch cache info wenn State komplett gelöscht wird
            if (state && !year) {
                this.data.holidayCacheInfo = this.data.holidayCacheInfo.filter(info => info.state !== state);
            } else if (state === null && year === null) {
                // Wenn alles gelöscht wird, auch die gesamte Cache-Info löschen
                this.data.holidayCacheInfo = [];
            }

            this.save();
            console.log(`✅ Cleared ${deletedCount} holidays`);
            return deletedCount;
        } catch (error) {
            console.error('❌ Failed to clear holidays:', error);
            throw error;
        }
    }

    async resetToDefaults() {
        try {
            console.log('🔄 Resetting database to default values...');
            
            // Setze alle Daten zurück
            this.data = {
                employees: [],
                shifts: [],
                shiftTypes: [],
                organizations: [],
                users: [],
                holidays: [],
                holidayCacheInfo: []
            };
            
            // Führe die Standard-Initialisierung aus
            this.seedInitialData();
            
            console.log('✅ Database reset to defaults completed');
            return { success: true, message: 'Datenbank erfolgreich auf Standardwerte zurückgesetzt' };
        } catch (error) {
            console.error('❌ Failed to reset database:', error);
            return { success: false, message: 'Fehler beim Zurücksetzen der Datenbank' };
        }
    }

    async getAllHolidayCacheInfo() {
        try {
            return [...this.data.holidayCacheInfo].sort((a, b) => a.state.localeCompare(b.state));
        } catch (error) {
            console.error('❌ Failed to get all holiday cache info:', error);
            return [];
        }
    }

    // =============================
    // DATABASE PATH MANAGEMENT
    // =============================

    /**
     * Konfiguriert einen neuen Datenbankpfad
     */
    async setCustomDatabasePath(newPath, copyExisting = true) {
        try {
            console.log('🔧 Setting custom database path:', newPath);
            
            const result = await this.dbConfig.setCustomPath(newPath, copyExisting);
            
            if (result.success) {
                // Update internal path and reload data
                const oldPath = this.dbPath;
                this.dbPath = this.dbConfig.getCurrentDbPath();
                
                console.log('🔄 Reloading database from new location...');
                this.load();
                
                console.log('✅ Database path changed successfully');
                console.log(`   Old: ${oldPath}`);
                console.log(`   New: ${this.dbPath}`);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Failed to set custom database path:', error);
            throw error;
        }
    }

    /**
     * Kehrt zum Standard-Datenbankpfad zurück
     */
    async resetDatabasePath(copyToDefault = true) {
        try {
            console.log('🔧 Resetting to default database path...');
            
            const result = await this.dbConfig.resetToDefault(copyToDefault);
            
            if (result.success) {
                // Update internal path and reload data
                const oldPath = this.dbPath;
                this.dbPath = this.dbConfig.getCurrentDbPath();
                
                console.log('🔄 Reloading database from default location...');
                this.load();
                
                console.log('✅ Database path reset successfully');
                console.log(`   Old: ${oldPath}`);
                console.log(`   New: ${this.dbPath}`);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Failed to reset database path:', error);
            throw error;
        }
    }

    /**
     * Holt Informationen über die Datenbankpfade
     */
    getDatabasePathInfo() {
        const pathInfo = this.dbConfig.getPathInfo();
        
        return {
            ...pathInfo,
            currentDbPath: this.dbPath,
            stats: this.getStats()
        };
    }

    /**
     * Validiert einen Pfad für die Datenbanknutzung
     */
    validateDatabasePath(testPath) {
        return this.dbConfig.validatePath(testPath);
    }

    /**
     * Synchronisiert Datenbanken zwischen primärem und Fallback-Pfad
     */
    async syncDatabases() {
        try {
            await this.dbConfig.syncDatabases();
            return { success: true, message: 'Datenbanken erfolgreich synchronisiert' };
        } catch (error) {
            console.error('❌ Database sync failed:', error);
            return { success: false, message: `Synchronisation fehlgeschlagen: ${error.message}` };
        }
    }

    /**
     * Überschreibt die save-Methode um Sync-Backup zu erstellen
     */
    save() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
            console.log('💾 Datenbank gespeichert');
            
            // Create sync backup in background (don't await to avoid blocking)
            if (this.dbConfig.config.autoBackup && this.dbConfig.config.useCustomPath) {
                this.dbConfig.syncDatabases().catch(error => {
                    console.warn('⚠️ Background sync warning:', error.message);
                });
            }
            
        } catch (error) {
            console.error('❌ Fehler beim Speichern:', error);
            throw error;
        }
    }
}

module.exports = JsonDatabase;
