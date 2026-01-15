/**
 * SELAI Insurance Integration Hub
 * Main Entry Point
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';

import { registerRoutes } from './api/routes.js';
import { getIntegrationService } from './services/integration-service.js';
import { initSupabaseSyncService } from './services/supabase-sync.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

// ============================================
// SERVER CONFIGURATION
// ============================================

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// CREATE SERVER
// ============================================

async function buildServer() {
  const app = Fastify({
    logger: false, // We use our own logger
    trustProxy: true,
  });

  // ============================================
  // PLUGINS
  // ============================================

  // CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable for API
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  });

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'SELAI Insurance Integration Hub',
        description: 'API for integrating with Israeli insurance data sources',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://${HOST}:${PORT}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'customer', description: 'Customer 360 endpoints' },
        { name: 'vehicle', description: 'Vehicle insurance endpoints' },
        { name: 'pension', description: 'Pension data endpoints' },
        { name: 'sync', description: 'Data synchronization endpoints' },
        { name: 'analysis', description: 'Coverage analysis endpoints' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // ============================================
  // INITIALIZE SERVICES
  // ============================================

  // Initialize Integration Service
  const useMocks = process.env.USE_MOCKS === 'true';
  getIntegrationService({ useMocks });
  logger.info('Integration service initialized', { useMocks });

  // Initialize Supabase Sync Service (if configured)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    initSupabaseSyncService({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
      tenantId: process.env.TENANT_ID,
    });
    logger.info('Supabase sync service initialized');
  } else {
    logger.warn('Supabase not configured - sync features disabled');
  }

  // ============================================
  // REGISTER ROUTES
  // ============================================

  await registerRoutes(app);

  // ============================================
  // ERROR HANDLERS
  // ============================================

  app.setErrorHandler((error, request, reply) => {
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });

    reply.status(error.statusCode || 500).send({
      error: NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not found',
      path: request.url,
    });
  });

  return app;
}

// ============================================
// START SERVER
// ============================================

async function start() {
  try {
    const app = await buildServer();

    await app.listen({ port: PORT, host: HOST });

    logger.info(`🚀 SELAI Integration Hub started`, {
      port: PORT,
      host: HOST,
      env: NODE_ENV,
      docs: `http://${HOST}:${PORT}/docs`,
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      await app.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

start();
