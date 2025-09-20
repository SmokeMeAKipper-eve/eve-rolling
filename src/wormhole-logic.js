// EVE Online wormhole rolling business logic
// Extracted for unit testing

const SHIP_TYPES = {
  'rbs': { name: 'Rolling Battleship', cold: 200, hot: 300 },
  'rhic': { name: 'Rolling Hictor', cold: 1, hot: 65 },
  'carrier': { name: 'Carrier', cold: 1250, hot: 1750 },
  'bs': { name: 'Battleship', cold: 100, hot: 150 },
  'marauder': { name: 'Marauder', cold: 160, hot: 210 },
  'cruiser': { name: 'Cruiser', cold: 13, hot: 63 }
};

const WORMHOLE_MASS_TYPES = [100, 500, 750, 1000, 2000, 3000, 3300, 5000];

const SHIP_MODES = {
  'cold': 'Cold',
  'unknown': 'Unknown',
  'hot': 'Hot',
  'custom': 'Custom'
};

const WORMHOLE_STATES = {
  'fresh': 'Fresh',
  'stable': 'Stable',
  'destab': 'Destab',
  'critical': 'Critical',
  'gone': 'Gone'
};

class Wormhole {
  constructor(massType, state, passedMass = 'fresh') {
    this.baseMass = massType; // Keep as simple integer (e.g. 3000)
    this.variance = 0.1;
    this.state = state;
    this.passedMass = passedMass;
  }
  
  getMinMass() {
    return Math.round(this.baseMass * (1 - this.variance));
  }
  
  getMaxMass() {
    return Math.round(this.baseMass * (1 + this.variance));
  }
  
  getStateText() {
    return WORMHOLE_STATES[this.state];
  }
  
  getCurrentMassRange() {
    // This returns the initial/display mass range
    const minBase = this.getMinMass();
    const maxBase = this.getMaxMass();
    
    switch (this.state) {
      case 'fresh':
        return { min: minBase, max: maxBase }; // Full range for fresh display
      case 'stable':
        return { min: Math.round(minBase * 0.5), max: maxBase };
      case 'destab':
        return { min: Math.round(minBase * 0.1), max: Math.round(maxBase * 0.5) };
      case 'critical':
        return { min: Math.round(minBase * 0.0), max: Math.round(maxBase * 0.1) };
      case 'gone':
        return { min: -5000, max: 0 }; // -5000 Gg to 0 Gg
      default:
        return { min: minBase, max: maxBase };
    }
  }
  
  getStateBoundaries() {
    // This returns the boundaries used for state calculations/constraints
    const minBase = this.getMinMass();
    const maxBase = this.getMaxMass();
    
    switch (this.state) {
      case 'fresh':
        return { min: Math.round(minBase * 0.5), max: maxBase }; // Fresh uses Stable boundaries for calculations
      case 'stable':
        return { min: Math.round(minBase * 0.5), max: maxBase };
      case 'destab':
        return { min: Math.round(minBase * 0.1), max: Math.round(maxBase * 0.5) };
      case 'critical':
        return { min: Math.round(minBase * 0.0), max: Math.round(maxBase * 0.1) };
      case 'gone':
        return { min: -5000, max: 0 }; // -5000 Gg to 0 Gg
      default:
        return { min: Math.round(minBase * 0.5), max: maxBase };
    }
  }
}

class Ship {
  constructor(type, mode) {
    this.type = type;
    this.mode = mode;
  }
  
  getMass() {
    const shipData = SHIP_TYPES[this.type];
    if (!shipData) return { min: 0, max: 0 };
    
    if (this.mode === 'unknown') {
      return {
        min: shipData.cold || 0,  // Cold is minimum mass
        max: shipData.hot || 0    // Hot is maximum mass
      };
    }
    
    const mass = shipData[this.mode];
    return typeof mass === 'number' ? { min: mass, max: mass } : { min: 0, max: 0 };
  }
  
  getMassText() {
    const mass = this.getMass();
    if (this.mode === 'unknown') {
      return `${mass.min > 0 ? `-${mass.min} (min)` : '-'} / ${mass.max > 0 ? `-${mass.max} (max)` : '-'} Gg`;
    }
    return mass.min > 0 ? `-${mass.min} Gg` : '-';
  }
  
  getDisplayName() {
    return `${SHIP_TYPES[this.type].name} (${SHIP_MODES[this.mode]})`;
  }
}

class CustomMass {
  constructor(mass) {
    this.mass = mass;
  }
  
  getMass() {
    return { min: this.mass, max: this.mass };
  }
  
  getMassText() {
    return `-${this.mass} Gg`;
  }
  
  getDisplayName() {
    return 'Custom';
  }
}

class Action {
  constructor(ship, direction) {
    this.ship = ship;
    this.direction = direction;
  }
  
  getDirectionText() {
    return this.direction === 'A' ? '<< Incoming' : 'Outgoing >>';
  }
  
  applyToMass(currentMass, wormholeState = null) {
    const shipMass = this.ship.getMass();
    let newMass;
    
    if (shipMass.min === shipMass.max) {
      // Exact mass (hot/cold modes) - subtract same amount from both
      const massToSubtract = shipMass.min;
      newMass = {
        min: Math.max(0, currentMass.min - massToSubtract),
        max: Math.max(0, currentMass.max - massToSubtract)
      };
    } else {
      // Unknown mode - use range
      newMass = {
        min: Math.max(0, currentMass.min - shipMass.max), // Use max ship mass for min remaining
        max: Math.max(0, currentMass.max - shipMass.min)  // Use min ship mass for max remaining
      };
    }
    
    // Only apply state boundary constraints if state is explicitly provided
    // When null, this is a raw calculation without state constraints
    if (wormholeState) {
      const stateBoundaries = wormholeState.getStateBoundaries();
      newMass.min = Math.max(newMass.min, stateBoundaries.min);
      newMass.max = Math.min(newMass.max, stateBoundaries.max);
      
      // Ensure min doesn't exceed max after boundary constraints
      newMass.min = Math.min(newMass.min, newMass.max);
    }
    
    return newMass;
  }
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHIP_TYPES,
    WORMHOLE_MASS_TYPES,
    SHIP_MODES,
    WORMHOLE_STATES,
    Wormhole,
    Ship,
    CustomMass,
    Action
  };
}

// Make available globally for browser
if (typeof window !== 'undefined') {
  window.SHIP_TYPES = SHIP_TYPES;
  window.WORMHOLE_MASS_TYPES = WORMHOLE_MASS_TYPES;
  window.SHIP_MODES = SHIP_MODES;
  window.WORMHOLE_STATES = WORMHOLE_STATES;
  window.Wormhole = Wormhole;
  window.Ship = Ship;
  window.CustomMass = CustomMass;
  window.Action = Action;
}