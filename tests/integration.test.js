// Simple integration test to verify the app loads without errors
const fs = require('fs');
const path = require('path');

describe('App Integration', () => {
  test('should load HTML file without syntax errors', () => {
    const htmlPath = path.join(__dirname, '../src/index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Basic checks
    expect(htmlContent).toContain('<!DOCTYPE html>');
    expect(htmlContent).toContain('<title>EVE Wormhole Rolling Tracker</title>');
    expect(htmlContent).toContain('<script src="wormhole-logic.js"></script>');
    expect(htmlContent).toContain('<script src="app.js"></script>');
    expect(htmlContent).toContain('id="initial-setup"');
    expect(htmlContent).toContain('id="tracking-interface"');
    
    // Verify script order (logic before app)
    const logicScriptIndex = htmlContent.indexOf('<script src="wormhole-logic.js"></script>');
    const appScriptIndex = htmlContent.indexOf('<script src="app.js"></script>');
    expect(logicScriptIndex).toBeLessThan(appScriptIndex);
  });

  test('should load CSS file without syntax errors', () => {
    const cssPath = path.join(__dirname, '../src/style.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    // Basic checks
    expect(cssContent).toContain('.container');
    expect(cssContent).toContain('background:');
    expect(cssContent).toContain('.completion-success');
    expect(cssContent).toContain('.completion-failure');
  });

  test('should load JavaScript file without syntax errors', () => {
    const jsPath = path.join(__dirname, '../src/app.js');
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    
    // Basic checks
    expect(jsContent).toContain('class WormholeRollingUI');
    expect(jsContent).toContain('handleWormholeCompletion');
    expect(jsContent).toContain('DOMContentLoaded');
    
    // Should not contain business logic definitions anymore (moved to wormhole-logic.js)
    expect(jsContent).not.toContain('const SHIP_TYPES');
    expect(jsContent).not.toContain('class Wormhole {');  // More specific - the class definition
    expect(jsContent).not.toContain('class Ship {');     // More specific - the class definition
    expect(jsContent).not.toContain('runMassCalculationTests');
  });

  test('should have wormhole-logic.js file with business logic', () => {
    const logicPath = path.join(__dirname, '../src/wormhole-logic.js');
    const logicContent = fs.readFileSync(logicPath, 'utf8');
    
    // Check that wormhole-logic.js contains the business logic
    expect(logicContent).toContain('const SHIP_TYPES');
    expect(logicContent).toContain('class Wormhole');
    expect(logicContent).toContain('class Ship');
    expect(logicContent).toContain('class CustomMass');
    expect(logicContent).toContain('class Action');
    
    // Check that it exports for both Node.js and browser
    expect(logicContent).toContain('module.exports');
    expect(logicContent).toContain('window.SHIP_TYPES');
    
    // Verify it can be imported for testing
    const { SHIP_TYPES: logicShipTypes } = require('../src/wormhole-logic');
    expect(Object.keys(logicShipTypes).length).toBeGreaterThan(0);
  });
});