-- Migration number: 0001 	 2025-03-12T10:28:22.454Z
DROP TABLE IF EXISTS books;
CREATE TABLE books (
    id CHAR(36) PRIMARY KEY,  -- UUID will be a 36-character string (e.g., "550e8400-e29b-41d4-a716-446655440000")
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    publication_year INT,
    description TEXT,
    status TEXT DEFAULT 'available',
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);