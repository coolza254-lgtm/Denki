// Denki design tokens, taken from the logo: ink navy + volt yellow, with
// chunky outlines and an offset "sticker" shadow for a playful look.

export const C = {
  bg: '#FAF7F0',
  card: '#FFFFFF',
  ink: '#28323F',
  inkSoft: '#5B6573',
  muted: '#98A0AB',
  line: '#ECE7DC',

  volt: '#FDC11D',
  voltSoft: '#FFF3C9',
  voltDeep: '#E2A400',

  sky: '#3D9BFF', // my AC
  skySoft: '#E2F0FF',
  coral: '#FF7452', // brother's AC
  coralSoft: '#FFE7DF',
  slate: '#A3ABB6', // rest of house
  mint: '#1FAF7A',
  mintSoft: '#DDF5EA',
  red: '#E5484D',
  redSoft: '#FDE8E8',
};

export const F = {
  light: 'Mitr_300Light',
  regular: 'Mitr_400Regular',
  medium: 'Mitr_500Medium',
  semi: 'Mitr_600SemiBold',
  bold: 'Mitr_700Bold',
};

export const R = { sm: 12, md: 18, lg: 24, pill: 999 };

/** Outline width and the offset of the solid "sticker" shadow. */
export const STROKE = 2;
export const DEPTH = 4;

/** Colour per usage category (house, my AC, brother's AC, rest). */
export const CAT_COLOR = { house: '#28323F', ac1: '#3D9BFF', ac2: '#FF7452', rest: '#A3ABB6' } as const;
