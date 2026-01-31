/**
 * Security Utilities for Input Sanitization
 * 
 * Note: Prisma ORM already uses parameterized queries which prevents SQL injection.
 * These utilities provide defense-in-depth for edge cases and XSS prevention.
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 * Used for search queries and user-provided text
 */
export function sanitizeString(input: string | null | undefined): string {
    if (!input) return '';

    return input
        .trim()
        // Remove null bytes
        .replace(/\0/g, '')
        // Remove control characters except newlines and tabs
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Sanitize search query - removes SQL-like patterns for defense-in-depth
 * Note: This is extra protection; Prisma already parameterizes queries
 */
export function sanitizeSearchQuery(input: string | null | undefined): string {
    if (!input) return '';

    return sanitizeString(input)
        // Remove SQL comment patterns
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '')
        // Remove semicolons (SQL statement terminators)
        .replace(/;/g, '')
        // Remove quotes that could break out of strings
        .replace(/['"\\]/g, '')
        // Limit length to prevent DoS
        .substring(0, 500);
}

/**
 * Sanitize HTML content - prevents XSS attacks
 * Escapes HTML special characters
 */
export function escapeHtml(input: string | null | undefined): string {
    if (!input) return '';

    const htmlEscapes: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;',
    };

    return input.replace(/[&<>"'`=\/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string | null | undefined): string {
    if (!email) return '';

    return email
        .toLowerCase()
        .trim()
        // Remove any characters that shouldn't be in an email
        .replace(/[^\w.@+-]/g, '')
        .substring(0, 254); // Max email length per spec
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string | null | undefined): string {
    if (!phone) return '';

    return phone
        .trim()
        // Keep only digits, +, -, spaces, parentheses
        .replace(/[^\d+\-\s()]/g, '')
        .substring(0, 20);
}

/**
 * Check if a string contains suspicious SQL patterns
 * Returns true if potentially malicious
 */
export function containsSqlPatterns(input: string): boolean {
    if (!input) return false;

    const sqlPatterns = [
        /\bOR\s+1\s*=\s*1/i,
        /\bAND\s+1\s*=\s*1/i,
        /\bUNION\s+SELECT/i,
        /\bDROP\s+TABLE/i,
        /\bDELETE\s+FROM/i,
        /\bINSERT\s+INTO/i,
        /\bUPDATE\s+\w+\s+SET/i,
        /\bEXEC\s*\(/i,
        /\bEXECUTE\s*\(/i,
        /--\s*$/,
        /;\s*--/,
        /\/\*.*\*\//,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Log a potential security threat
 */
export function logSecurityThreat(
    type: 'sql_injection' | 'xss' | 'rate_limit' | 'auth_failure',
    details: Record<string, any>
): void {
    console.warn(`[SECURITY ALERT] ${type}:`, {
        timestamp: new Date().toISOString(),
        ...details,
    });
}
