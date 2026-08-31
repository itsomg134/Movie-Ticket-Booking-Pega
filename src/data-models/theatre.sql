-- =====================================================
-- THEATRES TABLE
-- Stores all theatre/cinema information
-- =====================================================

CREATE TABLE theatres (
    theatre_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    area VARCHAR(100),
    pincode VARCHAR(10),
    address TEXT,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    website VARCHAR(255),
    total_screens INTEGER DEFAULT 1,
    seating_capacity INTEGER DEFAULT 100,
    amenities TEXT, -- JSON array of amenities
    parking_available BOOLEAN DEFAULT TRUE,
    wheelchair_accessible BOOLEAN DEFAULT TRUE,
    food_court BOOLEAN DEFAULT TRUE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    images TEXT, -- JSON array of image URLs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active'
);

-- Create indexes for faster queries
CREATE INDEX idx_theatres_city ON theatres(city);
CREATE INDEX idx_theatres_name ON theatres(name);
CREATE INDEX idx_theatres_status ON theatres(status);

-- =====================================================
-- THEATRE SCREENS TABLE
-- Stores individual screen information for each theatre
-- =====================================================

CREATE TABLE theatre_screens (
    screen_id SERIAL PRIMARY KEY,
    theatre_id INTEGER REFERENCES theatres(theatre_id) ON DELETE CASCADE,
    screen_name VARCHAR(50) NOT NULL,
    screen_number INTEGER NOT NULL,
    seating_capacity INTEGER NOT NULL,
    rows_count INTEGER,
    cols_count INTEGER,
    screen_type VARCHAR(50), -- Standard, IMAX, 3D, 4D, etc.
    sound_system VARCHAR(50), -- Dolby Atmos, DTS, etc.
    projector_type VARCHAR(50), -- Digital, IMAX Laser, etc.
    is_3d_capable BOOLEAN DEFAULT FALSE,
    is_imax_capable BOOLEAN DEFAULT FALSE,
    is_4d_capable BOOLEAN DEFAULT FALSE,
    seat_layout JSON, -- Detailed seat layout configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active'
);

CREATE INDEX idx_screen_theatre ON theatre_screens(theatre_id);
CREATE INDEX idx_screen_type ON theatre_screens(screen_type);

-- =====================================================
-- SAMPLE DATA FOR THEATRES TABLE
-- =====================================================

INSERT INTO theatres (
    name, city, location, area, pincode, address,
    contact_phone, contact_email, website, total_screens,
    seating_capacity, amenities, parking_available,
    wheelchair_accessible, food_court, latitude, longitude
) VALUES 
(
    'INOX: Reliance Mega Mall',
    'Kolhapur',
    'Reliance Mega Mall, Kolhapur',
    'Vadgaon',
    '416001',
    'Reliance Mega Mall, Vadgaon, Kolhapur, Maharashtra 416001',
    '0231-1234567',
    'inox.kolhapur@inox.in',
    'https://www.inox.in',
    6,
    800,
    '["Dolby Atmos", "Recliner Seats", "3D Capable"]',
    TRUE,
    TRUE,
    TRUE,
    16.7050,
    74.2433
),
(
    'PVR: DYP City',
    'Kolhapur',
    'DYP City, Kolhapur',
    'Rajendra Nagar',
    '416001',
    'DYP City, Rajendra Nagar, Kolhapur, Maharashtra 416001',
    '0231-2345678',
    'pvr.kolhapur@pvr.in',
    'https://www.pvrcinemas.com',
    4,
    600,
    '["4K Laser Projection", "Dolby 7.1", "Recliner Seats"]',
    TRUE,
    TRUE,
    TRUE,
    16.7150,
    74.2533
),
(
    'Rajaram ChitraMandir',
    'Kolhapur',
    'Vadgaon, Kolhapur',
    'Vadgaon',
    '416001',
    'Vadgaon, Kolhapur, Maharashtra 416001',
    '0231-3456789',
    'rajaram@cinema.com',
    'https://www.rajaramcinema.com',
    2,
    300,
    '["DTS Sound", "Standard Seating"]',
    TRUE,
    FALSE,
    FALSE,
    16.6950,
    74.2333
),
(
    'Shreeram Cityplex',
    'Kolhapur',
    'Vadgaon, Kolhapur',
    'Vadgaon',
    '416001',
    'Vadgaon, Kolhapur, Maharashtra 416001',
    '0231-4567890',
    'shreeram@cityplex.com',
    'https://www.shreeramcityplex.com',
    3,
    450,
    '["Dolby Digital", "Comfort Seats"]',
    TRUE,
    FALSE,
    TRUE,
    16.7080,
    74.2380
),
(
    'Ravindra Natya Mandir',
    'Mumbai',
    'Mumbai Central',
    'Mumbai Central',
    '400001',
    'Mumbai Central, Mumbai, Maharashtra 400001',
    '022-2345678',
    'ravindra@mandir.com',
    'https://www.ravindranatyamandir.com',
    1,
    150,
    '["Stage Events", "Plays"]',
    FALSE,
    FALSE,
    FALSE,
    18.9690,
    72.8260
);

-- =====================================================
-- SAMPLE DATA FOR THEATRE SCREENS TABLE
-- =====================================================

INSERT INTO theatre_screens (
    theatre_id, screen_name, screen_number, seating_capacity,
    rows_count, cols_count, screen_type, sound_system,
    projector_type, is_3d_capable, is_imax_capable, is_4d_capable,
    seat_layout
) VALUES 
(1, 'Screen 1', 1, 180, 12, 15, 'Standard', 'Dolby Atmos', 'Digital 2K', TRUE, FALSE, FALSE, 
 '{"rows": 12, "cols": 15, "seatTypes": {"Prime": [4,5,6,7,8], "Classic": [1,2,3,9,10,11,12,13]}}'),
(1, 'Screen 2', 2, 150, 10, 15, 'Standard', 'Dolby Digital', 'Digital 2K', FALSE, FALSE, FALSE,
 '{"rows": 10, "cols": 15, "seatTypes": {"Prime": [4,5,6,7], "Classic": [1,2,3,8,9,10,11]}}'),
(1, 'Screen 3', 3, 120, 10, 12, 'IMAX', 'Dolby Atmos', 'IMAX Laser', TRUE, TRUE, FALSE,
 '{"rows": 10, "cols": 12, "seatTypes": {"Prime": [3,4,5,6,7], "Classic": [1,2,8,9,10]}}'),
(2, 'Screen 1', 1, 160, 10, 16, 'Standard', 'Dolby 7.1', '4K Laser', TRUE, FALSE, FALSE,
 '{"rows": 10, "cols": 16, "seatTypes": {"Prime": [4,5,6,7,8,9], "Classic": [1,2,3,10,11,12]}}');

-- =====================================================
-- TRIGGER TO UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_theatre_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER theatre_update_timestamp
BEFORE UPDATE ON theatres
FOR EACH ROW
EXECUTE FUNCTION update_theatre_timestamp();

CREATE TRIGGER screen_update_timestamp
BEFORE UPDATE ON theatre_screens
FOR EACH ROW
EXECUTE FUNCTION update_theatre_timestamp();

-- =====================================================
-- VIEW FOR THEATRE DETAILS WITH SCREEN INFO
-- =====================================================

CREATE VIEW theatre_details AS
SELECT 
    t.*,
    COALESCE((
        SELECT COUNT(DISTINCT s.screen_id) 
        FROM theatre_screens s 
        WHERE s.theatre_id = t.theatre_id
    ), 0) as actual_screens,
    COALESCE((
        SELECT SUM(s.seating_capacity) 
        FROM theatre_screens s 
        WHERE s.theatre_id = t.theatre_id
    ), 0) as total_seating_capacity,
    COALESCE((
        SELECT COUNT(DISTINCT sh.show_id) 
        FROM shows sh 
        WHERE sh.theatre_id = t.theatre_id 
        AND sh.show_date >= CURRENT_DATE
        AND sh.status = 'Active'
    ), 0) as upcoming_shows
FROM theatres t
WHERE t.status = 'Active';