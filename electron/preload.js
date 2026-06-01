const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Employee operations
  getEmployees: (organizationId) => ipcRenderer.invoke('employees:getAll', organizationId),
  getEmployeeById: (id) => ipcRenderer.invoke('employees:getById', id),
  createEmployee: (employee) => ipcRenderer.invoke('employees:create', employee),
  updateEmployee: (id, updates) => ipcRenderer.invoke('employees:update', id, updates),
  deleteEmployee: (id) => ipcRenderer.invoke('employees:delete', id),

  // Shift operations
  getShifts: (filters) => ipcRenderer.invoke('shifts:getAll', filters),
  getShiftById: (id) => ipcRenderer.invoke('shifts:getById', id),
  createShift: (shift) => ipcRenderer.invoke('shifts:create', shift),
  updateShift: (id, updates) => ipcRenderer.invoke('shifts:update', id, updates),
  deleteShift: (id) => ipcRenderer.invoke('shifts:delete', id),
  getShiftsByEmployee: (employeeId, startDate, endDate) => 
    ipcRenderer.invoke('shifts:getByEmployee', employeeId, startDate, endDate),

  // Task operations
  getTasks: (filters) => ipcRenderer.invoke('tasks:getAll', filters),
  getTaskById: (id) => ipcRenderer.invoke('tasks:getById', id),
  createTask: (task) => ipcRenderer.invoke('tasks:create', task),
  updateTask: (id, updates) => ipcRenderer.invoke('tasks:update', id, updates),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
  getTasksByEmployee: (employeeId, startDate, endDate) =>
    ipcRenderer.invoke('tasks:getByEmployee', employeeId, startDate, endDate),

  // ShiftType operations
  getShiftTypes: (organizationId) => ipcRenderer.invoke('shift-types:getAll', organizationId),
  getShiftTypeById: (id) => ipcRenderer.invoke('shift-types:getById', id),
  createShiftType: (shiftType) => ipcRenderer.invoke('shift-types:create', shiftType),
  updateShiftType: (id, updates) => ipcRenderer.invoke('shift-types:update', id, updates),
  deleteShiftType: (id) => ipcRenderer.invoke('shift-types:delete', id),

  // TaskType operations
  getTaskTypes: (organizationId) => ipcRenderer.invoke('task-types:getAll', organizationId),
  getTaskTypeById: (id) => ipcRenderer.invoke('task-types:getById', id),
  createTaskType: (taskType) => ipcRenderer.invoke('task-types:create', taskType),
  updateTaskType: (id, updates) => ipcRenderer.invoke('task-types:update', id, updates),
  deleteTaskType: (id) => ipcRenderer.invoke('task-types:delete', id),

  // Organization operations
  getOrganizations: () => ipcRenderer.invoke('db:getOrganizations'),
  getOrganizationById: (id) => ipcRenderer.invoke('db:getOrganizationById', id),
  createOrganization: (organization) => ipcRenderer.invoke('db:createOrganization', organization),
  updateOrganization: (id, updates) => ipcRenderer.invoke('db:updateOrganization', id, updates),
  deleteOrganization: (id) => ipcRenderer.invoke('db:deleteOrganization', id),

  // Database management
  resetDatabase: () => ipcRenderer.invoke('db:reset'),
  createBackup: () => ipcRenderer.invoke('db:backup'),
  getDatabaseStats: () => ipcRenderer.invoke('db:stats'),
  importBackup: () => ipcRenderer.invoke('db:importBackup'),
  importBackupFromData: (data) => ipcRenderer.invoke('db:importBackupFromData', data),

  // Holiday operations
  getHolidays: (filters) => ipcRenderer.invoke('holidays:get', filters),
  loadHolidaysFromAPI: (state, fromYear, toYear) => ipcRenderer.invoke('holidays:loadFromAPI', state, fromYear, toYear),
  getHolidayCacheInfo: (state) => ipcRenderer.invoke('holidays:getCacheInfo', state),
  clearHolidayCache: (state, year) => ipcRenderer.invoke('holidays:clearCache', state, year),

  // Auth operations
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  verifyToken: (token) => ipcRenderer.invoke('auth:verify', token),

  // App control
  closeApp: () => ipcRenderer.invoke('app:close'),
  minimizeApp: () => ipcRenderer.invoke('app:minimize'),
  maximizeApp: () => ipcRenderer.invoke('app:maximize'),
  showConfirmationDialog: (title, message) => ipcRenderer.invoke('dialog:showConfirmation', title, message),
  
  // System info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => process.platform,
  
  // File operations
  selectFile: (options) => ipcRenderer.invoke('dialog:selectFile', options),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  // Legacy alias (some renderer code might still call showSaveDialog)
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  // Write plain text content to disk (after user chose a path)
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  
  // =============================
  // DATABASE PATH MANAGEMENT
  // =============================
  
  // Get database path information
  getDatabasePathInfo: () => ipcRenderer.invoke('db:getPathInfo'),
  
  // Set custom database path
  setCustomDatabasePath: (newPath, copyExisting = true) => 
    ipcRenderer.invoke('db:setCustomPath', newPath, copyExisting),
  
  // Reset to default database path
  resetDatabasePath: (copyToDefault = true) => 
    ipcRenderer.invoke('db:resetPath', copyToDefault),
  
  // Validate database path
  validateDatabasePath: (testPath) => 
    ipcRenderer.invoke('db:validatePath', testPath),
  
  // Sync databases
  syncDatabases: () => ipcRenderer.invoke('db:sync'),
  
  // Show directory picker
  showDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('notification:show', title, body),
  
  // Utility - WICHTIG: Das fehlte!
  isElectron: () => true,
  
  // Window events
  onAppReady: (callback) => ipcRenderer.on('app:ready', callback),
  onAppClose: (callback) => ipcRenderer.on('app:close', callback)
});

// Optional: Expose a limited set of Node.js APIs
contextBridge.exposeInMainWorld('nodeAPI', {
  process: {
    platform: process.platform,
    version: process.version
  }
});

console.log('🔐 Preload script loaded - Secure context bridge established (JSON Version)');
