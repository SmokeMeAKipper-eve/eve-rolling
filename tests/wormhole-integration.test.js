// Test file for wormhole data integration features
const path = require('path');

// Import wormhole data
const {
  WORMHOLE_DATA,
  SPECIAL_WORMHOLES,
  RESTRICTION_LEVELS,
  getWormholeInfo,
  getAllWormholeCodes,
  getWormholesByRestriction,
  getWormholesByDestination,
  getWormholesByMassRange
} = require('../src/wormhole-data.js');

describe('Wormhole Data Integration', () => {
  
  describe('Data Integrity', () => {
    test('should have all expected wormhole entries', () => {
      expect(Object.keys(WORMHOLE_DATA).length).toBeGreaterThan(90);
      expect(Object.keys(SPECIAL_WORMHOLES).length).toBe(2);
    });

    test('should have valid data structure for all wormholes', () => {
      Object.entries(WORMHOLE_DATA).forEach(([code, data]) => {
        expect(code).toMatch(/^[A-Z][0-9]{3}$/); // Format like "B274"
        expect(data).toHaveProperty('totalMass');
        expect(data).toHaveProperty('restriction');
        expect(data).toHaveProperty('destination');
        expect(typeof data.totalMass).toBe('number');
        expect(data.totalMass).toBeGreaterThan(0);
        expect(data.restriction).toBeGreaterThanOrEqual(1);
        expect(data.restriction).toBeLessThanOrEqual(5);
        expect(typeof data.destination).toBe('string');
      });
    });

    test('should have valid restriction levels', () => {
      expect(RESTRICTION_LEVELS[1]).toContain('Destroyer');
      expect(RESTRICTION_LEVELS[2]).toContain('Battlecruiser');
      expect(RESTRICTION_LEVELS[3]).toContain('Battleship');
      expect(RESTRICTION_LEVELS[4]).toContain('Freighter');
      expect(RESTRICTION_LEVELS[5]).toContain('Capital');
    });
  });

  describe('getWormholeInfo function', () => {
    test('should return correct info for known wormhole', () => {
      const info = getWormholeInfo('B274');
      expect(info).not.toBeNull();
      expect(info.code).toBe('B274');
      expect(info.totalMass).toBe(2000);
      expect(info.restriction).toBe(3);
      expect(info.restrictionText).toBe('up to Battleship');
      expect(info.destination).toBe('HS');
    });

    test('should return null for unknown wormhole', () => {
      const info = getWormholeInfo('FAKE123');
      expect(info).toBeNull();
    });

    test('should handle special wormholes', () => {
      const info = getWormholeInfo('K162');
      expect(info).not.toBeNull();
      expect(info.code).toBe('K162');
      expect(info.destination).toBe('Variable');
      expect(info.special).toContain('Exit hole');
    });
  });

  describe('getAllWormholeCodes function', () => {
    test('should return all wormhole codes sorted', () => {
      const codes = getAllWormholeCodes();
      expect(codes.length).toBeGreaterThan(90);
      expect(codes).toContain('B274');
      expect(codes).toContain('K162');
      expect(codes).toContain('⛮');
      
      // Check if sorted
      const sortedCodes = [...codes].sort();
      expect(codes).toEqual(sortedCodes);
    });
  });

  describe('Filter functions', () => {
    test('getWormholesByRestriction should filter correctly', () => {
      const frigateHoles = getWormholesByRestriction(1);
      expect(frigateHoles.length).toBeGreaterThan(0);
      expect(frigateHoles).toContain('A009');
      
      const capitalHoles = getWormholesByRestriction(5);
      expect(capitalHoles.length).toBeGreaterThan(0);
      expect(capitalHoles).toContain('C140');
    });

    test('getWormholesByDestination should filter correctly', () => {
      const hsHoles = getWormholesByDestination('HS');
      expect(hsHoles.length).toBeGreaterThan(0);
      expect(hsHoles).toContain('B274');
      
      const c1Holes = getWormholesByDestination('C1');
      expect(c1Holes.length).toBeGreaterThan(0);
    });

    test('getWormholesByMassRange should filter correctly', () => {
      const smallHoles = getWormholesByMassRange(100, 500);
      expect(smallHoles.length).toBeGreaterThan(0);
      expect(smallHoles).toContain('Z971'); // 100 Gg hole
      
      const largeHoles = getWormholesByMassRange(3000, 5000);
      expect(largeHoles.length).toBeGreaterThan(0);
      expect(largeHoles).toContain('D845'); // 5000 Gg hole
    });
  });

  describe('Data completeness', () => {
    test('should have representation across all restriction levels', () => {
      for (let level = 1; level <= 5; level++) {
        const holes = getWormholesByRestriction(level);
        expect(holes.length).toBeGreaterThan(0);
      }
    });

    test('should have wormholes for major destinations', () => {
      const destinations = ['HS', 'LS', 'NS', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
      destinations.forEach(dest => {
        const holes = getWormholesByDestination(dest);
        expect(holes.length).toBeGreaterThan(0);
      });
    });

    test('should have diverse mass ranges', () => {
      const masses = Object.values(WORMHOLE_DATA).map(wh => wh.totalMass);
      const uniqueMasses = [...new Set(masses)];
      expect(uniqueMasses.length).toBeGreaterThan(5); // Should have variety
      expect(Math.min(...masses)).toBeLessThan(500);
      expect(Math.max(...masses)).toBeGreaterThan(3000);
    });
  });

  describe('Recent additions', () => {
    test('should include Z971 wormhole that was recently added', () => {
      const z971 = getWormholeInfo('Z971');
      expect(z971).not.toBeNull();
      expect(z971.totalMass).toBe(100);
      expect(z971.restriction).toBe(2);
      expect(z971.destination).toBe('C1');
    });

    test('should have proper count including Z971', () => {
      const allCodes = getAllWormholeCodes();
      const regularWormholes = Object.keys(WORMHOLE_DATA);
      const specialWormholes = Object.keys(SPECIAL_WORMHOLES);
      
      expect(allCodes.length).toBe(regularWormholes.length + specialWormholes.length);
      expect(regularWormholes).toContain('Z971');
    });
  });
});

describe('Wormhole Integration Error Handling', () => {
  test('should handle null/undefined inputs gracefully', () => {
    expect(getWormholeInfo(null)).toBeNull();
    expect(getWormholeInfo(undefined)).toBeNull();
    expect(getWormholeInfo('')).toBeNull();
  });

  test('should handle invalid restriction levels', () => {
    expect(getWormholesByRestriction(0)).toEqual([]);
    expect(getWormholesByRestriction(10)).toEqual([]);
    expect(getWormholesByRestriction(-1)).toEqual([]);
  });

  test('should handle invalid destinations', () => {
    expect(getWormholesByDestination('INVALID')).toEqual([]);
    expect(getWormholesByDestination('')).toEqual([]);
  });

  test('should handle invalid mass ranges', () => {
    expect(getWormholesByMassRange(10000, 20000)).toEqual([]);
    expect(getWormholesByMassRange(-100, -50)).toEqual([]);
  });
});

describe('Browser/Node.js Compatibility', () => {
  test('should export for Node.js testing', () => {
    expect(WORMHOLE_DATA).toBeDefined();
    expect(getWormholeInfo).toBeDefined();
    expect(typeof getWormholeInfo).toBe('function');
  });

  test('should have functions that work in both environments', () => {
    // These should work regardless of environment
    const codes = getAllWormholeCodes();
    expect(Array.isArray(codes)).toBe(true);
    
    const info = getWormholeInfo('B274');
    expect(info).toBeTruthy();
    expect(typeof info).toBe('object');
  });
});

describe('Performance Tests', () => {
  test('should handle large queries efficiently', () => {
    const start = Date.now();
    
    // Run multiple operations
    for (let i = 0; i < 100; i++) {
      getAllWormholeCodes();
      getWormholesByRestriction(3);
      getWormholesByDestination('HS');
      getWormholesByMassRange(1000, 3000);
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  test('should handle repeated lookups efficiently', () => {
    const start = Date.now();
    
    // Look up same wormhole many times
    for (let i = 0; i < 1000; i++) {
      getWormholeInfo('B274');
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should be very fast
  });
});