# lane30

# About
This is a simple bowling game built to commemorate my 30th birthday. ~~Don't tell anyone yet because it's still a secret.~~ It was a great success.

Vibe-coded by ChatGPT. Heavily upgraded, refactored, and bug-fixed by PKING.

# Features
- Simple collision physics: Ball hits one way, pins go the other. Pins naturally decelerate.
- Accurate scoring table: Correct bowling scoring including special frame 10 logic.
- First time user education (FTUX): Simple instructions on how to play.
- Dynamic screen scaling: The game maintains the same aspect ratio regardless of device dimensions.
- Dynamic resolution scaling: The game maintains the same visual fidelity (PPI) regardless of device resolution.
- Fixed refresh rate: The game maintains a constant tick rate regardless of device screen refresh rate while keeping screen refresh rate unlocked.
- Touch actions on mobile devices and mouse input on computers.

# Testing

## Unit tests
### Install dependencies first
`npm install`

### Run tests in watch mode
`npm test`

### Run tests once
`npm run test:run`

### Run with coverage report
`npm run test:coverage`

## Run instructions
1. Run `python3 -m http.server 8000 -d ./` from project directory.
2. Open `http://[::]:8000/` in browser.

**Recommended:** command/ctrl + shift + r to force browser refresh to avoid 304s.
