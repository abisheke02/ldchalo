-- Chalo ERP Blueprint — Migration 007
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 007: Enhanced RBAC (Role-Based Access Control)
-- Full permission matrix for multi-school deployment
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(30) NOT NULL,  -- super_admin, school_admin, principal, teacher, accountant, librarian
    description VARCHAR(200),
    is_system BOOLEAN DEFAULT false,  -- system roles can't be deleted
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(school_id, code)
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,  -- administration, admission, student, fees...
    screen VARCHAR(100) NOT NULL,  -- school_master, holiday_master, student_list...
    action VARCHAR(20) NOT NULL,  -- view, create, edit, delete, approve, export
    description VARCHAR(200),
    UNIQUE(module, screen, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT true,
    UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role_id, school_id)
);

CREATE TABLE IF NOT EXISTS portal_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    student_id UUID REFERENCES students(user_id),
    portal_type VARCHAR(20) NOT NULL,  -- parent, student
    phone VARCHAR(20),
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    login_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    device_info VARCHAR(200),
    user_agent TEXT,
    session_duration_minutes INTEGER
);

CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id),
    screen_name VARCHAR(100),
    action VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed system roles
INSERT INTO roles (school_id, name, code, is_system) VALUES
    (NULL, 'Super Admin', 'super_admin', true),
    (NULL, 'School Admin', 'school_admin', true),
    (NULL, 'Principal', 'principal', true),
    (NULL, 'Teacher', 'teacher', true),
    (NULL, 'Accountant', 'accountant', true),
    (NULL, 'Librarian', 'librarian', true),
    (NULL, 'Transport Manager', 'transport_mgr', true),
    (NULL, 'HR Manager', 'hr_manager', true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_screen ON user_activity_log(screen_name, created_at DESC);
