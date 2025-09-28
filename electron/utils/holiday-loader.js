/**
 * Holiday Loader Utility für Backend
 * Lädt deutsche Feiertage von der API und stellt sie für das Backend bereit
 */

const https = require('https');

// Deutsche Bundesländer
const GERMAN_STATES = {
  'ALL': 'Alle Bundesländer',
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern', 
  'BE': 'Berlin',
  'BB': 'Brandenburg',
  'HB': 'Bremen',
  'HH': 'Hamburg',
  'HE': 'Hessen',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'SH': 'Schleswig-Holstein',
  'TH': 'Thüringen'
};

/**
 * Lädt deutsche Feiertage von der API
 */
async function getGermanHolidays(year, state = 'ALL') {
  return new Promise((resolve, reject) => {
    const stateParam = state === 'ALL' ? '' : `&nur_land=${state}`;
    const url = `https://feiertage-api.de/api/?jahr=${year}${stateParam}`;
    
    console.log(`🌐 Fetching holidays from: ${url}`);
    
    const req = https.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            throw new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
          }
          
          const apiData = JSON.parse(data);
          const holidays = [];
          
          // API Response Format: { "Neujahr": "2025-01-01", "Heilige Drei Könige": { "datum": "2025-01-06", "hinweis": "nur in BW, BY, ST" } }
          Object.entries(apiData).forEach(([name, dateInfo]) => {
            let date;
            let hinweis = null;
            
            if (typeof dateInfo === 'string') {
              date = dateInfo;
            } else if (dateInfo && dateInfo.datum) {
              date = dateInfo.datum;
              hinweis = dateInfo.hinweis;
            } else {
              return; // Skip invalid entries
            }
            
            holidays.push({
              date: date,
              name: name,
              type: 'public',
              state: state === 'ALL' ? null : state,
              note: hinweis
            });
          });
          
          console.log(`✅ Loaded ${holidays.length} holidays for ${state} ${year}`);
          resolve(holidays.sort((a, b) => new Date(a.date) - new Date(b.date)));
          
        } catch (error) {
          console.error(`❌ Failed to parse API response for ${year}:`, error);
          reject(error);
        }
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout for ${year}`));
    });
    
    req.on('error', (error) => {
      console.error(`❌ Network error loading holidays for ${year}:`, error);
      reject(error);
    });
  });
}

/**
 * Lädt Feiertage für mehrere Jahre
 */
async function loadHolidaysForYearRange(fromYear, toYear, state = 'ALL') {
  const allHolidays = [];
  const errors = [];
  
  for (let year = fromYear; year <= toYear; year++) {
    try {
      const holidays = await getGermanHolidays(year, state);
      allHolidays.push(...holidays);
      
      // Kurze Pause zwischen API-Calls um Rate-Limiting zu vermeiden
      if (year < toYear) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`❌ Failed to load holidays for ${year}:`, error);
      errors.push({ year, error: error.message });
    }
  }
  
  return {
    holidays: allHolidays,
    errors: errors,
    totalCount: allHolidays.length,
    yearRange: `${fromYear}-${toYear}`,
    state: state
  };
}

/**
 * Fallback: Grundlegende deutsche Feiertage berechnen (ohne API)
 */
function getBasicGermanHolidays(year) {
  const holidays = [
    { date: `${year}-01-01`, name: 'Neujahr', type: 'public' },
    { date: `${year}-05-01`, name: 'Tag der Arbeit', type: 'public' },
    { date: `${year}-10-03`, name: 'Tag der Deutschen Einheit', type: 'public' },
    { date: `${year}-12-25`, name: '1. Weihnachtsfeiertag', type: 'public' },
    { date: `${year}-12-26`, name: '2. Weihnachtsfeiertag', type: 'public' }
  ];

  // Osterfeiertage berechnen
  const easter = calculateEasterDate(year);
  const easterString = easter.toISOString().split('T')[0];
  
  holidays.push(
    { 
      date: addDays(easter, -2).toISOString().split('T')[0], 
      name: 'Karfreitag', 
      type: 'public' 
    },
    { 
      date: easterString, 
      name: 'Ostersonntag', 
      type: 'public' 
    },
    { 
      date: addDays(easter, 1).toISOString().split('T')[0], 
      name: 'Ostermontag', 
      type: 'public' 
    },
    { 
      date: addDays(easter, 39).toISOString().split('T')[0], 
      name: 'Christi Himmelfahrt', 
      type: 'public' 
    },
    { 
      date: addDays(easter, 50).toISOString().split('T')[0], 
      name: 'Pfingstmontag', 
      type: 'public' 
    }
  );

  return holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Helper functions
function calculateEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

module.exports = {
  getGermanHolidays,
  loadHolidaysForYearRange,
  getBasicGermanHolidays,
  GERMAN_STATES
};
