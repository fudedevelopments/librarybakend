# Library Backend API

A RESTful API for managing a library system with authentication.

## Features

- User authentication with JWT
- Book management (CRUD operations)
- Search functionality for books
- Role-based access control (admin/user)

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
  - Required fields: `username`, `email`, `password`
  
- `POST /auth/login` - Login and get JWT token
  - Required fields: `username`, `password`
  
- `GET /auth/profile` - Get current user profile (requires authentication)

### Books

All book endpoints require authentication.

- `GET /books` - Get all books
- `GET /books/search` - Search books by title, author, genre, or year
  - Query parameters: `title`, `author`, `genre`, `year`
- `GET /books/:id` - Get a single book by ID
- `POST /books` - Create a new book (admin only)
  - Required fields: `title`, `author`
  - Optional fields: `genre`, `publication_year`, `description`
- `PUT /books/:id` - Update a book (admin only)
- `DELETE /books/:id` - Delete a book (admin only)

## Setup and Deployment

1. Install dependencies:
   ```
   npm install
   ```

2. Create database migrations:
   ```
   npx wrangler@latest d1 migrations create booksdatabase create-books
   npx wrangler@latest d1 migrations create booksdatabase create-users
   ```

3. Apply migrations:
   ```
   npx wrangler@latest d1 migrations apply booksdatabase
   ```

4. Update the JWT_SECRET in wrangler.toml or set it as an environment variable

5. Run locally:
   ```
   npm run dev
   ```

6. Deploy:
   ```
   npm run deploy
   ```

## Environment Variables

- `JWT_SECRET` - Secret key for JWT token generation and verification

## Database Schema

### Books Table
```sql
CREATE TABLE books (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    publication_year INT,
    description TEXT,
    status TEXT DEFAULT 'available',
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Users Table
```sql
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
``` 