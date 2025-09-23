// Test random events functionality
const { RANDOM_EVENTS } = require('./src/wormhole-logic');

console.log('=== RANDOM EVENTS TEST ===\n');

// Check if random events are defined
console.log('Number of random events defined:', RANDOM_EVENTS.length);
console.log('Random events:', RANDOM_EVENTS.map(e => ({ 
  name: e.name, 
  probability: e.probability, 
  displayName: e.displayName 
})));

// Test probability calculations over many iterations
const iterations = 10000;
const eventCounts = {};

// Initialize counters
RANDOM_EVENTS.forEach(event => {
  eventCounts[event.name] = 0;
});

console.log(`\nTesting probabilities over ${iterations} iterations:`);

for (let i = 0; i < iterations; i++) {
  RANDOM_EVENTS.forEach(event => {
    if (Math.random() < event.probability) {
      eventCounts[event.name]++;
    }
  });
}

// Show results
RANDOM_EVENTS.forEach(event => {
  const actualRate = (eventCounts[event.name] / iterations) * 100;
  const expectedRate = event.probability * 100;
  console.log(`${event.name}:`);
  console.log(`  Expected: ${expectedRate}% chance per action`);
  console.log(`  Actual: ${actualRate.toFixed(2)}% (${eventCounts[event.name]} events)`);
  console.log('');
});

// Test single roll
console.log('=== SINGLE RANDOM ROLL TEST ===');
const triggeredEvents = [];
RANDOM_EVENTS.forEach(event => {
  const roll = Math.random();
  console.log(`${event.name}: rolled ${roll.toFixed(4)}, needed < ${event.probability} = ${roll < event.probability ? 'TRIGGERED!' : 'no event'}`);
  if (roll < event.probability) {
    triggeredEvents.push(event);
  }
});

console.log(`\nTriggered events this roll: ${triggeredEvents.length}`);
if (triggeredEvents.length > 0) {
  triggeredEvents.forEach(event => {
    console.log(`- ${event.displayName}`);
  });
}