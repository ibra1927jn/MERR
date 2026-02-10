import { createContext, useContext } from 'react';
import { HarvestState, Role, Picker, Bin, HarvestSettings, RowAssignment } from '../types';

export { Role, type HarvestState } from '../types';

// MOCK / ZOMBIE IMPLEMENTATION
// This context is DEAD. It only exists to prevent build errors in legacy components (Manager.tsx).
// All real logic is now in src/stores/useHarvestStore.ts

const DUMMY_STATE: any = {
  currentUser: { name: '', role: null },
  crew: [],
  bins: [],
  notifications: [],
  stats: { totalBuckets: 0, payEstimate: 0, tons: 0, velocity: 0, goalVelocity: 0, binsFull: 0 },
  settings: {},
  bucketRecords: [],
  selectedBinId: undefined,
  activeCrew: [],
  presentCount: 0,
  rowAssignments: [],
};

const HarvestContext = createContext<any>(DUMMY_STATE);

// No Provider needed anymore, but keeping a dummy just in case some rogue import tries to use it? 
// Actually, I removed HarvestProvider from index.tsx, so no one can provide it.
// Components using useHarvest() will get the default context value (DUMMY_STATE) if I pass it to createContext.
// Wait, createContext(defaultValue) only works if there is NO provider matching.
// So this is perfect.

export const useHarvest = () => {
  return DUMMY_STATE;
};

// We don't export HarvestProvider anymore because it's dead.