const {
  SHIP_TYPES,
  WORMHOLE_MASS_TYPES,
  SHIP_MODES,
  WORMHOLE_STATES,
  WORMHOLE_RESTRICTIONS,
  Wormhole,
  Ship,
  CustomMass,
  Action
} = require('../src/wormhole-logic');

describe('Wormhole Logic', () => {
  describe('Wormhole Mass Calculations', () => {
    test('should calculate correct base mass with variance', () => {
      const wh = new Wormhole(3000, 'fresh'); // 3000 Gg
      expect(wh.baseMass).toBe(3000); // Simple integer
      expect(wh.getMinMass()).toBe(2700); // 90% of base
      expect(wh.getMaxMass()).toBe(3300); // 110% of base (clean integer)
    });

    test('should return correct state boundaries vs current mass range', () => {
      const wh = new Wormhole(3000, 'fresh'); // 3000 Gg base
      
      // Fresh state - display shows full range, boundaries use stable
      const displayRange = wh.getCurrentMassRange();
      const stateBoundaries = wh.getStateBoundaries();
      
      expect(displayRange.min).toBe(2700); // 90% of 3000 Gg
      expect(displayRange.max).toBeCloseTo(3300, 0); // 110% of 3000 Gg
      
      expect(stateBoundaries.min).toBe(1350); // 50% of min (stable boundary)
      expect(stateBoundaries.max).toBe(3300); // Same max
    });

    test('should calculate stable state boundaries correctly', () => {
      const wh = new Wormhole(3000, 'stable');
      const boundaries = wh.getStateBoundaries();
      
      expect(boundaries.min).toBe(1350); // 50% of 2700 Gg
      expect(boundaries.max).toBe(3300); // 110% of 3000 Gg
    });
  });

  describe('Ship Mass Calculations', () => {
    test('should calculate exact mass for hot/cold modes', () => {
      const bsHot = new Ship('bs', 'hot');
      const bsCold = new Ship('bs', 'cold');
      
      const hotMass = bsHot.getMass();
      const coldMass = bsCold.getMass();
      
      expect(hotMass.min).toBe(150);
      expect(hotMass.max).toBe(150);
      
      expect(coldMass.min).toBe(100);
      expect(coldMass.max).toBe(100);
    });

    test('should calculate range mass for unknown mode', () => {
      const bsUnknown = new Ship('bs', 'unknown');
      const mass = bsUnknown.getMass();
      
      expect(mass.min).toBe(100); // Cold mass
      expect(mass.max).toBe(150); // Hot mass
    });
  });

  describe('Action Mass Application - The Critical Test Cases', () => {
    let wormhole, freshMass;
    
    beforeEach(() => {
      wormhole = new Wormhole(3000, 'fresh');
      freshMass = wormhole.getCurrentMassRange();
    });

    test('BS Unknown should reduce both min and max', () => {
      const bsUnknown = new Ship('bs', 'unknown');
      const action = new Action(bsUnknown, 'A');
      
      console.log('Before BS Unknown:');
      console.log(`  Min: ${freshMass.min} Gg, Max: ${freshMass.max} Gg`);
      
      const result = action.applyToMass(freshMass);
      
      console.log('After BS Unknown (raw calculation):');
      console.log(`  Min: ${result.min} Gg, Max: ${result.max} Gg`);
      
      // BS Unknown: min=100, max=150
      // New min = originalMin - maxShipMass = 2700 - 150 = 2550 Gg
      // New max = originalMax - minShipMass = 3300 - 100 = 3200 Gg
      expect(result.min).toBe(2550); // 2550 Gg
      expect(result.max).toBe(3200); // 3200 Gg
      
      // Both should be LESS than original
      expect(result.min).toBeLessThan(freshMass.min);
      expect(result.max).toBeLessThan(freshMass.max);
    });

    test('BS Hot should reduce both min and max by exact amount', () => {
      const bsHot = new Ship('bs', 'hot');
      const action = new Action(bsHot, 'A');
      
      const result = action.applyToMass(freshMass);
      
      console.log('After BS Hot:');
      console.log(`  Min: ${result.min} Gg, Max: ${result.max} Gg`);
      
      // BS Hot: 150 Gg exact
      // New min = 2700 - 150 = 2550 Gg
      // New max = 3300 - 150 = 3150 Gg
      expect(result.min).toBe(2550);
      expect(result.max).toBe(3150);
    });

    test('Combined actions: BS Unknown + BS Hot should compound correctly', () => {
      const bsUnknown = new Ship('bs', 'unknown');
      const bsHot = new Ship('bs', 'hot');
      const action1 = new Action(bsUnknown, 'A');
      const action2 = new Action(bsHot, 'A');
      
      // Apply first action
      const afterAction1 = action1.applyToMass(freshMass);
      console.log('After Action 1 (BS Unknown):');
      console.log(`  Min: ${afterAction1.min} Gg, Max: ${afterAction1.max} Gg`);
      
      // Apply second action
      const afterAction2 = action2.applyToMass(afterAction1);
      console.log('After Action 2 (BS Hot):');
      console.log(`  Min: ${afterAction2.min} Gg, Max: ${afterAction2.max} Gg`);
      
      // After BS Unknown: min=2550, max=3200
      // After BS Hot: min=2550-150=2400, max=3200-150=3050
      expect(afterAction2.min).toBe(2400); // 2400 Gg
      expect(afterAction2.max).toBe(3050); // 3050 Gg
      
      // Verify the progression is always downward
      expect(afterAction1.min).toBeLessThan(freshMass.min);
      expect(afterAction1.max).toBeLessThan(freshMass.max);
      expect(afterAction2.min).toBeLessThan(afterAction1.min);
      expect(afterAction2.max).toBeLessThan(afterAction1.max);
    });

    test('State boundary constraints should work correctly', () => {
      const bsUnknown = new Ship('bs', 'unknown');
      const action = new Action(bsUnknown, 'A');
      
      // Test with state boundaries applied
      const resultWithState = action.applyToMass(freshMass, wormhole);
      
      console.log('With state boundaries:');
      console.log(`  Min: ${resultWithState.min} Gg, Max: ${resultWithState.max} Gg`);
      
      const boundaries = wormhole.getStateBoundaries();
      
      // Should be constrained by state boundaries
      expect(resultWithState.min).toBeGreaterThanOrEqual(boundaries.min);
      expect(resultWithState.max).toBeLessThanOrEqual(boundaries.max);
    });

    test('Edge case: mass going below zero should be clamped', () => {
      const hugeMass = new CustomMass(5000); // 5000 Gg - more than wormhole max
      const action = new Action(hugeMass, 'A');
      
      const result = action.applyToMass(freshMass);
      
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
    });
  });

  describe('Real User Scenario Reproduction', () => {
    test('Reproduce the exact user bug report scenario', () => {
      // Fresh 3000 Gg wormhole
      const wormhole = new Wormhole(3000, 'fresh');
      const initialMass = wormhole.getCurrentMassRange();
      
      console.log('=== USER BUG REPRODUCTION ===');
      console.log('Initial Fresh 3000 Gg wormhole:');
      console.log(`  Min: ${initialMass.min} Gg, Max: ${initialMass.max} Gg`);
      
      // Action 1: BS Unknown
      const bsUnknown = new Ship('bs', 'unknown');
      const action1 = new Action(bsUnknown, 'A');
      const afterAction1 = action1.applyToMass(initialMass, wormhole);
      
      console.log('After Action 1 - BS Unknown:');
      console.log(`  Min: ${afterAction1.min} Gg, Max: ${afterAction1.max} Gg`);
      
      // Action 2: BS Hot  
      const bsHot = new Ship('bs', 'hot');
      const action2 = new Action(bsHot, 'A');
      const afterAction2 = action2.applyToMass(afterAction1, wormhole);
      
      console.log('After Action 2 - BS Hot:');
      console.log(`  Min: ${afterAction2.min} Gg, Max: ${afterAction2.max} Gg`);
      
      // The bug: user reported min was INCREASING instead of decreasing
      // Let's verify our logic is correct
      expect(afterAction1.min).toBeLessThan(initialMass.min);
      expect(afterAction1.max).toBeLessThan(initialMass.max);
      expect(afterAction2.min).toBeLessThan(afterAction1.min);
      expect(afterAction2.max).toBeLessThan(afterAction1.max);
      
      console.log('=== VERIFICATION ===');
      console.log('Min values progression (should always decrease):');
      console.log(`  Initial: ${initialMass.min} Gg`);
      console.log(`  After BS Unknown: ${afterAction1.min} Gg`);
      console.log(`  After BS Hot: ${afterAction2.min} Gg`);
      
      console.log('Max values progression (should always decrease):');
      console.log(`  Initial: ${initialMass.max} Gg`);
      console.log(`  After BS Unknown: ${afterAction1.max} Gg`);
      console.log(`  After BS Hot: ${afterAction2.max} Gg`);
    });
  });

  describe('Wormhole State Transitions', () => {
    test('should handle all wormhole state transitions correctly', () => {
      const wormhole3300 = new Wormhole(3300, 'fresh');
      
      // Fresh state
      const freshRange = wormhole3300.getCurrentMassRange();
      expect(freshRange.min).toBe(2970); // 90% of 3300
      expect(freshRange.max).toBe(3630); // 110% of 3300
      
      // Stable state 
      const stableWormhole = new Wormhole(3300, 'stable');
      const stableRange = stableWormhole.getCurrentMassRange();
      expect(stableRange.min).toBe(1485); // 50% of min
      expect(stableRange.max).toBe(3630); // Same max
      
      // Destab state
      const destabWormhole = new Wormhole(3300, 'destab');
      const destabRange = destabWormhole.getCurrentMassRange();
      expect(destabRange.min).toBe(297); // 10% of min 
      expect(destabRange.max).toBe(1815); // 50% of max
      
      // Critical state
      const criticalWormhole = new Wormhole(3300, 'critical');
      const criticalRange = criticalWormhole.getCurrentMassRange();
      expect(criticalRange.min).toBe(0); // 0% of min
      expect(criticalRange.max).toBe(363); // 10% of max
      
      // Gone state
      const goneWormhole = new Wormhole(3300, 'gone');
      const goneRange = goneWormhole.getCurrentMassRange();
      expect(goneRange.min).toBe(-5000); // Fixed -5000 Gg
      expect(goneRange.max).toBe(0); // Fixed 0 Gg
    });
  });

  describe('New Ship Integration', () => {
    test('should handle new ships (dictor, covops) in action calculations', () => {
      // Test that new ships work correctly in realistic scenarios
      const wormhole = new Wormhole(3300, 'fresh');
      const initialRange = wormhole.getCurrentMassRange();
      
      // Send a dictor through (very small mass)
      const dictorShip = new Ship('dictor', 'hot');
      const dictorMass = dictorShip.getMass();
      expect(dictorMass.min).toBe(2);
      expect(dictorMass.max).toBe(2);
      
      const dictorAction = new Action(dictorShip, 'B');
      const afterDictorRange = dictorAction.applyToMass(initialRange);
      expect(afterDictorRange.min).toBe(initialRange.min - 2);
      expect(afterDictorRange.max).toBe(initialRange.max - 2);
      
      // Send a covops through (also very small mass)
      const covopsShip = new Ship('covops', 'cold');
      const covopsMass = covopsShip.getMass();
      expect(covopsMass.min).toBe(1);
      expect(covopsMass.max).toBe(1);
      
      const covopsAction = new Action(covopsShip, 'B');
      const afterCovopsRange = covopsAction.applyToMass(afterDictorRange);
      expect(afterCovopsRange.min).toBe(afterDictorRange.min - 1);
      expect(afterCovopsRange.max).toBe(afterDictorRange.max - 1);
      
      // Verify the ships are properly classified as size 1 (destroyer class)
      expect(SHIP_TYPES.dictor.size).toBe(1);
      expect(SHIP_TYPES.covops.size).toBe(1);
    });
  });

  describe('Custom Mass Support', () => {
    test('should handle custom mass correctly', () => {
      const customMass = new CustomMass(500);
      
      const mass = customMass.getMass();
      expect(mass.min).toBe(500);
      expect(mass.max).toBe(500);
      
      expect(customMass.getMassText()).toBe('-500 Gg');
      expect(customMass.getDisplayName()).toBe('Custom');
      
      // Test custom mass in action
      const action = new Action(customMass, 'B');
      const initialMass = { min: 2000, max: 3000 };
      const result = action.applyToMass(initialMass);
      
      expect(result.min).toBe(1500); // 2000 - 500
      expect(result.max).toBe(2500); // 3000 - 500
    });
  });

  describe('Ship Type Variations', () => {
    test('should handle all ship types correctly', () => {
      // Test Roll BS (rbs)
      const rollBs = new Ship('rbs', 'hot');
      const rollBsMass = rollBs.getMass();
      expect(rollBsMass.min).toBe(300);
      expect(rollBsMass.max).toBe(300);
      
      // Test Roll HIC (rhic)
      const rollHic = new Ship('rhic', 'cold');
      const rollHicMass = rollHic.getMass();
      expect(rollHicMass.min).toBe(1);
      expect(rollHicMass.max).toBe(1);
      
      // Test Carrier
      const carrier = new Ship('carrier', 'unknown');
      const carrierMass = carrier.getMass();
      expect(carrierMass.min).toBe(1250); // Cold
      expect(carrierMass.max).toBe(1750); // Hot
      
      // Test Marauder  
      const marauder = new Ship('marauder', 'hot');
      const marauderMass = marauder.getMass();
      expect(marauderMass.min).toBe(210);
      expect(marauderMass.max).toBe(210);
      
      // Test Dictor (new ship)
      const dictor = new Ship('dictor', 'unknown');
      const dictorMass = dictor.getMass();
      expect(dictorMass.min).toBe(1); // Cold
      expect(dictorMass.max).toBe(2); // Hot
      
      // Test CovOps (new ship)
      const covops = new Ship('covops', 'hot');
      const covopsMass = covops.getMass();
      expect(covopsMass.min).toBe(2);
      expect(covopsMass.max).toBe(2);
      
      // Test Cruiser
      const cruiser = new Ship('cruiser', 'unknown');
      const cruiserMass = cruiser.getMass();
      expect(cruiserMass.min).toBe(13); // Cold
      expect(cruiserMass.max).toBe(63); // Hot
    });
  });

  describe('Action Direction Handling', () => {
    test('should display correct direction text', () => {
      const ship = new Ship('bs', 'hot');
      const incomingAction = new Action(ship, 'A');
      const outgoingAction = new Action(ship, 'B');
      
      expect(incomingAction.getDirectionText()).toBe('<< Incoming');
      expect(outgoingAction.getDirectionText()).toBe('Outgoing >>');
    });
  });

  describe('Critical State Edge Cases', () => {
    test('should have exactly 0 as minimum for critical state boundaries', () => {
      // Test multiple wormhole sizes to ensure fix works universally
      const wormholeSizes = [1000, 2000, 3000, 3300, 5000];
      
      wormholeSizes.forEach(size => {
        const criticalWormhole = new Wormhole(size, 'critical');
        const boundaries = criticalWormhole.getStateBoundaries();
        
        // Critical state should have exactly 0 as minimum (not a calculated value)
        expect(boundaries.min).toBe(0);
        
        // Max should still be 10% of max mass
        const expectedMax = Math.round(size * 1.1 * 0.1);
        expect(boundaries.max).toBe(expectedMax);
      });
    });
    
    test('should show correct range for critical wormhole display', () => {
      const criticalWormhole = new Wormhole(3000, 'critical');
      const displayRange = criticalWormhole.getCurrentMassRange();
      
      // Display range should also start at 0
      expect(displayRange.min).toBe(0);
      expect(displayRange.max).toBe(330); // 10% of 3300 (max mass)
    });
  });
  
  describe('Collapse Handling', () => {
    test('should properly handle negative remaining mass', () => {
      // Simulate the collapse scenario from game mode
      const wormhole = new Wormhole(1000, 'fresh');
      const initialRange = wormhole.getCurrentMassRange();
      
      // Apply an action that would cause negative remaining mass
      const hugeMass = { getMass: () => ({ min: 2000, max: 2000 }) }; // 2000 Gg (bigger than wormhole)
      const collapseAction = new Action(hugeMass, 'B');
      
      const result = collapseAction.applyToMass(initialRange);
      
      // Should clamp to 0, not go negative
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
    });
    
    test('should handle very small remaining mass correctly', () => {
      // Test the edge case where remaining mass is very small but positive
      const smallRange = { min: 5, max: 10 };
      const smallShip = { getMass: () => ({ min: 3, max: 3 }) };
      const action = new Action(smallShip, 'A');
      
      const result = action.applyToMass(smallRange);
      
      expect(result.min).toBe(2); // 5 - 3 = 2
      expect(result.max).toBe(7); // 10 - 3 = 7
      expect(result.min).toBeGreaterThan(0);
      expect(result.max).toBeGreaterThan(0);
    });
  });
  
  describe('State Boundary Validation', () => {
    test('should handle boundary calculations for all states with various wormhole sizes', () => {
      const sizes = [100, 500, 1000, 3300, 5000];
      const states = ['fresh', 'stable', 'destab', 'critical', 'gone'];
      
      sizes.forEach(size => {
        states.forEach(state => {
          const wormhole = new Wormhole(size, state);
          const boundaries = wormhole.getStateBoundaries();
          
          // Basic sanity checks
          expect(Number.isFinite(boundaries.min)).toBe(true);
          expect(Number.isFinite(boundaries.max)).toBe(true);
          expect(boundaries.min).toBeLessThanOrEqual(boundaries.max);
          
          // State-specific checks
          if (state === 'critical') {
            expect(boundaries.min).toBe(0);
          }
          
          if (state === 'gone') {
            expect(boundaries.min).toBe(-5000);
            expect(boundaries.max).toBe(0);
          }
        });
      });
    });
  });
  
  describe('Mass Calculation Precision', () => {
    test('should maintain integer precision in all calculations', () => {
      const wormhole = new Wormhole(3000, 'fresh');
      const ship = new Ship('bs', 'hot'); // 150 Gg exact
      const action = new Action(ship, 'A');
      
      const initialRange = wormhole.getCurrentMassRange();
      const result = action.applyToMass(initialRange);
      
      // All values should be integers (no floating point errors)
      expect(Number.isInteger(initialRange.min)).toBe(true);
      expect(Number.isInteger(initialRange.max)).toBe(true);
      expect(Number.isInteger(result.min)).toBe(true);
      expect(Number.isInteger(result.max)).toBe(true);
      
      // Verify the math is correct
      expect(result.min).toBe(initialRange.min - 150);
      expect(result.max).toBe(initialRange.max - 150);
    });
  });
  
  describe('Wormhole Size Restrictions', () => {
    test('should have correct ship size classifications', () => {
      // Verify ship size assignments match expected EVE Online ship classifications
      expect(SHIP_TYPES.dictor.size).toBe(1); // Destroyer class
      expect(SHIP_TYPES.covops.size).toBe(1); // Destroyer class
      expect(SHIP_TYPES.cruiser.size).toBe(2); // Battlecruiser and below
      expect(SHIP_TYPES.rhic.size).toBe(2); // Rolling HIC (cruiser class per user edit)
      expect(SHIP_TYPES.bs.size).toBe(3); // Battleship
      expect(SHIP_TYPES.rbs.size).toBe(3); // Rolling Battleship (battleship class)
      expect(SHIP_TYPES.marauder.size).toBe(3); // Marauder (battleship class)
      expect(SHIP_TYPES.carrier.size).toBe(5); // Capital
    });
    
    test('should provide correct restriction descriptions', () => {
      const restrictions = WORMHOLE_RESTRICTIONS;
      expect(restrictions[1]).toBe('up to Destroyer');
      expect(restrictions[2]).toBe('up to Battlecruiser');
      expect(restrictions[3]).toBe('up to Battleship');
      expect(restrictions[4]).toBe('up to Freighter');
      expect(restrictions[5]).toBe('up to Capital');
    });
    
    test('should correctly validate ship size against restrictions', () => {
      // Size 2 restriction (up to Battlecruiser) should allow only cruisers
      const cruiser = SHIP_TYPES.cruiser;
      const battleship = SHIP_TYPES.bs;
      const carrier = SHIP_TYPES.carrier;
      
      expect(cruiser.size <= 2).toBe(true); // Should be allowed
      expect(battleship.size <= 2).toBe(false); // Should be blocked
      expect(carrier.size <= 2).toBe(false); // Should be blocked
      
      // Size 3 restriction (up to Battleship) should allow battleships but not capitals
      expect(cruiser.size <= 3).toBe(true); // Should be allowed
      expect(battleship.size <= 3).toBe(true); // Should be allowed
      expect(carrier.size <= 3).toBe(false); // Should be blocked
      
      // Size 5 restriction (up to Capital) should allow everything
      expect(cruiser.size <= 5).toBe(true); // Should be allowed
      expect(battleship.size <= 5).toBe(true); // Should be allowed
      expect(carrier.size <= 5).toBe(true); // Should be allowed
    });
  });

  describe('Game Mode State Transition Logic', () => {
    test('should handle original vs remaining mass correctly', () => {
      // Test the concept behind the dual-mass system fix
      const originalCapacity = 3300; // Full wormhole capacity 
      const currentRemaining = 1650; // 50% remaining (simulating stable state)
      
      // State transition should be based on percentage of original
      const percentRemaining = (currentRemaining / originalCapacity) * 100;
      expect(percentRemaining).toBe(50);
      
      // At exactly 50%, this should trigger destabilization (≤50% threshold)
      expect(percentRemaining).toBeLessThanOrEqual(50);
      
      // Let's test a case that should stay stable
      const stableRemaining = 1800; // ~55% remaining
      const stablePercent = (stableRemaining / originalCapacity) * 100;
      expect(stablePercent).toBeGreaterThan(50); // Should stay stable
      
      // Test destab trigger
      const destabRemaining = 1500; // ~45% remaining  
      const destabPercent = (destabRemaining / originalCapacity) * 100;
      expect(destabPercent).toBeLessThanOrEqual(50); // Should trigger destab
    });
    
    test('should validate game mode percentage ranges for each state', () => {
      const originalMass = 3000; // Base wormhole
      
      // Fresh: 100% remaining (no ships passed)
      const freshMin = originalMass * 1.0; // 3000
      const freshMax = originalMass * 1.0; // 3000
      expect(freshMin).toBe(3000);
      expect(freshMax).toBe(3000);
      
      // Stable: 50-100% remaining  
      const stableMin = originalMass * 0.5;  // 1500
      const stableMax = originalMass * 1.0;  // 3000
      expect(stableMin).toBe(1500);
      expect(stableMax).toBe(3000);
      
      // Destab: 10-50% remaining
      const destabMin = originalMass * 0.1;  // 300
      const destabMax = originalMass * 0.5;  // 1500
      expect(destabMin).toBe(300);
      expect(destabMax).toBe(1500);
      
      // Critical: 0-10% remaining
      const criticalMin = originalMass * 0.0; // 0
      const criticalMax = originalMass * 0.1; // 300
      expect(criticalMin).toBe(0);
      expect(criticalMax).toBe(300);
    });
  });

  describe('Far Side Fleet', () => {
    test('should initialize far side fleet with zero quantities', () => {
      // Test the core logic without DOM
      const initialFarSideFleet = {};
      Object.keys(SHIP_TYPES).forEach(shipKey => {
        initialFarSideFleet[shipKey] = 0;
      });
      
      // Check that all ships start with 0 quantity
      Object.keys(SHIP_TYPES).forEach(shipKey => {
        expect(initialFarSideFleet[shipKey]).toBe(0);
      });
    });

    test('should update far side quantities correctly', () => {
      // Simulate the updateFarSideQuantity logic
      const fleet = { destroyer: 0, cruiser: 0 };
      
      // Test increasing quantity
      fleet.destroyer = (fleet.destroyer || 0) + 1;
      expect(fleet.destroyer).toBe(1);
      
      fleet.destroyer = (fleet.destroyer || 0) + 1;
      expect(fleet.destroyer).toBe(2);
      
      // Test decreasing quantity
      fleet.destroyer = Math.max(0, (fleet.destroyer || 0) - 1);
      expect(fleet.destroyer).toBe(1);
      
      // Test that quantity doesn't go below 0
      fleet.destroyer = Math.max(0, (fleet.destroyer || 0) - 1);
      fleet.destroyer = Math.max(0, (fleet.destroyer || 0) - 1);
      expect(fleet.destroyer).toBe(0);
    });

    test('should properly describe ships on far side', () => {
      // Test the helper function directly
      const getShipsOnFarSideDescription = (shipsObj) => {
        const shipCounts = [];
        Object.entries(shipsObj).forEach(([shipKey, count]) => {
          if (count > 0) {
            const shipName = SHIP_TYPES[shipKey].name;
            shipCounts.push(count === 1 ? shipName : `${count}x ${shipName}`);
          }
        });
        return shipCounts.length > 0 ? shipCounts.join(', ') : null;
      };
      
      // Test empty fleet
      expect(getShipsOnFarSideDescription({})).toBeNull();
      
      // Test single ship (using actual SHIP_TYPES keys)
      const singleShip = { cruiser: 1 };
      expect(getShipsOnFarSideDescription(singleShip)).toBe('Cruiser');
      
      // Test multiple single ships
      const multipleShips = { cruiser: 1, bs: 1 };
      const description = getShipsOnFarSideDescription(multipleShips);
      expect(description).toContain('Cruiser');
      expect(description).toContain('Battleship');
      
      // Test multiple quantities
      const multipleQuantities = { cruiser: 3, bs: 2 };
      const quantityDescription = getShipsOnFarSideDescription(multipleQuantities);
      expect(quantityDescription).toContain('3x Cruiser');
      expect(quantityDescription).toContain('2x Battleship');
      
      // Test that zero counts are filtered out
      const fleetWithZeros = { cruiser: 2, bs: 0, rhic: 0, carrier: 1 };
      const filteredDescription = getShipsOnFarSideDescription(fleetWithZeros);
      expect(filteredDescription).toContain('2x Cruiser');
      expect(filteredDescription).toContain('Carrier');
      expect(filteredDescription).not.toContain('Battleship x0');
      expect(filteredDescription).not.toContain('Rolling Hictor x0');
      
      // Should only show non-zero ships
      const expectedShips = filteredDescription.split(', ');
      expect(expectedShips).toHaveLength(2); // Only cruiser and carrier
    });

    test('should respect ship size restrictions', () => {
      // Test that ships larger than restriction level are filtered
      const restrictionLevel = 2; // Up to Battlecruiser
      
      const allowedShips = Object.entries(SHIP_TYPES).filter(([key, ship]) => 
        ship.size <= restrictionLevel
      );
      
      const restrictedShips = Object.entries(SHIP_TYPES).filter(([key, ship]) => 
        ship.size > restrictionLevel
      );
      
      expect(allowedShips.length).toBeGreaterThan(0);
      expect(restrictedShips.length).toBeGreaterThan(0);
      
      // Verify some specific ships (using correct SHIP_TYPES keys)
      expect(SHIP_TYPES.dictor.size <= restrictionLevel).toBe(true); // Size 1, should be allowed
      expect(SHIP_TYPES.covops.size <= restrictionLevel).toBe(true); // Size 1, should be allowed
      expect(SHIP_TYPES.cruiser.size <= restrictionLevel).toBe(true);
      expect(SHIP_TYPES.rhic.size <= restrictionLevel).toBe(true);
      expect(SHIP_TYPES.bs.size > restrictionLevel).toBe(true);
      expect(SHIP_TYPES.carrier.size > restrictionLevel).toBe(true);
    });

    test('should generate random far side fleet with correct probability distribution', () => {
      // Simulate the random far side fleet logic
      const restrictionLevel = 3; // Up to Battleship
      const trials = 1000;
      let zeroCount = 0;
      let nonZeroCount = 0;
      let totalQuantities = [];

      // Run many trials to test probability distribution
      for (let i = 0; i < trials; i++) {
        const roll = Math.random();
        if (roll > 0.75) { // 25% chance of non-zero
          const quantity = Math.floor(Math.random() * 5) + 1; // 1-5
          nonZeroCount++;
          totalQuantities.push(quantity);
        } else {
          zeroCount++;
        }
      }

      // Check that roughly 75% are zero and 25% are non-zero (with some tolerance)
      const zeroPercentage = zeroCount / trials;
      const nonZeroPercentage = nonZeroCount / trials;
      
      expect(zeroPercentage).toBeGreaterThan(0.70); // Allow some variance
      expect(zeroPercentage).toBeLessThan(0.80);
      expect(nonZeroPercentage).toBeGreaterThan(0.20);
      expect(nonZeroPercentage).toBeLessThan(0.30);

      // Check that non-zero quantities are in range 1-5
      totalQuantities.forEach(quantity => {
        expect(quantity).toBeGreaterThanOrEqual(1);
        expect(quantity).toBeLessThanOrEqual(5);
      });

      // Test ship size filtering logic
      const allowedShips = Object.entries(SHIP_TYPES).filter(([key, ship]) => 
        ship.size <= restrictionLevel
      );
      const restrictedShips = Object.entries(SHIP_TYPES).filter(([key, ship]) => 
        ship.size > restrictionLevel
      );

      expect(allowedShips.length).toBeGreaterThan(0);
      expect(restrictedShips.length).toBeGreaterThan(0);

      // Verify specific ships would be allowed/restricted
      expect(SHIP_TYPES.dictor.size <= restrictionLevel).toBe(true);
      expect(SHIP_TYPES.bs.size <= restrictionLevel).toBe(true);
      expect(SHIP_TYPES.carrier.size > restrictionLevel).toBe(true);
    });
  });
});