-- Chalo ERP Blueprint — Migration 015
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 015: Transport Module Extended
Tables: vehicles, drivers, vehicle_documents, ALTER transport_routes
-- ============================================
-- Generated from Chalo ERP Database Migration Plan
-- This migration is idempotent and can be run multiple times
-- ============================================

-- ============================================
-- MIGRATION 015: Transport Module
-- Vehicles, drivers, documents
-- ============================================

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type VARCHAR(30) NOT NULL,  -- bus, van, auto
    make VARCHAR(50),  -- Tata, Ashok Leyland
    model VARCHAR(50),
    seating_capacity INTEGER NOT NULL,
    fuel_type VARCHAR(20) DEFAULT 'diesel',
    gps_device_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    license_number VARCHAR(30) NOT NULL,
    license_expiry DATE,
    aadhar_number VARCHAR(12),
    address TEXT,
    photo_url VARCHAR(500),
    vehicle_id UUID REFERENCES vehicles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,  -- insurance, fitness_certificate, permit, puc
    document_number VARCHAR(50),
    issue_date DATE,
    expiry_date DATE,
    document_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'valid',  -- valid, expired, renewal_pending
    created_at TIMESTAMP DEFAULT NOW()
);

-- Link route to vehicle and driver
ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);
ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES drivers(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_school ON vehicles(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_school ON drivers(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_expiry ON vehicle_documents(expiry_date);