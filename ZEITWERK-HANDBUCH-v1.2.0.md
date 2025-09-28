# ZeitWerk v1.2.0 - Umfassende Funktionsbeschreibung und Benutzeranleitung

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Installation](#installation)
3. [Erste Schritte](#erste-schritte)
4. [Hauptfunktionen](#hauptfunktionen)
5. [Datenbankpfad-Verwaltung](#datenbankpfad-verwaltung)
6. [Export-Funktionen](#export-funktionen)
7. [Administration](#administration)
8. [Fehlerbehebung](#fehlerbehebung)
9. [Technische Spezifikationen](#technische-spezifikationen)

---

## Überblick

**ZeitWerk** ist eine moderne, benutzerfreundliche Anwendung für die Verwaltung von Dienstplänen und Schichtplanungen in der Jugendarbeit. Die Software wurde speziell für Jugendeinrichtungen, Vereine und soziale Träger entwickelt und bietet eine intuitive Oberfläche zur effizienten Planung und Verwaltung von Arbeitszeiten.

### Hauptmerkmale

- **🗓️ Intuitive Dienstplanverwaltung** mit Wochen- und Monatsansicht
- **👥 Mitarbeiterverwaltung** mit vollständigen Profilen
- **⏰ Flexible Schichttypen** mit Farb- und Zeitkonfiguration
- **🗂️ Konfigurierbare Datenbankpfade** für flexible Speicherung
- **📊 Export-Funktionen** für Excel und CSV
- **🔄 Backup- und Restore-System** für Datensicherheit
- **🎨 Moderne Benutzeroberfläche** mit Dark/Light Mode
- **🔒 Lokale Datenspeicherung** ohne Cloud-Abhängigkeit

### Zielgruppen

- Jugendeinrichtungen und Jugendzentren
- Soziale Träger und Vereine
- Beratungsstellen und Bildungseinrichtungen
- Kleine bis mittlere Teams in der Jugendarbeit

---

## Installation

### Systemvoraussetzungen

- **Betriebssystem**: Windows 10 oder höher (64-Bit)
- **Arbeitsspeicher**: Mindestens 4 GB RAM
- **Festplattenspeicher**: 200 MB freier Speicherplatz
- **Prozessor**: Moderne CPU (Intel i3 oder AMD Ryzen 3 oder besser)

### Installationsoptionen

#### Option 1: Vollinstallation (Empfohlen)
1. Laden Sie `ZeitWerk Setup 1.2.0.exe` herunter
2. Führen Sie die Datei als Administrator aus
3. Folgen Sie den Installationsanweisungen
4. Starten Sie ZeitWerk über das Desktop-Symbol oder Startmenü

#### Option 2: Portable Version
1. Laden Sie `ZeitWerk-Portable-1.2.0.exe` herunter
2. Erstellen Sie einen Ordner für ZeitWerk (z.B. `C:\Programme\ZeitWerk`)
3. Kopieren Sie die Portable-Datei in diesen Ordner
4. Starten Sie die Anwendung direkt durch Doppelklick

### Erste Installation

Bei der ersten Nutzung wird automatisch eine Beispiel-Datenbank mit Testdaten erstellt, um Ihnen den Einstieg zu erleichtern.

---

## Erste Schritte

### 1. Anmeldung

Beim ersten Start von ZeitWerk öffnet sich der Login-Bildschirm:

- **Benutzername**: `admin`
- **Passwort**: (leer lassen)

Nach der Anmeldung gelangen Sie zum Dashboard mit einer Übersicht über:
- Anzahl Mitarbeiter
- Geplante Schichten
- Aktuelle Datenbankgröße
- Schnellzugriff auf wichtige Funktionen

### 2. Grundeinrichtung

#### Schritt 1: Organisation konfigurieren
1. Navigieren Sie zu **Admin Panel** → **App-Einstellungen** → **Admin-Einstellungen**
2. Tragen Sie Ihren **Organisationsnamen** ein
3. Passen Sie den **Admin-Benutzernamen** an
4. Fügen Sie eine **Willkommensnachricht** hinzu

#### Schritt 2: Mitarbeiter anlegen
1. Gehen Sie zu **Mitarbeiter** in der Hauptnavigation
2. Klicken Sie auf **+ Neuer Mitarbeiter**
3. Füllen Sie die erforderlichen Felder aus:
   - Vor- und Nachname
   - E-Mail-Adresse
   - Telefonnummer
   - Mitarbeiternummer
   - Position und Abteilung
   - Einstellungsdatum

#### Schritt 3: Schichttypen anpassen
1. Navigieren Sie zu **Schichttypen**
2. Bearbeiten Sie die vorhandenen Typen oder erstellen Sie neue:
   - **Name** des Schichttyps
   - **Startzeit** und **Endzeit**
   - **Farbe** für die Anzeige
   - **Kategorie** (regulär oder Abwesenheit)
   - **Priorität** für die Sortierung

---

## Hauptfunktionen

### Dashboard

Das Dashboard bietet eine zentrale Übersicht über alle wichtigen Informationen:

- **Statistiken**: Anzahl Mitarbeiter, Schichten, Schichttypen
- **Datenbankgröße**: Aktuelle Speichernutzung
- **Export-Funktionen**: Schnellzugriff auf Datenexport
- **Letzte Aktivitäten**: Übersicht über kürzliche Änderungen

### Mitarbeiterverwaltung

#### Mitarbeiter anlegen
1. **Persönliche Daten**: Vor-/Nachname, Kontaktdaten
2. **Arbeitsplatz-Informationen**: Position, Abteilung, Mitarbeiternummer
3. **Organisationszugehörigkeit**: Zuordnung zu Organisationseinheiten
4. **Status**: Aktiv/Inaktiv für temporäre Deaktivierung

#### Mitarbeiter bearbeiten
- Klicken Sie auf das **Bearbeiten-Symbol** (Stift) in der Mitarbeiterliste
- Ändern Sie die gewünschten Informationen
- Speichern Sie mit **"Speichern"**

#### Mitarbeiter löschen
- Klicken Sie auf das **Löschen-Symbol** (Papierkorb)
- Bestätigen Sie die Löschung
- **Achtung**: Alle zugehörigen Schichten werden ebenfalls gelöscht

### Schichtplanung

#### Wochenansicht
Die Wochenansicht zeigt alle geplanten Schichten für eine Woche:

- **Navigation**: Verwenden Sie die Pfeile oder den Kalender
- **Schicht erstellen**: Klicken Sie auf ein leeres Zeitfeld
- **Schicht bearbeiten**: Klicken Sie auf eine bestehende Schicht
- **Schicht löschen**: Hover über die Schicht und klicken Sie das X-Symbol

#### Schicht erstellen
1. Wählen Sie **Mitarbeiter** aus der Dropdown-Liste
2. Wählen Sie **Schichttyp** (bestimmt Zeit und Farbe automatisch)
3. Wählen Sie das **Datum**
4. Optional: Fügen Sie **Notizen** hinzu
5. Klicken Sie **"Schicht erstellen"**

#### Schicht bearbeiten
1. Klicken Sie auf eine bestehende Schicht
2. Ändern Sie die gewünschten Parameter
3. Speichern Sie mit **"Änderungen speichern"**

#### Besonderheiten bei Schichten
- **Reguläre Schichten**: Nur eine pro Mitarbeiter und Tag möglich
- **Abwesenheiten**: Können über reguläre Schichten gelegt werden
- **Farbkodierung**: Automatisch basierend auf Schichttyp
- **Schichtname**: Wird in der Ansicht angezeigt

### Monatsansicht

Die Monatsansicht bietet einen Überblick über den gesamten Monat:

- **Kalender-Layout**: Klassische Monatsdarstellung
- **Kompakte Anzeige**: Schichten als farbige Balken
- **Navigation**: Vor/Zurück-Buttons oder Monatsauswahl
- **Schichterstellung**: Direkt durch Klick auf einen Tag möglich

---

## Datenbankpfad-Verwaltung

### Überblick

**NEU in Version 1.2.0**: ZeitWerk ermöglicht es Ihnen, einen benutzerdefinierten Speicherort für Ihre Datenbank festzulegen. Dies ist besonders nützlich für:

- **Netzlaufwerke**: Zentrale Speicherung für Teamzugriff
- **Externe Laufwerke**: Portable Datenhaltung
- **Backup-Strategien**: Speicherung auf gesicherten Laufwerken
- **Compliance**: Erfüllung spezifischer Datenschutzanforderungen

### Zugriff auf die Datenbankpfad-Verwaltung

1. Öffnen Sie das **Admin Panel**
2. Wechseln Sie zum Tab **"Datenbank-Verwaltung"**
3. Sie finden die **Datenbankpfad-Verwaltung** am oberen Bereich

### Aktueller Status verstehen

Die Oberfläche zeigt Ihnen:

- **Aktueller Datenbankpfad**: Wo Ihre Daten momentan gespeichert sind
- **Status-Indikator**: 
  - 🟢 **Grün**: Benutzerdefinierter Pfad aktiv
  - 🔵 **Blau**: Standard-Pfad in Verwendung
- **Dateigröße**: Aktuelle Größe der Datenbank
- **Verfügbarkeit**: Ob der Pfad zugänglich ist

### Benutzerdefinierten Pfad einrichten

#### Schritt-für-Schritt Anleitung

1. **Pfad auswählen**
   - Klicken Sie auf **"Ordner auswählen"**
   - Navigieren Sie zum gewünschten Speicherort
   - Wählen Sie einen Ordner oder erstellen Sie einen neuen
   - Bestätigen Sie mit **"Ordner auswählen"**

2. **Migration konfigurieren**
   - **"Bestehende Datenbank kopieren"**: ✅ (Empfohlen)
     - Ihre aktuellen Daten werden übertragen
     - Original bleibt als Backup erhalten
   - **Dialog bestätigen**: Klicken Sie **"Pfad ändern"**

3. **Migration abwarten**
   - ZeitWerk kopiert Ihre Datenbank
   - Der Vorgang dauert je nach Datenmenge einige Sekunden
   - Eine Erfolgsmeldung bestätigt die Übertragung

### Fallback-System verstehen

ZeitWerk verwendet ein **robustes Fallback-System**:

#### Primärer Pfad (Benutzerdefiniert)
- Ihr gewählter Speicherort
- Wird prioritär verwendet wenn verfügbar
- Automatische Überwachung der Verfügbarkeit

#### Sekundärer Pfad (Standard)
- Standard-Anwendungsordner als Backup
- Automatische Aktivierung bei Problemen
- Synchronisation mit primärem Pfad

#### Automatische Synchronisation
- **Bidirektional**: Änderungen werden in beide Richtungen übertragen
- **Zeitstempel-basiert**: Neuere Version hat Vorrang
- **Hintergrund-Prozess**: Erfolgt automatisch beim Speichern

### Synchronisation und Backup

#### Manuelle Synchronisation
1. Klicken Sie auf das **Sync-Symbol** (🔄) in der Titelleiste
2. Oder verwenden Sie den Button **"Synchronisieren"**
3. Eine Meldung bestätigt den Erfolg

#### Backup-Informationen
- **Automatische Backups**: Vor jeder Pfad-Änderung
- **Zeitstempel**: Eindeutige Dateinamen mit Datum/Zeit
- **Speicherort**: Sowohl am alten als auch am neuen Pfad
- **Format**: `backup-YYYY-MM-DD-HH-mm-ss.json`

### Zu Standard-Pfad zurückkehren

Falls Sie zum ursprünglichen Speicherort zurückkehren möchten:

1. Klicken Sie **"Zu Standard zurückkehren"**
2. Wählen Sie ob aktuelle Daten kopiert werden sollen
3. Bestätigen Sie die Änderung
4. ZeitWerk wechselt zurück zum Standard-Pfad

### Fehlerbehebung Datenbankpfad

#### Problem: Pfad nicht verfügbar
**Symptome**: Warnung "Nicht verfügbar" beim Pfad
**Ursachen**: 
- Netzlaufwerk getrennt
- USB-Stick entfernt
- Keine Berechtigung

**Lösung**:
- ZeitWerk wechselt automatisch zum Fallback-Pfad
- Schließen Sie das Laufwerk wieder an
- Klicken Sie "Synchronisieren" zur Wiederherstellung

#### Problem: Synchronisation fehlgeschlagen
**Symptome**: Fehlermeldung bei Sync-Versuch
**Ursachen**:
- Datei gesperrt durch anderen Prozess
- Speicher voll
- Berechtigung fehlt

**Lösung**:
- Schließen Sie andere Programme die auf die Datei zugreifen
- Prüfen Sie verfügbaren Speicherplatz
- Führen Sie ZeitWerk als Administrator aus

---

## Export-Funktionen

### Übersicht der Export-Optionen

ZeitWerk bietet zwei Export-Modi für verschiedene Anwendungsfälle:

#### 1. Erweiterte Export-Optionen
- **Detaillierte Datenexporte** mit allen Informationen
- **Filteroptionen** nach Zeitraum, Mitarbeiter, Schichttyp
- **Verschiedene Formate** für unterschiedliche Zwecke

#### 2. Einfacher Wochenexport
- **Matrix-Format** für Wochenübersichten
- **Excel-kompatibel** mit deutscher Formatierung
- **Schneller Überblick** für Teamleiter und Verwaltung

### Einfacher Wochenexport verwenden

#### Zugriff
1. Gehen Sie zum **Dashboard**
2. Klicken Sie auf **"Wochenexport (simpel)"** (oranger Button)

#### Export-Prozess
1. **Woche auswählen**: Wählen Sie die gewünschte Kalenderwoche
2. **Speicherort wählen**: Dialog öffnet sich automatisch
3. **Datei benennen**: Geben Sie einen aussagekräftigen Namen ein
4. **Export starten**: Klicken Sie "Speichern"
5. **Bestätigung**: Erfolgsmeldung erscheint

#### Format des Wochenexports

```
Mitarbeiter       | Mo 04.09 | Di 05.09 | Mi 06.09 | Do 07.09 | Fr 08.09 | Sa 09.09 | So 10.09
------------------|----------|----------|----------|----------|----------|----------|----------
Max Mustermann    | F        | S        | F        | S        | -        | -        | -
Anna Schmidt      | S        | F        | U        | F        | S        | -        | -
Tom Weber         | -        | -        | F        | F        | F        | A        | -

Legende:
F = Frühschicht (06:00 - 14:00)
S = Spätschicht (14:00 - 22:00)
A = Abendschicht (18:00 - 23:59)
U = Urlaub (00:00 - 23:59)
K = Krankheit (00:00 - 23:59)
T = Tagdienst (09:00 - 17:00)
- = Frei
```

#### Verwendung in Excel
- **Automatische Erkennung**: Excel erkennt das Format automatisch
- **UTF-8 mit BOM**: Deutsche Umlaute werden korrekt dargestellt
- **Semikolon-Trennung**: Standard für deutsche Excel-Versionen
- **Bearbeitbar**: Tabelle kann nachträglich angepasst werden

### Erweiterte Export-Optionen

#### Vollständiger Datenexport
1. Gehen Sie zum **Dashboard**
2. Klicken Sie **"Erweiterte Export-Optionen"**
3. Wählen Sie gewünschte **Filter**:
   - **Zeitraum**: Von/Bis Datum
   - **Mitarbeiter**: Spezifische Personen
   - **Schichttypen**: Bestimmte Schichtarten
   - **Organisation**: Bei mehreren Standorten

#### Export-Formate
- **CSV**: Für Tabellenkalkulation und Weiterverarbeitung
- **JSON**: Für technische Sicherungen und Datenübertragung
- **Detaillierte Listen**: Mit allen Schichtinformationen

---

## Administration

### Admin Panel Übersicht

Das Admin Panel ist in vier Hauptbereiche unterteilt:

#### 1. App-Einstellungen
Grundlegende Konfiguration der Anwendung

#### 2. Datenbank-Verwaltung
Datenbankpfade, Backups und Statistiken

#### 3. Feiertage-Verwaltung
Verwaltung gesetzlicher und regionaler Feiertage

### App-Einstellungen im Detail

#### Kalender & Zeitplanung

**Wochenansicht konfigurieren**
- **5-Tage-Woche**: Montag bis Freitag (klassische Arbeitswoche)
- **6-Tage-Woche**: Montag bis Samstag (mit Samstagsdienst)
- **7-Tage-Woche**: Vollständige Woche inklusive Sonntag

**Feiertage-Region**
- Wählen Sie Ihr **Bundesland** für automatische Feiertage
- Standard: Bayern (BY)
- Verfügbare Optionen: Alle deutschen Bundesländer

**Urlaubsperioden verwalten**
1. Klicken Sie **"Neue Periode"**
2. Geben Sie **Namen** ein (z.B. "Sommerferien 2025")
3. Wählen Sie **Start- und Enddatum**
4. Optional: **Beschreibung** hinzufügen
5. **Auswirkung auf Planung**: Aktivieren für Planungshinweise

#### Schichtplanung

**Pausenzeiten konfigurieren**
- **Automatische Berechnung**: Pausen werden bei der Arbeitszeit berücksichtigt
- **Standard-Pausendauer**: Grundeinstellung für neue Schichttypen
- **Pausenregeln**: Verschiedene Regeln je nach Arbeitszeit

**Pausenregeln erstellen**
1. Klicken Sie **"Neue Regel"**
2. **Name der Regel** (z.B. "Pause ab 6h")
3. **Mindest-Arbeitszeit** in Stunden
4. **Pausendauer** in Minuten
5. **Bezahlt/Unbezahlt** festlegen
6. **Automatisch anwenden** aktivieren

#### UI-Einstellungen

**Navigation**
- **Standardansicht nach Login**:
  - Dashboard (empfohlen)
  - Wochenansicht
  - Monatsansicht

**Theme-Verwaltung**
- Verwenden Sie den **Dark/Light Mode Toggle** in der oberen rechten Ecke
- Die Einstellung wird automatisch gespeichert

#### Admin-Einstellungen

**Administrator-Informationen**
- **Admin-Benutzername**: Wird im Login-Bildschirm angezeigt
- **Organisation**: Name Ihrer Einrichtung
- **Willkommensnachricht**: Persönliche Begrüßung beim Login

### Datenbank-Verwaltung

#### Statistiken
Übersicht über:
- Anzahl Mitarbeiter
- Anzahl Schichten
- Anzahl Schichttypen
- Anzahl Organisationen
- Datenbankgröße

#### Backup-Funktionen

**Manuelles Backup erstellen**
1. Klicken Sie **"Backup erstellen"**
2. Datei wird automatisch heruntergeladen
3. Dateiname: `zeitwerk-backup-YYYY-MM-DD.json`

**Backup wiederherstellen**
1. Klicken Sie **"Testdaten zurücksetzen"**
2. Option **"Backup-Datei hochladen"** wählen
3. Wählen Sie Ihre Backup-Datei
4. Bestätigen Sie die Wiederherstellung

#### Standard-Schichttypen

**Fehlende Schichttypen erstellen**
- Automatische Erstellung der Basis-Schichttypen
- Umfasst: Früh-, Spät-, Abendschicht, Urlaub, Krankheit, Tagdienst
- Nur ausführen wenn Schichttypen fehlen

### Feiertage-Verwaltung

#### Automatischer Import
- **Bundesland auswählen**: Für regionale Feiertage
- **Jahr festlegen**: Aktuelle und zukünftige Jahre
- **Import starten**: Feiertage werden automatisch geladen

#### Manuelle Verwaltung
- **Eigene Feiertage**: Betriebsspezifische freie Tage
- **Bearbeitung**: Vorhandene Feiertage anpassen
- **Löschen**: Nicht relevante Feiertage entfernen

#### Cache-Verwaltung
- **Cache leeren**: Bei Problemen mit Feiertagen
- **Neu laden**: Aktualisierung der Feiertage-Daten
- **Status prüfen**: Übersicht über geladene Feiertage

---

## Fehlerbehebung

### Häufige Probleme und Lösungen

#### Problem: Anwendung startet nicht
**Symptome**: ZeitWerk öffnet sich nicht nach dem Klick

**Lösungsschritte**:
1. **Task Manager prüfen**: Eventuell läuft ZeitWerk bereits im Hintergrund
2. **Als Administrator starten**: Rechtsklick → "Als Administrator ausführen"
3. **Neuinstallation**: Deinstallieren und erneut installieren
4. **Antivirus prüfen**: Ausnahme für ZeitWerk hinzufügen

#### Problem: Daten werden nicht gespeichert
**Symptome**: Änderungen gehen nach Neustart verloren

**Lösungsschritte**:
1. **Berechtigungen prüfen**: Schreibzugriff auf Datenbank-Ordner
2. **Festplattenspeicher**: Ausreichend freier Speicherplatz
3. **Datei-Sperren**: Andere Programme schließen die auf Datenbank zugreifen
4. **Pfad zurücksetzen**: In Datenbankpfad-Verwaltung zu Standard wechseln

#### Problem: Schichten werden nicht angezeigt
**Symptome**: Kalender bleibt leer trotz erstellter Schichten

**Lösungsschritte**:
1. **Zeitraum prüfen**: Sind Sie in der richtigen Woche/Monat?
2. **Filter zurücksetzen**: Mitarbeiter- oder Organisationsfilter entfernen
3. **Daten neu laden**: Seite aktualisieren (F5)
4. **Datenbankintegrität**: Admin Panel → Statistiken prüfen

#### Problem: Export funktioniert nicht
**Symptome**: Keine Datei wird erstellt oder Dialog erscheint nicht

**Lösungsschritte**:
1. **Berechtigungen**: Schreibzugriff auf Zielordner prüfen
2. **Pfad wählen**: Anderen Speicherort versuchen
3. **Dateiname**: Keine Sonderzeichen verwenden
4. **Daten vorhanden**: Schichten im gewählten Zeitraum verfügbar?

#### Problem: Netzwerkpfad nicht verfügbar
**Symptome**: Warnung bei benutzerdefiniertem Datenbankpfad

**Lösungsschritte**:
1. **Netzverbindung**: VPN oder Netzwerk prüfen
2. **Laufwerk verbinden**: Netzlaufwerk neu verbinden
3. **Fallback nutzen**: ZeitWerk nutzt automatisch Standard-Pfad
4. **Synchronisation**: Nach Wiederherstellung manuell synchronisieren

### Daten-Recovery

#### Backup wiederherstellen
1. **Backup-Datei finden**: Standard-Speicherort oder eigener Pfad
2. **Admin Panel öffnen**: Datenbank-Verwaltung
3. **Import wählen**: "Testdaten zurücksetzen" → "Backup hochladen"
4. **Datei auswählen**: .json Backup-Datei wählen
5. **Bestätigen**: Wiederherstellung starten

#### Automatische Backups finden
**Standard-Pfad**: `%APPDATA%\ZeitWerk`
**Backup-Dateien**: `backup-YYYY-MM-DD-HH-mm-ss.json`

### Performance-Optimierung

#### Bei langsamer Performance
1. **Datenbank-Größe prüfen**: Sehr große Datenbanken (>10MB) können langsam werden
2. **Alte Daten archivieren**: Vergangene Jahre in separates Backup
3. **RAM-Speicher**: Mindestens 4GB verfügbar
4. **Festplatte**: SSD statt HDD für bessere Leistung

#### Wartungsarbeiten
- **Monatlich**: Backup erstellen
- **Halbjährlich**: Alte Schichten archivieren
- **Jährlich**: Vollständige Neuinstallation erwägen

---

## Technische Spezifikationen

### Systemarchitektur

#### Frontend
- **Framework**: React 18 mit TypeScript
- **UI-Bibliothek**: Material-UI (MUI) v5
- **State Management**: Redux Toolkit
- **Build-Tool**: Vite
- **Bundle-Optimierung**: Code-Splitting und Lazy Loading

#### Backend
- **Laufzeit**: Electron mit Node.js
- **Datenbank**: JSON-basiert (keine externe DB erforderlich)
- **IPC-Kommunikation**: Secure Context Bridge
- **Datei-Management**: Native File System APIs

#### Sicherheit
- **Kontext-Isolation**: Aktiviert für Renderer-Prozesse
- **Node-Integration**: Deaktiviert im Renderer
- **Remote-Module**: Deaktiviert
- **Content Security Policy**: Implementiert

### Datenbank-Schema

#### Mitarbeiter (employees)
```json
{
  "id": "number",
  "firstName": "string",
  "lastName": "string", 
  "email": "string",
  "phone": "string",
  "employeeNumber": "string",
  "position": "string",
  "department": "string",
  "hireDate": "string (YYYY-MM-DD)",
  "organizationId": "number",
  "isActive": "boolean"
}
```

#### Schichten (shifts)
```json
{
  "id": "number",
  "employee_id": "number",
  "type_id": "number", 
  "date": "string (YYYY-MM-DD)",
  "start_time": "string (HH:mm)",
  "end_time": "string (HH:mm)",
  "notes": "string",
  "organizationId": "number"
}
```

#### Schichttypen (shiftTypes)
```json
{
  "id": "number",
  "name": "string",
  "startTime": "string (HH:mm)",
  "endTime": "string (HH:mm)",
  "color": "string (hex)",
  "organizationId": "number",
  "isActive": "boolean",
  "category": "string (regular|absence)",
  "priority": "number"
}
```

### Performance-Charakteristiken

#### Bundle-Größen (v1.2.0)
- **Hauptbundle**: 90.86 kB (gzip: 25.54 kB)
- **React Vendor**: 161.51 kB (gzip: 52.54 kB)
- **Material-UI Vendor**: 372.52 kB (gzip: 113.19 kB)
- **Admin Panel**: 222.24 kB (gzip: 58.97 kB) - Lazy Loaded

#### Systemanforderungen
- **Speicher**: ~150MB RAM im Betrieb
- **CPU**: Minimal bei normaler Nutzung
- **Festplatte**: ~200MB Installation + Datenbank
- **Netzwerk**: Nicht erforderlich (offline-fähig)

### Datenschutz und Compliance

#### Lokale Datenspeicherung
- **Keine Cloud**: Alle Daten bleiben lokal
- **Keine Telemetrie**: Keine Datenübertragung an Dritte
- **Verschlüsselung**: Dateisystem-Ebene durch Betriebssystem

#### DSGVO-Konformität
- **Datenminimierung**: Nur notwendige Daten werden gespeichert
- **Löschbarkeit**: Einzelne Datensätze vollständig löschbar
- **Portabilität**: Export in standardisierte Formate
- **Transparenz**: Vollständige Kontrolle über Datenort

### API-Dokumentation

#### IPC-Schnittstellen (Auswahl)

```javascript
// Mitarbeiter-Operationen
window.electronAPI.getEmployees(organizationId)
window.electronAPI.createEmployee(employeeData)
window.electronAPI.updateEmployee(id, updates)
window.electronAPI.deleteEmployee(id)

// Schicht-Operationen  
window.electronAPI.getShifts(filters)
window.electronAPI.createShift(shiftData)
window.electronAPI.updateShift(id, updates)
window.electronAPI.deleteShift(id)

// Datenbankpfad-Verwaltung
window.electronAPI.getDatabasePathInfo()
window.electronAPI.setCustomDatabasePath(path, copyExisting)
window.electronAPI.resetDatabasePath(copyToDefault)
window.electronAPI.syncDatabases()

// Export-Funktionen
window.electronAPI.saveFile(options)
window.electronAPI.writeFile(filePath, content)
```

---

## Changelog und Versionshistorie

### Version 1.2.0 (September 2025)
#### Neue Features
- ✅ **Datenbankpfad-Verwaltung** mit robustem Fallback-System
- ✅ **Benutzerdefinierten Speicherort** für Datenbank konfigurieren
- ✅ **Automatische Synchronisation** zwischen Pfaden
- ✅ **Pfad-Validierung** und Zugriffstests
- ✅ **Umfassende UI** für Pfad-Management im Admin-Panel

#### Verbesserungen
- ✅ **Bundle-Optimierung**: Hauptbundle von 1MB+ auf 91kB reduziert
- ✅ **Code-Splitting**: Lazy Loading für bessere Performance
- ✅ **TypeScript-Erweiterung**: Vollständige Typisierung neuer APIs
- ✅ **Fehlerbehandlung**: Robustere Error-Recovery-Mechanismen

### Version 1.1.0 (September 2025)
#### Neue Features
- ✅ **Simple Wochenexport** mit Matrix-Format
- ✅ **Orange Gradient Export-Button** mit Benutzer-Feedback
- ✅ **CSV-Optimierung** für deutsche Excel-Kompatibilität
- ✅ **Bundle-Größen-Optimierung** mit Code-Splitting

#### Verbesserungen
- ✅ **Hover-Effekte** in Wochen- und Monatsansicht verfeinert
- ✅ **Schicht-Namen und Farben** in allen Ansichten
- ✅ **Export-Funktionalität** erweitert und verbessert
- ✅ **Code-Cleanup**: 26 nicht verwendete Dateien entfernt

### Version 1.0.0 (September 2025)
#### Grundfunktionen
- ✅ **Mitarbeiterverwaltung** mit vollständigen Profilen
- ✅ **Schichtplanung** in Wochen- und Monatsansicht
- ✅ **Schichttypen-Verwaltung** mit Farben und Zeiten
- ✅ **JSON-basierte Datenbank** ohne externe Abhängigkeiten
- ✅ **Backup und Restore** System
- ✅ **Dark/Light Mode** Theme-Unterstützung
- ✅ **Export-Funktionen** für CSV und JSON
- ✅ **Admin-Panel** mit umfassenden Einstellungen
- ✅ **Feiertage-Verwaltung** mit automatischem Import

---

## Support und Weiterentwicklung

### Community und Feedback

#### Feedback-Kanäle
- **Feature-Wünsche**: Teilen Sie Ihre Ideen für neue Funktionen
- **Bug-Reports**: Melden Sie Probleme für schnelle Behebung
- **Verbesserungsvorschläge**: Helfen Sie uns ZeitWerk zu optimieren

#### Zukünftige Features (geplant)
- **Team-Zusammenarbeit**: Multi-User-Funktionalität
- **Erweiterte Berichte**: Detaillierte Arbeitszeit-Analysen
- **Mobile App**: Schichtplanung unterwegs
- **Integration**: Anbindung an andere HR-Systeme

### Best Practices

#### Für Administratoren
1. **Regelmäßige Backups**: Wöchentliche Sicherungen erstellen
2. **Updates**: Neue Versionen zeitnah installieren
3. **Schulungen**: Mitarbeiter in Grundfunktionen einweisen
4. **Monitoring**: Datenbankgröße und Performance beobachten

#### Für Benutzer
1. **Datenkonsistenz**: Schichten zeitnah eintragen
2. **Kategorien**: Richtige Schichttypen verwenden
3. **Notizen**: Wichtige Informationen bei Schichten hinterlegen
4. **Feedback**: Probleme zeitnah melden

### Wartung und Updates

#### Automatische Updates
- ZeitWerk prüft beim Start auf verfügbare Updates
- Updates können manuell installiert werden
- Ihre Daten bleiben bei Updates erhalten

#### Manuelle Installation
1. Neue Version von der offiziellen Quelle herunterladen
2. Alte Version deinstallieren (Daten bleiben erhalten)
3. Neue Version installieren
4. Einstellungen werden automatisch übernommen

---

## Anhang

### Tastaturkürzel

| Kombination | Funktion |
|-------------|----------|
| `Strg + N` | Neue Schicht erstellen |
| `Strg + S` | Speichern |
| `Strg + Z` | Rückgängig |
| `F5` | Seite aktualisieren |
| `Esc` | Dialog schließen |
| `Tab` | Zwischen Feldern wechseln |

### Datei-Endungen

| Endung | Beschreibung |
|--------|--------------|
| `.json` | Datenbank-Dateien und Backups |
| `.csv` | Export-Dateien für Excel |
| `.exe` | Installations- und Programmdateien |

### Standard-Verzeichnisse

#### Windows
- **Installation**: `C:\Program Files\ZeitWerk\`
- **Benutzerdaten**: `%APPDATA%\ZeitWerk\`
- **Datenbank**: `%APPDATA%\ZeitWerk\dienstplan-data.json`
- **Backups**: `%APPDATA%\ZeitWerk\backup-*.json`

#### Portable Version
- **Programm**: Gewählter Ordner
- **Datenbank**: Gleicher Ordner wie Programm
- **Backups**: Unterordner `backups\`

### Fehlercodes

| Code | Bedeutung | Lösung |
|------|-----------|--------|
| `DB_001` | Datenbank nicht gefunden | Pfad prüfen oder zurücksetzen |
| `DB_002` | Schreibfehler | Berechtigungen prüfen |
| `EXP_001` | Export fehlgeschlagen | Zielordner und Speicher prüfen |
| `NET_001` | Netzwerkpfad nicht verfügbar | Verbindung prüfen |

---

*Diese Dokumentation bezieht sich auf ZeitWerk Version 1.2.0. Für die neueste Version und Updates besuchen Sie die offizielle Website oder wenden Sie sich an den Support.*

**© 2025 ZeitWerk - Moderne Dienstplanverwaltung für die Jugendarbeit**
