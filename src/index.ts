import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import bookRoutes from './routes/books';

type Bindings = {
	DB: D1Database;
	JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS
app.use('*', cors());

// Health check endpoint
app.get('/', (c) => {
	return c.json({ status: 'ok', message: 'Library API is running' });
});

// Mount routes
app.route('/auth', authRoutes);
app.route('/books', bookRoutes);

export default app;