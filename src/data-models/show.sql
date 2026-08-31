-- =====================================================
-- SHOWS TABLE
-- Stores all movie show timings and schedules
-- =====================================================

CREATE TABLE shows (
    show_id SERIAL PRIMARY KEY,
    movie_id INTEGER REFERENCES movies(movie_id) ON DELETE CASCADE,
    theatre_id INTEGER REFERENCES theatres(theatre_id) ON DELETE CASCADE,
    screen_id INTEGER REFERENCES theatre_screens(screen_id) ON DELETE CASCADE,
    show_date DATE NOT NULL,
    show_time TIME NOT NULL,
    end_time TIME,
    show_type VARCHAR(50) DEFAULT 'Regular', -- Regular, Premier, Special, Morning, Matinee, Evening, Night
    ticket_price DECIMAL(10, 2) NOT NULL,
    vip_price DECIMAL(10, 2),
    recliner_price DECIMAL(10, 2),
    is_3d BOOLEAN DEFAULT FALSE,
    is_imax BOOLEAN DEFAULT FALSE,
    is_4d BOOLEAN DEFAULT FALSE,
    is_weekend BOOLEAN DEFAULT FALSE,
    language VARCHAR(50),
    subtitle_available BOOLEAN DEFAULT TRUE,
    total_seats INTEGER,
    available_seats INTEGER,
    booked_seats INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Active', -- Active, Cancelled, Completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_show_slot UNIQUE (theatre_id, screen_id, show_date, show_time)
);

-- Create indexes for faster queries
CREATE INDEX idx_shows_movie ON shows(movie_id);
CREATE INDEX idx_shows_theatre ON shows(theatre_id);
CREATE INDEX idx_shows_date ON shows(show_date);
CREATE INDEX idx_shows_time ON shows(show_time);
CREATE INDEX idx_shows_status ON shows(status);
CREATE INDEX idx_shows_movie_date ON shows(movie_id, show_date);

-- =====================================================
-- SHOW PRICING RULES TABLE
-- Dynamic pricing based on time, day, and seat type
-- =====================================================

CREATE TABLE show_pricing_rules (
    rule_id SERIAL PRIMARY KEY,
    show_id INTEGER REFERENCES shows(show_id) ON DELETE CASCADE,
    seat_type VARCHAR(20) NOT NULL, -- Prime, Classic, Recliner, VIP
    base_price DECIMAL(10, 2) NOT NULL,
    weekend_surcharge DECIMAL(10, 2) DEFAULT 0,
    holiday_surcharge DECIMAL(10, 2) DEFAULT 0,
    early_bird_discount DECIMAL(10, 2) DEFAULT 0, -- Discount for early booking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pricing_show ON show_pricing_rules(show_id);
CREATE INDEX idx_pricing_seat_type ON show_pricing_rules(seat_type);

-- =====================================================
-- SAMPLE DATA FOR SHOWS TABLE
-- =====================================================

INSERT INTO shows (
    movie_id, theatre_id, screen_id, show_date, show_time,
    end_time, show_type, ticket_price, vip_price,
    recliner_price, is_3d, is_imax, is_4d, is_weekend,
    language, subtitle_available, total_seats, available_seats
) VALUES 
-- INOX: Reliance Mega Mall Shows for Aug 30, 2026
(1, 1, 1, '2026-08-30', '08:00:00', '11:14:00', 'Regular', 220, 350, 450, TRUE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 180, 180),
(1, 1, 1, '2026-08-30', '10:15:00', '13:29:00', 'Regular', 220, 350, 450, TRUE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 180, 180),
(1, 1, 2, '2026-08-30', '11:15:00', '14:29:00', 'Regular', 200, 330, 420, FALSE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 150, 150),
(1, 1, 1, '2026-08-30', '14:10:00', '17:24:00', 'Matinee', 250, 380, 480, TRUE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 180, 178),
(1, 1, 1, '2026-08-30', '17:05:00', '20:19:00', 'Evening', 280, 400, 500, TRUE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 180, 175),
(1, 1, 1, '2026-08-30', '20:00:00', '23:14:00', 'Night', 300, 420, 520, TRUE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 180, 180),
(1, 1, 3, '2026-08-30', '09:00:00', '12:14:00', 'Regular', 350, 450, 550, TRUE, TRUE, FALSE, TRUE, 'Hindi', TRUE, 120, 115),
(1, 1, 3, '2026-08-30', '13:00:00', '16:14:00', 'Matinee', 380, 480, 580, TRUE, TRUE, FALSE, TRUE, 'Hindi', TRUE, 120, 120),

-- PVR: DYP City Shows
(1, 2, 4, '2026-08-30', '11:30:00', '14:44:00', 'Regular', 240, 370, 470, TRUE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 160, 150),
(1, 2, 4, '2026-08-30', '15:30:00', '18:44:00', 'Evening', 270, 390, 490, TRUE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 160, 160),

-- Shreeram Cityplex Shows
(1, 4, 4, '2026-08-30', '11:45:00', '14:59:00', 'Regular', 180, 300, 380, FALSE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 200, 195),
(1, 4, 4, '2026-08-30', '15:30:00', '18:44:00', 'Evening', 210, 330, 410, FALSE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 200, 200),
(1, 4, 4, '2026-08-30', '20:45:00', '23:59:00', 'Night', 230, 350, 430, FALSE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 200, 200),

-- Rajaram ChitraMandir Shows
(1, 3, 3, '2026-08-30', '11:45:00', '14:59:00', 'Regular', 160, 280, 360, FALSE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 150, 148),
(1, 3, 3, '2026-08-30', '15:15:00', '18:29:00', 'Evening', 190, 310, 390, FALSE, FALSE, FALSE, TRUE, 'Hindi', TRUE, 150, 150),

-- Spider-Man: Brand New Day - Upcoming Shows
(2, 1, 1, '2026-08-31', '10:00:00', '12:28:00', 'Regular', 240, 370, 470, TRUE, FALSE, FALSE, FALSE, 'English', TRUE, 180, 180),
(2, 1, 1, '2026-08-31', '13:00:00', '15:28:00', 'Matinee', 270, 390, 490, TRUE, FALSE, FALSE, FALSE, 'English', TRUE, 180, 180),
(2, 1, 1, '2026-08-31', '16:00:00', '18:28:00', 'Evening', 300, 420, 520, TRUE, FALSE, FALSE, FALSE, 'English', TRUE, 180, 180),

-- Awarapan 2 - Upcoming Shows
(3, 1, 2, '2026-09-01', '11:00:00', '13:36:00', 'Regular', 200, 330, 430, FALSE, FALSE, FALSE, FALSE, 'Hindi', TRUE, 150, 150),
(3, 1, 2, '2026-09-01', '14:00:00', '16:36:00', 'Matinee', 230, 350, 450, FALSE, FALSE, FALSE, FALSE, 'Hindi', TRUE, 150, 150);

-- =====================================================
-- SAMPLE DATA FOR SHOW PRICING RULES
-- =====================================================

INSERT INTO show_pricing_rules (
    show_id, seat_type, base_price, weekend_surcharge,
    holiday_surcharge, early_bird_discount
) VALUES 
-- For Show 1 (INOX Screen 1, 08:00 AM)
(1, 'Prime', 220, 30, 50, 20),
(1, 'Classic', 180, 25, 40, 15),
(1, 'Recliner', 350, 50, 75, 30),
(1, 'VIP', 450, 70, 100, 40),

-- For Show 2 (INOX Screen 1, 10:15 AM)
(2, 'Prime', 220, 30, 50, 20),
(2, 'Classic', 180, 25, 40, 15),
(2, 'Recliner', 350, 50, 75, 30),

-- For Show 10 (PVR, 11:30 AM)
(10, 'Prime', 240, 35, 55, 25),
(10, 'Classic', 200, 30, 45, 20),
(10, 'Recliner', 370, 55, 80, 35);

-- =====================================================
-- TRIGGER TO UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_show_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER show_update_timestamp
BEFORE UPDATE ON shows
FOR EACH ROW
EXECUTE FUNCTION update_show_timestamp();

-- =====================================================
-- VIEW FOR SHOW DETAILS WITH MOVIE AND THEATRE INFO
-- =====================================================

CREATE VIEW show_details AS
SELECT 
    s.show_id,
    s.show_date,
    s.show_time,
    s.end_time,
    s.show_type,
    s.ticket_price,
    s.is_3d,
    s.is_imax,
    s.is_4d,
    s.language,
    s.total_seats,
    s.available_seats,
    s.booked_seats,
    s.status,
    -- Movie Details
    m.movie_id,
    m.title as movie_title,
    m.genre,
    m.duration_minutes,
    m.rating as movie_rating,
    m.poster_url,
    m.description as movie_description,
    -- Theatre Details
    t.theatre_id,
    t.name as theatre_name,
    t.city,
    t.location as theatre_location,
    -- Screen Details
    sc.screen_id,
    sc.screen_name,
    sc.screen_type,
    sc.seating_capacity,
    -- Calculated Fields
    CASE 
        WHEN s.available_seats = 0 THEN 'Housefull'
        WHEN s.available_seats <= 10 THEN 'Fast Filling'
        ELSE 'Available'
    END as availability_status,
    CASE 
        WHEN EXTRACT(DOW FROM s.show_date) IN (0, 6) THEN 'Weekend'
        ELSE 'Weekday'
    END as day_type,
    ROUND(
        ((s.total_seats - s.available_seats)::DECIMAL / s.total_seats::DECIMAL) * 100, 
        2
    ) as occupancy_percentage
FROM shows s
JOIN movies m ON s.movie_id = m.movie_id
JOIN theatres t ON s.theatre_id = t.theatre_id
JOIN theatre_screens sc ON s.screen_id = sc.screen_id
WHERE s.status = 'Active'
AND s.show_date >= CURRENT_DATE;

-- =====================================================
-- FUNCTION TO UPDATE AVAILABLE SEATS
-- =====================================================

CREATE OR REPLACE FUNCTION update_show_seats(p_show_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_total_booked INTEGER;
BEGIN
    -- Calculate total booked seats
    SELECT COUNT(*) INTO v_total_booked
    FROM booking_seats bs
    JOIN bookings b ON bs.booking_id = b.booking_id
    WHERE b.show_id = p_show_id
    AND b.booking_status NOT IN ('Cancelled', 'Rejected');
    
    -- Update show with booked and available seats
    UPDATE shows
    SET 
        booked_seats = v_total_booked,
        available_seats = total_seats - v_total_booked,
        updated_at = CURRENT_TIMESTAMP
    WHERE show_id = p_show_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION TO GET AVAILABLE SHOWS FOR A DATE
-- =====================================================

CREATE OR REPLACE FUNCTION get_available_shows(
    p_movie_id INTEGER DEFAULT NULL,
    p_theatre_id INTEGER DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    show_id INTEGER,
    movie_title VARCHAR,
    theatre_name VARCHAR,
    show_time TIME,
    show_date DATE,
    ticket_price DECIMAL,
    available_seats INTEGER,
    total_seats INTEGER,
    availability_status VARCHAR,
    screen_type VARCHAR,
    is_3d BOOLEAN,
    is_imax BOOLEAN,
    language VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.show_id,
        m.title::VARCHAR as movie_title,
        t.name::VARCHAR as theatre_name,
        s.show_time,
        s.show_date,
        s.ticket_price,
        s.available_seats,
        s.total_seats,
        CASE 
            WHEN s.available_seats = 0 THEN 'Housefull'
            WHEN s.available_seats <= 10 THEN 'Fast Filling'
            ELSE 'Available'
        END as availability_status,
        sc.screen_type,
        s.is_3d,
        s.is_imax,
        s.language
    FROM shows s
    JOIN movies m ON s.movie_id = m.movie_id
    JOIN theatres t ON s.theatre_id = t.theatre_id
    JOIN theatre_screens sc ON s.screen_id = sc.screen_id
    WHERE s.status = 'Active'
    AND s.show_date = p_date
    AND (p_movie_id IS NULL OR s.movie_id = p_movie_id)
    AND (p_theatre_id IS NULL OR s.theatre_id = p_theatre_id)
    AND (p_city IS NULL OR t.city = p_city)
    AND s.available_seats > 0
    ORDER BY s.show_time;
END;
$$ LANGUAGE plpgsql;