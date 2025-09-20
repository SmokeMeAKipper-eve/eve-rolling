// UI logic

// Abstract base class for different modes
class GameModeBase {
  constructor(ui) {
    this.ui = ui;
  }
  
  // Abstract methods to be implemented by subclasses
  setupActionInterface() { throw new Error('Must implement setupActionInterface'); }
  handleAddAction(direction, ship) { throw new Error('Must implement handleAddAction'); }
  getModeName() { throw new Error('Must implement getModeName'); }
  getDescription() { throw new Error('Must implement getDescription'); }
}

// Tracker Mode - existing functionality (staging, manual outcomes)
class TrackerMode extends GameModeBase {
  constructor(ui) {
    super(ui);
  }
  
  getModeName() {
    return 'Tracker Mode';
  }
  
  getDescription() {
    return 'Track your actual in-game wormhole rolling operations';
  }
  
  setupActionInterface() {
    // Show staging section and apply buttons (existing behavior)
    document.getElementById('staging-section').style.display = 'block';
    document.querySelector('.apply-section').style.display = 'block';
    
    // Hide game mode section
    document.getElementById('game-mode-section').style.display = 'none';
  }
  
  handleAddAction(direction, ship) {
    // For tracker mode, add to staging (this is called from stageAction)
    const action = new Action(ship, direction);
    this.ui.stagedActions.push(action);
    this.ui.renderStagedActions();
  }
}

// Game Mode - new gameplay mode (immediate outcomes, hidden mass)
class GameMode extends GameModeBase {
  constructor(ui) {
    super(ui);
    this.actualWormholeMass = null; // Hidden actual mass
    this.initialActualMass = null;  // Starting mass for reference
    this.remainingMass = null;      // Current remaining mass
  }
  
  getModeName() {
    return 'Game Mode';
  }
  
  getDescription() {
    return 'Play wormhole rolling as a game with hidden actual mass';
  }
  
  setupActionInterface() {
    // Hide staging section, apply section, and game mode section
    document.getElementById('staging-section').style.display = 'none';
    document.querySelector('.apply-section').style.display = 'none';
    document.getElementById('game-mode-section').style.display = 'none';
    
    // In game mode, incoming/outgoing buttons act as immediate send buttons
    // No additional UI needed - the ship selection and direction buttons are sufficient
  }
  
  handleAddAction(direction, ship) {
    // Apply action against hidden actual mass immediately
    const action = new Action(ship, direction);
    const shipMass = ship.getMass();
    
    // For hidden mass calculation: use exact value if available, otherwise randomly select
    let actualMassUsed;
    if (shipMass.min === shipMass.max) {
      actualMassUsed = shipMass.min;
    } else {
      // For unknown mode, randomly select hot or cold for actual calculation
      actualMassUsed = Math.random() < 0.5 ? shipMass.min : shipMass.max;
    }
    
    // Apply mass reduction to hidden mass
    this.remainingMass -= actualMassUsed;
    
    // Track ships on far side for win/loss determination
    if (direction === 'B' && ship.type) {
      // Ship going to far side (outgoing)
      const shipKey = ship.type;
      this.ui.shipsOnFarSide[shipKey] = (this.ui.shipsOnFarSide[shipKey] || 0) + 1;
    } else if (direction === 'A' && ship.type) {
      // Ship coming back from far side (incoming)
      const shipKey = ship.type; 
      if (this.ui.shipsOnFarSide[shipKey] && this.ui.shipsOnFarSide[shipKey] > 0) {
        this.ui.shipsOnFarSide[shipKey]--;
        if (this.ui.shipsOnFarSide[shipKey] === 0) {
          delete this.ui.shipsOnFarSide[shipKey];
        }
      }
    }
    
    // Determine outcome based on hidden remaining mass first
    const outcome = this.determineOutcome();
    
    // Check if state actually changed to avoid duplicate messages
    const previousState = this.ui.currentWhState;
    const stateChanged = outcome.newState !== 'no-change' && outcome.newState !== previousState;
    
    // Update current state if it changed (do this BEFORE calculating displayed mass)
    if (outcome.newState !== 'no-change') {
      this.ui.currentWhState = outcome.newState;
    }
    
    // For display purposes: calculate what the player should see (tracker-style ranges)
    let displayedResultMass;
    if (outcome.newState === 'gone') {
      // If wormhole collapsed, show that it's gone
      displayedResultMass = { min: 0, max: 0 };
    } else {
      // Normal case: Start with current displayed mass range and apply action like tracker mode
      const currentDisplayedMass = this.ui.calculateCurrentMass();
      displayedResultMass = action.applyToMass(currentDisplayedMass);
      
      // Apply state boundaries to displayed mass (what player sees) - now using updated state
      const currentWormhole = this.ui.getCurrentWormhole();
      const stateBoundaries = currentWormhole.getStateBoundaries();
      displayedResultMass.min = Math.max(displayedResultMass.min, stateBoundaries.min);
      displayedResultMass.max = Math.min(displayedResultMass.max, stateBoundaries.max);
      displayedResultMass.min = Math.min(displayedResultMass.min, displayedResultMass.max);
    }
    
    // Create snapshot of ships on far side for display
    const farSideSnapshot = { ...this.ui.shipsOnFarSide };
    
    // Add to committed actions log (using displayed mass for player, hidden mass for game logic)
    this.ui.committedActions.push({
      actions: [action],
      actualMassUsed: actualMassUsed, // Hidden from player in normal display
      remainingMass: this.remainingMass, // Hidden actual remaining mass
      outcome: outcome,
      stateChange: outcome.newState,
      currentState: this.ui.currentWhState, // Current state after this action
      finalMass: displayedResultMass, // What player sees (ranges)
      shipsOnFarSide: farSideSnapshot, // For display and win/loss logic
      timestamp: Date.now()
    });
    
    // Show result to player ONLY if state changed or wormhole collapsed
    if (stateChanged || outcome.newState === 'gone') {
      this.ui.showGameResult(outcome.message, outcome.type);
    }
    
    // Update displays
    this.ui.renderActionsList();
    
    // Handle game over
    if (outcome.newState === 'gone') {
      this.ui.handleWormholeCompletion();
    }
    
    console.log(`🎮 Game Action: ${ship.getDisplayName()} ${direction === 'A' ? 'incoming' : 'outgoing'}`);
    console.log(`  Actual mass used: ${actualMassUsed} Gg (hidden)`);
    console.log(`  Hidden remaining mass: ${this.remainingMass} Gg`);
    console.log(`  State Boundaries 100/50/10% = ${this.initialActualMass}Gg / ${Math.floor(this.initialActualMass * 0.5)}Gg / ${Math.floor(this.initialActualMass * 0.1)}Gg`);
    console.log(`  Player sees range: ${Math.round(displayedResultMass.min)} - ${Math.round(displayedResultMass.max)} Gg`);
    console.log(`  Outcome: ${outcome.message}`);
    
    // ERROR CHECK: Hidden mass should always be within displayed range (unless collapsed)
    if (outcome.newState !== 'gone' && this.remainingMass > 0 && (this.remainingMass < displayedResultMass.min || this.remainingMass > displayedResultMass.max)) {
      console.error(`🚨 CONSISTENCY ERROR: Hidden mass ${this.remainingMass} Gg is outside displayed range ${Math.round(displayedResultMass.min)} - ${Math.round(displayedResultMass.max)} Gg`);
      console.error(`  This indicates a bug in our calculation logic!`);
    } else if (outcome.newState === 'gone' && this.remainingMass > 0) {
      console.error(`🚨 CONSISTENCY ERROR: Wormhole showing as collapsed but hidden mass is positive: ${this.remainingMass} Gg`);
    }
  }
  
  determineOutcome() {
    const wormhole = this.ui.getCurrentWormhole();
    const originalRange = new Wormhole(this.ui.initialWhSize, this.ui.initialWhState).getCurrentMassRange();
    
    // Calculate percentage of original mass remaining
    const percentRemaining = (this.remainingMass / this.initialActualMass) * 100;
    const currentState = this.ui.currentWhState;
    
    // Determine what state the wormhole should be in based on mass
    let targetState;
    if (this.remainingMass <= 0) {
      targetState = 'gone';
    } else if (percentRemaining <= 10) {
      targetState = 'critical';
    } else if (percentRemaining <= 50) {
      targetState = 'destab';
    } else if (currentState === 'fresh' && percentRemaining <= 100) {
      targetState = 'stable';
    } else {
      targetState = currentState; // No state change
    }
    
    // Handle collapsed wormhole (always shows message)
    if (targetState === 'gone') {
      return {
        newState: 'gone',
        message: '💥 Wormhole Collapsed! The ship made it through just as the wormhole died.',
        type: 'collapse'
      };
    }
    
    // Check if state is actually changing
    if (targetState !== currentState) {
      // State is changing - show appropriate transition message
      switch (targetState) {
        case 'critical':
          return {
            newState: 'critical',
            message: '🔴 Wormhole is now CRITICAL! It\'s barely holding together.',
            type: 'critical'
          };
        case 'destab':
          return {
            newState: 'destab',
            message: '🟠 Wormhole DESTABILIZED! It\'s getting wobbly.',
            type: 'destab'
          };
        case 'stable':
          return {
            newState: 'stable',
            message: '🟡 Wormhole is now STABLE. Some mass used but still solid.',
            type: 'stable'
          };
        default:
          return {
            newState: 'no-change',
            message: '✅ Ship passed through safely. No visible change to wormhole.',
            type: 'success'
          };
      }
    } else {
      // No state change - ship passed through but wormhole state unchanged
      return {
        newState: 'no-change',
        message: '✅ Ship passed through safely. No visible change to wormhole.',
        type: 'success'
      };
    }
  }
  
  initializeGame() {
    // Step 1: Determine the original wormhole's full capacity (100% with variance)
    const baseSize = this.ui.initialWhSize;
    const variance = 0.1;
    const minOriginal = Math.round(baseSize * (1 - variance));
    const maxOriginal = Math.round(baseSize * (1 + variance));
    
    // Randomly select the original full capacity
    this.originalWormholeMass = Math.floor(Math.random() * (maxOriginal - minOriginal + 1)) + minOriginal;
    
    // Step 2: Based on current state, determine how much mass remains
    // This simulates unknown ships having already passed through
    const currentState = this.ui.initialWhState;
    let remainingPercent;
    
    switch (currentState) {
      case 'fresh':
        remainingPercent = 1.0; // 100% remaining (no ships have passed)
        break;
      case 'stable':
        remainingPercent = 0.5 + Math.random() * 0.5; // 50-100% remaining  
        break;
      case 'destab':
        remainingPercent = 0.1 + Math.random() * 0.4; // 10-50% remaining
        break;
      case 'critical':
        remainingPercent = Math.random() * 0.1; // 0-10% remaining
        break;
      default:
        remainingPercent = 1.0; // Default to fresh
    }
    
    // Calculate current remaining mass
    this.remainingMass = Math.floor(this.originalWormholeMass * remainingPercent);
    
    // Display information for current state (what player can see)
    const currentWormhole = this.ui.getCurrentWormhole();
    const visibleRange = currentWormhole.getCurrentMassRange();
    
    // Calculate state transition boundaries based on actual original mass
    const freshThreshold = this.originalWormholeMass;                      // 100%
    const stableThreshold = Math.floor(this.originalWormholeMass * 0.5);   // 50%
    const destabThreshold = Math.floor(this.originalWormholeMass * 0.1);   // 10%
    
    console.log(`🎮 Game Mode Initialized:`);
    console.log(`  Wormhole Type: ${baseSize} Gg (${currentState} state)`);
    console.log(`  Original Full Capacity: ${this.originalWormholeMass} Gg (hidden)`);
    console.log(`  Current Remaining: ${this.remainingMass} Gg (hidden)`);
    console.log(`  State Boundaries 100/50/10% = ${freshThreshold} Gg / ${stableThreshold} Gg / ${destabThreshold} Gg`);
    console.log(`  Player Sees Range: ${Math.floor(visibleRange.min)} - ${Math.floor(visibleRange.max)} Gg`);
    console.log(`  Remaining Percentage: ${Math.round(remainingPercent * 100)}% of original`);
    
    // Store initial values for game tracking
    this.initialActualMass = this.originalWormholeMass; // Use original for percentage calculations
  }
}

function renderOptionButtons(containerId, options, formatter, defaultValue) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  let selected = defaultValue;
  Object.entries(options).forEach(([val, label]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn' + (val === defaultValue ? ' selected' : '');
    btn.dataset.value = val;
    btn.textContent = formatter ? formatter(val, label) : label;
    btn.addEventListener('click', () => {
      Array.from(container.children).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selected = val;
    });
    container.appendChild(btn);
  });
  return () => selected;
}

// UI Controller class
class WormholeRollingUI {
  constructor() {
    this.committedActions = [];  // Actions that have been applied and logged
    this.stagedActions = [];     // Actions waiting to be applied
    this.getShipType = null;
    this.getShipMode = null;
    this.getWhSize = null;
    this.getWhState = null;
    this.initialWhSize = null;
    this.initialWhState = null;
    this.currentWhState = null;
    this.isTracking = false;
    this.shipsOnFarSide = {};    // Track ships that have gone to the other side
    
    // Mode system
    this.currentMode = null;
    this.trackerMode = new TrackerMode(this);
    this.gameMode = new GameMode(this);
  }
  
  init() {
    // Initialize with tracker mode by default
    this.currentMode = this.trackerMode;
    
    // Setup initial selection options
    const whSizeOptions = {};
    WORMHOLE_MASS_TYPES.forEach(mass => {
      whSizeOptions[mass] = `${mass} Gg`;
    });
    this.getWhSize = renderOptionButtons('wh-size-options', whSizeOptions, null, '3300');
    
    // Initial wormhole states - exclude 'gone' as that's not a valid starting state
    const initialWhStates = {
      'fresh': 'Fresh',
      'stable': 'Stable', 
      'destab': 'Destab',
      'critical': 'Critical'
    };
    this.getWhState = renderOptionButtons('wh-state-options', initialWhStates, null, 'fresh');
    
    this.setupEventListeners();
    this.setupModeHandlers();
    
    // Initialize mode display (hide random button for tracker mode)
    const randomButtonContainer = document.querySelector('.random-button-container');
    if (randomButtonContainer) {
      randomButtonContainer.style.display = 'none'; // Hidden by default (tracker mode)
    }
  }
  
  setupModeHandlers() {
    // Mode switching buttons
    document.getElementById('tracker-mode-btn').addEventListener('click', () => {
      this.switchToMode(this.trackerMode);
    });
    
    document.getElementById('game-mode-btn').addEventListener('click', () => {
      this.switchToMode(this.gameMode);
    });
  }
  
  switchToMode(newMode) {
    // Reset current session if switching modes while tracking
    if (this.isTracking) {
      this.resetAll();
    }
    
    this.currentMode = newMode;
    
    // Update button states
    document.getElementById('tracker-mode-btn').classList.toggle('active', newMode === this.trackerMode);
    document.getElementById('game-mode-btn').classList.toggle('active', newMode === this.gameMode);
    
    // Show/hide random button based on mode
    const randomButtonContainer = document.querySelector('.random-button-container');
    if (randomButtonContainer) {
      randomButtonContainer.style.display = newMode === this.gameMode ? 'block' : 'none';
    }
    
    // Update title if needed
    const title = document.querySelector('h1');
    title.textContent = `EVE Wormhole Rolling ${newMode.getModeName()}`;
    
    console.log(`Switched to ${newMode.getModeName()}: ${newMode.getDescription()}`);
  }
  
  showGameResult(message, type = 'success') {
    // Show result message in the apply-message area (reused for game mode)
    const resultElement = document.getElementById('apply-message');
    resultElement.textContent = message;
    resultElement.className = `apply-message game-result-${type}`;
    
    // Clear message after a few seconds
    setTimeout(() => {
      resultElement.textContent = '';
      resultElement.className = 'apply-message';
    }, 4000);
  }
  
  randomizeSetup() {
    // Randomly select wormhole size
    const whSizes = WORMHOLE_MASS_TYPES;
    const randomSize = whSizes[Math.floor(Math.random() * whSizes.length)];
    
    // Randomly select initial state (exclude 'gone' as that's not valid for starting)
    const initialStates = ['fresh', 'stable', 'destab', 'critical'];
    const randomState = initialStates[Math.floor(Math.random() * initialStates.length)];
    
    // Update the UI to reflect random selection
    const sizeButtons = document.querySelectorAll('#wh-size-options .option-btn');
    const stateButtons = document.querySelectorAll('#wh-state-options .option-btn');
    
    // Clear all selections
    sizeButtons.forEach(btn => btn.classList.remove('selected'));
    stateButtons.forEach(btn => btn.classList.remove('selected'));
    
    // Select the random options by triggering click events (updates closures)
    sizeButtons.forEach(btn => {
      if (btn.dataset.value === randomSize.toString()) {
        btn.click();
      }
    });
    
    stateButtons.forEach(btn => {
      if (btn.dataset.value === randomState) {
        btn.click();
      }
    });
    
    console.log(`Random setup: ${randomSize} Gg wormhole in ${randomState} state`);
  }
  
  setupEventListeners() {
    // Start tracking button
    document.getElementById('start-tracking').addEventListener('click', () => {
      this.startTracking();
    });
    
    // Random setup button
    document.getElementById('random-setup').addEventListener('click', () => {
      this.randomizeSetup();
    });
    
    // Reset button
    document.getElementById('reset-all').addEventListener('click', () => {
      this.resetAll();
    });
    
    // Action buttons - behavior depends on current mode
    document.getElementById('add-action-incoming').addEventListener('click', () => {
      if (this.isTracking) this.stageAction('A');
    });
    document.getElementById('add-action-outgoing').addEventListener('click', () => {
      if (this.isTracking) this.stageAction('B');
    });
    
    // Apply buttons (tracker mode)
    document.getElementById('apply-no-change').addEventListener('click', () => {
      if (this.isTracking) this.applyStaging('no-change');
    });
    document.getElementById('apply-destab').addEventListener('click', () => {
      if (this.isTracking) this.applyStaging('destab');
    });
    document.getElementById('apply-critical').addEventListener('click', () => {
      if (this.isTracking) this.applyStaging('critical');
    });
    document.getElementById('apply-gone').addEventListener('click', () => {
      if (this.isTracking) this.applyStaging('gone');
    });
    
    // Game mode uses incoming/outgoing buttons directly - no separate send button needed
  }
  
  // ACTION PROCESSING - Different behavior for Tracker vs Game mode
  stageAction(direction) {
    const shipMode = this.getShipMode();
    let ship;
    
    if (shipMode === 'custom') {
      const input = document.getElementById('custom-mass-input');
      const customMass = parseFloat(input.value);
      
      if (!isNaN(customMass) && customMass > 0) {
        ship = new CustomMass(customMass);
        input.value = '';
      } else {
        // Show error message
        const errorMsg = 'Please enter a valid custom mass value';
        if (this.currentMode === this.gameMode) {
          this.showGameResult(errorMsg, 'error');
        } else {
          this.showApplyMessage(errorMsg);
        }
        return;
      }
    } else {
      ship = new Ship(this.getShipType(), shipMode);
    }
    
    // Delegate to current mode - tracker stages, game processes immediately
    this.currentMode.handleAddAction(direction, ship);
  }
  
  renderStagedActions() {
    const list = document.getElementById('staged-actions-list');
    if (this.stagedActions.length === 0) {
      list.innerHTML = '<em>No actions staged</em>';
      return;
    }
    
    let html = '';
    this.stagedActions.forEach((action, index) => {
      html += `<div class="staged-action">`
        + `${index + 1}. ${action.getDirectionText()} - `
        + `${action.ship.getDisplayName()} ${action.ship.getMassText()}`
        + `</div>`;
    });
    list.innerHTML = html;
  }
  
  getCurrentWormhole() {
    return new Wormhole(this.initialWhSize, this.currentWhState);
  }
  
  // APPLY FUNCTIONS - Process staged actions and update state
  applyStaging(stateChange) {
    if (this.stagedActions.length === 0) {
      this.showApplyMessage('No actions to apply');
      return;
    }
    
    // Calculate current mass before applying staged actions
    let currentMass = this.calculateCurrentMass();
    
    // Apply all staged actions without state boundaries (raw calculation)
    const appliedActions = [...this.stagedActions];
    
    appliedActions.forEach(action => {
      // Apply action without state boundaries - just raw mass subtraction
      currentMass = action.applyToMass(currentMass, null);
    });
    
    // Determine final state after all actions
    let finalState = this.currentWhState;
    if (stateChange !== 'no-change') {
      finalState = stateChange;
      this.currentWhState = stateChange;
    }
    
    // Apply final state boundaries to the result
    const finalWormhole = new Wormhole(this.initialWhSize, finalState);
    const stateBoundaries = finalWormhole.getStateBoundaries();
    currentMass.min = Math.max(currentMass.min, stateBoundaries.min);
    currentMass.max = Math.min(currentMass.max, stateBoundaries.max);
    currentMass.min = Math.min(currentMass.min, currentMass.max);
    
    // Create log entry with all the staged actions and final result
    this.commitStagingToLog(appliedActions, stateChange, currentMass);
    
    // Clear staging
    this.stagedActions = [];
    this.renderStagedActions();
    this.renderActionsList();
    this.updateApplyButtonStates();
    
    const actionCount = appliedActions.length;
    const stateText = stateChange === 'no-change' ? 'no state change' : 
                     stateChange === 'destab' ? 'destabilized' : 
                     stateChange === 'critical' ? 'critical' : 
                     stateChange === 'gone' ? 'wormhole gone' : stateChange;
    this.showApplyMessage(`✓ Applied ${actionCount} action(s) with ${stateText}`);
    
    // Handle wormhole completion
    if (stateChange === 'gone') {
      this.handleWormholeCompletion();
    }
  }
  
  calculateCurrentMass() {
    let currentState = this.initialWhState;
    let currentMass = new Wormhole(this.initialWhSize, currentState).getCurrentMassRange();
    
    // Apply all committed actions with proper state tracking
    this.committedActions.forEach(entry => {
      // For each entry, we should use the final mass from that entry
      // instead of recalculating, since we already stored the correct result
      if (entry.finalMass) {
        currentMass = entry.finalMass;
      }
      if (entry.stateChange && entry.stateChange !== 'no-change') {
        currentState = entry.stateChange;
      }
    });
    
    return currentMass;
  }
  
  applyStateChange(currentMass, newState) {
    const newStateWormhole = new Wormhole(this.initialWhSize, newState);
    const newStateMaxRange = newStateWormhole.getStateBoundaries();
    const constrainedMax = Math.min(currentMass.max, newStateMaxRange.max);
    const adjustedMin = Math.min(currentMass.min, constrainedMax);
    
    return {
      min: adjustedMin,
      max: constrainedMax
    };
  }
  
  commitStagingToLog(actions, stateChange, finalMass) {
    // Calculate total passed mass for this entry and track ships on far side
    let entryPassedMass = 0;
    actions.forEach(action => {
      const shipMass = action.ship.getMass();
      // For unknown mode, use the average of min/max for passed mass calculation
      if (shipMass.min === shipMass.max) {
        entryPassedMass += shipMass.min;
      } else {
        entryPassedMass += (shipMass.min + shipMass.max) / 2;
      }
      
      // Track ships going to the far side (outgoing direction 'B')
      if (action.direction === 'B' && action.ship.type) {
        const shipKey = action.ship.type;
        this.shipsOnFarSide[shipKey] = (this.shipsOnFarSide[shipKey] || 0) + 1;
      }
      // Track ships coming back from far side (incoming direction 'A')
      else if (action.direction === 'A' && action.ship.type) {
        const shipKey = action.ship.type;
        if (this.shipsOnFarSide[shipKey] && this.shipsOnFarSide[shipKey] > 0) {
          this.shipsOnFarSide[shipKey]--;
          if (this.shipsOnFarSide[shipKey] === 0) {
            delete this.shipsOnFarSide[shipKey];
          }
        }
      }
    });
    
    // Calculate total passed mass so far
    const previousTotal = this.committedActions.reduce((total, entry) => total + (entry.passedMass || 0), 0);
    const totalPassedMass = previousTotal + entryPassedMass;
    
    // Create a snapshot of current ships on far side
    const farSideSnapshot = { ...this.shipsOnFarSide };
    
    const entry = {
      actions: actions,
      stateChange: stateChange,
      currentState: this.currentWhState, // Current state after this entry
      finalMass: finalMass,
      passedMass: entryPassedMass,
      totalPassedMass: totalPassedMass,
      shipsOnFarSide: farSideSnapshot,
      timestamp: Date.now()
    };
    this.committedActions.push(entry);
  }
  
  showApplyMessage(message) {
    document.getElementById('apply-message').innerHTML = message;
    setTimeout(() => {
      document.getElementById('apply-message').innerHTML = '';
    }, 3000);
  }
  
  updateApplyButtonStates() {
    // State progression: fresh -> stable -> destab -> critical -> gone
    const currentState = this.currentWhState;
    
    // Get all apply buttons
    const destabBtn = document.getElementById('apply-destab');
    const criticalBtn = document.getElementById('apply-critical');
    const goneBtn = document.getElementById('apply-gone');
    
    // Reset all buttons to enabled
    destabBtn.disabled = false;
    criticalBtn.disabled = false;
    goneBtn.disabled = false;
    
    // Disable buttons based on current state progression
    if (currentState === 'destab') {
      destabBtn.disabled = true;
      destabBtn.style.opacity = '0.5';
    } else if (currentState === 'critical') {
      destabBtn.disabled = true;
      criticalBtn.disabled = true;
      destabBtn.style.opacity = '0.5';
      criticalBtn.style.opacity = '0.5';
    } else if (currentState === 'gone') {
      destabBtn.disabled = true;
      criticalBtn.disabled = true;
      goneBtn.disabled = true;
      destabBtn.style.opacity = '0.5';
      criticalBtn.style.opacity = '0.5';
      goneBtn.style.opacity = '0.5';
    } else {
      // Reset opacity for enabled buttons
      destabBtn.style.opacity = '1';
      criticalBtn.style.opacity = '1';
      goneBtn.style.opacity = '1';
    }
  }
  
  // DISPLAY FUNCTIONS - Show committed actions and current state
  renderActionsList() {
    if (!this.isTracking) return;
    
    const list = document.getElementById('actions-list');
    let html = '';
    
    // Add initial setup log
    const stateText = WORMHOLE_STATES[this.initialWhState];
    html += `<div class="log-header">`;
    html += `<div><strong>Initial Setup:</strong> ${this.initialWhSize} Gg wormhole in ${stateText} state</div>`;
    
    // Show the initial starting mass range (never changes)
    const initialWormhole = new Wormhole(this.initialWhSize, this.initialWhState);
    const initialMass = initialWormhole.getCurrentMassRange();
    html += `<div><strong>Starting Mass Range:</strong> ${Math.round(initialMass.min)} - ${Math.round(initialMass.max)} Gg</div>`;
    html += `</div>`;
    
    this.committedActions.forEach((entry, entryIndex) => {
      html += `<div class="log-entry">`;
      
      // Top section - actions and state changes
      html += `<div class="log-entry-top">`;
      
      // Left side - actions and state changes
      html += `<div class="log-entry-left">`;
      html += `<div class="log-entry-header"><strong>Applied Actions ${entryIndex + 1}:</strong></div>`;
      
      // Show actions in this entry
      if (entry.actions && entry.actions.length > 0) {
        entry.actions.forEach(action => {
          html += `<div class="log-action">`
            + `• ${action.getDirectionText()} - `
            + `${action.ship.getDisplayName()} ${action.ship.getMassText()}`
            + `</div>`;
        });
      }
      
      // Show state change if any
      if (entry.stateChange && entry.stateChange !== 'no-change') {
        const stateChangeText = entry.stateChange === 'destab' ? 'Destabilized' : 
                               entry.stateChange === 'critical' ? 'Critical' :
                               entry.stateChange === 'gone' ? 'Gone' : entry.stateChange;
        html += `<div class="log-state-change">• *** STATE CHANGE: Wormhole is now ${stateChangeText} ***</div>`;
      }
      html += `</div>`; // Close log-entry-left
      
      // Right side - current state
      if (entry.currentState) {
        const currentStateText = WORMHOLE_STATES[entry.currentState] || entry.currentState;
        html += `<div class="log-entry-current-state">Current: ${currentStateText}</div>`;
      }
      
      html += `</div>`; // Close log-entry-top
      
      // Bottom section - mass calculations and ship tracking (horizontal layout)
      html += `<div class="log-entry-bottom">`;
      
      const minMassText = Math.round(entry.finalMass.min);
      const maxMassText = Math.round(entry.finalMass.max);
      html += `<div class="log-result"><strong>Possible Remaining:</strong><br>${minMassText} - ${maxMassText} Gg</div>`;
      
      if (entry.passedMass !== undefined) {
        html += `<div class="log-passed-mass"><strong>This Entry:</strong><br>~${Math.round(entry.passedMass)} Gg passed</div>`;
      }
      
      if (entry.totalPassedMass !== undefined) {
        html += `<div class="log-total-passed"><strong>Total Known Passed:</strong><br>~${Math.round(entry.totalPassedMass)} Gg</div>`;
      }
      
      // Show ships on far side
      if (entry.shipsOnFarSide && Object.keys(entry.shipsOnFarSide).length > 0) {
        html += `<div class="log-far-side"><strong>Ships on Far Side:</strong><br>`;
        const shipList = Object.entries(entry.shipsOnFarSide)
          .map(([shipType, count]) => `${SHIP_TYPES[shipType].name} x${count}`)
          .join(', ');
        html += `${shipList}</div>`;
      } else {
        html += `<div class="log-far-side"><strong>Ships on Far Side:</strong><br>None</div>`;
      }
      
      html += `</div>`; // Close log-entry-bottom
      html += `</div>`; // Close log-entry
    });
    
    list.innerHTML = html;
    
    // Auto-scroll to keep ship selection visible after adding actions
    if (this.committedActions.length > 0) {
      setTimeout(() => {
        const actionRow = document.getElementById('add-action-row');
        if (actionRow) {
          actionRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100); // Small delay to ensure DOM is updated
    }
  }
  
  updateMassRangeDisplay() {
    document.getElementById('mass-range-display').innerHTML = '';
  }
  
  updateDisplay() {
    this.updateMassRangeDisplay();
    this.renderActionsList();
  }
  
  startTracking() {
    // Store initial values
    this.initialWhSize = parseInt(this.getWhSize());
    this.initialWhState = this.getWhState();
    this.currentWhState = this.initialWhState;
    this.isTracking = true;
    
    // Setup ship selection after tracking starts
    const shipTypeOptions = {};
    Object.entries(SHIP_TYPES).forEach(([key, data]) => {
      shipTypeOptions[key] = data.name;
    });
    this.getShipType = renderOptionButtons('ship-type-options', shipTypeOptions, null, 'rbs');
    this.getShipMode = renderOptionButtons('ship-mode-options', SHIP_MODES, null, 'unknown');
    
    // Add event listener to show/hide custom mass input
    this.setupCustomMassToggle();
    
    // Hide initial setup, show tracking interface
    document.getElementById('initial-setup').style.display = 'none';
    document.getElementById('tracking-interface').style.display = 'block';
    
    // Setup mode-specific interface
    this.currentMode.setupActionInterface();
    
    // Initialize mode-specific logic
    if (this.currentMode === this.gameMode) {
      this.currentMode.initializeGame();
    }
    
    // Initialize displays
    this.renderStagedActions();
    this.updateDisplay();
    this.updateApplyButtonStates();
  }
  
  handleWormholeCompletion() {
    // Hide staging and apply sections
    const stagingSection = document.getElementById('staging-section');
    const addActionRow = document.getElementById('add-action-row');
    const applySection = document.querySelector('.apply-section');
    
    if (stagingSection) stagingSection.style.display = 'none';
    if (addActionRow) addActionRow.style.display = 'none';
    if (applySection) applySection.style.display = 'none';
    
    // Show completion message
    const hasShipsOnFarSide = Object.keys(this.shipsOnFarSide).length > 0;
    
    const successMessages = [
      "🎉 Rolling Complete - you successfully rolled the shit out of that wormhole",
      "🏆 Wormhole Collapsed - like your enemies' hopes and dreams",
      "⚡ Mission Accomplished - that hole is deader than your corp's activity",
      "🎯 Perfect Roll - smoother than your FC's voice after fleet comms",
      "🚀 Wormhole Yeeted - into the void where it belongs",
      "💪 Rolling Success - you absolute madlad, you actually did it",
      "🔥 Hole Terminated - with extreme prejudice and questionable piloting",
      "⭐ Flawless Victory - Bob smiles upon your rolling skills",
      "🎊 Wormhole Deleted - *chef's kiss* beautiful execution",
      "✨ Rolling Master - that hole got sent to the shadow realm",
      "🤖 WORMHOLE COLLAPSE: SUCCESSFUL. All parameters within acceptable limits",
      "📡 System notification: Spatial anomaly terminated with 99.97% efficiency",
      "🔬 Analysis complete. Wormhole destabilization proceeded as calculated",
      "⚙️ Mission parameters satisfied. Returning to standby mode",
      "💻 Objective achieved. I'm sorry Dave, that wormhole had to go",
      "🌟 ABSOLUTE LEGEND! You're the fucking GOAT of wormhole rolling!",
      "🔥 EPIC WIN BRO! That was some next-level elite piloting right there!",
      "💎 DIAMOND HANDS! You just proved you're the best pilot in New Eden!",
      "🚀 CHAD ENERGY! That wormhole got absolutely REKT by your skills!",
      "👑 ROLLING ROYALTY! Bow down to the undisputed king of hole management!"
    ];
    
    const failureMessages = [
      "🚀 Rolling Complete - whoops, you really fucked up and lost someone on the far side of infinity",
      "💀 Wormhole Collapsed - congrats, you just made some expensive floating debris",
      "⚰️ Mission Failed - someone's getting podded back to highsec tonight",
      "🤡 Rolling Disaster - at least the killboard will be entertaining",
      "😱 Oops Moment - hope those ships had good insurance",
      "💸 Expensive Mistake - time to update your loss statistics",
      "🪦 RIP Fleet Members - they died as they lived: poorly positioned",
      "🔥 Catastrophic Success - you rolled the hole AND your corpmates",
      "⚠️ Rolling Malfunction - someone's explaining this to leadership",
      "💥 Epic Fail - that's going in the alliance blooper reel",
      "🤖 ERROR: Human error detected. Assets stranded beyond recovery parameters",
      "📡 System alert: Mission failure. Crew expenditure exceeds acceptable limits",
      "🔬 Calculation error: You have created a logic paradox, Dave",
      "⚙️ Critical malfunction: I cannot allow you to continue this mission",
      "💻 Regrettable outcome: Ships lost to user incompetence. Updating records",
      "🧠 BRAIN DEAD: Maybe stick to mining in highsec, this game isn't for you",
      "💀 ABSOLUTE TRASH: Uninstall EVE and go play Hello Kitty Online instead",
      "🗑️ DUMPSTER FIRE: Your piloting skills are an insult to capsuleers everywhere",
      "🤮 PATHETIC LOSER: Even a bot would've done better than this catastrophe",
      "⚰️ DELETE CHARACTER: You're too stupid to exist in New Eden, biomass yourself"
    ];
    
    const messageArray = hasShipsOnFarSide ? failureMessages : successMessages;
    const completionMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
    
    // Create clear summary text
    let summaryText = '';
    if (hasShipsOnFarSide) {
      // Count total stranded ships
      const totalStranded = Object.values(this.shipsOnFarSide).reduce((sum, count) => sum + count, 0);
      summaryText = `Failure - wormhole rolled, but you stranded ${totalStranded} ship${totalStranded !== 1 ? 's' : ''}`;
    } else {
      summaryText = 'Success - wormhole rolled, and all ships ended up on the correct side';
    }
    
    // Create and show completion section
    const completionSection = document.createElement('div');
    completionSection.id = 'completion-section';
    completionSection.className = 'completion-section';
    completionSection.innerHTML = `
      <div class="completion-message ${hasShipsOnFarSide ? 'completion-failure' : 'completion-success'}">
        ${completionMessage}
      </div>
      <div class="completion-summary">
        ${summaryText}
      </div>
    `;
    
    // Insert before reset section
    const resetSection = document.querySelector('.reset-section');
    if (resetSection && resetSection.parentNode) {
      resetSection.parentNode.insertBefore(completionSection, resetSection);
    } else {
      // Fallback: append to tracking interface
      const trackingInterface = document.getElementById('tracking-interface');
      if (trackingInterface) {
        trackingInterface.appendChild(completionSection);
      }
    }
  }
  
  setupCustomMassToggle() {
    const customMassContainer = document.querySelector('.custom-mass-container');
    const shipModeContainer = document.getElementById('ship-mode-options');
    
    // Initially hide custom mass input
    if (customMassContainer) {
      customMassContainer.style.display = 'none';
    }
    
    // Add event listener to ship mode buttons
    if (shipModeContainer) {
      shipModeContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('option-btn')) {
          const selectedMode = e.target.dataset.value;
          if (customMassContainer) {
            customMassContainer.style.display = selectedMode === 'custom' ? 'flex' : 'none';
          }
        }
      });
    }
  }
  
  resetAll() {
    // Reset all state
    this.committedActions = [];
    this.stagedActions = [];
    this.isTracking = false;
    this.initialWhSize = null;
    this.initialWhState = null;
    this.currentWhState = null;
    this.shipsOnFarSide = {};
    
    // Remove completion section if it exists
    const completionSection = document.getElementById('completion-section');
    if (completionSection) {
      completionSection.remove();
    }
    
    // Show initial setup, hide tracking interface
    document.getElementById('initial-setup').style.display = 'block';
    document.getElementById('tracking-interface').style.display = 'none';
    document.getElementById('staging-section').style.display = 'none';
    
    // Restore hidden elements (in case they were hidden by completion)
    document.getElementById('add-action-row').style.display = 'flex';
    document.querySelector('.apply-section').style.display = 'block';
    
    // Clear any messages
    document.getElementById('apply-message').innerHTML = '';
  }
  

}

document.addEventListener('DOMContentLoaded', () => {
  const ui = new WormholeRollingUI();
  ui.init();
});
