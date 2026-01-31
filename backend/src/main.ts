import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ============================================
  // SECURITY: Helmet HTTP Security Headers
  // ============================================
  app.use(helmet({
    // Content Security Policy - prevents XSS attacks
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // X-Frame-Options - prevents clickjacking
    frameguard: { action: 'deny' },
    // X-Content-Type-Options - prevents MIME type sniffing
    noSniff: true,
    // X-XSS-Protection - legacy XSS protection for older browsers
    xssFilter: true,
    // Strict-Transport-Security - enforces HTTPS
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // X-DNS-Prefetch-Control - controls DNS prefetching
    dnsPrefetchControl: { allow: false },
    // X-Download-Options - prevents IE from executing downloads
    ieNoOpen: true,
    // Referrer-Policy - controls referrer information
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // X-Permitted-Cross-Domain-Policies - prevents Adobe Flash/PDF cross-domain
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  }));

  // Increase body size limit for base64 images
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS for frontend
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
  ];

  // Add production frontend URL if set
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // ============================================
  // SECURITY: Input Validation & Sanitization
  // ============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true,            // Auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Sanitize inputs by trimming strings
      stopAtFirstError: false,
    }),
  );

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Backend server running on http://localhost:${port}/api`);
  console.log(`🛡️ Security: Helmet headers enabled`);
  console.log(`🔒 Security: Rate limiting active`);
}

bootstrap();
