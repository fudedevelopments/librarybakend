import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { generateSalt, hashPassword, verifyPassword } from '../utils/crypto';
import { createToken, verifyToken } from '../utils/jwt';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
};

interface User {
    id: string;
    username: string;
    email: string;
    password_hash: string;
    salt: string;
    role: string;
}

const auth = new Hono<{ Bindings: Bindings }>();

// Register a new user
auth.post('/register', async (c) => {
    try {
        const body = await c.req.json();
        const { username, email, password } = body;

        // Validate input
        if (!username || !email || !password) {
            return c.json({ error: 'Username, email, and password are required' }, 400);
        }

        const existingUser = await c.env.DB.prepare(
            'SELECT * FROM users WHERE username = ? OR email = ?'
        )
            .bind(username, email)
            .first();

        if (existingUser) {
            return c.json({ error: 'Username or email already exists' }, 409);
        }


        const salt = await generateSalt();
        const passwordHash = await hashPassword(password, salt);
        const id = uuidv4();

        // Insert new user
        await c.env.DB.prepare(
            'INSERT INTO users (id, username, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?, ?)'
        )
            .bind(id, username, email, passwordHash, salt, 'user')
            .run();

        return c.json({ message: 'User registered successfully', userId: id }, 201);
    } catch (error) {
        console.error('Registration error:', error);
        return c.json({ error: 'Failed to register user' }, 500);
    }
});

// Login
auth.post('/login', async (c) => {
    try {
        const body = await c.req.json();
        const { username, password } = body;

        // Validate input
        if (!username || !password) {
            return c.json({ error: 'Username and password are required' }, 400);
        }

        // Find user
        const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?')
            .bind(username)
            .first<User>();

        if (!user) {
            return c.json({ error: 'Invalid username or password' }, 401);
        }

        // Add debugging to check user data
        console.log('User found:', {
            id: user.id,
            username: user.username,
            salt: user.salt ? 'exists' : 'missing',
            password_hash: user.password_hash ? 'exists' : 'missing'
        });

        // Check if salt or password_hash is missing
        if (!user.salt || !user.password_hash) {
            console.error('Missing salt or password_hash for user:', username);
            return c.json({ error: 'Account data is incomplete. Please contact support.' }, 500);
        }

        // Verify password
        try {
            const passwordMatch = await verifyPassword(password, user.password_hash, user.salt);
            if (!passwordMatch) {
                return c.json({ error: 'Invalid username or password' }, 401);
            }
        } catch (verifyError) {
            console.error('Password verification error:', verifyError);
            return c.json({ error: 'Authentication error. Please try again.' }, 500);
        }

        // Generate JWT token
        try {
            // Get JWT secret with fallback for development
            const jwtSecret = c.env.JWT_SECRET || 'neclibrary-secure-jwt-secret-key-2025';

            // Log JWT secret for debugging (remove in production)
            console.log('JWT_SECRET exists:', !!jwtSecret);
            console.log('JWT_SECRET length:', jwtSecret.length);

            const payload = {
                userId: user.id,
                username: user.username,
                role: user.role,
            };

            console.log('Creating token with payload:', JSON.stringify(payload));

            const token = await createToken(
                payload,
                jwtSecret,
                86400 // 24 hours
            );

            return c.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (tokenError) {
            console.error('Token creation error:', tokenError);
            return c.json({
                error: 'Failed to create authentication token',
                details: tokenError instanceof Error ? tokenError.message : 'Unknown error'
            }, 500);
        }
    } catch (error) {
        console.error('Login error:', error);
        return c.json({ error: 'Failed to login: ' + (error instanceof Error ? error.message : 'Unknown error') }, 500);
    }
});

// Get current user profile
auth.get('/profile', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized - No token provided' }, 401);
        }

        const token = authHeader.split(' ')[1];

        try {
            // Get JWT secret with fallback for development
            const jwtSecret = c.env.JWT_SECRET || 'neclibrary-secure-jwt-secret-key-2025';

            const decoded = await verifyToken(token, jwtSecret);

            const user = await c.env.DB.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?')
                .bind(decoded.userId)
                .first();

            if (!user) {
                return c.json({ error: 'User not found' }, 404);
            }

            return c.json({ user });
        } catch (error) {
            return c.json({ error: 'Unauthorized - Invalid token' }, 401);
        }
    } catch (error) {
        console.error('Profile error:', error);
        return c.json({ error: 'Failed to get profile' }, 500);
    }
});

export default auth; 