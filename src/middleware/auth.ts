import { Context, Next } from 'hono';
import { verifyToken } from '../utils/jwt';

type JWTPayload = {
    userId: string;
    username: string;
    role: string;
};

export const authMiddleware = async (c: Context, next: Next) => {
    try {
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized - No token provided' }, 401);
        }

        const token = authHeader.split(' ')[1];
        const secret = c.env.JWT_SECRET as string;

        if (!secret) {
            console.error('JWT_SECRET is not defined in environment variables');
            return c.json({ error: 'Internal server error' }, 500);
        }

        try {
            const decoded = await verifyToken(token, secret) as JWTPayload;
            c.set('jwtPayload', decoded);
            await next();
        } catch (error) {
            return c.json({ error: 'Unauthorized - Invalid token' }, 401);
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
};

export const adminAuthMiddleware = async (c: Context, next: Next) => {
    await authMiddleware(c, async () => {
        const payload = c.get('jwtPayload') as JWTPayload;

        if (payload.role !== 'admin') {
            return c.json({ error: 'Forbidden - Admin access required' }, 403);
        }

        await next();
    });
}; 