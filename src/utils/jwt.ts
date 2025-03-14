function base64UrlEncode(str: string | ArrayBuffer): string {
    let bytes;
    if (typeof str === 'string') {
        bytes = new TextEncoder().encode(str);
    } else {
        bytes = new Uint8Array(str);
    }

    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(base64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
}

// Create a JWT token
export async function createToken(payload: any, secret: string, expiresIn: number = 86400): Promise<string> {
    try {
        // Validate inputs
        if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid payload: must be a non-null object');
        }

        if (!secret || typeof secret !== 'string' || secret.trim() === '') {
            throw new Error('Invalid secret: must be a non-empty string');
        }

        // Create header
        const header = {
            alg: 'HS256',
            typ: 'JWT'
        };

        // Add expiration to payload
        const now = Math.floor(Date.now() / 1000);
        payload.iat = now;
        payload.exp = now + expiresIn;

        // Encode header and payload
        const encodedHeader = base64UrlEncode(JSON.stringify(header));
        const encodedPayload = base64UrlEncode(JSON.stringify(payload));

        // Create signature
        const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);

        try {
            const secretKey = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(secret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );

            const signature = await crypto.subtle.sign('HMAC', secretKey, data);
            const encodedSignature = base64UrlEncode(signature);

            // Return complete JWT
            return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
        } catch (cryptoError) {
            console.error('Crypto API error:', cryptoError);
            throw new Error(`JWT signing failed: ${cryptoError}`);
        }
    } catch (error) {
        console.error('Error creating token:', error);
        throw error;
    }
}

// Verify a JWT token
export async function verifyToken(token: string, secret: string): Promise<any> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }

        const [encodedHeader, encodedPayload, encodedSignature] = parts;

        // Verify signature
        const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
        const secretKey = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signature = base64UrlDecode(encodedSignature);
        const isValid = await crypto.subtle.verify('HMAC', secretKey, signature, data);

        if (!isValid) {
            throw new Error('Invalid signature');
        }

        // Decode payload
        const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));

        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            throw new Error('Token expired');
        }

        return payload;
    } catch (error) {
        throw new Error(`Token verification failed: ${error}`);
    }
} 