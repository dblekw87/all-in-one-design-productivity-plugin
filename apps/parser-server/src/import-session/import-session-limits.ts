export interface ImportSessionLimits {
  ttlMs: number;
  maxSessions: number;
  maxAssetsPerSession: number;
  maxBytesPerSession: number;
  maxTotalBytes: number;
  maxDownloadsPerSession: number;
}

export const DEFAULT_IMPORT_SESSION_LIMITS: ImportSessionLimits = {
  ttlMs: 5 * 60 * 1000,
  maxSessions: 100,
  maxAssetsPerSession: 1_000,
  maxBytesPerSession: 20 * 1024 * 1024,
  maxTotalBytes: 200 * 1024 * 1024,
  maxDownloadsPerSession: 2_000
};
