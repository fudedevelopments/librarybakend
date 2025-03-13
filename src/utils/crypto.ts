/**
 * Utility functions for cryptography using Web Crypto API
 * This is more compatible with Cloudflare Workers than bcrypt
 */

// Convert string to ArrayBuffer
function str2ab(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

// Convert ArrayBuffer to hex string
function ab2hex(buffer: ArrayBuffer): string {
    const arr = Array.from(new Uint8Array(buffer));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a random salt
export async function generateSalt(): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return ab2hex(salt);
}

// Hash a password with salt using SHA-256
export async function hashPassword(password: string, salt: string): Promise<string> {
    const passwordData = str2ab(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordData);
    return ab2hex(hashBuffer);
}

// Verify a password against a hash and salt
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    try {
        const passwordHash = await hashPassword(password, salt);
        return passwordHash === hash;
    } catch (error) {
        console.error('Error verifying password:', error);
        throw error;
    }
} 