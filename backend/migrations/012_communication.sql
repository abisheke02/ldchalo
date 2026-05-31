-- Chalo ERP Blueprint — Migration 012
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 012: Communication Module
-- SMS, Email, WhatsApp gateway + templates + logs
-- ============================================

CREATE TABLE IF NOT EXISTS sms_gateway_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL,  -- msg91, twilio, textlocal
    api_key VARCHAR(200),
    sender_id VARCHAR(20),
    template_id VARCHAR(100),
    whatsapp_enabled BOOLEAN DEFAULT false,
    whatsapp_api_key VARCHAR(200),
    smtp_host VARCHAR(100),
    smtp_port INTEGER,
    smtp_user VARCHAR(100),
    smtp_password VARCHAR(200),
    from_email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(school_id)
);

CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(20) NOT NULL,  -- sms, email, whatsapp
    trigger_event VARCHAR(50),  -- absent_marked, fee_due, exam_result, admission_confirm
    subject VARCHAR(200),  -- for email
    body TEXT NOT NULL,  -- with {{student_name}}, {{class}}, {{amount}} placeholders
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL,  -- sms, email, whatsapp
    recipient_type VARCHAR(20),  -- parent, student, staff
    recipient_id UUID,
    recipient_phone VARCHAR(20),
    recipient_email VARCHAR(100),
    subject VARCHAR(200),
    message TEXT,
    status VARCHAR(20) DEFAULT 'queued',  -- queued, sent, delivered, failed
    error_message TEXT,
    provider_message_id VARCHAR(100),
    triggered_by VARCHAR(50),  -- system_auto, manual, scheduled
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    template_id UUID REFERENCES message_templates(id),
    message_type VARCHAR(20) NOT NULL,
    recipients JSONB,  -- {type: "class", class_id: 5} or {type: "all_parents"}
    scheduled_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',  -- scheduled, processing, completed, cancelled
    created_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_log_school ON message_log(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_log_status ON message_log(status, created_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_time ON scheduled_messages(scheduled_at, status);
