import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
    DB: D1Database;
};

const books = new Hono<{ Bindings: Bindings }>();

books.use('*');

books.post('/',  async (c) => {
    try {
        const body = await c.req.json();
        const id = uuidv4();

        const { title, author, genre, publication_year, description } = body;

        if (!title || !author) {
            return c.json({ error: 'Title and author are required' }, 400);
        }

        const stmt = c.env.DB.prepare(`
      INSERT INTO books (id, title, author, genre, publication_year, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, title, author, genre || null, publication_year || null, description || null);

        await stmt.run();

        return c.json({ message: 'Book created successfully', id }, 201);
    } catch (error) {
        console.error('Create book error:', error);
        return c.json({ error: 'Failed to create book' }, 500);
    }
});

// Get all books with pagination
books.get('/', async (c) => {
    try {
        const page = parseInt(c.req.query('page') || '1');
        const limit = 10;
        const offset = (page - 1) * limit;

        // Get total count for pagination metadata
        const countResult = await c.env.DB.prepare('SELECT COUNT(*) as total FROM books').first();
        const total = Number(countResult?.total || 0);

        // Get paginated results
        const result = await c.env.DB.prepare('SELECT * FROM books LIMIT ? OFFSET ?')
            .bind(limit, offset)
            .all();

        return c.json({
            success: true,
            data: result.results,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get books error:', error);
        return c.json({ error: 'Failed to fetch books' }, 500);
    }
});

// Search books with pagination
books.get('/search', async (c) => {
    try {
        const { title, author, genre, year } = c.req.query();
        const page = parseInt(c.req.query('page') || '1');
        const limit = 10;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM books WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM books WHERE 1=1';
        const bindings: any[] = [];
        const countBindings: any[] = [];

        if (title) {
            query += ' AND title LIKE ?';
            countQuery += ' AND title LIKE ?';
            bindings.push(`%${title}%`);
            countBindings.push(`%${title}%`);
        }
        if (author) {
            query += ' AND author LIKE ?';
            countQuery += ' AND author LIKE ?';
            bindings.push(`%${author}%`);
            countBindings.push(`%${author}%`);
        }
        if (genre) {
            query += ' AND genre = ?';
            countQuery += ' AND genre = ?';
            bindings.push(genre);
            countBindings.push(genre);
        }
        if (year) {
            const parsedYear = parseInt(year);
            if (!isNaN(parsedYear)) {
                query += ' AND publication_year = ?';
                countQuery += ' AND publication_year = ?';
                bindings.push(parsedYear);
                countBindings.push(parsedYear);
            }
        }

        // Add pagination
        query += ' LIMIT ? OFFSET ?';
        bindings.push(limit, offset);

        // Get total count for pagination metadata
        const countStatement = c.env.DB.prepare(countQuery).bind(...countBindings);
        const countResult = await countStatement.first();
        const total = Number(countResult?.total || 0);

        // Get paginated results
        const statement = c.env.DB.prepare(query).bind(...bindings);
        const result = await statement.all();

        return c.json({
            success: true,
            message: result.results.length ? 'Books found' : 'No books match your search',
            data: result.results,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Search books error:', error);
        return c.json({ success: false, error: 'Failed to search books' }, 500);
    }
});

// Get a single book by ID
books.get('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const result = await c.env.DB.prepare('SELECT * FROM books WHERE id = ?')
            .bind(id)
            .first();

        if (!result) {
            return c.json({ error: 'Book not found' }, 404);
        }
        return c.json(result);
    } catch (error) {
        console.error('Get book error:', error);
        return c.json({ error: 'Failed to fetch book' }, 500);
    }
});

// Update a book (admin only)
books.put('/:id',  async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();

        const { title, author, genre, publication_year, description, status } = body;

        const stmt = c.env.DB.prepare(`
      UPDATE books 
      SET title = ?, author = ?, genre = ?, publication_year = ?, description = ?, status = ?
      WHERE id = ?
    `).bind(
            title || null,
            author || null,
            genre || null,
            publication_year || null,
            description || null,
            status || null,
            id
        );

        const result = await stmt.run();

        if (!result.success) {
            return c.json({ error: 'Book not found' }, 404);
        }
        return c.json({ message: 'Book updated successfully' });
    } catch (error) {
        console.error('Update book error:', error);
        return c.json({ error: 'Failed to update book' }, 500);
    }
});

// Delete a book (admin only)
books.delete('/:id',  async (c) => {
    try {
        const id = c.req.param('id');
        const stmt = c.env.DB.prepare('DELETE FROM books WHERE id = ?').bind(id);
        const result = await stmt.run();

        if (!result.success) {
            return c.json({ error: 'Book not found' }, 404);
        }
        return c.json({ message: 'Book deleted successfully' });
    } catch (error) {
        console.error('Delete book error:', error);
        return c.json({ error: 'Failed to delete book' }, 500);
    }
});

export default books; 