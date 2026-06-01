const { contextBridge, ipcRenderer } = require('electron');

// Bridge JSON-DB IPC APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // App
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  closeApp: () => ipcRenderer.invoke('app:close'),
  minimizeApp: () => ipcRenderer.invoke('app:minimize'),
  maximizeApp: () => ipcRenderer.invoke('app:maximize'),
  relaunchApp: () => ipcRenderer.invoke('app:relaunch'),
  isElectron: () => true,
  platform: process.platform,

  // App Settings (persisted for main process features like Low-GPU mode)
  appSettings: {
    get: () => ipcRenderer.invoke('appSettings:get'),
    set: (patch) => ipcRenderer.invoke('appSettings:set', patch)
  },

  // Organizations
  getOrganizations: () => ipcRenderer.invoke('db:getOrganizations'),
  getOrganizationById: (id) => ipcRenderer.invoke('db:getOrganizationById', id),
  createOrganization: (org) => ipcRenderer.invoke('db:createOrganization', org),
  updateOrganization: (id, updates) => ipcRenderer.invoke('db:updateOrganization', id, updates),
  deleteOrganization: (id) => ipcRenderer.invoke('db:deleteOrganization', id),

  // Employees
  getEmployees: (organizationId) => ipcRenderer.invoke('employees:getAll', organizationId),
  getEmployeeById: (id) => ipcRenderer.invoke('employees:getById', id),
  createEmployee: (employee) => ipcRenderer.invoke('employees:create', employee),
  updateEmployee: (id, updates) => ipcRenderer.invoke('employees:update', id, updates),
  deleteEmployee: (id) => ipcRenderer.invoke('employees:delete', id),

  // Shift Types
  getShiftTypes: (organizationId) => ipcRenderer.invoke('shift-types:getAll', organizationId),
  getShiftTypeById: (id) => ipcRenderer.invoke('shift-types:getById', id),
  createShiftType: (shiftType) => ipcRenderer.invoke('shift-types:create', shiftType),
  updateShiftType: (id, updates) => ipcRenderer.invoke('shift-types:update', id, updates),
  deleteShiftType: (id) => ipcRenderer.invoke('shift-types:delete', id),

  // Shifts
  getShifts: (filters) => ipcRenderer.invoke('shifts:getAll', filters || {}),
  getShiftById: (id) => ipcRenderer.invoke('shifts:getById', id),
  createShift: (shift) => ipcRenderer.invoke('shifts:create', shift),
  updateShift: (id, updates) => ipcRenderer.invoke('shifts:update', id, updates),
  deleteShift: (id) => ipcRenderer.invoke('shifts:delete', id),
  getShiftsByEmployee: (employeeId, start, end) => ipcRenderer.invoke('shifts:getByEmployee', employeeId, start, end),

  // Tasks
  getTasks: (filters) => ipcRenderer.invoke('tasks:getAll', filters || {}),
  getTaskById: (id) => ipcRenderer.invoke('tasks:getById', id),
  createTask: (task) => ipcRenderer.invoke('tasks:create', task),
  updateTask: (id, updates) => ipcRenderer.invoke('tasks:update', id, updates),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
  getTasksByEmployee: (employeeId, start, end) => ipcRenderer.invoke('tasks:getByEmployee', employeeId, start, end),

  // Task Types
  getTaskTypes: (organizationId) => ipcRenderer.invoke('task-types:getAll', organizationId),
  getTaskTypeById: (id) => ipcRenderer.invoke('task-types:getById', id),
  createTaskType: (taskType) => ipcRenderer.invoke('task-types:create', taskType),
  updateTaskType: (id, updates) => ipcRenderer.invoke('task-types:update', id, updates),
  deleteTaskType: (id) => ipcRenderer.invoke('task-types:delete', id),

  // DB utilities
  getDatabaseStats: () => ipcRenderer.invoke('db:stats'),
  getShiftYears: () => ipcRenderer.invoke('db:getShiftYears'),
  purgeShiftsByYear: (year) => ipcRenderer.invoke('db:purgeShiftsByYear', year),
  createBackup: () => ipcRenderer.invoke('db:backup'),
  importBackup: () => ipcRenderer.invoke('db:importBackup'),
  importBackupFromData: (data) => ipcRenderer.invoke('db:importBackupFromData', data),
  resetDatabase: () => ipcRenderer.invoke('db:reset'),

  // Holidays (serverless basic)
  getHolidays: (filters) => ipcRenderer.invoke('holidays:get', filters || {}),
  loadHolidaysFromAPI: (state, fromYear, toYear) => ipcRenderer.invoke('holidays:loadFromAPI', state, fromYear, toYear),
  getHolidayCacheInfo: (state) => ipcRenderer.invoke('holidays:getCacheInfo', state),
  clearHolidayCache: (state, year) => ipcRenderer.invoke('holidays:clearCache', state, year),

  // File dialogs and writing
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options || {}),
  writeFile: (filePath, content, options) => ipcRenderer.invoke('fs:writeFile', filePath, content, options || {}),
  // Export folder helpers
  getExportFolder: () => ipcRenderer.invoke('exportFolder:get'),
  setExportFolder: (path) => ipcRenderer.invoke('exportFolder:set', path),
  clearExportFolder: () => ipcRenderer.invoke('exportFolder:clear'),
  writeExportFile: (fileName, content, options) => ipcRenderer.invoke('fs:writeExportFile', fileName, content, options || {}),

  // Photos (employee avatars)
  importEmployeePhoto: () => ipcRenderer.invoke('photos:import'),
  toFileUrl: (() => {
    const cache = new Map();
    return (absolutePath) => {
      try {
        if (!absolutePath || typeof absolutePath !== 'string') return '';
        if (cache.has(absolutePath)) return cache.get(absolutePath);
        // Ask main process for a data URL (works in dev http and prod)
        const dataUrl = ipcRenderer.sendSync('fs:readFileAsDataUrlSync', absolutePath);
        if (dataUrl && typeof dataUrl === 'string') {
          cache.set(absolutePath, dataUrl);
          return dataUrl;
        }
        return '';
      } catch (_) {
        return '';
      }
    };
  })(),

  // Database path management
  getDatabasePathInfo: () => ipcRenderer.invoke('dbPath:getInfo'),
  setCustomDatabasePath: (newPath, copyExisting) => ipcRenderer.invoke('dbPath:setCustom', newPath, copyExisting),
  resetDatabasePath: (copyToDefault) => ipcRenderer.invoke('dbPath:reset', copyToDefault),
  validateDatabasePath: (testPath) => ipcRenderer.invoke('dbPath:validate', testPath),
  syncDatabases: () => ipcRenderer.invoke('dbPath:sync'),
  showDirectoryDialog: () => ipcRenderer.invoke('dialog:selectDirectory'),
});

console.log('🔐 Preload (serverless) loaded');
