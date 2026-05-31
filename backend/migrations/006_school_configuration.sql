-- Chalo ERP Blueprint — Migration 006
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 006: School Configuration Tables
-- Holidays, branches, events, blocks, auto-numbering
-- ============================================

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    address TEXT,
    city_id UUID REFERENCES cities(id),
    phone VARCHAR(20),
    email VARCHAR(100),
    is_main BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    day_type VARCHAR(20) DEFAULT 'full',  -- full, half
    is_recurring BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS week_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    day_of_week INTEGER NOT NULL,  -- 0=Sunday, 6=Saturday
    is_working BOOLEAN DEFAULT true,
    half_day BOOLEAN DEFAULT false,
    UNIQUE(school_id, academic_year_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS time_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,  -- Morning Block, Afternoon Block
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    block_id UUID REFERENCES time_blocks(id),
    name VARCHAR(20) NOT NULL,  -- Period 1, Break, Period 2
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_break BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    event_type VARCHAR(50),  -- Academic, Sports, Cultural, Annual Day
    is_holiday BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auto_number_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,  -- admission, receipt, tc, invoice
    prefix VARCHAR(20),  -- ADM, RCP, TC
    separator VARCHAR(5) DEFAULT '/',
    next_number INTEGER DEFAULT 1,
    number_length INTEGER DEFAULT 4,  -- zero-padded: 0001, 0002
    academic_year_reset BOOLEAN DEFAULT true,
    UNIQUE(school_id, entity_type)
);

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuration_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'string',  -- string, boolean, number, json
    description VARCHAR(200),
    UNIQUE(school_id, config_key)
);

-- Add branch reference to schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_holidays_school_year ON holidays(school_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_events_school_date ON events(school_id, event_date);
CREATE INDEX IF NOT EXISTS idx_periods_school ON periods(school_id, sort_order);
