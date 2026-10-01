import { CFG } from './config.js';

/* =====================================================================
   POWERUPS — registry so more can be added later
   ===================================================================== */
export const POWERUPS = {
  shadow: { name: 'Landing Shadow', short: 'SHADOW', charges: () => Math.max(1, CFG.powerups.shadow.placements | 0) },
};
