# 🗂️ Datenbankpfad-Verwaltung - Feature Dokumentation

## Übersicht

Das neue **Datenbankpfad-Verwaltung** Feature ermöglicht es Benutzern, einen eigenen Ordner für die Datenbank festzulegen, während ein robustes Fallback-System für maximale Sicherheit sorgt.

## 🎯 Funktionen

### ✅ **Benutzerdefinierte Datenbankpfade**
- Wählen Sie einen beliebigen Ordner für die Datenbank
- Automatische Pfad-Validierung und Zugriffstests
- Benutzerfreundliche Ordner-Auswahl über Dialog

### ✅ **Robustes Fallback-System**
- **Primärer Pfad**: Benutzerdefinierter Ordner
- **Sekundärer Pfad**: Standard-Anwendungsordner
- Automatischer Fallback bei Problemen (z.B. Netzlaufwerk nicht verfügbar)

### ✅ **Automatische Synchronisation**
- Bidirektionale Synchronisation zwischen Pfaden
- Zeitstempel-basierte Konfliktauflösung
- Automatische Backup-Erstellung bei Änderungen

### ✅ **Datenbank-Migration**
- Sichere Übertragung bestehender Daten zum neuen Pfad
- Backup der originalen Datenbank
- Rollback-Möglichkeit zum Standard-Pfad

## 🏗️ Technische Architektur

### Backend-Komponenten

#### `database-config.js`
- Zentrale Konfigurationsverwaltung
- Pfad-Validierung und -Tests
- Synchronisations-Logik

#### `json-db.js` (erweitert)
- Integration der Pfad-Konfiguration
- Automatische Fallback-Mechanismen
- Erweiterte Methoden für Pfad-Management

#### `main-json.js` (erweitert)
- Neue IPC-Handler für Pfad-Operations
- Dialog-Integration für Ordner-Auswahl
- Sichere Kommunikation mit Frontend

#### `preload.js` (erweitert)
- Secure Context Bridge für neue APIs
- TypeScript-Unterstützung

### Frontend-Komponenten

#### `DatabasePathManager.tsx`
- Vollständige UI für Pfad-Verwaltung
- Real-time Status-Anzeige
- Benutzerfreundliche Dialoge

#### `AdminPanel.tsx` (erweitert)
- Integration in den Admin-Bereich
- Nahtlose Einbindung in bestehende Struktur

## 🚀 Verwendung

### Im Admin-Panel

1. **Navigieren**: Admin Panel → Datenbank-Verwaltung
2. **Pfad wählen**: "Ordner auswählen" Button klicken
3. **Bestätigen**: Migration-Optionen konfigurieren
4. **Übertragen**: Automatische Datenübertragung

### Status-Übersicht

- **Aktueller Pfad**: Anzeige des aktiven Datenbankpfads
- **Fallback-Status**: Information über Backup-Pfad
- **Synchronisation**: Letzte Sync-Zeit und Status
- **Statistiken**: Dateigröße und Datenbankinhalt

## 🔒 Sicherheitsfeatures

### Backup-System
- Automatische Backups vor Pfad-Änderungen
- Zeitstempel-basierte Backup-Namen
- Erhaltung der ursprünglichen Datenbank

### Fehlerbehandlung
- Pfad-Zugriffstests vor Migration
- Automatischer Fallback bei Problemen
- Benutzerfreundliche Fehlermeldungen

### Datenintegrität
- Validierung der Datenbankstruktur
- CRC-Checks für Datei-Transfers
- Rollback bei fehlgeschlagenen Migrationen

## 📋 Konfiguration

### Standard-Verhalten
```javascript
{
  customPath: null,           // Kein benutzerdefinierter Pfad
  useCustomPath: false,       // Standard-Pfad verwenden
  autoBackup: true,          // Automatische Backups aktiviert
  syncMode: 'bidirectional'  // Bidirektionale Synchronisation
}
```

### Erweiterte Optionen
- **Auto-Backup**: Automatische Synchronisation aktivieren/deaktivieren
- **Sync-Modus**: Bidirektional, Primary-Only, oder Fallback-Only
- **Validierung**: Pfad-Zugriff und Schreibberechtigungen testen

## 🛠️ Technische Details

### IPC-Kommunikation
- `db:getPathInfo` - Pfad-Informationen abrufen
- `db:setCustomPath` - Benutzerdefinierten Pfad setzen
- `db:resetPath` - Zu Standard-Pfad zurückkehren
- `db:validatePath` - Pfad validieren
- `db:sync` - Manuelle Synchronisation
- `dialog:openDirectory` - Ordner-Auswahl Dialog

### Dateistruktur
```
userData/
├── database-config.json       # Pfad-Konfiguration
├── dienstplan-data.json       # Haupt-Datenbank (Standard)
└── backup-YYYY-MM-DD.json     # Automatische Backups

customPath/
├── dienstplan-data.json       # Haupt-Datenbank (Benutzerdefiniert)
└── backup-YYYY-MM-DD.json     # Sync-Backups
```

## 🔄 Migration-Workflow

1. **Pfad-Auswahl**: Benutzer wählt neuen Ordner
2. **Validierung**: System testet Zugriff und Berechtigung
3. **Backup**: Aktuelle Datenbank wird gesichert
4. **Migration**: Datenbank wird kopiert
5. **Konfiguration**: Neue Pfad-Einstellungen werden gespeichert
6. **Verifikation**: System überprüft Migration-Erfolg
7. **Aktivierung**: Neuer Pfad wird aktiviert

## 🚨 Fehlerbehebung

### Häufige Probleme

#### Pfad nicht zugänglich
- **Ursache**: Keine Schreibberechtigung oder Netzwerk-Problem
- **Lösung**: Automatischer Fallback zum Standard-Pfad
- **Anzeige**: Warnung in der UI mit Details

#### Synchronisation fehlgeschlagen
- **Ursache**: Datei gesperrt oder Speicher voll
- **Lösung**: Retry-Mechanismus mit exponentieller Verzögerung
- **Fallback**: Manuelle Synchronisation möglich

#### Datenbank-Korruption
- **Schutz**: Validierung vor jeder Migration
- **Wiederherstellung**: Automatisches Rollback zu letztem gültigen Backup
- **Benachrichtigung**: Sofortige Benutzer-Information

## 🎉 Vorteile

### Für Benutzer
- **Flexibilität**: Datenbank auf gewünschtem Laufwerk/Ordner
- **Sicherheit**: Robustes Backup- und Fallback-System
- **Einfachheit**: Intuitive Benutzeroberfläche
- **Transparenz**: Vollständige Kontrolle über Datenbankort

### Für Administratoren
- **Zentrale Verwaltung**: Alle Pfad-Einstellungen an einem Ort
- **Monitoring**: Real-time Status und Statistiken
- **Wartung**: Einfache Synchronisation und Backup-Verwaltung
- **Compliance**: Datenschutz durch lokale Speicherung

## 🔧 Integration

Das Feature ist nahtlos in die bestehende ZeitWerk-Anwendung integriert:

- **Keine Breaking Changes**: Bestehende Installationen funktionieren unverändert
- **Opt-in**: Feature muss explizit aktiviert werden
- **Rückwärtskompatibilität**: Standard-Verhalten bleibt erhalten
- **Progressive Enhancement**: Erweitert bestehende Funktionalität

## 📝 Zusammenfassung

Die Datenbankpfad-Verwaltung bietet eine professionelle Lösung für flexible Datenbank-Speicherung mit maximaler Sicherheit und Benutzerfreundlichkeit. Das robuste Fallback-System gewährleistet, dass die Anwendung auch bei Problemen mit dem benutzerdefinierten Pfad zuverlässig funktioniert.
