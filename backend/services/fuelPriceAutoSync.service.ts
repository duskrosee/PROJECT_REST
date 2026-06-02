import { prisma } from '../database';
import { FuelPriceSyncService } from './fuelPriceSync.service';

const DEFAULT_SYNC_INTERVAL_MINUTES = 60;
const DEFAULT_AUTO_IMPORT_LIMIT = 100;

export function startFuelPriceAutoSync() {
  const enabled = readBooleanEnv('BENZYNAMAPA_AUTO_SYNC_ENABLED', false);
  if (!enabled) {
    console.log('[BENZYNAMAPA] Automatic price sync is disabled.');
    return;
  }

  const syncOnStartup = readBooleanEnv('BENZYNAMAPA_AUTO_SYNC_ON_STARTUP', false);
  const importOnStartup = readBooleanEnv('BENZYNAMAPA_AUTO_IMPORT_ON_STARTUP', false);
  const intervalMinutes = readPositiveIntegerEnv('BENZYNAMAPA_AUTO_SYNC_INTERVAL_MINUTES', DEFAULT_SYNC_INTERVAL_MINUTES);
  const autoImportLimit = readPositiveIntegerEnv('BENZYNAMAPA_AUTO_IMPORT_LIMIT', DEFAULT_AUTO_IMPORT_LIMIT);
  const intervalMs = intervalMinutes * 60 * 1000;
  const service = new FuelPriceSyncService();
  let isRunning = false;

  const runImportIfNeeded = async () => {
    if (!importOnStartup) {
      return false;
    }

    const importedCount = await prisma.station.count({
      where: { externalProvider: 'benzynamapa' },
    });

    if (importedCount > 0) {
      return false;
    }

    console.log(`[BENZYNAMAPA] No imported stations found — running initial import (limit ${autoImportLimit})...`);
    const result = await service.importStations('SYSTEM_AUTO_IMPORT', { limit: autoImportLimit });
    console.log(
      `[BENZYNAMAPA] Initial import completed: created ${result.createdCount}, updated ${result.updatedCount}, fuels ${result.stationFuelCount}.`
    );
    return true;
  };

  const runSync = async (reason: string) => {
    if (isRunning) {
      console.log(`[BENZYNAMAPA] Skipping ${reason} sync because another sync is already running.`);
      return;
    }

    isRunning = true;
    const startedAt = Date.now();

    try {
      if (reason === 'startup') {
        await runImportIfNeeded();
      }

      const result = await service.syncAll('SYSTEM_AUTO_SYNC');
      const durationMs = Date.now() - startedAt;
      console.log(
        `[BENZYNAMAPA] ${reason} sync completed in ${durationMs}ms: ` +
        `${result.updatedStationCount}/${result.stationCount} stations updated.`
      );
    } catch (error: any) {
      console.error(`[BENZYNAMAPA] ${reason} sync failed:`, error.message);
    } finally {
      isRunning = false;
    }
  };

  if (syncOnStartup) {
    setTimeout(() => {
      void runSync('startup');
    }, 1000);
  }

  setInterval(() => {
    void runSync('scheduled');
  }, intervalMs);

  console.log(`[BENZYNAMAPA] Automatic price sync scheduled every ${intervalMinutes} minutes.`);
}

function readBooleanEnv(name: string, defaultValue: boolean) {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }

  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

function readPositiveIntegerEnv(name: string, defaultValue: number) {
  const parsed = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}
