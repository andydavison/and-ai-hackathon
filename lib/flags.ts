/** Maps FIFA 3-letter country codes to ISO 3166-1 alpha-2 codes used by flagcdn.com */
const FIFA_TO_ISO: Record<string, string> = {
  ALG: 'dz', ARG: 'ar', AUS: 'au', AUT: 'at',
  BEL: 'be', BIH: 'ba', BRA: 'br',
  CAN: 'ca', CIV: 'ci', COD: 'cd', COL: 'co', CPV: 'cv', CRO: 'hr', CUW: 'cw', CZE: 'cz',
  ECU: 'ec', EGY: 'eg', ENG: 'gb-eng', ESP: 'es',
  FRA: 'fr',
  GER: 'de', GHA: 'gh',
  HAI: 'ht',
  IRN: 'ir', IRQ: 'iq',
  JOR: 'jo', JPN: 'jp',
  KOR: 'kr', KSA: 'sa',
  MAR: 'ma', MEX: 'mx',
  NED: 'nl', NOR: 'no', NZL: 'nz',
  PAN: 'pa', PAR: 'py', POR: 'pt',
  QAT: 'qa',
  RSA: 'za',
  SAU: 'sa', SCO: 'gb-sct', SEN: 'sn', SUI: 'ch', SWE: 'se',
  TUN: 'tn', TUR: 'tr',
  URU: 'uy', USA: 'us', UZB: 'uz',
};

// Valid fixed-dimension sizes from flagcdn.com (WxH, 4:3 ratio)
const SIZES = {
  sm: '24x18',
  md: '40x30',
  lg: '64x48',
} as const;

/**
 * Returns a flagcdn.com PNG URL for a given FIFA country code.
 * Uses fixed-dimension format (e.g. 24x18) which has more size options than fixed-width.
 */
export function getFlagUrl(fifaCode: string, size: keyof typeof SIZES = 'md'): string | null {
  const iso = FIFA_TO_ISO[fifaCode];
  if (!iso) return null;
  return `https://flagcdn.com/${SIZES[size]}/${iso}.png`;
}
