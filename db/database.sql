-- Active: 1773557885374@@127.0.0.1@5432@messdb
-- Create an enum type for meal types
DROP TYPE IF EXISTS meal_type CASCADE;

CREATE TYPE meal_type AS ENUM ('Breakfast', 'Lunch', 'Dinner');

-- Create an enum type for days of the week
DROP TYPE IF EXISTS day_of_week CASCADE;

CREATE TYPE day_of_week AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- Table to store menu items
CREATE TABLE IF NOT EXISTS menu_items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_vegetarian BOOLEAN DEFAULT TRUE,
    calories INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to store the daily menu schedule
CREATE TABLE IF NOT EXISTS daily_menu (
    menu_id SERIAL PRIMARY KEY,
    day day_of_week NOT NULL,
    meal_type meal_type NOT NULL,
    item_id INTEGER NOT NULL REFERENCES menu_items (item_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure we don't accidentally schedule the exact same item for the same meal on the same day twice
    UNIQUE (day, meal_type, item_id)
);

-- Index to quickly look up items for a specific day and meal
CREATE INDEX IF NOT EXISTS idx_daily_menu_day_meal ON daily_menu (day, meal_type);

-- Optional: Function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Optional: Triggers to call the update function
DROP TRIGGER IF EXISTS update_menu_items_modtime ON menu_items;

CREATE TRIGGER update_menu_items_modtime
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_daily_menu_modtime ON daily_menu;

CREATE TRIGGER update_daily_menu_modtime
    BEFORE UPDATE ON daily_menu
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

--- Example Data Insertion ---

INSERT INTO
    menu_items (
        name,
        description,
        is_vegetarian,
        calories
    )
VALUES (
        'Aloo Paratha',
        'Stuffed potato flatbread served with yogurt and pickle',
        TRUE,
        350
    ),
    (
        'Poha',
        'Flattened rice cooked with onions, peanuts, and spices',
        TRUE,
        250
    ),
    (
        'Chicken Curry',
        'Spicy chicken curry with rich gravy',
        FALSE,
        450
    ),
    (
        'Dal Tadka',
        'Yellow lentils tempered with cumin and garlic',
        TRUE,
        200
    ),
    (
        'Rice',
        'Steamed basmati rice',
        TRUE,
        150
    ),
    (
        'Roti',
        'Whole wheat flatbread',
        TRUE,
        100
    ),
    (
        'Paneer Butter Masala',
        'Cottage cheese in a rich tomato gravy',
        TRUE,
        400
    ),
    (
        'Mix Veg',
        'Assorted vegetables cooked in spices',
        TRUE,
        180
    ),
    (
        'Gulab Jamun',
        'Deep fried dough balls soaked in sugar syrup',
        TRUE,
        300
    );

INSERT INTO
    daily_menu (day, meal_type, item_id)
VALUES ('Monday', 'Breakfast', 1), -- Aloo Paratha
    ('Monday', 'Breakfast', 2), -- Poha
    ('Monday', 'Lunch', 4), -- Dal Tadka
    ('Monday', 'Lunch', 5), -- Rice
    ('Monday', 'Lunch', 6), -- Roti
    ('Monday', 'Lunch', 3), -- Chicken Curry (Non-veg option)
    ('Monday', 'Dinner', 7), -- Paneer Butter Masala
    ('Monday', 'Dinner', 8), -- Mix Veg
    ('Monday', 'Dinner', 6), -- Roti
    ('Monday', 'Dinner', 9);
-- Gulab Jamun


-- Table to store user feedback
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id SERIAL PRIMARY KEY,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: In a real system you'd probably link feedback to `user_id` or a specific `menu_id`. 
-- Since we do not have an authentication table, this is anonymous system-wide feedback.