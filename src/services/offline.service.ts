// DEPRECATED SERVICE
// This service has been replaced by src/stores/useHarvestStore.ts and HarvestSyncBridge.tsx
// Do not use this file.

export const offlineService = {
  getPendingCount: async () => 0,
  getConflictCount: async () => 0,
  getSyncStatus: () => ({ inProgress: false }),
  processQueue: async () => { },
  cacheRoster: async () => { }, // No-op
  cacheSettings: async () => { }, // No-op
  getCachedSettings: async () => null,
};
