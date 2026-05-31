-- Chalo ERP Blueprint — Migration 016
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 016: Hostel Management Module
Tables: hostels, hostel_rooms, hostel_enrollments
-- ============================================
-- Generated from Chalo ERP Database Migration Plan
-- This migration is idempotent and can be run multiple times
-- ============================================

-- ============================================
-- MIGRATION 016: Hostel Module (Residential Schools)
-- ============================================

CREATE TABLE IF NOT EXISTS hostels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20),  -- boys, girls, co-ed
    warden_staff_id UUID REFERENCES staff(id),
    capacity INTEGER,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    floor INTEGER DEFAULT 0,
    room_type VARCHAR(30),  -- single, double, dormitory
    capacity INTEGER NOT NULL,
    occupied INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(hostel_id, room_number)
);

CREATE TABLE IF NOT EXISTS hostel_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    hostel_id UUID REFERENCES hostels(id),
    room_id UUID REFERENCES hostel_rooms(id),
    academic_year_id UUID REFERENCES academic_years(id),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    vacated_date DATE,
    food_preference VARCHAR(20),  -- veg, non_veg
    emergency_contact VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',  -- active, vacated
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hostel_enrollments_student ON hostel_enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_occupancy ON hostel_rooms(hostel_id, occupied);