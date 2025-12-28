# Security Analysis Report

## Executive Summary

This document provides a comprehensive security analysis of the Enqoy application, identifying vulnerabilities and providing recommendations for improvement.

---

## 1. API Keys in Client Code ✅ GOOD

### Current State
- **No API keys found in client-side code**
- Only `VITE_API_URL` environment variable is used (API endpoint URL, not a secret)
- JWT tokens are stored in `localStorage` (acceptable, though httpOnly cookies would be more secure)

### Findings
- ✅ No hardcoded API keys in frontend code
- ✅ No secrets exposed in client bundles
- ✅ Environment variables properly used for configuration

### Recommendations
1. **JWT Storage**: Consider migrating from `localStorage` to httpOnly cookies for better XSS protection
2. **Environment Variables**: Ensure `.env` files are in `.gitignore` (verify this)
3. **Build-time Variables**: Confirm that `VITE_API_URL` is the only env var exposed to client

---

## 2. Input Validation ⚠️ PARTIAL

### Current State
- ✅ Global `ValidationPipe` enabled with:
  - `whitelist: true` - strips unknown properties
  - `forbidNonWhitelisted: true` - rejects requests with unknown properties
  - `transform: true` - transforms payloads to DTO instances
- ✅ DTOs use `class-validator` decorators (`@IsEmail()`, `@IsString()`, `@MinLength()`, etc.)

### Issues Found

#### 2.1 Weak Validation in Some DTOs
**Location**: `backend/src/auth/dto/register.dto.ts`
```typescript
@IsOptional()
@IsObject()
personality?: any;  // ⚠️ No validation on object structure
```

**Risk**: Accepts any object structure, potential for injection or data corruption.

**Recommendation**:
```typescript
@IsOptional()
@IsObject()
@ValidateNested()
@Type(() => PersonalityDto)
personality?: PersonalityDto;
```

#### 2.2 Missing Validation on Query Parameters
**Location**: Multiple controllers
```typescript
@Get()
findAll(@Query('includeHidden') includeHidden?: string) {
  const includeHiddenBool = includeHidden === 'true' || includeHidden === '1';
  // ⚠️ No validation on query params
}
```

**Risk**: Potential for unexpected behavior with malformed inputs.

**Recommendation**: Use DTOs for query parameters:
```typescript
class FindEventsQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === '1')
  includeHidden?: boolean;
}
```

#### 2.3 Missing Length Limits
**Location**: Various DTOs
- Email fields: No max length
- String fields: No max length validation
- Arrays: No max length validation

**Risk**: Potential DoS via extremely large payloads.

**Recommendation**: Add `@MaxLength()` decorators:
```typescript
@IsEmail()
@MaxLength(255)
email: string;

@IsString()
@MinLength(6)
@MaxLength(100)
password: string;
```

#### 2.4 Body Size Limit
**Location**: `backend/src/main.ts`
```typescript
app.use(bodyParser.json({ limit: '50mb' }));  // ⚠️ Very large limit
```

**Risk**: Potential DoS attacks with large payloads.

**Recommendation**: 
- Reduce to reasonable limits (e.g., 10MB for image uploads)
- Implement separate limits per endpoint type
- Consider streaming for large file uploads

---

## 3. Rate Limiting ❌ NOT IMPLEMENTED

### Current State
- **No rate limiting found in the codebase**
- No `@nestjs/throttler` package
- No custom rate limiting middleware
- No protection against brute force attacks

### Critical Vulnerabilities

#### 3.1 Authentication Endpoints
**Endpoints at Risk**:
- `POST /api/auth/login` - No rate limiting
- `POST /api/auth/register` - No rate limiting
- `POST /api/auth/forgot-password` - No rate limiting
- `POST /api/auth/reset-password` - No rate limiting

**Risk**: 
- Brute force attacks on login
- Account enumeration via registration
- Email spam via forgot-password
- Token brute forcing

#### 3.2 Public Endpoints
**Endpoints at Risk**:
- `GET /api/events` - No rate limiting
- `GET /api/events/:id` - No rate limiting
- `GET /api/icebreakers/active` - No rate limiting

**Risk**: 
- DoS attacks
- Resource exhaustion
- API abuse

#### 3.3 Protected Endpoints
**Endpoints at Risk**:
- All authenticated endpoints - No rate limiting

**Risk**: 
- Authenticated users can spam endpoints
- Resource exhaustion
- Cost implications (e.g., Gemini API calls)

### Recommendations

#### Immediate Actions
1. **Install `@nestjs/throttler`**:
   ```bash
   npm install @nestjs/throttler
   ```

2. **Configure Global Rate Limiting**:
   ```typescript
   // backend/src/app.module.ts
   import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
   
   @Module({
     imports: [
       ThrottlerModule.forRoot([{
         ttl: 60000, // 1 minute
         limit: 10, // 10 requests per minute
       }]),
       // ... other modules
     ],
     providers: [
       {
         provide: APP_GUARD,
         useClass: ThrottlerGuard,
       },
     ],
   })
   ```

3. **Endpoint-Specific Limits**:
   ```typescript
   // Stricter limits for auth endpoints
   @Throttle(5, 60) // 5 requests per minute
   @Post('login')
   async login(@Body() dto: LoginDto) { ... }
   
   // More lenient for public endpoints
   @Throttle(100, 60) // 100 requests per minute
   @Get('events')
   findAll() { ... }
   ```

4. **IP-Based Rate Limiting**: Use Redis for distributed rate limiting in production

---

## 4. Authentication on Internal Endpoints ⚠️ INCOMPLETE

### Current State
- ✅ JWT authentication implemented with `JwtAuthGuard`
- ✅ Role-based access control with `RolesGuard`
- ✅ Most admin endpoints protected
- ⚠️ Several public endpoints that may need protection

### Unprotected Endpoints Analysis

#### 4.1 Public Endpoints (Intentionally Public) ✅
These appear to be intentionally public:
- `GET /api/events` - Public event listing
- `GET /api/events/upcoming` - Public upcoming events
- `GET /api/events/past` - Public past events
- `GET /api/events/:id` - Public event details
- `GET /api/icebreakers/active` - Public icebreaker questions
- `GET /api/announcements/active` - Public announcements

**Status**: ✅ Acceptable for public-facing features

#### 4.2 Potentially Vulnerable Endpoints ⚠️

**1. Payment Info Endpoint**
```typescript
// backend/src/payment/payment.controller.ts
@Controller('payments')
@UseGuards(JwtAuthGuard)  // ⚠️ Class-level guard
export class PaymentController {
  @Get('info')
  async getPaymentInfo() {  // ⚠️ No method-level guard override
    return this.paymentService.getPaymentInfo();
  }
}
```

**Issue**: The `@UseGuards(JwtAuthGuard)` at class level should protect this, but it's unclear if this is intentional.

**Recommendation**: 
- If public: Add `@Public()` decorator and remove from class guard
- If private: Verify guard is working correctly

**2. Friend Invitation Token Endpoint**
```typescript
// backend/src/friend-invitations/friend-invitations.controller.ts
@Controller('friend-invitations')
@UseGuards(JwtAuthGuard)  // ⚠️ Class-level guard
export class FriendInvitationsController {
  @Get('token/:token')
  getInvitationByToken(@Param('token') token: string) {  // ⚠️ Should be public
    return this.friendInvitationsService.getInvitationByToken(token);
  }
}
```

**Issue**: This endpoint needs to be public for non-authenticated users to accept invitations, but class-level guard blocks it.

**Risk**: Invitation links won't work for non-authenticated users.

**Recommendation**: Create `@Public()` decorator and apply it:
```typescript
@Public()
@Get('token/:token')
getInvitationByToken(@Param('token') token: string) { ... }
```

**3. Payment Booking Endpoint**
```typescript
@Get('booking/:bookingId')
async getPaymentByBooking(@Param('bookingId') bookingId: string) {
  return this.paymentService.getPaymentByBooking(bookingId);
}
```

**Issue**: Protected by class-level guard, but should verify user owns the booking.

**Risk**: Any authenticated user can query payment info for any booking.

**Recommendation**: Add ownership check:
```typescript
@Get('booking/:bookingId')
async getPaymentByBooking(
  @Param('bookingId') bookingId: string,
  @CurrentUser() user: any,
) {
  return this.paymentService.getPaymentByBooking(bookingId, user.id);
}
```

### Recommendations

1. **Create `@Public()` Decorator**:
   ```typescript
   // backend/src/common/decorators/public.decorator.ts
   import { SetMetadata } from '@nestjs/common';
   
   export const IS_PUBLIC_KEY = 'isPublic';
   export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
   ```

2. **Update JWT Guard to Skip Public Routes**:
   ```typescript
   // backend/src/auth/guards/jwt-auth.guard.ts
   import { Reflector } from '@nestjs/core';
   import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
   
   @Injectable()
   export class JwtAuthGuard extends AuthGuard('jwt') {
     constructor(private reflector: Reflector) {
       super();
     }
   
     canActivate(context: ExecutionContext) {
       const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
         context.getHandler(),
         context.getClass(),
       ]);
       if (isPublic) {
         return true;
       }
       return super.canActivate(context);
     }
   }
   ```

3. **Review All Endpoints**: Audit each endpoint to ensure proper protection level

4. **Add Resource Ownership Checks**: Ensure users can only access their own resources

---

## 5. CORS Configuration ⚠️ OVER-PERMISSIVE

### Current State
```typescript
// backend/src/main.ts
const isDevelopment = process.env.NODE_ENV !== 'production';
app.enableCors({
  origin: isDevelopment ? true : (process.env.FRONTEND_URL || 'http://localhost:8080'),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

### Issues Found

#### 5.1 Development Mode - Allows All Origins
**Issue**: `origin: true` in development allows **any origin** to make requests.

**Risk**: 
- CSRF attacks in development
- Accidental exposure if deployed with `NODE_ENV !== 'production'`
- Local development tools can be exploited

**Recommendation**: Even in development, specify exact origins:
```typescript
const allowedOrigins = isDevelopment
  ? ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000']
  : [process.env.FRONTEND_URL].filter(Boolean);

app.enableCors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  // ... rest of config
});
```

#### 5.2 Production Fallback
**Issue**: Falls back to `http://localhost:8080` if `FRONTEND_URL` is not set.

**Risk**: Production deployment could allow localhost origins.

**Recommendation**: 
- Fail fast if `FRONTEND_URL` is not set in production
- Never allow localhost in production

#### 5.3 Missing Security Headers
**Issue**: No additional security headers configured.

**Recommendation**: Add security headers:
```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

### Recommendations

1. **Strict Origin Validation**: Use function-based origin validation
2. **Environment Validation**: Fail if required env vars are missing in production
3. **Security Headers**: Add standard security headers
4. **CORS Logging**: Log rejected CORS requests for monitoring

---

## 6. Additional Security Concerns

### 6.1 Password Reset Token Security
**Location**: `backend/src/auth/auth.controller.ts`

**Issue**: Token passed in URL query parameter:
```typescript
res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
```

**Risk**: Tokens can be logged in server logs, browser history, referrer headers.

**Recommendation**: Use POST with token in body, or use one-time codes.

### 6.2 SQL Injection Protection
**Status**: ✅ Using Prisma ORM (parameterized queries)

### 6.3 XSS Protection
**Status**: ⚠️ Partial
- Backend: No explicit XSS protection headers
- Frontend: React automatically escapes, but verify for user-generated content

### 6.4 Error Information Disclosure
**Issue**: Error messages may leak sensitive information.

**Recommendation**: 
- Use custom exception filters
- Don't expose stack traces in production
- Sanitize error messages

### 6.5 Logging Sensitive Data
**Location**: `backend/src/auth/guards/roles.guard.ts`
```typescript
console.log('[RolesGuard] User:', user ? { id: user.id, email: user.email } : 'undefined');
```

**Issue**: Logging user emails in production logs.

**Recommendation**: 
- Remove or use proper logging with log levels
- Never log PII in production
- Use structured logging (e.g., Winston, Pino)

---

## Priority Action Items

### 🔴 Critical (Fix Immediately)
1. **Implement Rate Limiting** - All endpoints vulnerable to DoS
2. **Fix CORS in Development** - Currently allows all origins
3. **Fix Friend Invitation Endpoint** - Public endpoint blocked by auth guard

### 🟡 High Priority (Fix Soon)
4. **Add Input Validation** - Strengthen DTO validation
5. **Review Unprotected Endpoints** - Audit all endpoints
6. **Add Security Headers** - XSS, clickjacking protection
7. **Fix Payment Endpoint Authorization** - Add ownership checks

### 🟢 Medium Priority (Plan for Next Sprint)
8. **Migrate JWT to httpOnly Cookies** - Better XSS protection
9. **Reduce Body Size Limits** - Prevent DoS
10. **Improve Error Handling** - Prevent information disclosure
11. **Remove Sensitive Logging** - Don't log PII

---

## Testing Recommendations

1. **Penetration Testing**: 
   - Test rate limiting
   - Test CORS restrictions
   - Test authentication bypass attempts

2. **Security Scanning**:
   - Use tools like `npm audit`
   - Run OWASP ZAP or similar
   - Dependency vulnerability scanning

3. **Code Review**:
   - Review all DTOs for proper validation
   - Audit all endpoints for proper guards
   - Check for hardcoded secrets

---

## Conclusion

The application has a solid foundation with JWT authentication and input validation, but critical security features are missing:
- **Rate limiting is completely absent** - high priority
- **CORS is over-permissive** - especially in development
- **Some endpoints need authorization review**

Addressing these issues will significantly improve the security posture of the application.


