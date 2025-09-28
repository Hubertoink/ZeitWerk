# Projektdokumentation: ZeitWerk Dienstplan-App

## 1. Projektübersicht

**ZeitWerk** ist eine moderne, plattformunabhängige Desktop-Anwendung zur Verwaltung von Dienstplänen, die speziell auf die Bedürfnisse der offenen Jugendarbeit (OKJA) zugeschnitten ist. Sie bietet eine einfache und intuitive Oberfläche zur Planung von Schichten, zur Verwaltung von Mitarbeitern und zur Erstellung von aussagekräftigen Exporten.

Die Anwendung wurde als Electron-App entwickelt, um eine nahtlose Erfahrung auf verschiedenen Betriebssystemen (Windows, macOS, Linux) zu gewährleisten und gleichzeitig die Leistungsfähigkeit moderner Web-Technologien zu nutzen.

---

## 2. Technologie-Stack

Die Anwendung basiert auf einem modernen und robusten Technologie-Stack:

- **Haupt-Framework:** [Electron](https://www.electronjs.org/) zur Erstellung der Desktop-Anwendung mit Web-Technologien.
- **Frontend:**
    - **Bibliothek:** [React](https://reactjs.org/) für den Aufbau der Benutzeroberfläche.
    - **Build-Tool:** [Vite](https://vitejs.dev/) für eine extrem schnelle Entwicklungsumgebung und optimierte Builds.
    - **Sprache:** [TypeScript](https://www.typescriptlang.org/) für Typsicherheit und bessere Code-Qualität.
    - **UI-Komponenten:** [Material-UI (MUI)](https://mui.com/) für ein ansprechendes und konsistentes Design.
    - **State-Management:** [Redux Toolkit](https://redux-toolkit.js.org/) für eine vorhersagbare und zentrale Zustandsverwaltung.
    - **Routing:** [React Router](https://reactrouter.com/) zur Navigation zwischen den verschiedenen Ansichten.
- **Backend (im Electron Main-Prozess):**
    - **Laufzeitumgebung:** [Node.js](https://nodejs.org/) (integriert in Electron).
    - **Datenbank:** Eine einfache, dateibasierte **JSON-Datenbank** (`db.json`), die über einen benutzerdefinierten Manager (`electron/database/json-db.js`) verwaltet wird. Dies ermöglicht eine portable, serverlose Anwendung.
    - **Kommunikation:** IPC (Inter-Process Communication) von Electron zur sicheren Kommunikation zwischen dem Frontend (Renderer-Prozess) und dem Backend (Main-Prozess).

---

## 3. Projektstruktur

Das Projekt ist in drei Hauptbereiche unterteilt:

```
/
├── electron/      # Konfiguration und Logik für den Electron Main-Prozess
│   ├── database/  # Logik für die JSON-Datenbank (lesen, schreiben, Backups)
│   ├── utils/     # Hilfsfunktionen (z.B. Feiertags-Loader)
│   ├── main-json.js # Haupt-Einstiegspunkt der App (nutzt die JSON-DB)
│   └── preload.js   # Sichere Brücke zwischen Frontend und Backend (IPC)
│
├── frontend/      # Die gesamte React-Benutzeroberfläche
│   ├── public/    # Statische Assets (Logo, Icons)
│   └── src/
│       ├── components/ # Wiederverwendbare React-Komponenten (Dashboard, Kalender, etc.)
│       ├── contexts/   # React-Kontexte (falls verwendet)
│       ├── services/   # API-Wrapper für die Elektronen-IPC-Aufrufe
│       ├── store/      # Redux Toolkit Slices für das State Management
│       ├── types/      # TypeScript-Typdefinitionen
│       └── App.tsx     # Hauptkomponente mit Routing
│
├── backend/       # (Optional) Code für einen alternativen Server-basierten Ansatz
│                  # Wird in der aktuellen Konfiguration (main-json.js) nicht verwendet.
│
├── dist-electron/ # Ausgabe-Verzeichnis für die gebauten Installationsdateien
│
└── package.json   # Projekt-Metadaten, Abhängigkeiten und NPM-Skripte
```

---

## 4. Hauptfunktionen

### 4.1. Authentifizierung & Dashboard
- **Login:** Ein einfacher Login-Bildschirm schützt den Zugang zur Anwendung.
- **Statistiken:** Auf dem Login-Bildschirm werden grundlegende Datenbank-Statistiken wie die Dateigröße angezeigt.
- **Dashboard:** Nach dem Login bietet ein übersichtliches Dashboard wichtige Kennzahlen auf einen Blick:
    - Anzahl der Mitarbeiter und Organisationen.
    - Anzahl der heutigen und wöchentlichen Schichten.
    - Eine grafische Übersicht zur Schichtbesetzung.
    - Eine Liste der kommenden Schichten für die nächsten 7 Tage.

### 4.2. Dienstplanung
- **Monats- und Wochenansicht:** Schichten können in einer übersichtlichen Kalenderansicht (Monat/Woche) eingesehen werden.
- **Schicht-Management:**
    - Schichten können erstellt, bearbeitet und Mitarbeitern zugewiesen werden.
    - Schichtdetails (Typ, Zeiten, Notizen) sind direkt ersichtlich.
    - Interaktive Hover-Effekte zeigen Details an und ermöglichen das schnelle Löschen einer Schicht.
- **Mitarbeiter- & Schichttypen-Verwaltung:** Stammdaten wie Mitarbeiter und Schichttypen (inkl. Farben) können zentral verwaltet werden.

### 4.3. Daten-Export
Die Anwendung bietet zwei leistungsstarke Export-Funktionen, die über das Dashboard zugänglich sind:

1.  **Wochenexport (simpel):**
    - Erstellt eine saubere, Excel-freundliche CSV-Datei der aktuellen Woche.
    - Das Layout ist eine Matrix: Mitarbeiter in den Zeilen, Wochentage in den Spalten.
    - Ideal für einen schnellen Überblick oder zum Ausdrucken.
    - Nutzt Semikolons als Trennzeichen und eine UTF-8-Kodierung (BOM) für korrekte Darstellung in deutschem Excel.

2.  **Erweiterter Export:**
    - Ermöglicht den Export von detaillierten Daten in einem benutzerdefinierten Zeitraum.
    - Exportiert wahlweise Statistiken, Organisationen, Mitarbeiter, Schichttypen und alle Schichten in separaten Blöcken.
    - Unterstützt sowohl CSV- als auch ein farblich formatiertes XLS-Format.

### 4.4. Datenverwaltung
- **JSON-Datenbank:** Alle Daten werden lokal in einer einzigen `db.json`-Datei gespeichert, was die Anwendung portabel macht.
- **Backup & Import:**
    - Es können jederzeit Backups der Datenbank erstellt werden.
    - Ein bestehendes Backup (JSON-Datei) kann einfach per Drag-and-Drop oder Dateiauswahl importiert werden, um den Datenstand wiederherzustellen.
- **Feiertags-Management:** Feiertage für deutsche Bundesländer können für einen bestimmten Zeitraum geladen und in der Planung berücksichtigt werden.

---

## 5. Einrichtung & Ausführung

### 5.1. Voraussetzungen
- [Node.js](https://nodejs.org/) (inkl. npm)

### 5.2. Installation
Führen Sie den folgenden Befehl im Hauptverzeichnis des Projekts aus, um alle Abhängigkeiten (inkl. Frontend und Backend) zu installieren:
```bash
npm run install:all
```

### 5.3. Entwicklungsmodus
Um die Anwendung im Entwicklungsmodus mit Hot-Reloading zu starten, verwenden Sie:
```bash
# Startet das Frontend und die Electron-App mit der JSON-Datenbank
npm run dev:json
```
Die Anwendung startet, sobald der Vite-Dev-Server bereit ist. Änderungen im Code werden automatisch neu geladen.

### 5.4. Build & Distribution
Um eine finale, verteilbare Version der Anwendung (Installationsdatei und portable `.exe` für Windows) zu erstellen, führen Sie folgenden Befehl aus:
```bash
# Baut das Frontend und erstellt die Distribution-Dateien
npm run electron:dist:json
```
Die fertigen Dateien finden Sie anschließend im Ordner `dist-electron`.
