-- =====================================================
-- BOOKINGS TABLE
-- Stores all booking transactions
-- =====================================================

CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_age INTEGER,
    show_id INTEGER REFERENCES shows(show_id) ON DELETE CASCADE,
    total_tickets INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    base_amount DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    coupon_code VARCHAR(50),
    booking_status VARCHAR(50) DEFAULT 'Pending', -- Pending, Confirmed, Cancelled, Rejected, Completed
    confirmation_status VARCHAR(50) DEFAULT 'Awaiting', -- Awaiting, Confirmed, Cancelled
    payment_status VARCHAR(50) DEFAULT 'Pending', -- Pending, Paid, Failed, Refunded
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    qr_code TEXT, -- QR Code for e-ticket
    ticket_pdf_url TEXT,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmation_date TIMESTAMP,
    payment_date TIMESTAMP,
    cancellation_date TIMESTAMP,
    expiry_date TIMESTAMP,
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_guest_booking BOOLEAN DEFAULT FALSE,
    staff_notes TEXT,
    processed_by INTEGER,
    cancellation_reason VARCHAR(255)
);

-- Create indexes for faster queries
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_email ON bookings(customer_email);
CREATE INDEX idx_bookings_phone ON bookings(customer_phone);
CREATE INDEX idx_bookings_show ON bookings(show_id);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

-- =====================================================
-- BOOKING HISTORY TABLE
-- Tracks all status changes for a booking
-- =====================================================

CREATE TABLE booking_history (
    history_id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(booking_id) ON DELETE CASCADE,
    status_from VARCHAR(50),
    status_to VARCHAR(50),
    action_type VARCHAR(50), -- Created, Confirmed, Cancelled, Payment, etc.
    action_by VARCHAR(255),
    action_by_role VARCHAR(50),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_booking ON booking_history(booking_id);
CREATE INDEX idx_history_created ON booking_history(created_at);

-- =====================================================
-- PAYMENTS TABLE
-- Stores payment details for bookings
-- =====================================================

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(booking_id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- Card, UPI, NetBanking, Wallet
    payment_status VARCHAR(50) DEFAULT 'Pending', -- Pending, Success, Failed, Refunded
    transaction_id VARCHAR(100) UNIQUE,
    payment_gateway VARCHAR(50),
    gateway_response TEXT, -- JSON response from payment gateway
    card_last_four VARCHAR(4),
    card_type VARCHAR(20),
    upi_id VARCHAR(100),
    bank_name VARCHAR(100),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refund_amount DECIMAL(10, 2),
    refund_date TIMESTAMP,
    refund_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(payment_status);

-- =====================================================
-- TICKETS TABLE
-- Stores individual ticket details
-- =====================================================

CREATE TABLE tickets (
    ticket_id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(booking_id) ON DELETE CASCADE,
    seat_id INTEGER REFERENCES seats(seat_id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    row_number VARCHAR(5) NOT NULL,
    seat_type VARCHAR(20),
    ticket_price DECIMAL(10, 2) NOT NULL,
    qr_code TEXT,
    ticket_number VARCHAR(20) UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_booking ON tickets(booking_id);
CREATE INDEX idx_tickets_seat ON tickets(seat_id);
CREATE INDEX idx_tickets_number ON tickets(ticket_number);

-- =====================================================
-- FUNCTION TO GENERATE BOOKING REFERENCE
-- =====================================================

CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT := 'BK';
    v_year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    v_month TEXT := EXTRACT(MONTH FROM CURRENT_DATE)::TEXT;
    v_seq INTEGER;
    v_reference TEXT;
BEGIN
    -- Get sequence number for today
    SELECT COALESCE(COUNT(*) + 1, 1) INTO v_seq
    FROM bookings
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Generate reference: BK-2026-08-0001
    v_reference := v_prefix || '-' || v_year || '-' || 
                   LPAD(v_month, 2, '0') || '-' || 
                   LPAD(v_seq::TEXT, 4, '0');
    
    RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION TO CREATE A NEW BOOKING
-- =====================================================

CREATE OR REPLACE FUNCTION create_booking(
    p_customer_name VARCHAR,
    p_customer_email VARCHAR,
    p_customer_phone VARCHAR,
    p_show_id INTEGER,
    p_seat_ids INTEGER[],
    p_coupon_code VARCHAR DEFAULT NULL,
    p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_id INTEGER,
    booking_reference VARCHAR,
    total_amount DECIMAL,
    status VARCHAR
) AS $$
DECLARE
    v_booking_id INTEGER;
    v_total_amount DECIMAL := 0;
    v_seat_price DECIMAL;
    v_show_total_seats INTEGER;
    v_show_available_seats INTEGER;
    v_coupon_discount DECIMAL := 0;
    v_reference VARCHAR;
BEGIN
    -- Check seat availability
    SELECT COUNT(*) INTO v_show_total_seats
    FROM seats
    WHERE show_id = p_show_id
    AND seat_id = ANY(p_seat_ids)
    AND is_available = TRUE
    AND is_reserved = FALSE;
    
    IF v_show_total_seats != array_length(p_seat_ids, 1) THEN
        RAISE EXCEPTION 'One or more seats are not available';
    END IF;
    
    -- Calculate total amount
    SELECT SUM(seat_price) INTO v_total_amount
    FROM seats
    WHERE show_id = p_show_id
    AND seat_id = ANY(p_seat_ids);
    
    -- Apply coupon discount if provided
    IF p_coupon_code IS NOT NULL THEN
        -- Simulate coupon validation
        IF p_coupon_code = 'B1G1' AND array_length(p_seat_ids, 1) >= 2 THEN
            v_coupon_discount := v_total_amount / 2;
        ELSIF p_coupon_code = 'MUNCH50' THEN
            v_coupon_discount := v_total_amount * 0.10;
        ELSE
            v_coupon_discount := 0;
        END IF;
    END IF;
    
    -- Generate booking reference
    v_reference := generate_booking_reference();
    
    -- Create booking
    INSERT INTO bookings (
        booking_reference,
        customer_name,
        customer_email,
        customer_phone,
        show_id,
        total_tickets,
        total_amount,
        base_amount,
        discount_amount,
        coupon_code,
        booking_status,
        confirmation_status,
        payment_status,
        special_requests,
        is_guest_booking,
        expiry_date,
        created_at,
        updated_at
    ) VALUES (
        v_reference,
        p_customer_name,
        p_customer_email,
        p_customer_phone,
        p_show_id,
        array_length(p_seat_ids, 1),
        v_total_amount - v_coupon_discount,
        v_total_amount,
        v_coupon_discount,
        p_coupon_code,
        'Pending',
        'Awaiting',
        'Pending',
        p_special_requests,
        TRUE,
        CURRENT_TIMESTAMP + INTERVAL '15 minutes',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING booking_id INTO v_booking_id;
    
    -- Reserve seats (temporary hold)
    UPDATE seats
    SET 
        is_reserved = TRUE,
        reserved_until = CURRENT_TIMESTAMP + INTERVAL '15 minutes'
    WHERE show_id = p_show_id
    AND seat_id = ANY(p_seat_ids);
    
    -- Create booking seats entries
    INSERT INTO booking_seats (
        booking_id,
        seat_id,
        seat_number,
        row_number,
        seat_type,
        seat_price
    )
    SELECT 
        v_booking_id,
        seat_id,
        seat_number,
        row_number,
        seat_type,
        seat_price
    FROM seats
    WHERE show_id = p_show_id
    AND seat_id = ANY(p_seat_ids);
    
    -- Create tickets
    INSERT INTO tickets (
        booking_id,
        seat_id,
        seat_number,
        row_number,
        seat_type,
        ticket_price,
        ticket_number,
        created_at
    )
    SELECT 
        v_booking_id,
        seat_id,
        seat_number,
        row_number,
        seat_type,
        seat_price,
        'TKT-' || v_booking_id || '-' || seat_id,
        CURRENT_TIMESTAMP
    FROM seats
    WHERE show_id = p_show_id
    AND seat_id = ANY(p_seat_ids);
    
    -- Add booking history
    INSERT INTO booking_history (
        booking_id,
        status_from,
        status_to,
        action_type,
        action_by,
        comments
    ) VALUES (
        v_booking_id,
        NULL,
        'Pending',
        'Created',
        p_customer_email,
        'Booking created by customer'
    );
    
    -- Update show available seats
    PERFORM update_show_seats(p_show_id);
    
    -- Return booking details
    RETURN QUERY
    SELECT 
        v_booking_id,
        v_reference,
        v_total_amount - v_coupon_discount,
        'Pending';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION TO CONFIRM BOOKING
-- =====================================================

CREATE OR REPLACE FUNCTION confirm_booking(
    p_booking_id INTEGER,
    p_payment_method VARCHAR,
    p_transaction_id VARCHAR
)
RETURNS TABLE (
    booking_id INTEGER,
    booking_reference VARCHAR,
    status VARCHAR
) AS $$
DECLARE
    v_booking RECORD;
    v_show_id INTEGER;
BEGIN
    -- Get booking details
    SELECT * INTO v_booking
    FROM bookings
    WHERE booking_id = p_booking_id
    AND booking_status = 'Pending'
    AND confirmation_status = 'Awaiting';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found or already processed';
    END IF;
    
    -- Update booking status
    UPDATE bookings
    SET 
        booking_status = 'Confirmed',
        confirmation_status = 'Confirmed',
        payment_status = 'Paid',
        payment_method = p_payment_method,
        transaction_id = p_transaction_id,
        confirmation_date = CURRENT_TIMESTAMP,
        payment_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE booking_id = p_booking_id;
    
    -- Confirm seats (permanently book them)
    PERFORM confirm_seats(p_booking_id);
    
    -- Update show seats
    SELECT show_id INTO v_show_id FROM bookings WHERE booking_id = p_booking_id;
    PERFORM update_show_seats(v_show_id);
    
    -- Add booking history
    INSERT INTO booking_history (
        booking_id,
        status_from,
        status_to,
        action_type,
        action_by,
        comments
    ) VALUES (
        p_booking_id,
        'Pending',
        'Confirmed',
        'Confirmed',
        'System',
        'Booking confirmed and payment successful'
    );
    
    -- Return updated booking
    RETURN QUERY
    SELECT 
        b.booking_id,
        b.booking_reference,
        b.booking_status
    FROM bookings b
    WHERE b.booking_id = p_booking_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION TO CANCEL BOOKING
-- =====================================================

CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id INTEGER,
    p_reason VARCHAR DEFAULT 'User requested cancellation'
)
RETURNS TABLE (
    booking_id INTEGER,
    booking_reference VARCHAR,
    status VARCHAR
) AS $$
DECLARE
    v_booking RECORD;
    v_show_id INTEGER;
BEGIN
    -- Get booking details
    SELECT * INTO v_booking
    FROM bookings
    WHERE booking_id = p_booking_id
    AND booking_status IN ('Pending', 'Confirmed');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found or cannot be cancelled';
    END IF;
    
    -- Update booking status
    UPDATE bookings
    SET 
        booking_status = 'Cancelled',
        confirmation_status = 'Cancelled',
        cancellation_date = CURRENT_TIMESTAMP,
        cancellation_reason = p_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE booking_id = p_booking_id;
    
    -- Release seats
    UPDATE seats
    SET 
        is_reserved = FALSE,
        reserved_until = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE seat_id IN (
        SELECT seat_id 
        FROM booking_seats 
        WHERE booking_id = p_booking_id
    );
    
    -- Update show seats
    SELECT show_id INTO v_show_id FROM bookings WHERE booking_id = p_booking_id;
    PERFORM update_show_seats(v_show_id);
    
    -- Add booking history
    INSERT INTO booking_history (
        booking_id,
        status_from,
        status_to,
        action_type,
        action_by,
        comments
    ) VALUES (
        p_booking_id,
        v_booking.booking_status,
        'Cancelled',
        'Cancelled',
        'System',
        p_reason
    );
    
    -- Return updated booking
    RETURN QUERY
    SELECT 
        b.booking_id,
        b.booking_reference,
        b.booking_status
    FROM bookings b
    WHERE b.booking_id = p_booking_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION TO PROCESS AUTO-CANCELLATION (SLA)
-- =====================================================

CREATE OR REPLACE FUNCTION process_auto_cancellation()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_booking RECORD;
BEGIN
    -- Find expired bookings (not confirmed within 15 minutes)
    FOR v_booking IN 
        SELECT booking_id
        FROM bookings
        WHERE booking_status = 'Pending'
        AND confirmation_status = 'Awaiting'
        AND expiry_date < CURRENT_TIMESTAMP
    LOOP
        -- Cancel the booking
        PERFORM cancel_booking(
            v_booking.booking_id,
            'Auto-cancelled: Confirmation timeout (15 minutes)'
        );
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION TO GET BOOKING DETAILS WITH TICKETS
-- =====================================================

CREATE OR REPLACE FUNCTION get_booking_details(p_booking_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'booking', json_build_object(
            'bookingId', b.booking_id,
            'bookingReference', b.booking_reference,
            'customerName', b.customer_name,
            'customerEmail', b.customer_email,
            'customerPhone', b.customer_phone,
            'totalTickets', b.total_tickets,
            'totalAmount', b.total_amount,
            'discountAmount', b.discount_amount,
            'bookingStatus', b.booking_status,
            'confirmationStatus', b.confirmation_status,
            'paymentStatus', b.payment_status,
            'bookingDate', b.booking_date,
            'confirmationDate', b.confirmation_date
        ),
        'show', json_build_object(
            'showId', s.show_id,
            'showDate', s.show_date,
            'showTime', s.show_time,
            'ticketPrice', s.ticket_price,
            'movieTitle', m.title,
            'movieGenre', m.genre,
            'movieRating', m.rating,
            'theatreName', t.name,
            'theatreCity', t.city,
            'screenName', sc.screen_name
        ),
        'seats', (
            SELECT json_agg(
                json_build_object(
                    'seatNumber', bs.seat_number,
                    'rowNumber', bs.row_number,
                    'seatType', bs.seat_type,
                    'price', bs.seat_price
                )
            )
            FROM booking_seats bs
            WHERE bs.booking_id = b.booking_id
        ),
        'tickets', (
            SELECT json_agg(
                json_build_object(
                    'ticketNumber', tc.ticket_number,
                    'seatNumber', tc.seat_number,
                    'rowNumber', tc.row_number,
                    'qrCode', tc.qr_code,
                    'isUsed', tc.is_used
                )
            )
            FROM tickets tc
            WHERE tc.booking_id = b.booking_id
        )
    ) INTO v_result
    FROM bookings b
    JOIN shows s ON b.show_id = s.show_id
    JOIN movies m ON s.movie_id = m.movie_id
    JOIN theatres t ON s.theatre_id = t.theatre_id
    JOIN theatre_screens sc ON s.screen_id = sc.screen_id
    WHERE b.booking_id = p_booking_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEW FOR BOOKING SUMMARY
-- =====================================================

CREATE VIEW booking_summary AS
SELECT 
    b.booking_id,
    b.booking_reference,
    b.customer_name,
    b.customer_email,
    b.customer_phone,
    b.total_tickets,
    b.total_amount,
    b.booking_status,
    b.confirmation_status,
    b.payment_status,
    b.booking_date,
    b.confirmation_date,
    m.title as movie_title,
    m.genre,
    t.name as theatre_name,
    t.city,
    s.show_date,
    s.show_time,
    (SELECT COUNT(*) FROM tickets WHERE booking_id = b.booking_id) as ticket_count,
    (SELECT string_agg(seat_number || '-' || row_number, ', ') 
     FROM booking_seats 
     WHERE booking_id = b.booking_id) as seat_numbers,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.booking_date)) / 60 as minutes_since_booking
FROM bookings b
JOIN shows s ON b.show_id = s.show_id
JOIN movies m ON s.movie_id = m.movie_id
JOIN theatres t ON s.theatre_id = t.theatre_id
WHERE b.booking_status IN ('Pending', 'Confirmed', 'Completed')
ORDER BY b.booking_date DESC;

-- =====================================================
-- VIEW FOR STAFF DASHBOARD
-- =====================================================

CREATE VIEW staff_dashboard AS
SELECT 
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN booking_status = 'Pending' THEN 1 END) as pending_bookings,
    COUNT(CASE WHEN booking_status = 'Confirmed' THEN 1 END) as confirmed_bookings,
    COUNT(CASE WHEN booking_status = 'Cancelled' THEN 1 END) as cancelled_bookings,
    COUNT(CASE WHEN booking_status = 'Rejected' THEN 1 END) as rejected_bookings,
    COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END) as payment_pending,
    COUNT(CASE WHEN payment_status = 'Paid' THEN 1 END) as payment_paid,
    COUNT(CASE WHEN payment_status = 'Failed' THEN 1 END) as payment_failed,
    SUM(CASE WHEN booking_status = 'Confirmed' THEN total_amount ELSE 0 END) as total_revenue,
    AVG(total_amount) as average_ticket_value,
    DATE(booking_date) as booking_date
FROM bookings
WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(booking_date)
ORDER BY booking_date DESC;

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE AND LOGGING
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_booking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_update_timestamp
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_booking_timestamp();

-- Auto-cancel expired bookings (run every minute)
CREATE OR REPLACE FUNCTION auto_cancel_expired_bookings()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM process_auto_cancellation();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORED PROCEDURE FOR REPORTING
-- =====================================================

CREATE OR REPLACE PROCEDURE generate_booking_report(
    p_start_date DATE,
    p_end_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS temp_booking_report AS
    SELECT 
        DATE(b.booking_date) as booking_date,
        m.title as movie_title,
        t.name as theatre_name,
        COUNT(*) as total_bookings,
        SUM(b.total_tickets) as total_tickets_sold,
        SUM(b.total_amount) as total_revenue,
        AVG(b.total_amount) as avg_transaction_value,
        COUNT(CASE WHEN b.payment_status = 'Paid' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN b.payment_status = 'Failed' THEN 1 END) as failed_payments
    FROM bookings b
    JOIN shows s ON b.show_id = s.show_id
    JOIN movies m ON s.movie_id = m.movie_id
    JOIN theatres t ON s.theatre_id = t.theatre_id
    WHERE b.booking_date BETWEEN p_start_date AND p_end_date
    AND b.booking_status NOT IN ('Cancelled', 'Rejected')
    GROUP BY DATE(b.booking_date), m.title, t.name
    ORDER BY booking_date DESC, total_revenue DESC;
END;
$$;

-- =====================================================
-- SAMPLE BOOKING DATA
-- =====================================================

-- Create a sample booking
SELECT create_booking(
    'John Doe',
    'john.doe@email.com',
    '9876543210',
    1, -- show_id
    ARRAY[1, 2, 3, 4, 5, 6, 7, 8], -- seat_ids
    'B1G1', -- coupon
    'Wheelchair access required'
);

-- Confirm the booking
SELECT confirm_booking(
    1, -- booking_id
    'UPI',
    'TXN123456789'
);

-- Cancel a booking
SELECT cancel_booking(
    1,
    'Changed plans'
);

-- View booking details
SELECT get_booking_details(1);

-- Run auto-cancellation process
SELECT process_auto_cancellation();