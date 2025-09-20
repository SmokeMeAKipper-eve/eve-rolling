// UI logic

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
  }
  
  init() {
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
  }
  
  setupEventListeners() {
    // Start tracking button
    document.getElementById('start-tracking').addEventListener('click', () => {
      this.startTracking();
    });
    
    // Reset button
    document.getElementById('reset-all').addEventListener('click', () => {
      this.resetAll();
    });
    
    // Action staging buttons
    document.getElementById('add-action-incoming').addEventListener('click', () => {
      if (this.isTracking) this.stageAction('A');
    });
    document.getElementById('add-action-outgoing').addEventListener('click', () => {
      if (this.isTracking) this.stageAction('B');
    });
    
    // Apply buttons
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
  }
  
  // STAGING FUNCTIONS - Build up actions before applying
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
        // If custom mode is selected but no valid mass entered, show error
        this.showApplyMessage('Please enter a valid custom mass value');
        return;
      }
    } else {
      ship = new Ship(this.getShipType(), shipMode);
    }
    
    const action = new Action(ship, direction);
    this.stagedActions.push(action);
    this.renderStagedActions();
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
      html += `</div>`;
      
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
    document.getElementById('staging-section').style.display = 'block';
    
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
    
    // Create and show completion section
    const completionSection = document.createElement('div');
    completionSection.id = 'completion-section';
    completionSection.className = 'completion-section';
    completionSection.innerHTML = `
      <div class="completion-message ${hasShipsOnFarSide ? 'completion-failure' : 'completion-success'}">
        ${completionMessage}
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
