/*
 * Per-film surface detail from the original 3M Restyling Studio wraps config
 * (generated from its materialPresets and wraps): normal map (flake, brushed,
 * carbon…), its strength and tiling, colour textures, and two-tone flip colours
 * [start, end, strength]. Texture names are files in assets/textures/.
 */

// looks shared by every film of a material preset
export const PRESET_LOOK = {
  'brushed-metal': { normal: 'brushed-normals', scale: 0.2, repeat: 50 },
  'matte-modern-metallic': { normal: 'paint-normals', scale: 0.4, repeat: 70 },
  'satin-modern-metallic': { normal: 'paint-normals', scale: 0.4, repeat: 200 },
  'gloss-modern-metallic': { normal: 'paint-normals', scale: 0.5, repeat: 70 },
  'carbon-modern': { normal: 'carbon-normals', scale: 0.34, repeat: 500 },
};

// films that differ from their preset (keyed by film id)
export const FILM_LOOK = {
  BR212: {
    normal: 'br212-normal', scale: 0.2, map: 'br212-roughness', repeat: 50,
  },
  G201: { normal: 'paint-normals', scale: 0.75, repeat: 70 },
  G211: { normal: 'paint-normals', scale: 0.6, repeat: 70 },
  G212: {
    normal: 'paint-normals', scale: 0.6, repeat: 40, stretch: 0.7,
  },
  G217: { normal: 'paint-normals', scale: 0.9, repeat: 70 },
  G227: { normal: 'paint-normals', scale: 0.7, repeat: 70 },
  G251: { normal: 'paint-normals', scale: 0.6, repeat: 100 },
  G336: { normal: 'paint-normals', scale: 0.5, repeat: 160 },
  G337: { normal: 'paint-normals', scale: 0.25, repeat: 70 },
  G356: {
    normal: 'paint-normals', scale: 0.5, repeat: 70, flip: ['#00ffb3', '#00ff00', 1],
  },
  G364: { normal: 'paint-normals', scale: 0.15, repeat: 70 },
  GP240: {
    normal: 'paint-normals', scale: 0.7, map: 'c-sp240', repeat: 30,
  },
  GP278: {
    normal: 'paint-normals', scale: 0.83, repeat: 59, flip: ['#160022', '#700000', 1.87],
  },
  GP281: { normal: 'paint-normals', scale: 0.6, repeat: 300 },
  GP282: {
    normal: 'paint-normals', scale: 1, map: 'c-gp282', repeat: 60,
  },
  M21: { normal: 'paint-normals', scale: 0.6, repeat: 100 },
  M206: { normal: 'paint-normals', scale: 1, repeat: 70 },
  M209: { normal: 'paint-normals', scale: 0.6, repeat: 70 },
  M211: { normal: 'paint-normals', scale: 0.6, repeat: 70 },
  M227: { normal: 'paint-normals', scale: 0.7, repeat: 70 },
  M261: { normal: 'paint-normals', scale: 0.5, repeat: 70 },
  MX12: {
    map: 'mx12-basecolor', normal: 'mx12-normal', rough: 'mx12-roughness', repeat: 120, scale: 1,
  },
  S261: { normal: 'paint-normals', scale: 0.5, repeat: 200 },
  S335: {
    normal: 'paint-normals', scale: 0.4, repeat: 200, flip: ['#cf7a00', '#61cf00', 3.08],
  },
  SP236: {
    normal: 'paint-normals', scale: 0.5, repeat: 100, flip: ['#f55600', '#341527', 3.4],
  },
  SP240: {
    normal: 'paint-normals', scale: 0.7, map: 'c-sp240', repeat: 30,
  },
  SP242: {
    normal: 'paint-normals', scale: 0.4, map: 'c-sp242', repeat: 80,
  },
  SP281: { normal: 'paint-normals', scale: 0.4, repeat: 200 },
  CFS201: { normal: 'carbon-normals', scale: 0.14, repeat: 500 },
  CFS12: { normal: 'carbon-normals', scale: 0.13, repeat: 500 },
  SB12: {
    normal: 'camo-normals', scale: 0.4, repeat: 20, stretch: 2,
  },
  BR120: {
    normal: 'br212-normal', scale: 1, map: 'br212-roughness', repeat: 50,
  },
  BR201: {
    normal: 'br212-normal', scale: 1, map: 'br212-roughness', repeat: 50,
  },
  BR230: {
    normal: 'br212-normal', scale: 1, map: 'br212-roughness', repeat: 50,
  },
  G53: { flip: ['#f52b2b', '#003cff', 1] },
  M212: { normal: 'paint-normals', scale: 0.3, repeat: 20 },
  M287: { normal: 'paint-normals', scale: 0.34, repeat: 20 },
  G16: { flip: ['#4bff00', '#c2ff00', 10] },
  'PWF-GP276': {
    normal: 'paint-normals', scale: 0.5, repeat: 70, flip: ['#1d9db9', '#245f2e', 5],
  },
  'PWF-GP288': { flip: ['#002122', '#4e0070', 6] },
  'PWF-GP281': { normal: 'paint-normals', scale: 0.6, repeat: 300 },
  'PWF-GP231': { flip: ['#ff2fa9', '#ffffff', 3] },
  'PWF-G137': { normal: 'paint-normals', scale: 0.8, repeat: 70 },
  'PWF-GP246': {
    normal: 'paint-normals', scale: 0.5, repeat: 70, flip: ['#477070', '#90a048', 6],
  },
  'PWF-GP263': { flip: ['#ff0000', '#ff0000', 3] },
  'PWF-GP256': {
    normal: 'paint-normals', scale: 1, repeat: 40, flip: ['#ffffff', '#b3ad48', 6],
  },
  'PWF-G248': {
    normal: 'paint-normals', scale: 0.5, repeat: 70, flip: ['#a31dcd', '#ff00d1', 1],
  },
  HG212: {
    normal: 'paint-normals', scale: 0.6, repeat: 40, stretch: 0.7,
  },
  HGP278: {
    normal: 'paint-normals', scale: 0.83, repeat: 59, flip: ['#160022', '#700000', 1.87],
  },
  HG336: { normal: 'paint-normals', scale: 0.5, repeat: 160 },
  HG65: { flip: ['#e4ff20', '#acff37', 1] },
  HGP221: { normal: 'paint-normals', scale: 0.7, repeat: 32 },
  HGP258: { normal: 'paint-normals', scale: 0.83, repeat: 70 },
  SP213: { flip: ['#fa8e7f', '#ffec5f', 5.36] },
  SP264: {
    normal: 'paint-normals', scale: 0.27, repeat: 125, flip: ['#f0b710', '#0dac1f', 7.97],
  },
};
