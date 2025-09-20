
# EVE Wormhole Rolling Tracker

A web-based tool for planning and tracking wormhole rolling operations in EVE Online. Calculate mass usage, track ship movements, and manage wormhole collapse operations with real-time feedback and entertaining completion messages.

## Overview

This tool helps EVE Online pilots efficiently roll wormholes by:
- Calculating accurate mass usage with EVE's 10% variance
- Tracking ship movements through wormholes
- Managing different wormhole states (Fresh → Critical)
- Providing real-time feedback on remaining capacity
- Celebrating successful rolls (or roasting failures) with variety

## Features

- **Wormhole Management**: Support for all standard wormhole sizes and states
- **Ship Database**: Pre-configured masses for common ships (hot/cold configurations)
- **Custom Mass Input**: Handle any ship configuration or cargo load
- **Action Tracking**: Monitor incoming/outgoing movements with running totals
- **State Visualization**: Clear display of current wormhole capacity and limits
- **Completion Messages**: 20 success and 20 failure messages ranging from EVE humor to AI clinical assessments to savage roasts

## Running the Application

### Local Development
```bash
# Clone the repository
git clone <your-repo-url>
cd eve-rolling

# Install development dependencies (for testing only)
npm install

# Open the application
# Simply open index.html in your web browser - no server required!
```

### Usage
1. **Configure Wormhole**: Select size (Gg) and current state (Fresh/Stable/Destabilized/Critical)
2. **Add Actions**: Choose ships or custom masses for incoming/outgoing movements  
3. **Monitor Progress**: Watch real-time calculations and remaining capacity
4. **Roll to Completion**: Get entertaining feedback when the wormhole collapses

### Deployment
Static HTML application - deploy anywhere:
- **GitHub Pages**: Push to repository, enable Pages in Settings
- **Any Web Server**: Upload files to web root
- **Local File**: Open `index.html` directly in browser

## Testing

The application includes comprehensive unit tests for all business logic:

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch
```

Test coverage includes:
- Wormhole mass calculations and state transitions
- Ship mass data and configurations  
- Action tracking and validation
- Custom mass handling
- Edge cases and error conditions

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Testing**: Jest for unit tests
- **Architecture**: Clean separation of business logic and UI
- **Dependencies**: Zero runtime dependencies, Jest for development only
- **Development**: Built with GitHub Copilot Pro assistance

---

*Fly safe, capsuleer! o7*
