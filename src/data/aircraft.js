import { MARKINGS } from './factions.js';

/**
 * The six playable fighters as data. Consumed by:
 *   - game/aircraft.js  → dials scale the shared flight model
 *   - game/plane-model.js → `model` + `livery` build the cel-shaded mesh
 *
 * Source of truth: knowledge/pocket-pilots/aircraft/ (dials = the §5.2 tuning table).
 *
 * Model spec:
 *   fuselage.style: 'box' | 'boxy' | 'round'    nose.style: 'cowl' | 'radiator' | 'spinner'
 *   wings: ordered top→bottom, each { y, span, chord, thickness? }  (sesquiplane = narrow lower wing)
 *   strut: 'parallel' | 'V' | 'N'   hump: gun fairing (Camel)   gear: landing gear
 * Livery colours are bright/plasticky per the cel art direction.
 */

export const AIRCRAFT = {
  // ---------------- Allied ----------------
  sopwith_camel: {
    id: 'sopwith_camel',
    name: 'Sopwith Camel',
    role: 'Turn-fighter · tricky rotary torque',
    side: 'allied',
    nation: 'UK',
    config: 'biplane',
    guns: 2,
    dials: { turn: 0.85, speed: 0.55, climb: 0.55, diveSafety: 0.5, durability: 0.5, firepower: 0.7 },
    mechanics: { torqueBias: 0.18 }, // fast right turns
    livery: { body: 0x6f6a3f, wing: 0x9c9760, metal: 0x35353d, accent: 0xb23b2e },
    marking: MARKINGS.UK,
    model: {
      fuselage: { length: 2.2, width: 0.5, height: 0.55, style: 'box' },
      nose: { style: 'cowl' },
      wings: [
        { y: 0.55, span: 3.0, chord: 0.72 },
        { y: -0.34, span: 2.8, chord: 0.68 },
      ],
      strut: 'parallel', hump: true, gear: true,
    },
  },

  spad_s13: {
    id: 'spad_s13',
    name: 'SPAD S.XIII',
    role: 'Energy fighter · fast & strong diver',
    side: 'allied',
    nation: 'France',
    config: 'biplane',
    guns: 2,
    dials: { turn: 0.5, speed: 0.95, climb: 0.75, diveSafety: 0.95, durability: 0.7, firepower: 0.7 },
    mechanics: { lowSpeedPenalty: 0.5 },
    livery: { body: 0xcfc39a, wing: 0xcabf95, metal: 0x50525a, accent: 0x2f5fd0 },
    marking: MARKINGS.France,
    model: {
      fuselage: { length: 2.6, width: 0.56, height: 0.6, style: 'boxy' },
      nose: { style: 'radiator' },
      wings: [
        { y: 0.6, span: 3.0, chord: 0.75 },
        { y: -0.4, span: 2.9, chord: 0.72 },
      ],
      strut: 'parallel', hump: false, gear: true,
    },
  },

  nieuport_17: {
    id: 'nieuport_17',
    name: 'Nieuport 17',
    role: 'Nimble climber · fragile in dives',
    side: 'allied',
    nation: 'France',
    config: 'sesquiplane',
    guns: 1,
    dials: { turn: 0.9, speed: 0.45, climb: 0.8, diveSafety: 0.35, durability: 0.45, firepower: 0.45 },
    mechanics: { diveLimit: 0.35 },
    livery: { body: 0xc2c7cc, wing: 0xd4d8dc, metal: 0x44464c, accent: 0xd0342b },
    marking: MARKINGS.France,
    model: {
      fuselage: { length: 2.3, width: 0.44, height: 0.5, style: 'box' },
      nose: { style: 'cowl' },
      wings: [
        { y: 0.6, span: 3.0, chord: 0.8 },
        { y: -0.35, span: 2.4, chord: 0.42 }, // narrow single-spar lower wing
      ],
      strut: 'V', hump: false, gear: true,
    },
  },

  // ---------------- Central Powers ----------------
  fokker_dr1: {
    id: 'fokker_dr1',
    name: 'Fokker Dr.I',
    role: 'Triplane · turn king, slow & poor dive',
    side: 'central',
    nation: 'Germany',
    config: 'triplane',
    guns: 2,
    dials: { turn: 0.95, speed: 0.5, climb: 0.85, diveSafety: 0.4, durability: 0.5, firepower: 0.7 },
    mechanics: { torqueBias: 0.15 },
    livery: { body: 0xe23b2e, wing: 0xe23b2e, metal: 0x2a2a30, accent: 0x141414 }, // Red Baron
    marking: MARKINGS.Germany,
    model: {
      fuselage: { length: 2.2, width: 0.5, height: 0.55, style: 'box' },
      nose: { style: 'cowl' },
      wings: [
        { y: 0.95, span: 3.0, chord: 0.7 },
        { y: 0.15, span: 2.9, chord: 0.7 },
        { y: -0.6, span: 2.7, chord: 0.7 },
      ],
      strut: 'parallel', hump: false, gear: true,
    },
  },

  fokker_d7: {
    id: 'fokker_d7',
    name: 'Fokker D.VII',
    role: 'All-rounder · forgiving & steady',
    side: 'central',
    nation: 'Germany',
    config: 'biplane',
    guns: 2,
    dials: { turn: 0.7, speed: 0.8, climb: 0.75, diveSafety: 0.85, durability: 0.8, firepower: 0.7 },
    mechanics: { altitudeHandling: 1 },
    livery: { body: 0x5f6f4a, wing: 0x6f8f6a, metal: 0x484c55, accent: 0x8a9a5a }, // lozenge-ish
    marking: MARKINGS.Germany,
    model: {
      fuselage: { length: 2.7, width: 0.56, height: 0.62, style: 'boxy' },
      nose: { style: 'radiator' },
      wings: [
        { y: 0.62, span: 3.2, chord: 0.85, thickness: 0.14 }, // thick cantilever
        { y: -0.38, span: 3.0, chord: 0.8, thickness: 0.14 },
      ],
      strut: 'N', hump: false, gear: true,
    },
  },

  albatros_d3: {
    id: 'albatros_d3',
    name: 'Albatros D.III',
    role: 'Hard-hitting · fragile in dives',
    side: 'central',
    nation: 'Germany',
    config: 'sesquiplane',
    guns: 2,
    dials: { turn: 0.6, speed: 0.75, climb: 0.7, diveSafety: 0.35, durability: 0.75, firepower: 0.75 },
    mechanics: { diveLimit: 0.35 },
    livery: { body: 0xc0392b, wing: 0xc79a5e, metal: 0x3a3a40, accent: 0xf0d070, spinner: 0xe8e2d0 }, // Jasta 11 red
    marking: MARKINGS.Germany,
    model: {
      fuselage: { length: 2.7, width: 0.5, height: 0.52, style: 'round' }, // shark-like plywood
      nose: { style: 'spinner' },
      wings: [
        { y: 0.55, span: 3.1, chord: 0.75 },
        { y: -0.3, span: 2.6, chord: 0.45 }, // narrow lower wing
      ],
      strut: 'V', hump: false, gear: true,
    },
  },
};

/** Display / selection order: Allied first, then Central Powers. */
export const AIRCRAFT_ORDER = [
  'sopwith_camel', 'spad_s13', 'nieuport_17',
  'fokker_dr1', 'fokker_d7', 'albatros_d3',
];

export const aircraftList = () => AIRCRAFT_ORDER.map((id) => AIRCRAFT[id]);
