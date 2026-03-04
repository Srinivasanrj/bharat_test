-- SchemaSahayak Database Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    age INT,
    gender VARCHAR(50),
    annual_income NUMERIC(15, 2),
    occupation VARCHAR(100),
    state VARCHAR(100),
    location_gps POINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schemes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255),
    category VARCHAR(100),
    description TEXT,
    benefit_details TEXT,
    eligibility_criteria JSONB,
    state_link VARCHAR(255),
    is_central BOOLEAN DEFAULT TRUE,
    benefit_amount NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    message TEXT,
    role VARCHAR(50), -- 'user', 'bot'
    language VARCHAR(10),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    scheme_id INT REFERENCES schemes(id),
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'pending', 'approved'
    form_data JSONB,
    pre_filled_percentage INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100),
    state VARCHAR(100),
    coordinates POINT
);

CREATE TABLE IF NOT EXISTS scheme_views (
    id SERIAL PRIMARY KEY,
    scheme_id INT REFERENCES schemes(id),
    view_count INT DEFAULT 0,
    last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE VIEW user_demographics AS
SELECT occupation, state, AVG(age) as avg_age, COUNT(*) as user_count
FROM users
GROUP BY occupation, state;

CREATE VIEW popular_schemes AS
SELECT s.name, sv.view_count
FROM schemes s
JOIN scheme_views sv ON s.id = sv.scheme_id
ORDER BY sv.view_count DESC;

-- Insert some base locations
INSERT INTO locations (city, state, coordinates) VALUES
('Mumbai', 'Maharashtra', '(19.0760, 72.8777)'),
('Chennai', 'Tamil Nadu', '(13.0827, 80.2707)'),
('Bangalore', 'Karnataka', '(12.9716, 77.5946)'),
('Delhi', 'Delhi', '(28.6139, 77.2090)');
