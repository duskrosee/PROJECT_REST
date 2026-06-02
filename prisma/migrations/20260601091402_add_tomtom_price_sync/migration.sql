-- AlterTable
ALTER TABLE "Station" ADD COLUMN "brand" TEXT;
ALTER TABLE "Station" ADD COLUMN "externalFuelPriceId" TEXT;
ALTER TABLE "Station" ADD COLUMN "externalProvider" TEXT;
ALTER TABLE "Station" ADD COLUMN "latitude" REAL;
ALTER TABLE "Station" ADD COLUMN "longitude" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StationFuel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stationId" TEXT NOT NULL,
    "fuelId" TEXT NOT NULL,
    "pricePerLiter" REAL NOT NULL,
    "availableQuantity" REAL NOT NULL,
    "priceSource" TEXT,
    "priceUpdatedAt" DATETIME,
    "priceCurrency" TEXT,
    "priceVolumeUnit" TEXT,
    "externalFuelType" TEXT,
    "isEstimated" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "StationFuel_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StationFuel_fuelId_fkey" FOREIGN KEY ("fuelId") REFERENCES "Fuel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StationFuel" ("availableQuantity", "fuelId", "id", "pricePerLiter", "stationId") SELECT "availableQuantity", "fuelId", "id", "pricePerLiter", "stationId" FROM "StationFuel";
DROP TABLE "StationFuel";
ALTER TABLE "new_StationFuel" RENAME TO "StationFuel";
CREATE UNIQUE INDEX "StationFuel_stationId_fuelId_key" ON "StationFuel"("stationId", "fuelId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
