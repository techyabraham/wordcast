import { existsSync, promises as fs } from 'fs';

export const cleanupFiles = async (paths: Array<string | undefined | null>) => {
  const tasks = paths
    .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    .filter((entry) => existsSync(entry))
    .map(async (entry) => {
      try {
        await fs.unlink(entry);
      } catch {
        // ignore cleanup failures
      }
    });

  await Promise.all(tasks);
};
