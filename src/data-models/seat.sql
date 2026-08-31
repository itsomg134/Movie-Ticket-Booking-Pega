-- =====================================================
-- SEATS TABLE
-- Stores individual seat information for each screen/show
-- =====================================================

CREATE TABLE seats (
    seat_id SERIAL PRIMARY KEY,
    theatre_id INTEGER REFERENCES theatres(theatre_id) ON DELETE CASCADE,
    screen_id INTEGER REFERENCES theatre_screens(screen_id) ON DELETE CASCADE,
    show_id INTEGER REFERENCES shows(show_id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    row_number VARCHAR(5) NOT NULL,
    seat_type VARCHAR(20) DEFAULT 'Classic', -- Classic, Prime, Recliner, VIP, Wheelchair
    seat_price DECIMAL(10, 2),
    is_available BOOLEAN DEFAULT TRUE,
    is_reserved BOOLEAN DEFAULT FALSE,
    reserved_until TIMESTAMP,
    seat_position_x INTEGER, -- For UI layout mapping
    seat_position_y INTEGER, -- For UI layout mapping
    is_bestseller BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_seat_per_show UNIQUE (show_id, seat_number, row_number)
);

-- Create indexes for faster queries
CREATE INDEX idx_seats_show ON seats(show_id);
CREATE INDEX idx_seats_theatre ON seats(theatre_id);
CREATE INDEX idx_seats_screen ON seats(screen_id);
CREATE INDEX idx_seats_available ON seats(is_available);
CREATE INDEX idx_seats_reserved ON seats(is_reserved);
CREATE INDEX idx_seats_type ON seats(seat_type);

-- =====================================================
-- BOOKING SEATS TABLE
-- Stores seats booked for each booking
-- =====================================================

CREATE TABLE booking_seats (
    booking_seat_id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(booking_id) ON DELETE CASCADE,
    seat_id INTEGER REFERENCES seats(seat_id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    row_number VARCHAR(5) NOT NULL,
    seat_type VARCHAR(20),
    seat_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_booking_seat UNIQUE (booking_id, seat_id)
);

CREATE INDEX idx_booking_seats_booking ON booking_seats(booking_id);
CREATE INDEX idx_booking_seats_seat ON booking_seats(seat_id);

-- =====================================================
-- FUNCTION TO GENERATE SEATS FOR A SHOW
-- =====================================================

CREATE OR REPLACE FUNCTION generate_seats_for_show(
    p_show_id INTEGER,
    p_screen_id INTEGER,
    p_rows INTEGER,
    p_cols INTEGER,
    p_seat_types JSON
)
RETURNS VOID AS $$
DECLARE
    v_row CHAR;
    v_col INTEGER;
    v_row_num INTEGER;
    v_theatre_id INTEGER;
    v_seat_type VARCHAR(20);
    v_price DECIMAL(10, 2);
    v_is_bestseller BOOLEAN;
BEGIN
    -- Get theatre_id from screen
    SELECT theatre_id INTO v_theatre_id
    FROM theatre_screens
    WHERE screen_id = p_screen_id;
    
    -- Loop through rows (A-Z)
    FOR v_row_num IN 1..p_rows LOOP
        v_row := CHR(64 + v_row_num); -- A, B, C, ...
        
        -- Loop through columns (1-p_cols)
        FOR v_col IN 1..p_cols LOOP
            -- Determine seat type based on row position
            IF v_row_num <= 3 THEN
                v_seat_type := 'Prime';
                v_price := 220;
                v_is_bestseller := v_row_num = 2;
            ELSIF v_row_num <= 6 THEN
                v_seat_type := 'Classic';
                v_price := 180;
                v_is_bestseller := FALSE;
            ELSIF v_row_num <= 8 THEN
                v_seat_type := 'Recliner';
                v_price := 350;
                v_is_bestseller := FALSE;
            ELSE
                v_seat_type := 'VIP';
                v_price := 450;
                v_is_bestseller := FALSE;
            END IF;
            
            -- Insert seat
            INSERT INTO seats (
                theatre_id,
                screen_id,
                show_id,
                seat_number,
                row_number,
                seat_type,
                seat_price,
                is_available,
                is_bestseller,
                seat_position_x,
                seat_position_y
            ) VALUES (
                v_theatre_id,
                p_screen_id,
                p_show_id,
                LPAD(v_col::TEXT, 2, '0'),
                v_row,
                v_seat_type,
                v_price,
                TRUE,
                v_is_bestseller,
                v_col,
                v_row_num
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION TO RESERVE SEATS (Temporary Hold)
-- =====================================================

CREATE OR REPLACE FUNCTION reserve_seats(
    p_show_id INTEGER,
    p_seat_numbers VARCHAR[],
    p_reserve_minutes INTEGER DEFAULT 10
)
RETURNS BOOLEAN AS $$
DECLARE
    v_seat_count INTEGER;
    v_available_count INTEGER;
    v_seat_id INTEGER;
BEGIN
    -- Check if seats are available
    SELECT COUNT(*) INTO v_available_count
    FROM seats
    WHERE show_id = p_show_id
    AND seat_number = ANY(p_seat_numbers)
    AND is_available = TRUE
    AND is_reserved = FALSE;
    
    IF v_available_count != array_length(p_seat_numbers, 1) THEN
        RETURN FALSE;
    END IF;
    
    -- Reserve the seats
    UPDATE seats
    SET 
        is_reserved = TRUE,
        reserved_until = CURRENT_TIMESTAMP + (p_reserve_minutes || ' minutes')::INTERVAL,
        updated_at = CURRENT_TIMESTAMP
    WHERE show_id = p_show_id
    AND seat_number = ANY(p_seat_numbers)
    AND is_available = TRUE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION TO CONFIRM SEATS AFTER BOOKING
-- =====================================================

CREATE OR REPLACE FUNCTION confirm_seats(
    p_booking_id INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_seat_ids INTEGER[];
BEGIN
    -- Get seat IDs from booking
    SELECT array_agg(seat_id) INTO v_seat_ids
    FROM booking_seats
    WHERE booking_id = p_booking_id;
    
    -- Mark seats as permanently booked
    UPDATE seats
    SET 
        is_available = FALSE,
        is_reserved = FALSE,
        reserved_until = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE seat_id = ANY(v_seat_ids);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION TO RELEASE RESERVED SEATS (Timeout/Cancel)
-- =====================================================

CREATE OR REPLACE FUNCTION release_reserved_seats()
RETURNS VOID AS $$
BEGIN
    -- Release any reserved seats that have expired
    UPDATE seats
    SET 
        is_reserved = FALSE,
        reserved_until = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE is_reserved = TRUE
    AND reserved_until < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA GENERATION FOR SEATS (For a specific show)
-- =====================================================

-- This example generates seats for show_id = 1 (INOX Screen 1, 08:00 AM)
-- Generate seats for show with 10 rows and 12 columns
SELECT generate_seats_for_show(1, 1, 12, 15, '{"Prime": [1,2,3], "Classic": [4,5,6,7,8,9]}');

-- Generate seats for show_id = 2 (INOX Screen 1, 10:15 AM)
SELECT generate_seats_for_show(2, 1, 12, 15, '{"Prime": [1,2,3], "Classic": [4,5,6,7,8,9]}');

-- Generate seats for show_id = 10 (PVR, 11:30 AM)
SELECT generate_seats_for_show(10, 4, 10, 16, '{"Prime": [1,2,3,4], "Classic": [5,6,7,8,9]}');

-- =====================================================
-- VIEW FOR SEAT AVAILABILITY FOR A SHOW
-- =====================================================

CREATE VIEW seat_availability AS
SELECT 
    s.show_id,
    m.title as movie_title,
    t.name as theatre_name,
    sc.screen_name,
    se.seat_id,
    se.seat_number,
    se.row_number,
    se.seat_type,
    se.seat_price,
    se.is_available,
    se.is_reserved,
    se.is_bestseller,
    CASE 
        WHEN se.is_available = FALSE THEN 'Sold'
        WHEN se.is_reserved = TRUE THEN 'Reserved'
        WHEN se.is_bestseller = TRUE THEN 'Bestseller'
        ELSE 'Available'
    END as seat_status
FROM shows s
JOIN movies m ON s.movie_id = m.movie_id
JOIN theatres t ON s.theatre_id = t.theatre_id
JOIN theatre_screens sc ON s.screen_id = sc.screen_id
JOIN seats se ON s.show_id = se.show_id
WHERE s.status = 'Active'
AND s.show_date >= CURRENT_DATE
ORDER BY s.show_time, se.row_number, se.seat_number;

-- =====================================================
-- FUNCTION TO GET SEAT MAP FOR UI
-- =====================================================

CREATE OR REPLACE FUNCTION get_seat_map(p_show_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'seatId', seat_id,
            'seatNumber', seat_number,
            'rowNumber', row_number,
            'seatType', seat_type,
            'price', seat_price,
            'status', CASE 
                WHEN is_available = FALSE THEN 'sold'
                WHEN is_reserved = TRUE THEN 'reserved'
                WHEN is_bestseller = TRUE THEN 'bestseller'
                ELSE 'available'
            END,
            'positionX', seat_position_x,
            'positionY', seat_position_y
        )
        ORDER BY row_number, seat_number
    ) INTO v_result
    FROM seats
    WHERE show_id = p_show_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;