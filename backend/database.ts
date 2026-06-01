import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const prisma = new PrismaClient();

export async function seedDatabase() {
  try {
    // 1. Seed Users if not present
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('[SEED] Seeding default users...');
      await prisma.user.createMany({
        data: [
          {
            id: 'usr_admin',
            username: 'admin',
            email: 'admin@vizja.pl',
            fullName: 'Jan Kowalski',
            isAdmin: true,
            createdAt: new Date(),
            passwordHash: bcrypt.hashSync('admin123', 10),
          },
          {
            id: 'usr_manager',
            username: 'manager',
            email: 'manager@vizja.pl',
            fullName: 'Anna Nowak',
            isAdmin: false,
            createdAt: new Date(),
            passwordHash: bcrypt.hashSync('manager123', 10),
          },
          {
            id: 'usr_operator',
            username: 'operator',
            email: 'operator@vizja.pl',
            fullName: 'Marek Wisniewski',
            isAdmin: false,
            createdAt: new Date(),
            passwordHash: bcrypt.hashSync('operator123', 10),
          }
        ],
      });
    }

    // 2. Seed Fuel Catalog if empty
    const fuelCount = await prisma.fuel.count();
    if (fuelCount === 0) {
      console.log('[SEED] Seeding fuel catalog...');
      await prisma.fuel.createMany({
        data: [
          {
            id: 'fuel_pb95',
            name: 'Pb95',
            type: 'benzyna',
            pricePerLiter: 6.45,
            availableQuantity: 45000,
          },
          {
            id: 'fuel_pb98',
            name: 'Pb98',
            type: 'benzyna',
            pricePerLiter: 6.99,
            availableQuantity: 28000,
          },
          {
            id: 'fuel_on',
            name: 'ON Ekodiesel',
            type: 'diesel',
            pricePerLiter: 6.54,
            availableQuantity: 50000,
          },
          {
            id: 'fuel_lpg',
            name: 'LPG Pro',
            type: 'LPG',
            pricePerLiter: 2.89,
            availableQuantity: 18000,
          },
          {
            id: 'fuel_adblue',
            name: 'AdBlue',
            type: 'inne',
            pricePerLiter: 3.50,
            availableQuantity: 9500,
          }
        ],
      });
    }

    // 3. Seed Stations and relation table if empty
    const stationCount = await prisma.station.count();
    if (stationCount === 0) {
      console.log('[SEED] Seeding stations and stock levels...');
      
      const st1 = await prisma.station.create({
        data: {
          id: 'st_warszawa',
          name: 'Orlen Warszawa Mozaikowa',
          address: 'ul. Mozaikowa 142',
          city: 'Warszawa',
          workingHours: '24/7',
          createdAt: new Date(),
        }
      });

      const st2 = await prisma.station.create({
        data: {
          id: 'st_krakow',
          name: 'BP Kraków Wielicka',
          address: 'ul. Wielicka 42',
          city: 'Kraków',
          workingHours: '06:00 - 23:00',
          createdAt: new Date(),
        }
      });

      const st3 = await prisma.station.create({
        data: {
          id: 'st_gdansk',
          name: 'Shell Gdańsk Grunwaldzka',
          address: 'al. Grunwaldzka 210',
          city: 'Gdańsk',
          workingHours: '24/7',
          createdAt: new Date(),
        }
      });

      // Add fuel relationships in StationFuel
      await prisma.stationFuel.createMany({
        data: [
          // Warszawa fuels
          { stationId: st1.id, fuelId: 'fuel_pb95', pricePerLiter: 6.45, availableQuantity: 12000 },
          { stationId: st1.id, fuelId: 'fuel_pb98', pricePerLiter: 6.99, availableQuantity: 8000 },
          { stationId: st1.id, fuelId: 'fuel_on', pricePerLiter: 6.54, availableQuantity: 15000 },
          { stationId: st1.id, fuelId: 'fuel_lpg', pricePerLiter: 2.89, availableQuantity: 4000 },
          
          // Kraków fuels
          { stationId: st2.id, fuelId: 'fuel_pb95', pricePerLiter: 6.41, availableQuantity: 9500 },
          { stationId: st2.id, fuelId: 'fuel_on', pricePerLiter: 6.50, availableQuantity: 11000 },
          { stationId: st2.id, fuelId: 'fuel_lpg', pricePerLiter: 2.85, availableQuantity: 3000 },

          // Gdańsk fuels
          { stationId: st3.id, fuelId: 'fuel_pb95', pricePerLiter: 6.49, availableQuantity: 11500 },
          { stationId: st3.id, fuelId: 'fuel_pb98', pricePerLiter: 7.05, availableQuantity: 6500 },
          { stationId: st3.id, fuelId: 'fuel_on', pricePerLiter: 6.59, availableQuantity: 14000 },
          { stationId: st3.id, fuelId: 'fuel_adblue', pricePerLiter: 3.45, availableQuantity: 1200 }
        ]
      });
    }

    // 4. Seed Audit Logs if empty
    const logCount = await prisma.auditLog.count();
    if (logCount === 0) {
      await prisma.auditLog.create({
        data: {
          id: 'log_startup',
          timestamp: new Date(),
          user: 'SYSTEM',
          action: 'STARTUP',
          details: 'Bezpieczna baza SQLite została pomyślnie zamontowana i zainicjowana.',
        }
      });
    }

    console.log('[SEED] SQLite database seeded and ready.');
  } catch (error) {
    console.error('[SEED] Error seeding data:', error);
  }
}
