import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { apiRouter } from './backend/routes';
import { seedDatabase } from './backend/database';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // CORS and base headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[REST] ${req.method} ${req.path}`);
    next();
  });

  // Automatically Seed SQLite Database on boot
  await seedDatabase();

  // Register central modular REST API router
  app.use(apiRouter);

  // Swagger Documentation Setup
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'FUELREST SYSTEM - API',
        version: '1.0.0',
        description: 'Zarządzanie siecią stacji paliw i asortymentem z autoryzacją JWT oraz bazą SQLite (Prisma ORM).',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    apis: ['./server.ts', './backend/routes.ts'],
  };

  const swaggerDocs = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

  // Vite static/SPA asset delivery integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] FUELREST System Online on URL: http://localhost:${PORT}`);
    console.log(`[SERVER] Swagger documentation loaded at URL: http://localhost:${PORT}/api-docs`);
  });
}

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Logowanie użytkownika (Auth)
 *     description: Loguje użytkownika i zwraca token JWT z polem isAdmin w payloadzie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Zwraca token sesji i dane profilu.
 *       401:
 *         description: Błędne hasło lub nazwa użytkownika.
 */

/**
 * @openapi
 * /api/stations:
 *   get:
 *     summary: Pobierz listę stacji paliw
 *     description: Pobiera katalog wszystkich stacji paliw wraz z aktualnym stanem asortymentu w stacji.
 *     responses:
 *       200:
 *         description: Lista stacji z asortymentem i cenami.
 */

/**
 * @openapi
 * /api/fuels:
 *   get:
 *     summary: Pobierz główne typy paliwa
 *     description: Pobiera słownik i asortyment paliw sieciowych.
 *     responses:
 *       200:
 *         description: Zwraca typy paliw w katalogu.
 */

/**
 * @openapi
 * /api/stations/{id}/transactions:
 *   post:
 *     summary: Tankowanie / Zakup paliwa (Dostawa / Zakup)
 *     description: Realizuje transakcję tankowania paliwa na danej stacji. Blokowane przy braku rezerw lub nieczynnej stacji.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: st_warszawa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fuelId
 *               - liters
 *             properties:
 *               fuelId:
 *                 type: string
 *                 example: fuel_pb95
 *               liters:
 *                 type: number
 *                 example: 30
 *               buyerName:
 *                 type: string
 *                 example: Marian Kowal
 *     responses:
 *       201:
 *         description: Transakcja zrealizowana pomyślnie.
 *       400:
 *         description: Brak wolnych zapasów lub ujemna ilość.
 *       404:
 *         description: Stacja lub asortyment nie istnieją.
 */

/**
 * @openapi
 * /api/transactions:
 *   get:
 *     summary: Historia transakcji (operacji)
 *     description: Pobiera kompletną listę wszystkich zrealizowanych transakcji tankowań.
 *     responses:
 *       200:
 *         description: Zwraca historię operacji w systemie.
 */

startServer();
