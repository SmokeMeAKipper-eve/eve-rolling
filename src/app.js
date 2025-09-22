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
    this.randomEventOccurred = false; // Track if a random event has already happened this game
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
    console.log(`  Actual mass used: ${actualMassUsed} Gg (for tracking, exact value known)`);
    console.log(`  Actual remaining mass: ${this.remainingMass} Gg`);
    console.log(`  State Boundaries 100/50/10% = ${this.initialActualMass}Gg / ${Math.floor(this.initialActualMass * 0.5)}Gg / ${Math.floor(this.initialActualMass * 0.1)}Gg`);
    console.log(`  Player sees range: ${Math.round(displayedResultMass.min)} - ${Math.round(displayedResultMass.max)} Gg`);
    console.log(`  Outcome: ${outcome.message}`);
    
    // Log ships on far side after action
    if (this.ui && this.ui.getShipsOnFarSideDescription) {
      const farSideDescription = this.ui.getShipsOnFarSideDescription(this.ui.shipsOnFarSide);
      console.log(`  Ships on Far Side: ${farSideDescription || 'None'}`);
    } else {
      console.log(`  Ships on Far Side: Unable to determine (ui reference issue)`);
    }
    
    // ERROR CHECK: Actual mass should always be within displayed range (unless collapsed)
    // This check happens BEFORE random events to validate player action consistency
    if (outcome.newState !== 'gone' && this.remainingMass > 0 && (this.remainingMass < displayedResultMass.min || this.remainingMass > displayedResultMass.max)) {
      console.error(`🚨 CONSISTENCY ERROR: Actual mass ${this.remainingMass} Gg is outside displayed range ${Math.round(displayedResultMass.min)} - ${Math.round(displayedResultMass.max)} Gg`);
      console.error(`  This indicates a bug in our calculation logic!`);
    } else if (outcome.newState === 'gone' && this.remainingMass > 0) {
      console.error(`🚨 CONSISTENCY ERROR: Wormhole showing as collapsed but actual mass is positive: ${this.remainingMass} Gg`);
    }
    
    // Process random events AFTER the main action is complete and validated
    this.ui.processRandomEventsAfterAction();
  }
  
  determineOutcome() {
    const wormhole = this.ui.getCurrentWormhole();
    const originalRange = new Wormhole(this.ui.initialWhSize, this.ui.initialWhState).getCurrentMassRange();
    
    // Calculate percentage of original mass remaining
    const percentRemaining = (this.remainingMass / this.initialActualMass) * 100;
    const currentState = this.ui.currentWhState;
    
    // Determine what state the wormhole should be in based on mass remaining
    let targetState;
    if (this.remainingMass <= 0) {
      targetState = 'gone';
    } else if (percentRemaining <= 10) {
      targetState = 'critical';
    } else if (percentRemaining <= 50) {
      targetState = 'destab';
    } else {
      // Above 50% mass remaining - wormhole should be stable
      targetState = 'stable';
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
    // Reset random event flag for new game
    this.randomEventOccurred = false;
    console.log('🎮 New game initialized - random events are now possible (max 1 per game)');
    
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
    console.log(`  Ship Restrictions: Up to ${this.initialWhRestriction ? WORMHOLE_RESTRICTIONS[this.initialWhRestriction] : 'Not Set'}`);
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
    this.getWhRestriction = null;
    this.initialWhSize = null;
    this.initialWhState = null;
    this.initialWhRestriction = null;
    this.initialFarSideFleet = {};  // Ships initially on far side at setup
    this.currentWhState = null;
    this.isTracking = false;
    this.shipsOnFarSide = {};    // Track ships that have gone to the other side
    this.selectedWormholeType = null; // Track selected wormhole type
    
    // Mode system
    this.currentMode = null;
    this.trackerMode = new TrackerMode(this);
    this.gameMode = new GameMode(this);
  }
  
  init() {
    // Initialize with tracker mode by default
    this.currentMode = this.trackerMode;
    
    // Setup wormhole type dropdown first
    this.setupWormholeTypeSelection();
    
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
    
    // Wormhole size restrictions
    this.getWhRestriction = renderOptionButtons('wh-restriction-options', WORMHOLE_RESTRICTIONS, null, '3');
    
    // Far side fleet setup
    this.setupFarSideFleet();
    
    // Add listener to restriction changes to update far side fleet and auto-select wormhole
    document.getElementById('wh-restriction-options').addEventListener('click', (e) => {
      if (e.target.classList.contains('option-btn')) {
        // Small delay to let the selection update
        setTimeout(() => {
          this.renderFarSideFleetUI();
          this.autoSelectWormholeType();
        }, 10);
      }
    });
    
    // Add listener to mass changes to auto-select matching wormhole type
    document.getElementById('wh-size-options').addEventListener('click', (e) => {
      if (e.target.classList.contains('option-btn')) {
        setTimeout(() => this.autoSelectWormholeType(), 10);
      }
    });
    
    this.setupEventListeners();
    this.setupModeHandlers();
    
    // Initialize mode display (hide random button for tracker mode by default)
    const randomButton = document.getElementById('random-setup');
    if (randomButton) {
      randomButton.style.display = 'none'; // Hidden by default since we start in tracker mode
    }
    
    // Set initial button text for tracker mode (default)
    const startButton = document.getElementById('start-tracking');
    const resetButton = document.getElementById('reset-all');
    startButton.textContent = 'Start Tracking';
    resetButton.textContent = 'Reset Tracking';
  }
  
  setupFarSideFleet() {
    // Initialize far side fleet quantities to 0 for all ships
    this.initialFarSideFleet = {};
    Object.keys(SHIP_TYPES).forEach(shipKey => {
      this.initialFarSideFleet[shipKey] = 0;
    });
    
    this.renderFarSideFleetUI();
  }
  
  renderFarSideFleetUI() {
    const container = document.getElementById('far-side-fleet-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Get current restriction level to filter ships
    const currentRestriction = this.getWhRestriction ? this.getWhRestriction() : 5;
    
    Object.keys(SHIP_TYPES).forEach(shipKey => {
      const ship = SHIP_TYPES[shipKey];
      const quantity = this.initialFarSideFleet[shipKey] || 0;
      const isDisabled = ship.size > currentRestriction;
      
      const shipRow = document.createElement('div');
      shipRow.className = `far-side-ship-row ${isDisabled ? 'disabled' : ''}`;
      
      shipRow.innerHTML = `
        <div class="far-side-ship-name ${isDisabled ? 'disabled' : ''}">${ship.name}</div>
        <div class="far-side-controls">
          <button class="far-side-btn" data-action="decrease" data-ship="${shipKey}" ${isDisabled || quantity === 0 ? 'disabled' : ''}>−</button>
          <div class="far-side-quantity">${quantity}</div>
          <button class="far-side-btn" data-action="increase" data-ship="${shipKey}" ${isDisabled ? 'disabled' : ''}>+</button>
        </div>
      `;
      
      container.appendChild(shipRow);
    });
    
    // Add event listeners for the +/- buttons
    container.querySelectorAll('.far-side-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const shipKey = e.target.dataset.ship;
        this.updateFarSideQuantity(shipKey, action);
      });
    });
  }
  
  updateFarSideQuantity(shipKey, action) {
    if (action === 'increase') {
      this.initialFarSideFleet[shipKey] = (this.initialFarSideFleet[shipKey] || 0) + 1;
    } else if (action === 'decrease') {
      this.initialFarSideFleet[shipKey] = Math.max(0, (this.initialFarSideFleet[shipKey] || 0) - 1);
    }
    
    this.renderFarSideFleetUI();
  }
  
  setupWormholeTypeSelection() {
    const select = document.getElementById('wormhole-type-select');
    const info = document.getElementById('wormhole-info');
    
    // Clear existing options (keep the first "Select..." option)
    select.innerHTML = '<option value="">Select a wormhole type...</option>';
    
    // Get all wormhole codes and sort them
    const allCodes = getAllWormholeCodes();
    
    // Add regular wormholes
    allCodes.forEach(code => {
      if (code !== 'K162' && code !== '⛮') { // Skip special wormholes for selection
        const option = document.createElement('option');
        option.value = code;
        option.textContent = code;
        select.appendChild(option);
      }
    });
    
    // Add event listener for selection changes
    select.addEventListener('change', (e) => {
      const selectedCode = e.target.value;
      this.onWormholeTypeSelected(selectedCode);
    });
  }
  
  onWormholeTypeSelected(whCode) {
    this.selectedWormholeType = whCode;
    const info = document.getElementById('wormhole-info');
    
    if (!whCode) {
      info.textContent = '';
      return;
    }
    
    const whInfo = getWormholeInfo(whCode);
    if (whInfo) {
      // Update the mass and restriction selections to match
      this.setMassSelection(whInfo.totalMass);
      this.setRestrictionSelection(whInfo.restriction);
      
      // Update info display
      info.innerHTML = `
        <span>→ ${whInfo.destination}</span>
        <span>•</span>
        <span>${whInfo.totalMass} Gg</span>
        <span>•</span>
        <span>${whInfo.restrictionText}</span>
      `;
      
      // Update far side fleet for new restriction
      this.renderFarSideFleetUI();
    }
  }
  
  setMassSelection(mass) {
    const buttons = document.querySelectorAll('#wh-size-options .option-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('selected', btn.textContent === `${mass} Gg`);
    });
    
    // Update the getter function
    this.getWhSize = () => mass.toString();
  }
  
  setRestrictionSelection(restriction) {
    const buttons = document.querySelectorAll('#wh-restriction-options .option-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('selected', btn.textContent === WORMHOLE_RESTRICTIONS[restriction]);
    });
    
    // Update the getter function
    this.getWhRestriction = () => restriction.toString();
  }
  
  autoSelectWormholeType() {
    const currentMass = parseInt(this.getWhSize());
    const currentRestriction = parseInt(this.getWhRestriction());
    
    // Find wormholes that match both mass and restriction
    let matchingWormholes = [];
    Object.entries(WORMHOLE_DATA).forEach(([code, data]) => {
      if (data.totalMass === currentMass && data.restriction === currentRestriction) {
        matchingWormholes.push(code);
      }
    });
    
    const select = document.getElementById('wormhole-type-select');
    const info = document.getElementById('wormhole-info');
    
    if (matchingWormholes.length === 1) {
      // Exact match - select it
      select.value = matchingWormholes[0];
      this.selectedWormholeType = matchingWormholes[0];
      const whInfo = getWormholeInfo(matchingWormholes[0]);
      info.innerHTML = `
        <span>→ ${whInfo.destination}</span>
        <span>•</span>
        <span>${whInfo.totalMass} Gg</span>
        <span>•</span>
        <span>${whInfo.restrictionText}</span>
      `;
    } else if (matchingWormholes.length > 1) {
      // Multiple matches - show options
      select.value = '';
      this.selectedWormholeType = null;
      info.textContent = `${matchingWormholes.length} wormhole types match: ${matchingWormholes.join(', ')}`;
    } else {
      // No matches
      select.value = '';
      this.selectedWormholeType = null;
      info.textContent = 'No wormhole types match this mass/restriction combination';
    }
  }
  
  setupModeHandlers() {
    // Tab switching (automatically resets when switching)
    document.getElementById('tracker-mode-btn').addEventListener('click', () => {
      this.switchToMode(this.trackerMode);
    });
    
    document.getElementById('game-mode-btn').addEventListener('click', () => {
      this.switchToMode(this.gameMode);
    });
  }
  
  switchToMode(newMode) {
    // Always reset when switching modes (since tabs act as mode selectors)
    if (this.isTracking) {
      this.resetAll();
    }
    
    this.currentMode = newMode;
    
    // Update tab states
    document.getElementById('tracker-mode-btn').classList.toggle('active', newMode === this.trackerMode);
    document.getElementById('game-mode-btn').classList.toggle('active', newMode === this.gameMode);
    
    // Update instruction content
    document.getElementById('tracker-instructions').classList.toggle('active', newMode === this.trackerMode);
    document.getElementById('game-instructions').classList.toggle('active', newMode === this.gameMode);
    
    // Show/hide random button based on mode (only for game mode)
    const randomButton = document.getElementById('random-setup');
    if (randomButton) {
      randomButton.style.display = newMode === this.gameMode ? 'inline-block' : 'none';
    }
    
    // Update button text based on mode
    const startButton = document.getElementById('start-tracking');
    const resetButton = document.getElementById('reset-all');
    
    if (newMode === this.gameMode) {
      startButton.textContent = 'Start Game';
      resetButton.textContent = 'Reset Game';
    } else {
      startButton.textContent = 'Start Tracking';
      resetButton.textContent = 'Reset Tracking';
    }
    
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
    // Randomly select a wormhole type from the database
    const allCodes = Object.keys(WORMHOLE_DATA);
    const randomCode = allCodes[Math.floor(Math.random() * allCodes.length)];
    const whInfo = getWormholeInfo(randomCode);
    
    // Randomly select initial state (exclude 'gone' as that's not valid for starting)
    const initialStates = ['fresh', 'stable', 'destab', 'critical'];
    const randomState = initialStates[Math.floor(Math.random() * initialStates.length)];
    
    // Update wormhole type dropdown
    const select = document.getElementById('wormhole-type-select');
    select.value = randomCode;
    this.onWormholeTypeSelected(randomCode);
    
    // Update state selection
    const stateButtons = document.querySelectorAll('#wh-state-options .option-btn');
    stateButtons.forEach(btn => btn.classList.remove('selected'));
    
    stateButtons.forEach(btn => {
      if (btn.dataset.value === randomState) {
        btn.click();
      }
    });
    
    // Randomize far side fleet based on the wormhole's restriction
    this.randomizeFarSideFleet(whInfo.restriction);
    
    console.log(`Random setup: ${randomCode} (${whInfo.totalMass} Gg, ${whInfo.restrictionText}, → ${whInfo.destination}) in ${randomState} state`);
  }
  
  randomizeFarSideFleet(restrictionLevel) {
    // Reset all ships to 0
    Object.keys(SHIP_TYPES).forEach(shipKey => {
      this.initialFarSideFleet[shipKey] = 0;
    });
    
    // For each valid ship type (respecting size restrictions)
    Object.entries(SHIP_TYPES).forEach(([shipKey, ship]) => {
      if (ship.size <= restrictionLevel) {
        // 75% chance of 0, 25% chance of 1-5
        const roll = Math.random();
        if (roll > 0.75) { // 25% chance of non-zero
          this.initialFarSideFleet[shipKey] = Math.floor(Math.random() * 5) + 1; // 1-5
        }
      }
    });
    
    // Update the UI to reflect random far side fleet
    this.renderFarSideFleetUI();
    
    // Log the random fleet for debugging
    const fleetSummary = this.getShipsOnFarSideDescription(this.initialFarSideFleet);
    if (fleetSummary) {
      console.log(`Random far side fleet: ${fleetSummary}`);
    } else {
      console.log('Random far side fleet: None');
    }
  }
  
  // Random Events System for Game Mode
  checkForRandomEvents() {
    if (!RANDOM_EVENTS || this.currentMode !== this.gameMode) {
      return [];
    }
    
    // Only allow one random event per game
    if (this.gameMode.randomEventOccurred) {
      console.log('🎲 Random event check: Blocked - one event already occurred this game');
      return [];
    }
    
    const triggeredEvents = [];
    RANDOM_EVENTS.forEach(event => {
      if (Math.random() < event.probability) {
        triggeredEvents.push(event);
      }
    });
    
    return triggeredEvents;
  }
  
  processRandomEventsAfterAction() {
    // Only process events in game mode and if wormhole isn't collapsed
    if (this.currentMode !== this.gameMode || this.gameMode.remainingMass <= 0) {
      return;
    }

    const randomEvents = this.checkForRandomEvents();
    
    if (randomEvents.length > 0) {
      // Filter out events that have ships exceeding wormhole restrictions
      const currentRestriction = this.initialWhRestriction;
      const validEvents = randomEvents.filter(event => {
        // Check if all actions in the event have ships that fit through the wormhole
        return event.actions.every(action => {
          const shipData = SHIP_TYPES[action.shipType];
          return shipData && shipData.size <= currentRestriction;
        });
      });
      
      if (validEvents.length > 0) {
        // Randomly select one of the valid events (instead of taking the first)
        const randomIndex = Math.floor(Math.random() * validEvents.length);
        this.processRandomEventAsAction(validEvents[randomIndex]);
      } else {
        console.log('🎲 Random events triggered but all ships too large for wormhole restrictions');
      }
    }
  }  processRandomEventAsAction(event) {
    console.log(`\n🎲 Random Event Triggered: ${event.displayName}`);
    
    // Mark that a random event has occurred this game
    this.gameMode.randomEventOccurred = true;
    console.log('🎲 Random event limit: This was the one allowed event for this game');
    
    const processedActions = [];
    let totalMassImpact = 0;
    let currentDisplayedMass = this.calculateCurrentMass(); // Start with current player view
    let eventCompleted = false;
    let eventStateChange = 'no-change'; // Track the overall state change for the event
    let eventStateChangeMessage = '';
    const initialState = this.currentWhState; // Remember initial state
    
    // Process each action in the event sequentially
    for (let i = 0; i < event.actions.length; i++) {
      const eventAction = event.actions[i];
      
      // Check if wormhole is still open before processing this action
      if (this.currentWhState === 'gone') {
        console.log(`  Action ${i + 1} skipped: Wormhole already collapsed`);
        break;
      }
      
      console.log(`  Processing action ${i + 1}/${event.actions.length}: ${SHIP_TYPES[eventAction.shipType]?.name || eventAction.shipType} ${eventAction.direction}`);
      
      // Create ship for this specific action
      const eventShip = this.createEventShip(eventAction);
      const direction = eventAction.direction === 'outgoing' ? 'B' : 'A'; // B = outgoing, A = incoming
      
      // Create action and get mass impact
      const action = new Action(eventShip, direction);
      const massImpact = eventAction.getMassImpact();
      totalMassImpact += massImpact;
      
      // Apply mass reduction to hidden mass
      this.gameMode.remainingMass -= massImpact;
      
      // Apply this action to the current displayed mass (progressive calculation)
      const displayedResultMass = action.applyToMass(currentDisplayedMass);
      
      // Apply state boundaries to displayed mass (same as normal actions)
      const currentWormhole = this.getCurrentWormhole();
      const stateBoundaries = currentWormhole.getStateBoundaries();
      displayedResultMass.min = Math.max(displayedResultMass.min, stateBoundaries.min);
      displayedResultMass.max = Math.min(displayedResultMass.max, stateBoundaries.max);
      displayedResultMass.min = Math.min(displayedResultMass.min, displayedResultMass.max);
      
      // Update the running displayed mass for the next action
      currentDisplayedMass = displayedResultMass;
      
      // Determine outcome using same logic as normal actions (after each action)
      const outcome = this.gameMode.determineOutcome();
      
      // Update current state if it changed
      if (outcome.newState !== 'no-change') {
        this.currentWhState = outcome.newState;
        console.log(`    Action ${i + 1} outcome: ${outcome.message}`);
        
        // Track the most significant state change for the overall event
        if (eventStateChange === 'no-change') {
          eventStateChange = outcome.newState;
          eventStateChangeMessage = outcome.message;
        }
      }
      
      // Store this action
      processedActions.push({
        action: action,
        massImpact: massImpact,
        outcome: outcome,
        displayedMass: displayedResultMass
      });
      
      console.log(`    Action ${i + 1} mass impact: ${massImpact} Gg`);
      console.log(`    Remaining after action ${i + 1}: ${this.gameMode.remainingMass} Gg`);
      
      // Check if wormhole collapsed from this action
      if (outcome.newState === 'gone') {
        console.log(`    🚨 Action ${i + 1} caused wormhole collapse!`);
        eventCompleted = true;
        break;
      }
    }
    
    // Add to committed actions (visible to player like normal action)
    const farSideSnapshot = { ...this.shipsOnFarSide };
    const finalOutcome = processedActions.length > 0 ? processedActions[processedActions.length - 1].outcome : { newState: 'no-change', message: 'No change' };
    
    this.committedActions.push({
      type: 'event',
      actions: processedActions.map(pa => pa.action),
      eventData: event,
      actualMassUsed: totalMassImpact,
      remainingMass: this.gameMode.remainingMass,
      outcome: finalOutcome,
      stateChange: eventStateChange, // Use the tracked overall state change
      currentState: this.currentWhState,
      finalMass: currentDisplayedMass, // Player sees this final progressive mass
      shipsOnFarSide: farSideSnapshot,
      timestamp: Date.now(),
      actionsProcessed: processedActions.length,
      totalActions: event.actions.length
    });
    
    // Show final result to player
    console.log(`  Total event mass impact: ${totalMassImpact} Gg`);
    console.log(`  Player sees final range: ${Math.round(currentDisplayedMass.min)} - ${Math.round(currentDisplayedMass.max)} Gg`);
    console.log(`  Actual remaining after event: ${this.gameMode.remainingMass} Gg`);
    console.log(`  Actions completed: ${processedActions.length}/${event.actions.length}`);
    
    // Log ships on far side after event
    if (this.getShipsOnFarSideDescription) {
      const eventFarSideDescription = this.getShipsOnFarSideDescription(this.shipsOnFarSide);
      console.log(`  Ships on Far Side: ${eventFarSideDescription || 'None'}`);
    } else {
      console.log(`  Ships on Far Side: Unable to determine (method missing)`);
    }
    
    // Handle wormhole collapse from event
    if (this.currentWhState === 'gone') {
      console.log(`  🚨 Random event caused wormhole collapse - triggering completion`);
      // Update UI to show the event BEFORE triggering completion
      this.renderActionsList();
      this.handleWormholeCompletion();
      return; // Don't update UI after completion
    }
    
    // Update the UI to show the new mass ranges
    this.renderActionsList();
  }
  
  createEventShip(eventAction) {
    // Extract ship type from individual action
    const shipType = eventAction.shipType;
    const shipData = SHIP_TYPES[shipType];
    
    if (!shipData) {
      // Fallback for unknown ship types
      return {
        type: 'cruiser',
        mode: 'unknown',
        getMass: () => ({
          min: SHIP_TYPES.cruiser.cold,
          max: SHIP_TYPES.cruiser.hot
        }),
        getDisplayName: () => 'Event Ship (Hidden)'
      };
    }
    
    return {
      type: shipType,
      mode: 'unknown', // Unknown mass like player actions
      getMass: () => ({
        min: shipData.cold,
        max: shipData.hot
      }),
      getDisplayName: () => `Event ${shipData.name} (Hidden)`
    };
  }  logAction(actionData) {
    // For events, add directly to committed actions as separate entries
    if (actionData.type === 'event') {
      this.committedActions.push({
        type: 'event',
        eventData: actionData,
        timestamp: Date.now()
      });
      
      this.renderActionsList();
    }
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
      this.resetCurrentMode();
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
  
  getShipsOnFarSideDescription(shipsObj) {
    const shipCounts = [];
    Object.entries(shipsObj).forEach(([shipKey, count]) => {
      if (count > 0) {
        const shipName = SHIP_TYPES[shipKey].name;
        shipCounts.push(count === 1 ? shipName : `${count}x ${shipName}`);
      }
    });
    return shipCounts.length > 0 ? shipCounts.join(', ') : null;
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
    
    // Console logging for tracker mode
    const actionDescriptions = actions.map(action => 
      `${action.ship.getDisplayName()} ${action.direction === 'A' ? 'incoming' : 'outgoing'}`
    ).join(', ');
    const stateText = stateChange === 'no-change' ? 'no state change' : 
                     stateChange === 'destab' ? 'destabilized' : 
                     stateChange === 'critical' ? 'critical' : 
                     stateChange === 'gone' ? 'wormhole gone' : stateChange;
    console.log(`📊 Tracker Actions Applied: ${actionDescriptions}`);
    console.log(`  Result: ${Math.round(finalMass.min)} - ${Math.round(finalMass.max)} Gg, ${stateText}`);
    console.log(`  Passed mass this batch: ${Math.round(entryPassedMass)} Gg`);
    console.log(`  Total passed mass: ${Math.round(totalPassedMass)} Gg`);
    
    // Log ships on far side after tracker batch
    const trackerFarSideDescription = this.getShipsOnFarSideDescription(farSideSnapshot);
    console.log(`  Ships on Far Side: ${trackerFarSideDescription || 'None'}`);
    
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
    const restrictionText = WORMHOLE_RESTRICTIONS[this.initialWhRestriction];
    html += `<div class="log-header">`;
    html += `<div><strong>Initial Setup:</strong> ${this.initialWhSize} Gg wormhole in ${stateText} state, ${restrictionText}</div>`;
    
    // Show the range boundaries for different states
    const baseMass = this.initialWhSize;
    const variance = 0.1;
    const freshMin = Math.round(baseMass * (1 - variance));
    const freshMax = Math.round(baseMass * (1 + variance));
    const destabMin = Math.round(freshMin * 0.5);
    const destabMax = Math.round(freshMax * 0.5);
    const critMin = Math.round(freshMin * 0.1);
    const critMax = Math.round(freshMax * 0.1);
    
    html += `<div><strong>Fresh / Destab / Crit Range</strong></div>`;
    html += `<div>  Min: <span class="range-fresh">${freshMin}</span> / <span class="range-destab">${destabMin}</span> / <span class="range-critical">${critMin}</span></div>`;
    html += `<div>  Max: <span class="range-fresh">${freshMax}</span> / <span class="range-destab">${destabMax}</span> / <span class="range-critical">${critMax}</span></div>`;
    
    // Show the initial starting mass range (never changes)
    const initialWormhole = new Wormhole(this.initialWhSize, this.initialWhState);
    const initialMass = initialWormhole.getCurrentMassRange();
    html += `<div><strong>Starting Mass Range:</strong> ${Math.round(initialMass.min)} - ${Math.round(initialMass.max)} Gg</div>`;
    
    // Show initial far side fleet if any
    const initialFarSideShips = this.getShipsOnFarSideDescription(this.initialFarSideFleet);
    if (initialFarSideShips) {
      html += `<div><strong>Initial Far Side Fleet:</strong> ${initialFarSideShips}</div>`;
    }
    
    html += `</div>`;
    
    this.committedActions.forEach((entry, entryIndex) => {
      // Handle different entry types
      if (entry.type === 'event') {
        // Event entry - display like normal action but with event styling
        html += `<div class="log-entry log-event">`;
        
        // Top section - event message and state changes
        html += `<div class="log-entry-top">`;
        html += `<div class="log-entry-left">`;
        html += `<div class="log-entry-header" style="color: #FFA500;"><strong>Random Event:</strong></div>`;
        html += `<div class="log-action" style="color: #FFA500;">${entry.eventData.displayName}</div>`;
        
        // Show state change if any
        if (entry.stateChange && entry.stateChange !== 'no-change') {
          const stateChangeText = entry.stateChange === 'fresh' ? 'Fresh' :
                                 entry.stateChange === 'stable' ? 'Stable' :
                                 entry.stateChange === 'destab' ? 'Destab' :
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
        
        // Show actions processed in this event
        if (entry.eventData && entry.eventData.actions) {
          html += `<div class="log-event-actions">`;
          html += `<div class="log-event-actions-header"><strong>Actions:</strong></div>`;
          
          for (let i = 0; i < entry.actionsProcessed; i++) {
            const action = entry.eventData.actions[i];
            const actionNum = i + 1;
            const directionText = action.direction === 'outgoing' ? 'jumps out' : 'jumps back';
            const shipName = SHIP_TYPES[action.shipType]?.name || action.shipType;
            html += `<div class="log-event-action">• ${shipName} ${directionText}</div>`;
          }
          
          if (entry.actionsProcessed < entry.totalActions) {
            const skipped = entry.totalActions - entry.actionsProcessed;
            html += `<div class="log-event-action-skipped">• ${skipped} action(s) skipped (wormhole collapsed)</div>`;
          }
          
          html += `</div>`; // Close log-event-actions
        }
        
        // Bottom section - mass calculations (like normal actions)
        html += `<div class="log-entry-bottom">`;
        const minMassText = Math.round(entry.finalMass.min);
        const maxMassText = Math.round(entry.finalMass.max);
        html += `<div class="log-result"><strong>Remaining After Event:</strong><br>${minMassText} - ${maxMassText} Gg</div>`;
        
        // Show total mass range for the event (sum of all possible action masses)
        if (entry.eventData && entry.eventData.name === 'neutral_cruiser_jump') {
          const singleMin = 13, singleMax = 63;
          const totalMin = singleMin * 2; // Two cruiser jumps minimum
          const totalMax = singleMax * 2; // Two cruiser jumps maximum
          html += `<div class="log-passed-mass"><strong>Event Mass:</strong><br>${totalMin}-${totalMax} Gg (Unknown)</div>`;
        } else if (entry.eventData && entry.eventData.name === 'neutral_carrier_jump') {
          const singleMin = 1250, singleMax = 1750;
          const totalMin = singleMin * 2; // Two carrier jumps minimum
          const totalMax = singleMax * 2; // Two carrier jumps maximum
          html += `<div class="log-passed-mass"><strong>Event Mass:</strong><br>${totalMin}-${totalMax} Gg (Unknown)</div>`;
        }
        
        html += `</div>`; // Close log-entry-bottom
        html += `</div>`; // Close log-entry
        return; // Skip normal action processing
      }
      
      // Normal action entry
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
        const shipList = Object.entries(entry.shipsOnFarSide)
          .filter(([shipType, count]) => count > 0) // Only show ships with count > 0
          .map(([shipType, count]) => `${SHIP_TYPES[shipType].name} x${count}`)
          .join(', ');
        
        if (shipList.length > 0) {
          html += `<div class="log-far-side"><strong>Ships on Far Side:</strong><br>${shipList}</div>`;
        } else {
          html += `<div class="log-far-side"><strong>Ships on Far Side:</strong><br>None</div>`;
        }
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
  
  setupShipSelection() {
    const container = document.getElementById('ship-type-options');
    container.innerHTML = '';
    let selected = 'rbs'; // Default selection
    
    Object.entries(SHIP_TYPES).forEach(([key, data]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.value = key;
      btn.textContent = data.name;
      
      // Check if ship exceeds wormhole size restriction
      const shipSize = data.size;
      const maxAllowedSize = this.initialWhRestriction;
      const isDisabled = shipSize > maxAllowedSize;
      
      if (isDisabled) {
        btn.className = 'option-btn disabled';
        btn.disabled = true;
        btn.title = `Ship too large for this wormhole (size ${shipSize} > ${maxAllowedSize})`;
      } else {
        btn.className = 'option-btn' + (key === 'rbs' ? ' selected' : '');
        btn.addEventListener('click', () => {
          Array.from(container.children).forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selected = key;
        });
      }
      
      container.appendChild(btn);
    });
    
    // If default selection is disabled, find the first enabled ship
    if (SHIP_TYPES[selected].size > this.initialWhRestriction) {
      const firstEnabledShip = Object.entries(SHIP_TYPES).find(([key, data]) => data.size <= this.initialWhRestriction);
      if (firstEnabledShip) {
        selected = firstEnabledShip[0];
        container.querySelector(`[data-value="${selected}"]`).classList.add('selected');
      }
    }
    
    this.getShipType = () => selected;
  }
  
  startTracking() {
    // Store initial values
    this.initialWhSize = parseInt(this.getWhSize());
    this.initialWhState = this.getWhState();
    this.initialWhRestriction = parseInt(this.getWhRestriction());
    
    // Convert "fresh" to "stable" - fresh is just a UI concept for stable with no known transits
    this.currentWhState = this.initialWhState === 'fresh' ? 'stable' : this.initialWhState;
    this.isTracking = true;
    
    // Initialize far side fleet from initial setup
    this.shipsOnFarSide = { ...this.initialFarSideFleet };
    
    // Setup ship selection after tracking starts with size restrictions
    this.setupShipSelection();
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
    
    // Show completion message - check if we have ANY ships left on far side
    const currentFarSideCount = Object.values(this.shipsOnFarSide).reduce((sum, count) => sum + count, 0);
    const initialFarSideCount = Object.values(this.initialFarSideFleet).reduce((sum, count) => sum + count, 0);
    const hasStrandedShips = currentFarSideCount > 0;
    
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
    
    const messageArray = hasStrandedShips ? failureMessages : successMessages;
    const completionMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
    
    // Create clear summary text
    let summaryText = '';
    if (hasStrandedShips) {
      // Show total stranded ships
      summaryText = `Failure - wormhole rolled, but ${currentFarSideCount} ship${currentFarSideCount !== 1 ? 's' : ''} left on far side`;
    } else {
      summaryText = 'Success - wormhole rolled, and all ships ended up on the correct side';
    }
    
    // Create and show completion section
    const completionSection = document.createElement('div');
    completionSection.id = 'completion-section';
    completionSection.className = 'completion-section';
    completionSection.innerHTML = `
      <div class="completion-message ${hasStrandedShips ? 'completion-failure' : 'completion-success'}">
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
  
  resetCurrentMode() {
    // Reset to initial setup but stay in current mode
    this.resetAll();
    // Note: resetAll() already handles everything, we just renamed the public method
    // This keeps the current mode intact since switchToMode() is not called
  }
  
  resetAll() {
    // Reset all state
    this.committedActions = [];
    this.stagedActions = [];
    this.isTracking = false;
    this.initialWhSize = null;
    this.initialWhState = null;
    this.initialWhRestriction = null;
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
