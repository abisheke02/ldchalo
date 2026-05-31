/**
 * Chalo Schools ERP — Communication Routes
 * Endpoints 225-237: SMS gateway config, templates, send/bulk-send, log, schedule, AI circular
 * File: routes/communication.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

// ============================================
// SMS/WhatsApp Service Placeholder
// Replace with actual provider SDK (MSG91, Twilio, Gupshup, etc.)
// ============================================
const SmsService = {
  /**
   * Send a single SMS
   * @param {string} phone - Phone number with country code
   * @param {string} message - Message text
   * @param {object} config - Gateway configuration
   * @returns {object} { success, messageId, error }
   */
  async sendSms(phone, message, config) {
    // TODO: Replace with actual SMS provider API call
    // Example with MSG91:
    // const response = await axios.post('https://api.msg91.com/api/v5/flow/', {
    //   template_id: config.template_id,
    //   recipients: [{ mobiles: phone, message }],
    // }, { headers: { authkey: config.api_key } });
    console.log(`[SMS SERVICE] Sending to ${phone}: ${message.substring(0, 50)}...`);
    return {
      success: true,
      messageId: `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      provider: config.provider || 'mock'
    };
  },

  /**
   * Send WhatsApp message
   * @param {string} phone - Phone number
   * @param {string} message - Message text
   * @param {object} config - Gateway configuration
   * @returns {object} { success, messageId, error }
   */
  async sendWhatsApp(phone, message, config) {
    // TODO: Replace with WhatsApp Business API / Gupshup / Twilio
    console.log(`[WHATSAPP SERVICE] Sending to ${phone}: ${message.substring(0, 50)}...`);
    return {
      success: true,
      messageId: `WA_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      provider: config.provider || 'mock'
    };
  },

  /**
   * Send Email
   * @param {string} email - Email address
   * @param {string} subject - Email subject
   * @param {string} body - Email HTML body
   * @param {object} config - SMTP configuration
   * @returns {object} { success, messageId, error }
   */
  async sendEmail(email, subject, body, config) {
    // TODO: Replace with nodemailer / AWS SES / SendGrid
    console.log(`[EMAIL SERVICE] Sending to ${email}: ${subject}`);
    return {
      success: true,
      messageId: `EM_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      provider: config.provider || 'mock'
    };
  }
};

/**
 * #225 GET /communication/gateway-config
 * Get SMS/WhatsApp config
 * Auth: Admin
 */
router.get('/gateway-config', requireRole('communication.config'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, provider, channel, api_key_masked, sender_id, is_active, 
              daily_limit, monthly_limit, messages_sent_today, messages_sent_month,
              webhook_url, updated_at
       FROM communication_gateway_config 
       WHERE school_id = $1
       ORDER BY channel, provider`,
      [req.user.school_id]
    );

    return res.json({
      success: true,
      data: result.rows,
      message: 'Gateway configurations retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching gateway config:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve gateway config', details: error.message }
    });
  }
});

/**
 * #226 PUT /communication/gateway-config
 * Update gateway config
 * Auth: Admin
 */
router.put('/gateway-config', requireRole('communication.config'), async (req, res) => {
  try {
    const {
      id,
      provider, // msg91, twilio, gupshup, custom
      channel, // sms, whatsapp, email
      api_key,
      api_secret,
      sender_id,
      is_active,
      daily_limit,
      monthly_limit,
      webhook_url,
      additional_config // JSON for provider-specific settings
    } = req.body;

    if (!provider || !channel) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'provider and channel are required' }
      });
    }

    // Mask the API key for storage display (keep full key encrypted separately)
    const apiKeyMasked = api_key ? `${api_key.substring(0, 4)}****${api_key.slice(-4)}` : null;

    let result;
    if (id) {
      // Update existing
      result = await pool.query(
        `UPDATE communication_gateway_config SET
          provider = $1, channel = $2, api_key = $3, api_secret = $4,
          api_key_masked = $5, sender_id = $6, is_active = $7,
          daily_limit = $8, monthly_limit = $9, webhook_url = $10,
          additional_config = $11, updated_at = NOW(), updated_by = $12
         WHERE id = $13 AND school_id = $14
         RETURNING id, provider, channel, api_key_masked, sender_id, is_active, daily_limit, monthly_limit`,
        [provider, channel, api_key, api_secret || null, apiKeyMasked,
         sender_id || null, is_active !== false, daily_limit || 1000,
         monthly_limit || 30000, webhook_url || null,
         JSON.stringify(additional_config || {}), req.user.id, id, req.user.school_id]
      );
    } else {
      // Create new
      result = await pool.query(
        `INSERT INTO communication_gateway_config (
          school_id, provider, channel, api_key, api_secret, api_key_masked,
          sender_id, is_active, daily_limit, monthly_limit, webhook_url,
          additional_config, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING id, provider, channel, api_key_masked, sender_id, is_active, daily_limit, monthly_limit`,
        [req.user.school_id, provider, channel, api_key, api_secret || null,
         apiKeyMasked, sender_id || null, is_active !== false, daily_limit || 1000,
         monthly_limit || 30000, webhook_url || null,
         JSON.stringify(additional_config || {}), req.user.id]
      );
    }

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Gateway configuration saved successfully'
    });
  } catch (error) {
    console.error('Error updating gateway config:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update gateway config', details: error.message }
    });
  }
});

/**
 * #227 POST /communication/test-sms
 * Send test SMS
 * Auth: Admin
 */
router.post('/test-sms', requireRole('communication.config'), async (req, res) => {
  try {
    const { phone, message, channel = 'sms' } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'phone and message are required' }
      });
    }

    // Get gateway config
    const configResult = await pool.query(
      `SELECT * FROM communication_gateway_config 
       WHERE school_id = $1 AND channel = $2 AND is_active = true
       LIMIT 1`,
      [req.user.school_id, channel]
    );

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_CONFIG', message: `No active ${channel} gateway configuration found` }
      });
    }

    const config = configResult.rows[0];
    let result;

    if (channel === 'sms') {
      result = await SmsService.sendSms(phone, message, config);
    } else if (channel === 'whatsapp') {
      result = await SmsService.sendWhatsApp(phone, message, config);
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'channel must be sms or whatsapp' }
      });
    }

    // Log the test message
    await pool.query(
      `INSERT INTO communication_log (
        school_id, channel, recipient_phone, message, status, 
        message_id, is_test, sent_by, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW())`,
      [req.user.school_id, channel, phone, message,
       result.success ? 'sent' : 'failed', result.messageId || null, req.user.id]
    );

    return res.json({
      success: result.success,
      data: { messageId: result.messageId, provider: result.provider },
      message: result.success ? 'Test message sent successfully' : 'Failed to send test message'
    });
  } catch (error) {
    console.error('Error sending test SMS:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to send test message', details: error.message }
    });
  }
});

/**
 * #228 GET /communication/templates
 * List message templates
 * Auth: Any authenticated user
 */
router.get('/templates', requireRole('communication.view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, channel, category, is_active } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR body ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (channel) {
      conditions.push(`channel = $${paramIndex++}`);
      params.push(channel);
    }
    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(is_active === 'true');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM communication_templates ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT id, name, channel, category, subject, body, variables, 
             is_active, dlt_template_id, created_at, updated_at
      FROM communication_templates
      ${whereClause}
      ORDER BY category, name
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Templates retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve templates', details: error.message }
    });
  }
});

/**
 * #229 POST /communication/templates
 * Create template
 * Auth: Admin
 */
router.post('/templates', requireRole('communication.manage_templates'), async (req, res) => {
  try {
    const {
      name,
      channel, // sms, whatsapp, email
      category, // fee_reminder, attendance, exam, general, circular
      subject, // for email
      body,
      variables, // Array of variable names like ['student_name', 'amount', 'due_date']
      dlt_template_id, // DLT registration ID for SMS in India
      is_active = true
    } = req.body;

    if (!name || !channel || !body) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name, channel, and body are required' }
      });
    }

    const result = await pool.query(
      `INSERT INTO communication_templates (
        school_id, name, channel, category, subject, body, variables,
        dlt_template_id, is_active, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *`,
      [req.user.school_id, name, channel, category || 'general', subject || null,
       body, JSON.stringify(variables || []), dlt_template_id || null,
       is_active, req.user.id]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create template', details: error.message }
    });
  }
});

/**
 * #230 PUT /communication/templates/:id
 * Update template
 * Auth: Admin
 */
router.put('/templates/:id', requireRole('communication.manage_templates'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, channel, category, subject, body, variables, dlt_template_id, is_active } = req.body;

    const result = await pool.query(
      `UPDATE communication_templates SET
        name = COALESCE($1, name), channel = COALESCE($2, channel),
        category = COALESCE($3, category), subject = COALESCE($4, subject),
        body = COALESCE($5, body), variables = COALESCE($6, variables),
        dlt_template_id = COALESCE($7, dlt_template_id),
        is_active = COALESCE($8, is_active),
        updated_by = $9, updated_at = NOW()
       WHERE id = $10 AND school_id = $11
       RETURNING *`,
      [name, channel, category, subject, body,
       variables ? JSON.stringify(variables) : null, dlt_template_id,
       is_active, req.user.id, id, req.user.school_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Template not found' }
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update template', details: error.message }
    });
  }
});

/**
 * #231 POST /communication/send
 * Send message (SMS/Email/WhatsApp) to individual recipient
 * Auth: Any authenticated user
 */
router.post('/send', requireRole('communication.send'), async (req, res) => {
  try {
    const {
      channel, // sms, whatsapp, email
      recipient_phone,
      recipient_email,
      template_id,
      subject, // for email
      message, // Direct message (if not using template)
      variables, // Object with key-value pairs for template variables
      student_id // Optional: link to student for logging
    } = req.body;

    if (!channel) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'channel is required' }
      });
    }

    // Get message content
    let finalMessage = message;
    let finalSubject = subject;

    if (template_id) {
      const templateResult = await pool.query(
        'SELECT * FROM communication_templates WHERE id = $1 AND school_id = $2',
        [template_id, req.user.school_id]
      );

      if (templateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Template not found' }
        });
      }

      const template = templateResult.rows[0];
      finalMessage = template.body;
      finalSubject = template.subject || subject;

      // Replace variables in template
      if (variables && typeof variables === 'object') {
        Object.keys(variables).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          finalMessage = finalMessage.replace(regex, variables[key]);
          if (finalSubject) {
            finalSubject = finalSubject.replace(regex, variables[key]);
          }
        });
      }
    }

    if (!finalMessage) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'message or template_id is required' }
      });
    }

    // Get gateway config
    const configResult = await pool.query(
      `SELECT * FROM communication_gateway_config 
       WHERE school_id = $1 AND channel = $2 AND is_active = true LIMIT 1`,
      [req.user.school_id, channel]
    );

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_CONFIG', message: `No active ${channel} gateway configured` }
      });
    }

    const config = configResult.rows[0];

    // Check daily limits
    if (config.messages_sent_today >= config.daily_limit) {
      return res.status(429).json({
        success: false,
        error: { code: 'LIMIT_EXCEEDED', message: 'Daily message limit exceeded' }
      });
    }

    // Send message
    let sendResult;
    if (channel === 'sms') {
      if (!recipient_phone) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'recipient_phone is required for SMS' }
        });
      }
      sendResult = await SmsService.sendSms(recipient_phone, finalMessage, config);
    } else if (channel === 'whatsapp') {
      if (!recipient_phone) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'recipient_phone is required for WhatsApp' }
        });
      }
      sendResult = await SmsService.sendWhatsApp(recipient_phone, finalMessage, config);
    } else if (channel === 'email') {
      if (!recipient_email) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'recipient_email is required for email' }
        });
      }
      sendResult = await SmsService.sendEmail(recipient_email, finalSubject || 'School Notification', finalMessage, config);
    }

    // Log the message
    await pool.query(
      `INSERT INTO communication_log (
        school_id, channel, recipient_phone, recipient_email, template_id,
        subject, message, status, message_id, student_id, sent_by, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [req.user.school_id, channel, recipient_phone || null, recipient_email || null,
       template_id || null, finalSubject || null, finalMessage,
       sendResult.success ? 'sent' : 'failed', sendResult.messageId || null,
       student_id || null, req.user.id]
    );

    // Update daily count
    await pool.query(
      `UPDATE communication_gateway_config SET messages_sent_today = messages_sent_today + 1
       WHERE id = $1`,
      [config.id]
    );

    return res.json({
      success: sendResult.success,
      data: { messageId: sendResult.messageId, channel, status: sendResult.success ? 'sent' : 'failed' },
      message: sendResult.success ? 'Message sent successfully' : 'Failed to send message'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to send message', details: error.message }
    });
  }
});

/**
 * #232 POST /communication/send-bulk
 * Bulk send to class/all parents
 * Auth: Admin
 */
router.post('/send-bulk', requireRole('communication.bulk_send'), async (req, res) => {
  try {
    const {
      channel, // sms, whatsapp, email
      template_id,
      message, // Direct message if no template
      subject,
      variables, // Global variables applied to all
      recipients, // Optional: explicit list of { phone, email, student_id, name, ...vars }
      filters // Optional: { class_id, section_id, academic_year_id, category }
    } = req.body;

    if (!channel || (!template_id && !message)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'channel and either template_id or message are required' }
      });
    }

    // Get template if provided
    let templateBody = message;
    let templateSubject = subject;
    if (template_id) {
      const templateResult = await pool.query(
        'SELECT * FROM communication_templates WHERE id = $1 AND school_id = $2',
        [template_id, req.user.school_id]
      );
      if (templateResult.rows.length > 0) {
        templateBody = templateResult.rows[0].body;
        templateSubject = templateResult.rows[0].subject || subject;
      }
    }

    // Build recipient list
    let recipientList = recipients || [];

    if (!recipients && filters) {
      // Query students/parents based on filters
      const params = [req.user.school_id];
      let paramIndex = 2;
      const conditions = ['s.school_id = $1', 's.status = \'active\''];

      if (filters.class_id) {
        conditions.push(`s.class_id = $${paramIndex++}`);
        params.push(filters.class_id);
      }
      if (filters.section_id) {
        conditions.push(`s.section_id = $${paramIndex++}`);
        params.push(filters.section_id);
      }

      const recipientQuery = `
        SELECT s.id as student_id, s.name as student_name, s.admission_number,
               s.parent_phone, s.parent_email, s.father_name,
               c.name as class_name, sec.name as section_name
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY s.name
      `;

      const recipientResult = await pool.query(recipientQuery, params);
      recipientList = recipientResult.rows.map(r => ({
        student_id: r.student_id,
        phone: r.parent_phone,
        email: r.parent_email,
        name: r.student_name,
        student_name: r.student_name,
        father_name: r.father_name,
        class_name: r.class_name,
        section_name: r.section_name
      }));
    }

    if (recipientList.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_RECIPIENTS', message: 'No recipients found matching the criteria' }
      });
    }

    // Get gateway config
    const configResult = await pool.query(
      `SELECT * FROM communication_gateway_config 
       WHERE school_id = $1 AND channel = $2 AND is_active = true LIMIT 1`,
      [req.user.school_id, channel]
    );

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_CONFIG', message: `No active ${channel} gateway configured` }
      });
    }

    const config = configResult.rows[0];

    // Create bulk send job
    const jobResult = await pool.query(
      `INSERT INTO communication_bulk_jobs (
        school_id, channel, template_id, total_recipients, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, 'processing', $5, NOW())
      RETURNING id`,
      [req.user.school_id, channel, template_id || null, recipientList.length, req.user.id]
    );

    const jobId = jobResult.rows[0].id;

    // Process messages (in production, this should be queued with Bull/Redis)
    let sent = 0;
    let failed = 0;

    for (const recipient of recipientList) {
      try {
        // Replace variables per recipient
        let personalizedMessage = templateBody;
        const allVars = { ...variables, ...recipient };
        Object.keys(allVars).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          personalizedMessage = personalizedMessage.replace(regex, allVars[key] || '');
        });

        let sendResult;
        const phone = recipient.phone;
        const email = recipient.email;

        if (channel === 'sms' && phone) {
          sendResult = await SmsService.sendSms(phone, personalizedMessage, config);
        } else if (channel === 'whatsapp' && phone) {
          sendResult = await SmsService.sendWhatsApp(phone, personalizedMessage, config);
        } else if (channel === 'email' && email) {
          let personalizedSubject = templateSubject || 'School Notification';
          Object.keys(allVars).forEach(key => {
            personalizedSubject = personalizedSubject.replace(new RegExp(`{{${key}}}`, 'g'), allVars[key] || '');
          });
          sendResult = await SmsService.sendEmail(email, personalizedSubject, personalizedMessage, config);
        } else {
          sendResult = { success: false, error: 'No valid contact info' };
        }

        // Log each message
        await pool.query(
          `INSERT INTO communication_log (
            school_id, channel, recipient_phone, recipient_email, template_id,
            message, status, message_id, student_id, bulk_job_id, sent_by, sent_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [req.user.school_id, channel, phone || null, email || null,
           template_id || null, personalizedMessage,
           sendResult.success ? 'sent' : 'failed', sendResult.messageId || null,
           recipient.student_id || null, jobId, req.user.id]
        );

        if (sendResult.success) sent++;
        else failed++;
      } catch (err) {
        failed++;
        console.error(`Failed to send to recipient:`, err.message);
      }
    }

    // Update job status
    await pool.query(
      `UPDATE communication_bulk_jobs SET status = 'completed', sent_count = $1, 
       failed_count = $2, completed_at = NOW()
       WHERE id = $3`,
      [sent, failed, jobId]
    );

    // Update daily count
    await pool.query(
      `UPDATE communication_gateway_config SET messages_sent_today = messages_sent_today + $1
       WHERE id = $2`,
      [sent, config.id]
    );

    return res.json({
      success: true,
      data: {
        job_id: jobId,
        total_recipients: recipientList.length,
        sent,
        failed,
        channel
      },
      message: `Bulk send completed. ${sent} sent, ${failed} failed out of ${recipientList.length} recipients.`
    });
  } catch (error) {
    console.error('Error in bulk send:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process bulk send', details: error.message }
    });
  }
});

/**
 * #233 GET /communication/log
 * Message delivery log
 * Auth: Any authenticated user
 */
router.get('/log', requireRole('communication.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      channel,
      status,
      date_from,
      date_to,
      student_id,
      bulk_job_id
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`cl.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    if (search) {
      conditions.push(`(cl.recipient_phone ILIKE $${paramIndex} OR cl.recipient_email ILIKE $${paramIndex} OR cl.message ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (channel) {
      conditions.push(`cl.channel = $${paramIndex++}`);
      params.push(channel);
    }
    if (status) {
      conditions.push(`cl.status = $${paramIndex++}`);
      params.push(status);
    }
    if (date_from) {
      conditions.push(`cl.sent_at >= $${paramIndex++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`cl.sent_at <= $${paramIndex++}`);
      params.push(date_to + ' 23:59:59');
    }
    if (student_id) {
      conditions.push(`cl.student_id = $${paramIndex++}`);
      params.push(student_id);
    }
    if (bulk_job_id) {
      conditions.push(`cl.bulk_job_id = $${paramIndex++}`);
      params.push(bulk_job_id);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM communication_log cl ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT cl.id, cl.channel, cl.recipient_phone, cl.recipient_email,
             cl.subject, cl.message, cl.status, cl.message_id, cl.sent_at,
             cl.delivery_status, cl.delivered_at, cl.is_test,
             s.name as student_name,
             u.name as sent_by_name,
             ct.name as template_name
      FROM communication_log cl
      LEFT JOIN students s ON cl.student_id = s.id
      LEFT JOIN users u ON cl.sent_by = u.id
      LEFT JOIN communication_templates ct ON cl.template_id = ct.id
      ${whereClause}
      ORDER BY cl.sent_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Communication log retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching communication log:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve communication log', details: error.message }
    });
  }
});

/**
 * #234 GET /communication/scheduled
 * List scheduled messages
 * Auth: Any authenticated user
 */
router.get('/scheduled', requireRole('communication.view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const offset = (page - 1) * limit;
    const params = [req.user.school_id];
    let paramIndex = 2;
    const conditions = ['school_id = $1'];

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM communication_scheduled ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT cs.id, cs.channel, cs.template_id, cs.subject, cs.message,
             cs.scheduled_at, cs.status, cs.recipient_count,
             cs.filters, cs.created_at,
             u.name as created_by_name,
             ct.name as template_name
      FROM communication_scheduled cs
      LEFT JOIN users u ON cs.created_by = u.id
      LEFT JOIN communication_templates ct ON cs.template_id = ct.id
      ${whereClause}
      ORDER BY cs.scheduled_at ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Scheduled messages retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing scheduled messages:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve scheduled messages', details: error.message }
    });
  }
});

/**
 * #235 POST /communication/schedule
 * Schedule a message
 * Auth: Admin
 */
router.post('/schedule', requireRole('communication.schedule'), async (req, res) => {
  try {
    const {
      channel,
      template_id,
      message,
      subject,
      variables,
      scheduled_at, // ISO 8601 datetime
      filters, // { class_id, section_id, ... }
      recipients // Optional explicit list
    } = req.body;

    if (!channel || !scheduled_at || (!template_id && !message)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'channel, scheduled_at, and either template_id or message are required' }
      });
    }

    // Validate scheduled_at is in the future
    if (new Date(scheduled_at) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'scheduled_at must be in the future' }
      });
    }

    // Count recipients
    let recipientCount = 0;
    if (recipients) {
      recipientCount = recipients.length;
    } else if (filters) {
      const params = [req.user.school_id];
      let paramIndex = 2;
      const conditions = ['school_id = $1', "status = 'active'"];
      if (filters.class_id) {
        conditions.push(`class_id = $${paramIndex++}`);
        params.push(filters.class_id);
      }
      if (filters.section_id) {
        conditions.push(`section_id = $${paramIndex++}`);
        params.push(filters.section_id);
      }
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM students WHERE ${conditions.join(' AND ')}`,
        params
      );
      recipientCount = parseInt(countResult.rows[0].total);
    }

    const result = await pool.query(
      `INSERT INTO communication_scheduled (
        school_id, channel, template_id, message, subject, variables,
        scheduled_at, filters, recipients_json, recipient_count, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled', $11, NOW())
      RETURNING *`,
      [req.user.school_id, channel, template_id || null, message || null,
       subject || null, JSON.stringify(variables || {}), scheduled_at,
       JSON.stringify(filters || {}), JSON.stringify(recipients || []),
       recipientCount, req.user.id]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `Message scheduled for ${new Date(scheduled_at).toLocaleString()} to ${recipientCount} recipients`
    });
  } catch (error) {
    console.error('Error scheduling message:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to schedule message', details: error.message }
    });
  }
});

/**
 * #236 DELETE /communication/scheduled/:id
 * Cancel scheduled message
 * Auth: Admin
 */
router.delete('/scheduled/:id', requireRole('communication.schedule'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE communication_scheduled SET status = 'cancelled', cancelled_by = $1, cancelled_at = NOW()
       WHERE id = $2 AND school_id = $3 AND status = 'scheduled'
       RETURNING id, status`,
      [req.user.id, id, req.user.school_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scheduled message not found or already processed' }
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Scheduled message cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling scheduled message:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to cancel scheduled message', details: error.message }
    });
  }
});

/**
 * #237 POST /communication/circular
 * AI-generate circular
 * Auth: Admin
 */
router.post('/circular', requireRole('communication.create_circular'), async (req, res) => {
  try {
    const {
      topic, // e.g. "Annual Day celebration", "Fee reminder", "PTM notification"
      tone, // formal, friendly, urgent
      audience, // parents, students, staff, all
      details, // Additional details to include
      language, // english, hindi, bilingual
      include_date,
      include_venue,
      max_length // short, medium, long
    } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'topic is required' }
      });
    }

    // Get school info for letterhead context
    const schoolResult = await pool.query(
      'SELECT name, address, principal_name FROM schools WHERE id = $1',
      [req.user.school_id]
    );
    const school = schoolResult.rows[0] || {};

    // AI circular generation prompt (to be sent to OpenAI/Claude API)
    const prompt = `Generate a school circular for ${school.name || 'the school'}.
Topic: ${topic}
Tone: ${tone || 'formal'}
Audience: ${audience || 'parents'}
Language: ${language || 'english'}
Length: ${max_length || 'medium'}
${details ? `Additional details: ${details}` : ''}
${include_date ? `Event Date: ${include_date}` : ''}
${include_venue ? `Venue: ${include_venue}` : ''}

Format the circular with:
- School header
- Date
- Subject line
- Body with proper salutation
- Sign-off from ${school.principal_name || 'Principal'}`;

    // TODO: Replace with actual AI API call (OpenAI, Claude, etc.)
    // const aiResponse = await openai.chat.completions.create({
    //   model: 'gpt-4',
    //   messages: [{ role: 'user', content: prompt }]
    // });
    // const generatedCircular = aiResponse.choices[0].message.content;

    // Placeholder response
    const generatedCircular = `
${school.name || 'School Name'}
${school.address || 'School Address'}
${'—'.repeat(40)}

Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

CIRCULAR

Subject: ${topic}

Dear ${audience === 'staff' ? 'Staff Members' : 'Parents/Guardians'},

This is to inform you about ${topic.toLowerCase()}. ${details || 'Please note the details below and plan accordingly.'}

${include_date ? `Date: ${include_date}` : ''}
${include_venue ? `Venue: ${include_venue}` : ''}

We request your kind cooperation in this matter.

Warm regards,
${school.principal_name || 'Principal'}
${school.name || 'School Name'}
    `.trim();

    // Save the generated circular
    const saveResult = await pool.query(
      `INSERT INTO communication_circulars (
        school_id, topic, content, audience, tone, language,
        ai_generated, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, 'draft', $7, NOW())
      RETURNING id`,
      [req.user.school_id, topic, generatedCircular, audience || 'parents',
       tone || 'formal', language || 'english', req.user.id]
    );

    return res.json({
      success: true,
      data: {
        id: saveResult.rows[0].id,
        circular: generatedCircular,
        topic,
        audience,
        tone,
        status: 'draft',
        ai_generated: true
      },
      message: 'Circular generated successfully. You can edit and send it.'
    });
  } catch (error) {
    console.error('Error generating circular:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate circular', details: error.message }
    });
  }
});

module.exports = router;
