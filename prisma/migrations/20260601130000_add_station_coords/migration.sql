-- AlterTable: add optional GPS coordinates to Station
ALTER TABLE "Station" ADD COLUMN "lat" REAL;
ALTER TABLE "Station" ADD COLUMN "lng" REAL;
