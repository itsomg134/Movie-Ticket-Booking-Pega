-- =====================================================
-- MOVIES TABLE
-- Stores all movie information
-- =====================================================

CREATE TABLE movies (
    movie_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    genre VARCHAR(255) NOT NULL,
    sub_genre VARCHAR(255),
    duration_minutes INTEGER NOT NULL, -- Duration in minutes
    language VARCHAR(50) NOT NULL,
    subtitle_languages VARCHAR(255),
    rating VARCHAR(10) NOT NULL, -- U, U/A, A, S
    poster_url TEXT,
    backdrop_url TEXT,
    trailer_url TEXT,
    description TEXT,
    release_date DATE,
    cast_info TEXT, -- JSON or comma-separated cast
    crew_info TEXT, -- JSON or comma-separated crew
    imdb_rating DECIMAL(3,1),
    user_rating DECIMAL(3,1),
    total_votes INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    is_premiere BOOLEAN DEFAULT FALSE,
    is_re_release BOOLEAN DEFAULT FALSE,
    is_3d BOOLEAN DEFAULT FALSE,
    is_imax BOOLEAN DEFAULT FALSE,
    is_4d BOOLEAN DEFAULT FALSE,
    age_restriction VARCHAR(10), -- 18+, 13+, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active' -- Active, Inactive, Coming Soon
);

-- Create indexes for better performance
CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_movies_genre ON movies(genre);
CREATE INDEX idx_movies_language ON movies(language);
CREATE INDEX idx_movies_release_date ON movies(release_date);
CREATE INDEX idx_movies_rating ON movies(rating);
CREATE INDEX idx_movies_status ON movies(status);

-- =====================================================
-- SAMPLE DATA FOR MOVIES TABLE
-- =====================================================

INSERT INTO movies (
    title, original_title, genre, sub_genre, duration_minutes, 
    language, subtitle_languages, rating, poster_url, description, 
    release_date, cast_info, crew_info, imdb_rating, user_rating, 
    total_votes, likes_count, is_premiere, is_re_release, 
    is_3d, is_imax, is_4d, age_restriction
) VALUES 
(
    'Toxic: A Fairy Tale for Grown-ups',
    'Toxic: A Fairy Tale for Grown-ups',
    'Action/Crime/Period/Thriller',
    'Action Drama',
    194,
    'Hindi',
    'English',
    'A',
    'https://example.com/posters/toxic-poster.jpg',
    'Independence has swept across India, but Goa still answers to the Portuguese. In the uneasy years before liberation, in a city where power, betrayal, and violence collide, Raya must navigate the complexities of loyalty and morality.',
    'Yash as Raya, Kiara Advani as Nadia, Huma Qureshi as Elizabeth, Nayanthara as Ganga, Tara Sutaria as Rebecca',
    'Geetu Mohandas - Director, Venkat K. Narayana (KVN) - Producer, Yash - Producer, Ravi Basrur - Musician',
    8.9, 9.8, 25200, 1500000, TRUE, FALSE, TRUE, TRUE, TRUE, '18+'
),
(
    'Spider-Man: Brand New Day',
    'Spider-Man: Brand New Day',
    'Action/Adventure/Sci-Fi',
    'Superhero',
    148,
    'English',
    'Hindi, Tamil, Telugu',
    'U/A',
    'https://example.com/posters/spiderman-poster.jpg',
    'Peter Parker embarks on a new adventure as he balances his life as a superhero and a college student.',
    'Tom Holland as Spider-Man, Zendaya as MJ, Jacob Batalon as Ned, Benedict Cumberbatch as Doctor Strange',
    'Jon Watts - Director, Kevin Feige - Producer, Amy Pascal - Producer, Michael Giacchino - Musician',
    8.7, 8.9, 343000, 2500000, FALSE, FALSE, TRUE, TRUE, TRUE, '13+'
),
(
    'Awarapan 2',
    'Awarapan 2',
    'Action/Crime/Romantic',
    'Action Romance',
    156,
    'Hindi',
    'English',
    'A',
    'https://example.com/posters/awarapan2-poster.jpg',
    'A tale of love, betrayal, and redemption set against the backdrop of the Mumbai underworld.',
    'John Abraham as Shiv, Shraddha Kapoor as Riya, Nawazuddin Siddiqui as Khan, Anil Kapoor as Boss',
    'Mohan Raja - Director, Vamsi Krishna Reddy - Producer, Pramod Uppalapati - Producer, Pritam - Musician',
    7.8, 8.0, 81900, 950000, FALSE, FALSE, FALSE, FALSE, FALSE, '18+'
),
(
    'Hanuman Ansh',
    'Hanuman Ansh',
    'Devotional/Drama',
    'Religious Drama',
    135,
    'Hindi',
    'English',
    'U',
    'https://example.com/posters/hanuman-ansh-poster.jpg',
    'An epic tale of devotion and courage, Hanuman Ansh brings to life the legendary stories of Lord Hanuman.',
    'Prabhas as Hanuman, Deepika Padukone as Sita, Amitabh Bachchan as Ram, Alia Bhatt as Lakshmi',
    'Om Raut - Director, Bhushan Kumar - Producer, Ajit Andhare - Producer, Ajay-Atul - Musician',
    9.0, 9.8, 25200, 1800000, TRUE, FALSE, FALSE, FALSE, FALSE, 'U'
),
(
    'You Were Never Really Here',
    'You Were Never Really Here',
    'Thriller/Crime',
    'Psychological Thriller',
    95,
    'English',
    'Hindi',
    'A',
    'https://example.com/posters/you-were-never-poster.jpg',
    'A traumatized veteran tracks down missing girls in New York City, confronting his own demons along the way.',
    'Joaquin Phoenix as Joe, Ekaterina Samsonov as Nina, Alessandro Nivola as Governor, John Doman as John',
    'Lynne Ramsay - Director, Scott Rudin - Producer, Paul Thomas Anderson - Producer, Jonny Greenwood - Musician',
    7.5, 7.8, 45000, 320000, FALSE, FALSE, FALSE, FALSE, FALSE, '18+'
);

-- =====================================================
-- TRIGGER TO UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_movie_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER movie_update_timestamp
BEFORE UPDATE ON movies
FOR EACH ROW
EXECUTE FUNCTION update_movie_timestamp();

-- =====================================================
-- VIEW FOR MOVIE DETAILS WITH AGGREGATED DATA
-- =====================================================

CREATE VIEW movie_details AS
SELECT 
    m.*,
    COALESCE((
        SELECT COUNT(*) 
        FROM bookings b 
        JOIN shows s ON b.show_id = s.show_id 
        WHERE s.movie_id = m.movie_id 
        AND b.booking_status = 'Confirmed'
    ), 0) as total_bookings,
    COALESCE((
        SELECT ROUND(AVG(rating), 1)
        FROM reviews r
        WHERE r.movie_id = m.movie_id
    ), 0) as average_rating,
    COALESCE((
        SELECT COUNT(*)
        FROM reviews r
        WHERE r.movie_id = m.movie_id
    ), 0) as total_reviews
FROM movies m
WHERE m.status = 'Active';