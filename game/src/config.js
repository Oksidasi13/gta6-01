// Vice Shores — tuning and constants. One place for every number the game balances on,
// so a later tweak never means hunting through the systems.
export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 2400;
export const ROAD_WIDTH = 96;
export const SIDEWALK = 16;
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

// Roads: the city's grid. Vertical roads run north-south, horizontal east-west.
export const ROADS_VERTICAL = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROADS_HORIZONTAL = [200, 600, 1000, 1400, 1800, 2200];
export const BEACH_TOP = 2200;
export const WATER_TOP = 2320;

// Player on foot.
export const PLAYER_WALK_SPEED = 190;
export const PLAYER_SPRINT_SPEED = 300;
export const PLAYER_RADIUS = 14;
export const PLAYER_MAX_HP = 100;
export const PISTOL_DAMAGE = 34;
export const PISTOL_AMMO_MAX = 12;
export const PISTOL_RELOAD_SECONDS = 1.2;
export const PUNCH_DAMAGE = 25;
export const PUNCH_RANGE = 62;

// Cars.
export const CAR_LENGTH = 52;
export const CAR_WIDTH = 26;
export const CAR_TOP_SPEED = 600;
export const CAR_ACCEL = 320;
export const CAR_BRAKE = 620;
export const CAR_STEER = 2.6;
export const TRAFFIC_COUNT = 14;
export const PARKED_COUNT = 10;
export const TRAFFIC_SPEED = 150;

// Police and wanted.
export const WANTED_MAX = 5;
export const COP_FOOT_SPEED = 205;
export const COP_BUST_RANGE = 30;
export const COP_BUST_SECONDS = 1.2;
export const WANTED_DECAY_SECONDS = 7;
export const POLICE_CAR_SPEED = 420;

// Pedestrians.
export const PED_COUNT = 24;
export const PED_WALK_SPEED = 55;
export const PED_FLEE_SPEED = 150;

// Missions.
export const MISSION_PAYOUTS = [400, 700, 1200];

// Rendering.
export const MINIMAP_WIDTH = 190;
export const MINIMAP_HEIGHT = 142;

// Save.
export const SAVE_KEY = 'vice-shores-save-v1';
