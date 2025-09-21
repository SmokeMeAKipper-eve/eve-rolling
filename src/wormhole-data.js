// EVE Online Wormhole Data
// Comprehensive database of all wormhole types with mass limits and ship restrictions

// Ship restriction level mappings
const RESTRICTION_LEVELS = {
  1: 'up to Destroyer',        // 5M kg jump mass
  2: 'up to Battlecruiser',   // 62M kg jump mass  
  3: 'up to Battleship',      // 375M kg jump mass
  4: 'up to Freighter',       // 1B kg jump mass
  5: 'up to Capital'          // 2B kg jump mass
};

// Convert mass strings to gigagrams (Gg)
const convertMassToGg = (massStr) => {
  const massValue = parseInt(massStr.replace(/[^0-9]/g, ''));
  return massValue / 1000; // Convert kg to Gg
};

// Wormhole database - extracted from EVE Online data
const WORMHOLE_DATA = {
  // Frigate Holes (Small - up to Destroyer)
  'A009': { totalMass: 3000, restriction: 1, destination: 'C13' },
  'C008': { totalMass: 3000, restriction: 1, destination: 'C5' },
  'E004': { totalMass: 3000, restriction: 1, destination: 'C1' },
  'G008': { totalMass: 3000, restriction: 1, destination: 'C6' },
  'L005': { totalMass: 3000, restriction: 1, destination: 'C2' },
  'M001': { totalMass: 3000, restriction: 1, destination: 'C4' },
  'Q003': { totalMass: 3000, restriction: 1, destination: 'NS' },
  'Z006': { totalMass: 3000, restriction: 1, destination: 'C3' },
  
  // Medium Holes (up to Battlecruiser)
  'C125': { totalMass: 1000, restriction: 2, destination: 'C2' },
  'H121': { totalMass: 500, restriction: 2, destination: 'C1' },
  'J244': { totalMass: 1000, restriction: 2, destination: 'LS' },
  'J377': { totalMass: 1000, restriction: 2, destination: 'LS' },
  'J492': { totalMass: 1000, restriction: 2, destination: 'LS' },
  'L614': { totalMass: 1000, restriction: 2, destination: 'C5' },
  'M609': { totalMass: 1000, restriction: 2, destination: 'C4' },
  'N110': { totalMass: 1000, restriction: 2, destination: 'HS' },
  'O883': { totalMass: 1000, restriction: 2, destination: 'C3' },
  'P060': { totalMass: 500, restriction: 2, destination: 'C1' },
  'Q063': { totalMass: 500, restriction: 2, destination: 'HS' },
  'Q317': { totalMass: 500, restriction: 2, destination: 'C1' },
  'S804': { totalMass: 1000, restriction: 2, destination: 'C6' },
  'T458': { totalMass: 500, restriction: 2, destination: 'Thera' },
  'V301': { totalMass: 500, restriction: 2, destination: 'C1' },
  'Y790': { totalMass: 500, restriction: 2, destination: 'C1' },
  'Z060': { totalMass: 1000, restriction: 2, destination: 'NS' },
  'Z647': { totalMass: 500, restriction: 2, destination: 'C1' },
  'Z971': { totalMass: 100, restriction: 2, destination: 'C1' },
  'F353': { totalMass: 100, restriction: 2, destination: 'Thera' },
  
  // Large Holes (up to Battleship)
  'A239': { totalMass: 2000, restriction: 3, destination: 'LS' },
  'A982': { totalMass: 3000, restriction: 3, destination: 'C6' },
  'B274': { totalMass: 2000, restriction: 3, destination: 'HS' },
  'C247': { totalMass: 2000, restriction: 3, destination: 'C3' },
  'D364': { totalMass: 1000, restriction: 3, destination: 'C2' },
  'D382': { totalMass: 2000, restriction: 3, destination: 'C2' },
  'D845': { totalMass: 5000, restriction: 3, destination: 'HS' },
  'E175': { totalMass: 2000, restriction: 3, destination: 'C4' },
  'E545': { totalMass: 2000, restriction: 3, destination: 'NS' },
  'F135': { totalMass: 750, restriction: 3, destination: 'Thera' },
  'F216': { totalMass: 1000, restriction: 3, destination: 'Pochven' },
  'G024': { totalMass: 2000, restriction: 3, destination: 'C2' },
  'I182': { totalMass: 2000, restriction: 3, destination: 'C2' },
  'K329': { totalMass: 3000, restriction: 3, destination: 'NS' },
  'K346': { totalMass: 3000, restriction: 3, destination: 'NS' },
  'L477': { totalMass: 2000, restriction: 3, destination: 'C3' },
  'M267': { totalMass: 1000, restriction: 3, destination: 'C3' },
  'N062': { totalMass: 3000, restriction: 3, destination: 'C5' },
  'N290': { totalMass: 3000, restriction: 3, destination: 'LS' },
  'N766': { totalMass: 2000, restriction: 3, destination: 'C2' },
  'N770': { totalMass: 3000, restriction: 3, destination: 'C5' },
  'N968': { totalMass: 2000, restriction: 3, destination: 'C3' },
  'O128': { totalMass: 1000, restriction: 3, destination: 'C4' },
  'O477': { totalMass: 2000, restriction: 3, destination: 'C3' },
  'R943': { totalMass: 750, restriction: 3, destination: 'C2' },
  'S047': { totalMass: 3000, restriction: 3, destination: 'HS' },
  'T405': { totalMass: 2000, restriction: 3, destination: 'C4' },
  'U210': { totalMass: 3000, restriction: 3, destination: 'LS' },
  'U574': { totalMass: 3000, restriction: 3, destination: 'C6' },
  'X702': { totalMass: 1000, restriction: 3, destination: 'C3' },
  'X877': { totalMass: 2000, restriction: 3, destination: 'C4' },
  'Y683': { totalMass: 2000, restriction: 3, destination: 'C4' },
  'Z457': { totalMass: 2000, restriction: 3, destination: 'C4' },
  'H900': { totalMass: 3000, restriction: 3, destination: 'C5' },
  'R474': { totalMass: 3000, restriction: 3, destination: 'C6' },
  'B735': { totalMass: 750, restriction: 3, destination: 'Drifter' },
  'C414': { totalMass: 750, restriction: 3, destination: 'Drifter' },
  'R259': { totalMass: 750, restriction: 3, destination: 'Drifter' },
  'S877': { totalMass: 750, restriction: 3, destination: 'Drifter' },
  'V928': { totalMass: 750, restriction: 3, destination: 'Drifter' },
  'R081': { totalMass: 1000, restriction: 3, destination: 'C4' },
  'X450': { totalMass: 1000, restriction: 3, destination: 'NS' },
  'U372': { totalMass: 1000, restriction: 3, destination: 'Pochven' },
  
  // Extra Large Holes (up to Freighter) 
  'A641': { totalMass: 2000, restriction: 4, destination: 'HS' },
  'B041': { totalMass: 3000, restriction: 4, destination: 'C6' },
  'B449': { totalMass: 2000, restriction: 4, destination: 'HS' },
  'B520': { totalMass: 3000, restriction: 4, destination: 'HS' },
  'D792': { totalMass: 3000, restriction: 4, destination: 'HS' },
  'E587': { totalMass: 3000, restriction: 4, destination: 'NS' },
  'L031': { totalMass: 3000, restriction: 4, destination: 'Thera' },
  'M164': { totalMass: 2000, restriction: 4, destination: 'Thera' },
  'M555': { totalMass: 3000, restriction: 4, destination: 'C5' },
  'R051': { totalMass: 3000, restriction: 4, destination: 'LS' },
  'V283': { totalMass: 3000, restriction: 4, destination: 'NS' },
  'V898': { totalMass: 2000, restriction: 4, destination: 'LS' },
  'C729': { totalMass: 1000, restriction: 4, destination: 'Pochven' },
  
  // Capital Holes (up to Capital)
  'C140': { totalMass: 3300, restriction: 5, destination: 'LS' },
  'C248': { totalMass: 3300, restriction: 5, destination: 'NS' },
  'C391': { totalMass: 3300, restriction: 5, destination: 'LS' },
  'H296': { totalMass: 3300, restriction: 5, destination: 'C5' },
  'N432': { totalMass: 3300, restriction: 5, destination: 'C5' },
  'N944': { totalMass: 3300, restriction: 5, destination: 'LS' },
  'S199': { totalMass: 3300, restriction: 5, destination: 'NS' },
  'U319': { totalMass: 3300, restriction: 5, destination: 'C6' },
  'V753': { totalMass: 3300, restriction: 5, destination: 'C6' },
  'V911': { totalMass: 3300, restriction: 5, destination: 'C5' },
  'W237': { totalMass: 3300, restriction: 5, destination: 'C6' },
  'Z142': { totalMass: 3300, restriction: 5, destination: 'NS' },
};

// Special wormholes that don't follow standard naming conventions
const SPECIAL_WORMHOLES = {
  'K162': { totalMass: 0, restriction: 0, destination: 'Variable', special: 'Exit hole - varies by origin' },
  '⛮': { totalMass: 0, restriction: 0, destination: 'Drifter', special: 'Drifter wormhole' }
};

// Get wormhole info by code
function getWormholeInfo(whCode) {
  const wh = WORMHOLE_DATA[whCode] || SPECIAL_WORMHOLES[whCode];
  if (!wh) return null;
  
  return {
    code: whCode,
    totalMass: wh.totalMass,
    restriction: wh.restriction,
    restrictionText: RESTRICTION_LEVELS[wh.restriction] || 'Variable',
    destination: wh.destination,
    special: wh.special || null
  };
}

// Get all wormhole codes
function getAllWormholeCodes() {
  return [...Object.keys(WORMHOLE_DATA), ...Object.keys(SPECIAL_WORMHOLES)].sort();
}

// Get wormholes by restriction level
function getWormholesByRestriction(restrictionLevel) {
  return Object.entries(WORMHOLE_DATA)
    .filter(([code, data]) => data.restriction === restrictionLevel)
    .map(([code]) => code);
}

// Get wormholes by destination
function getWormholesByDestination(destination) {
  return Object.entries(WORMHOLE_DATA)
    .filter(([code, data]) => data.destination === destination)
    .map(([code]) => code);
}

// Get wormholes by mass range
function getWormholesByMassRange(minMass, maxMass) {
  return Object.entries(WORMHOLE_DATA)
    .filter(([code, data]) => data.totalMass >= minMass && data.totalMass <= maxMass)
    .map(([code]) => code);
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WORMHOLE_DATA,
    SPECIAL_WORMHOLES,
    RESTRICTION_LEVELS,
    getWormholeInfo,
    getAllWormholeCodes,
    getWormholesByRestriction,
    getWormholesByDestination,  
    getWormholesByMassRange
  };
}

// Make available globally for browser
if (typeof window !== 'undefined') {
  window.WORMHOLE_DATA = WORMHOLE_DATA;
  window.SPECIAL_WORMHOLES = SPECIAL_WORMHOLES;
  window.RESTRICTION_LEVELS = RESTRICTION_LEVELS;
  window.getWormholeInfo = getWormholeInfo;
  window.getAllWormholeCodes = getAllWormholeCodes;
  window.getWormholesByRestriction = getWormholesByRestriction;
  window.getWormholesByDestination = getWormholesByDestination;
  window.getWormholesByMassRange = getWormholesByMassRange;
}