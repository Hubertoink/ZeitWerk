# Implementierungsplan: Öffnungszeiten & Events

## Phase 1: Datenstruktur erweitern

### A) Organization-Schema erweitern
```json
{
  "id": 1,
  "name": "Jugendhaus Nord",
  "openingHours": {
    "monday": { "open": "14:00", "close": "20:00", "closed": false },
    "tuesday": { "open": "14:00", "close": "20:00", "closed": false },
    "wednesday": { "open": "14:00", "close": "20:00", "closed": false },
    "thursday": { "open": "14:00", "close": "20:00", "closed": false },
    "friday": { "open": "14:00", "close": "22:00", "closed": false },
    "saturday": { "closed": true },
    "sunday": { "closed": true }
  },
  "specialOpenings": []
}
```

### B) Neue Event-Schichttypen
```json
{
  "name": "Veranstaltung",
  "category": "event",
  "color": "#FF5722",
  "priority": 10
}
```

## Phase 2: Wochenansicht erweitern

### A) Header-Erweiterung (WeekView.tsx)
- Zeile 890-940: Header-Zellen um Öffnungszeiten erweitern
- Format: "🕐 14:00-20:00" oder "Geschlossen"

### B) Visuelle Indikatoren
- Geschlossene Zeiten: Grauer Hintergrund
- Reduzierte Öffnungszeiten: Orange markiert
- Normale Öffnungszeiten: Standard

### C) Organisations-Chip erweitern
- Zeile 867-878: Zusätzlicher Chip mit Wochen-Übersicht
- Format: "🕐 Mo-Fr 14-20h, Sa+So geschl."

## Phase 3: Organisation-Detail-Ansicht

### A) Neue Komponente: OrganizationDetail.tsx
- Tab 1: Grunddaten (bestehend)
- Tab 2: Öffnungszeiten Editor
- Tab 3: Events & Sonderöffnungen

### B) Öffnungszeiten-Editor
- Wochentags-Grid mit Time-Picker
- Toggle für "Geschlossen"
- Saisonale Anpassungen

## Phase 4: Integration & Testing

### A) Backend-Erweiterung
- json-db.js um openingHours erweitern
- IPC-Handler für Organization-Updates

### B) State Management
- organizationSlice um openingHours erweitern
- Selektoren für aktuelle Öffnungszeiten

## Benutzer-Benefits:

✅ **Planer sehen sofort**: Wann ist geöffnet?
✅ **Verhindert Fehler**: Keine Schichten in Schließzeiten
✅ **Bessere Übersicht**: Öffnungszeiten direkt in der Planungsansicht
✅ **Event-Support**: Sonderöffnungen für Veranstaltungen
✅ **Multi-Organisation**: Jede Organisation hat eigene Zeiten
