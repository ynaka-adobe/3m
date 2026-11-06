/*
 * The studio's vehicles, from the original 3M Restyling Studio vehicle config:
 * wrappable parts (mesh names in each model), paint protection meshes per
 * coverage tier (cumulative: Full Car includes Full Front and Partial Front),
 * and the camera position the original uses for each part (its own units;
 * only the direction is used here, scaled to our framing). colorMap is the
 * baked texture the original paints trim, chrome, tyres and rims with.
 */

// order and default (the middle one) follow the original's vehicle carousel
export const DEFAULT_VEHICLE = 'sports-car';

export const VEHICLES = [
  {
    key: 'luxury',
    code: 'L',
    model: 'luxurysedan.glb',
    ppf: 'luxurysedan-ppf.glb',
    colorMap: 'luxurysedan.webp',
    thumb: 'luxurycar.webp',
    parts: {
      front: ['b_bumper_f'],
      hood: ['b_hood'],
      left: ['b_fender_l', 'b_door_l_f', 'b_kick_l', 'b_door_l_r', 'b_side_r'],
      top: ['b_roof', 'b_trunk'],
      right: ['b_fender_r', 'b_door_r_f', 'b_kick_r', 'b_door_r_r', 'b_side_l'],
      rear: ['b_bumper_r'],
      accents: ['b_accent_hood', 'b_accent_kick_l', 'b_accent_kick_r', 'b_accent_roof', 'b_accent_trunk'],
    },
    ppfTiers: {
      silver: ['luxurysedan_ppf_silver'],
      gold: ['luxurysedan_ppf_silver', 'luxurysedan_ppf_gold'],
      platinum: ['luxurysedan_ppf_silver', 'luxurysedan_ppf_gold', 'luxurysedan_ppf_platinum'],
    },
    start: [372, 354, 396],
    // camera for shared snapshots (wide and narrow stages)
    shot: [227, 140, 590],
    shotPortrait: [501, 140, 882],
    cams: {
      front: [-8, 129, 636],
      hood: [-6, 446, 471],
      left: [488, 219, -367],
      top: [-6, 446, 471],
      right: [-504, 325, -248],
      rear: [7, 267, -592],
      accents: [-7, 289, 582],
    },
  },
  {
    key: 'tuner',
    code: 'U',
    model: 'tuner.glb',
    ppf: 'tuner-ppf.glb',
    colorMap: 'tuner.webp',
    thumb: 'tuner.webp',
    parts: {
      front: ['t_bumper_f'],
      hood: ['t_hood'],
      left: ['t_fender_l', 't_door_l', 't_side_l'],
      top: ['t_roof', 't_trunk'],
      right: ['t_fender_r', 't_fender_r001', 't_door_r', 't_side_r'],
      rear: ['t_bumper_r'],
      accents: ['t_accent_bumper', 't_accent_hood', 't_accent_kick_l', 't_accent_kick_r', 't_accent_roof', 't_accent_trunk'],
    },
    ppfTiers: {
      silver: ['tuner_ppf_silver'],
      gold: ['tuner_ppf_silver', 'tuner_ppf_gold'],
      platinum: ['tuner_ppf_silver', 'tuner_ppf_gold', 'tuner_ppf_platinum'],
    },
    start: [372, 354, 396],
    // camera for shared snapshots (wide and narrow stages)
    shot: [275, 132, 572],
    shotPortrait: [549, 132, 863],
    cams: {
      front: [-2, 208, 615],
      hood: [-6, 446, 471],
      left: [516, 317, -233],
      top: [-6, 446, 471],
      right: [-434, 260, -407],
      rear: [12, 185, -622],
      accents: [-7, 343, 551],
    },
  },
  {
    key: 'sports-car',
    code: 'S',
    model: 'sportscar.glb',
    ppf: 'sportscar-ppf.glb',
    colorMap: 'sportscar.webp',
    thumb: 'sportscar.webp',
    parts: {
      front: ['gt_fender_f'],
      hood: ['gt_hood'],
      left: ['gt_door_l', 'gt_fender_l', 'gt_mirror_l', 'z_side_low_r_gt'],
      top: ['gt_roof', 'gt_spoiler', 'gt_hood_b'],
      right: ['gt_door_r', 'gt_fender_r', 'gt_mirror_r', 'z_side_low_l_gt'],
      rear: ['gt_bumper_b'],
      accents: ['gt_accent_fender_f', 'gt_accent_hood', 'gt_accent_roof', 'gt_accent_hood_b', 'gt_accent_spoiler'],
    },
    // the original has no Partial Front coverage for this car
    ppfTiers: {
      silver: [],
      gold: ['sportscar_ppf_gold'],
      platinum: ['sportscar_ppf_gold', 'sportscar_ppf_platinum'],
    },
    start: [372, 354, 396],
    // camera for shared snapshots (wide and narrow stages)
    shot: [248, 166, 575],
    shotPortrait: [522, 166, 867],
    cams: {
      front: [0, 118, 500],
      hood: [0, 496, 336],
      left: [322, 215, -339],
      top: [0, 496, 336],
      right: [-280, 193, -386],
      rear: [4, 178, -482],
      accents: [0, 290, 524],
    },
  },
  {
    key: 'muscle-car',
    code: 'M',
    model: 'musclecar.glb',
    ppf: 'musclecar-ppf.glb',
    colorMap: 'musclecar.webp',
    thumb: 'musclecar.webp',
    parts: {
      front: ['dc_bumper_f', 'dc_bumper_f_accent'],
      hood: ['dc_hood'],
      left: ['dc_fender_l', 'dc_door_l', 'dc_side_l'],
      top: ['dc_roof', 'dc_trunk'],
      right: ['dc_fender_r', 'dc_door_r', 'dc_side_r'],
      rear: ['dc_bumper_r'],
      accents: ['dc_accent_bumper_f', 'dc_accent_roof', 'dc_accent_hood', 'dc_accent_trunk', 'dc_accent_bumper'],
    },
    ppfTiers: {
      silver: ['musclecar_ppf_silver'],
      gold: ['musclecar_ppf_silver', 'musclecar_ppf_gold'],
      platinum: ['musclecar_ppf_silver', 'musclecar_ppf_gold', 'musclecar_ppf_platinum'],
    },
    start: [372, 354, 396],
    // camera for shared snapshots (wide and narrow stages)
    shot: [327, 151, 538],
    shotPortrait: [325, 156, 877],
    cams: {
      front: [13, 175, 625],
      hood: [-2, 457, 462],
      left: [516, 317, -233],
      top: [-2, 457, 462],
      right: [-551, 296, 173],
      rear: [2, 180, -624],
      accents: [-7, 296, 578],
    },
  },
  {
    key: 'truck',
    code: 'T',
    model: 'truck.glb',
    ppf: 'truck-ppf.glb',
    colorMap: 'truck.webp',
    thumb: 'truck.webp',
    parts: {
      front: ['f_bumper_f'],
      hood: ['f_hood'],
      left: ['f_fender_l', 'f_door_f_l', 'f_door_r_l', 'f_trim_l', 'f_bed_l'],
      top: ['f_roof', 'f_cab_back'],
      right: ['f_fender_r', 'f_door_f_r', 'f_door_r_r', 'f_trim_r', 'f_bed_r'],
      rear: ['f_gate'],
      accents: ['f_accent_l', 'f_accent_r', 'f_accent_hood'],
    },
    ppfTiers: {
      silver: ['truck_ppf_silver'],
      gold: ['truck_ppf_silver', 'truck_ppf_gold'],
      platinum: ['truck_ppf_silver', 'truck_ppf_gold', 'truck_ppf_platinum'],
    },
    start: [287, 386, 570],
    // camera for shared snapshots (wide and narrow stages)
    shot: [316, 153, 657],
    shotPortrait: [496, 153, 1015],
    cams: {
      front: [0, 274, 589],
      hood: [200, 618, 0],
      left: [536, 327, -165],
      top: [200, 618, 0],
      right: [-522, 320, -215],
      rear: [7, 267, -592],
      accents: [455, 306, -347],
    },
  },
];
