// Ridge Runner — configuration: physics, colours, missions, HUD.
// All values are tuned for an arcade feel: forgiving, readable, fun.

export const VIEW = {
  width: 1280,
  height: 720,
  groundBase: 620, // y of the valley floor in world units (screen y grows down)
};

export const PHYSICS = {
  gravity: 26, // px/s^2 pulling the nose down when slow
  maxSpeed: 340, // px/s at full throttle, level flight
  minSpeed: 60, // below this the plane stalls
  accel: 90, // px/s^2 gained per second at full throttle
  drag: 0.22, // per-second speed loss fraction
  climbDrag: 0.55, // extra drag while climbing steeply
  pitchRate: 1.9, // rad/s the nose moves with up/down held
  maxPitch: 0.62, // rad, about 35 degrees
  lift: 1.0,
  stallSink: 150, // px/s sink rate while stalled
  boostMult: 1.45, // speed multiplier while boosting
  boostBurn: 10, // extra fuel per second while boosting
};

export const FUEL = {
  start: 100,
  burnPerThrottle: 1.8, // fuel per second at full throttle
  burnIdle: 0.8, // fuel per second at idle
  canister: 35, // fuel gained per canister
};

export const PLANE = {
  maxDamage: 3,
  ringRadius: 46,
  collectRadius: 60,
};

// Colours: one dusk palette for sky, terrain and instruments.
export const COLORS = {
  skyTop: '#1c2f5e',
  skyMid: '#4a6fa5',
  skyLow: '#e8a56b',
  sun: '#ffd9a0',
  sunCore: '#fff3d6',
  mountainFar: '#5d6f9e',
  mountainNear: '#3d4f7a',
  hill: '#2e4a2f',
  hillDark: '#243d26',
  ground: '#3a2f24',
  grass: '#4d7a3a',
  river: '#6fb3d8',
  tree: '#1f4d24',
  treeTop: '#2f6b33',
  townWall: '#8a7a68',
  townRoof: '#6e4a3a',
  windowLit: '#ffd76a',
  runway: '#3c3c46',
  runwayLine: '#f2f2e8',
  ring: '#ffd76a',
  ringGlow: 'rgba(255, 215, 106, 0.35)',
  canister: '#7ee787',
  planeBody: '#e8e4da',
  planeWing: '#c9403c',
  planeGlass: '#9fd8ef',
  hud: '#eaf6ff',
  hudDim: 'rgba(234, 246, 255, 0.55)',
  hudPanel: 'rgba(10, 18, 34, 0.55)',
  hudWarn: '#ff5a4e',
  hudGood: '#7ee787',
};

// Missions: same engine, different goals, terrain seeds and hazards.
export const MISSIONS = [
  {
    id: 'rings',
    name: 'Ring Run',
    blurb: 'Thread all 8 rings before the fuel runs dry.',
    seed: 101,
    rings: 8,
    canisters: 3,
    fuel: 100,
    storm: 0,
    runway: false,
    goal: 'Fly through 8 rings',
  },
  {
    id: 'courier',
    name: 'Courier',
    blurb: 'Pick up the parcel, then land gently on the runway.',
    seed: 202,
    rings: 1,
    canisters: 2,
    fuel: 100,
    storm: 0,
    runway: true,
    goal: 'Collect the parcel, then land on the runway',
  },
  {
    id: 'storm',
    name: 'Storm Run',
    blurb: 'Ride the gusts, grab 5 fuel cans, reach the far strip.',
    seed: 303,
    rings: 4,
    canisters: 5,
    fuel: 85,
    storm: 1,
    runway: true,
    goal: 'Collect 5 fuel cans and land',
  },
];

export const SCORES = {
  ring: 100,
  canister: 50,
  landing: 500,
  nearMiss: 25,
  timeBonusPerSecond: 10,
};
