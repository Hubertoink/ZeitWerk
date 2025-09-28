# Dienstplan-App für die Jugendarbeit

Eine moderne Web-Applikation zur Verwaltung von Mitarbeitenden, Organisationseinheiten und Schichtplanung speziell für Jugendhäuser und ähnliche Einrichtungen.

## 🚀 Features

### ✅ Kernfunktionen
- **Mitarbeiterverwaltung**: Anlegen, Bearbeiten und Verwalten von Mitarbeitenden
- **Organisationseinheiten**: Hierarchische Verwaltung von Teams, Projekten und Standorten
- **Schichttypen**: Flexible Definition von Schichtarten mit Farben und Zeiten
- **Kalenderansichten**: Wochen- und Monatsansicht für optimale Übersicht
- **Drag & Drop**: Intuitive Schichtzuweisung per Drag & Drop
- **Multi-Tenant**: Unterstützung mehrerer Jugendhäuser in einer Installation

### 🎯 Geplante Erweiterungen
- Benachrichtigungssystem (E-Mail/Push)
- Mobile-First Design / Progressive Web App
- Rollen & Berechtigungen (Admin, Planer, Mitarbeitende)
- Export-/Importfunktion (CSV, iCal)
- Reporting: Auslastung, Fehlzeiten, Einsatzstatistiken

## 🛠 Technologie-Stack

### Frontend
- **React 18** mit TypeScript
- **Material-UI (MUI)** für moderne UI-Komponenten
- **Redux Toolkit** für State Management
- **React DnD** für Drag & Drop Funktionalität
- **Vite** als Build-Tool
- **Day.js** für Datums-/Zeitverwaltung

### Backend
- **Node.js** mit **Express.js**
- **TypeScript** für typisierte Entwicklung
- **Prisma ORM** für Datenbankzugriff
- **PostgreSQL** als Datenbank
- **JWT** für Authentifizierung
- **Winston** für Logging

### DevOps & Deployment
- **Docker** für Containerisierung
- **Docker Compose** für lokale Entwicklung
- Vorbereitet für **Kubernetes** Deployment
- CI/CD Pipeline bereit

## 📦 Installation

### Voraussetzungen
- Node.js 18+
- PostgreSQL 13+
- npm oder yarn

### 1. Repository klonen
```bash
git clone <repository-url>
cd Dienstplan_OKJA_App
```

### 2. Dependencies installieren
```bash
# Alle Dependencies installieren
npm run install:all

# Oder einzeln:
npm install          # Root-Dependencies
npm run install:frontend
npm run install:backend
```

### 3. Datenbank einrichten
```bash
# PostgreSQL Datenbank erstellen
createdb dienstplan_db

# Environment-Datei kopieren und anpassen
cp backend/.env.example backend/.env

# Datenbank-Schema erstellen
cd backend
npm run db:migrate
npm run db:generate
```

### 4. Anwendung starten
```bash
# Entwicklungsserver (Frontend + Backend gleichzeitig)
npm run dev

# Oder separat:
npm run dev:frontend  # http://localhost:3000
npm run dev:backend   # http://localhost:5000
```

## 🏗 Projektstruktur

```
Dienstplan_OKJA_App/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/       # React Komponenten
│   │   │   ├── Calendar/     # Kalender-Views
│   │   │   ├── Employees/    # Mitarbeiter-Management
│   │   │   ├── Organizations/# Organisationseinheiten
│   │   │   └── ShiftTypes/   # Schichttypen
│   │   ├── store/           # Redux Store & Slices
│   │   ├── services/        # API Services
│   │   └── types/           # TypeScript Definitionen
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # Node.js Backend
│   ├── src/
│   │   ├── routes/          # API Routen
│   │   ├── middleware/      # Express Middleware
│   │   ├── utils/           # Utilities
│   │   └── server.ts        # Express Server
│   ├── prisma/
│   │   ├── schema.prisma    # Datenbankschema
│   │   └── migrations/      # Datenbank-Migrationen
│   └── package.json
└── package.json            # Monorepo Root
```

## 🔧 Entwicklung

### Wichtige Scripts
```bash
# Entwicklung
npm run dev                  # Vollständige Entwicklungsumgebung
npm run dev:frontend        # Nur Frontend
npm run dev:backend         # Nur Backend

# Build
npm run build               # Alles bauen
npm run build:frontend     # Frontend bauen
npm run build:backend      # Backend bauen

# Datenbank
npm run db:migrate         # Prisma Migrationen ausführen
npm run db:generate        # Prisma Client generieren
npm run db:seed           # Testdaten einfügen

# Tests
npm test                   # Alle Tests ausführen
npm run test:frontend     # Frontend Tests
npm run test:backend      # Backend Tests
```

### API Dokumentation
Die API läuft standardmäßig auf `http://localhost:5000`

#### Hauptendpunkte:
- `POST /api/auth/login` - Benutzer-Anmeldung
- `GET /api/employees` - Mitarbeiter auflisten
- `POST /api/employees` - Neuen Mitarbeiter anlegen
- `GET /api/organizations` - Organisationseinheiten auflisten
- `GET /api/shift-types` - Schichttypen auflisten
- `GET /api/shifts` - Schichten auflisten
- `POST /api/shifts` - Neue Schicht anlegen

### Keyboard Shortcuts
- `N`: Neue Schicht anlegen
- `E`: Ausgewählte Schicht editieren
- `Entf`: Ausgewählte Schicht löschen
- `Strg + ←/→`: Wochen vor/zurück springen
- `Strg + M`: Zur Monatsansicht wechseln

## 🚀 Deployment

### Docker
```bash
# Development mit Docker Compose
docker-compose up -d

# Production Build
docker build -t dienstplan-app .
```

### Environment Variables
Wichtige Umgebungsvariablen in `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/dienstplan_db
JWT_SECRET=your-super-secret-key
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
```

## 👥 Mitwirkende

Entwickelt für die Jugendarbeit von der Jugendhaus-Community.

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei für Details.

## 🆘 Support

Bei Fragen oder Problemen:
1. Schauen Sie in die [Issues](../../issues)
2. Erstellen Sie ein neues Issue
3. Kontaktieren Sie das Entwicklungsteam

---

**Made with ❤️ for Jugendarbeit**
