/**
 * @fileoverview Email Service using Nodemailer
 * @description Handles transactional email sending for the Chalo Schools ERP.
 * Supports per-school SMTP configuration, HTML templates, bulk email,
 * and attachment support.
 * 
 * Environment Variables:
 * - SMTP_HOST: Default SMTP host (e.g., smtp.gmail.com)
 * - SMTP_PORT: Default SMTP port (default: 587)
 * - SMTP_SECURE: Use TLS (default: false for port 587)
 * - SMTP_USER: Default SMTP username
 * - SMTP_PASS: Default SMTP password
 * - SMTP_FROM_NAME: Default sender name
 * - SMTP_FROM_EMAIL: Default sender email
 * - EMAIL_QUEUE_ENABLED: Enable email queuing (default: false)
 * 
 * @module services/email.service
 */

'use strict';

const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

/**
 * Default SMTP configuration from environment variables
 * @constant {Object}
 */
const DEFAULT_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: {
    name: process.env.SMTP_FROM_NAME || 'Chalo Schools',
    email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
  },
};

/**
 * Transport cache (keyed by school_id)
 * Avoids creating new transporter instances for every email
 * @type {Map<number, {transport: Object, createdAt: number}>}
 */
const transportCache = new Map();
const TRANSPORT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Gets or creates an SMTP transport for a school
 * Each school can have its own SMTP configuration stored in the database.
 * Falls back to default environment config if no school-specific config exists.
 * 
 * @param {number} [schoolId] - School ID for school-specific SMTP config
 * @returns {Promise<Object>} Nodemailer transporter instance
 */
async function getTransport(schoolId) {
  // Check cache first
  if (schoolId && transportCache.has(schoolId)) {
    const cached = transportCache.get(schoolId);
    if (Date.now() - cached.createdAt < TRANSPORT_CACHE_TTL) {
      return cached.transport;
    }
    transportCache.delete(schoolId);
  }

  let config = { ...DEFAULT_CONFIG };

  // Try to load school-specific SMTP config from database
  if (schoolId) {
    try {
      const { rows } = await pool.query(
        `SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, 
                from_name, from_email
         FROM school_email_config 
         WHERE school_id = $1 AND is_active = true`,
        [schoolId]
      );

      if (rows.length > 0) {
        const schoolConfig = rows[0];
        config = {
          host: schoolConfig.smtp_host || config.host,
          port: schoolConfig.smtp_port || config.port,
          secure: schoolConfig.smtp_secure || config.secure,
          auth: {
            user: schoolConfig.smtp_user || config.auth.user,
            pass: schoolConfig.smtp_pass || config.auth.pass,
          },
          from: {
            name: schoolConfig.from_name || config.from.name,
            email: schoolConfig.from_email || config.from.email,
          },
        };
      }
    } catch (error) {
      console.warn('[Email] Failed to load school SMTP config, using defaults:', error.message);
    }
  }

  // Create transporter
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    pool: true, // Use connection pooling
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000, // 1 second between messages
    rateLimit: 5, // Max 5 messages per rateDelta
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  // Store sender info on the transport object for later use
  transport._fromConfig = config.from;

  // Cache the transport
  if (schoolId) {
    transportCache.set(schoolId, { transport, createdAt: Date.now() });
  }

  return transport;
}

/**
 * Configures and validates SMTP transport for a school
 * Use this to test connectivity before saving configuration.
 * 
 * @param {number} schoolId - School ID
 * @returns {Promise<Object>} Verification result
 * 
 * @example
 * const result = await configureTransport(1);
 * // { success: true, message: 'SMTP connection verified' }
 */
async function configureTransport(schoolId) {
  try {
    const transport = await getTransport(schoolId);
    
    // Verify the connection
    await transport.verify();
    
    return {
      success: true,
      message: 'SMTP connection verified successfully',
      config: {
        host: transport.options.host,
        port: transport.options.port,
        secure: transport.options.secure,
      },
    };
  } catch (error) {
    // Clear cached transport on failure
    transportCache.delete(schoolId);
    
    console.error('[Email] Transport verification failed:', error.message);
    return {
      success: false,
      error: error.message,
      code: error.code || 'SMTP_ERROR',
    };
  }
}

/**
 * Sends a single email
 * 
 * @param {string|string[]} to - Recipient email address(es)
 * @param {string} subject - Email subject line
 * @param {string} html - HTML content of the email
 * @param {Object} [options={}] - Additional options
 * @param {number} [options.schoolId] - School ID for school-specific SMTP
 * @param {string} [options.text] - Plain text alternative
 * @param {string} [options.replyTo] - Reply-to address
 * @param {Array} [options.attachments] - Nodemailer attachment objects
 * @param {string} [options.cc] - CC recipients
 * @param {string} [options.bcc] - BCC recipients
 * @returns {Promise<Object>} Send result
 * 
 * @example
 * await sendEmail(
 *   'parent@example.com',
 *   'Fee Receipt - Chalo School',
 *   '<h1>Fee Receipt</h1><p>Amount: ₹5000</p>',
 *   {
 *     schoolId: 1,
 *     attachments: [{ filename: 'receipt.pdf', content: pdfBuffer }]
 *   }
 * );
 */
async function sendEmail(to, subject, html, options = {}) {
  try {
    if (!to || !subject) {
      return { success: false, error: 'Recipient and subject are required' };
    }

    const transport = await getTransport(options.schoolId);
    const fromConfig = transport._fromConfig || DEFAULT_CONFIG.from;

    const mailOptions = {
      from: `"${fromConfig.name}" <${fromConfig.email}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: options.text || stripHtml(html),
    };

    // Optional fields
    if (options.replyTo) mailOptions.replyTo = options.replyTo;
    if (options.cc) mailOptions.cc = options.cc;
    if (options.bcc) mailOptions.bcc = options.bcc;
    if (options.attachments) mailOptions.attachments = options.attachments;

    const result = await transport.sendMail(mailOptions);

    // Log email send
    await logEmailSend({
      to: mailOptions.to,
      subject,
      status: 'sent',
      messageId: result.messageId,
      schoolId: options.schoolId,
    });

    return {
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  } catch (error) {
    console.error('[Email] Send failed:', error.message);

    await logEmailSend({
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      status: 'failed',
      error: error.message,
      schoolId: options.schoolId,
    });

    return {
      success: false,
      error: error.message,
      code: error.code || 'SEND_FAILED',
    };
  }
}

/**
 * Sends bulk emails with template rendering
 * 
 * @param {Array<{email: string, name?: string, data?: Object}>} recipients - Array of recipient objects
 * @param {string} subject - Email subject (can contain {{variables}})
 * @param {string} template - HTML template with {{variables}}
 * @param {Object} [commonData={}] - Data common to all recipients
 * @param {Object} [options={}] - Additional options
 * @param {number} [options.schoolId] - School ID
 * @param {number} [options.batchSize=10] - Emails to send per batch
 * @param {number} [options.batchDelay=1000] - Delay between batches (ms)
 * @returns {Promise<Object>} Bulk send results
 * 
 * @example
 * await sendBulkEmail(
 *   [
 *     { email: 'parent1@example.com', name: 'Mr. Sharma', data: { student_name: 'Rahul', amount: '5000' } },
 *     { email: 'parent2@example.com', name: 'Mrs. Patel', data: { student_name: 'Priya', amount: '7500' } },
 *   ],
 *   'Fee Reminder - {{school_name}}',
 *   '<p>Dear {{parent_name}}, please pay ₹{{amount}} for {{student_name}}.</p>',
 *   { school_name: 'DAV Public School' },
 *   { schoolId: 1, batchSize: 10, batchDelay: 2000 }
 * );
 */
async function sendBulkEmail(recipients, subject, template, commonData = {}, options = {}) {
  if (!recipients || !recipients.length) {
    return { success: false, error: 'Recipients array is required' };
  }

  const batchSize = options.batchSize || 10;
  const batchDelay = options.batchDelay || 1000;
  const results = { sent: [], failed: [] };

  // Process in batches
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const batchPromises = batch.map(async (recipient) => {
      // Merge common data with recipient-specific data
      const templateData = {
        ...commonData,
        ...recipient.data,
        parent_name: recipient.name || recipient.data?.parent_name || '',
      };

      // Render template
      const renderedHtml = renderTemplate(template, templateData);
      const renderedSubject = renderTemplate(subject, templateData);

      const result = await sendEmail(
        recipient.email,
        renderedSubject,
        renderedHtml,
        { schoolId: options.schoolId }
      );

      if (result.success) {
        results.sent.push({ email: recipient.email, messageId: result.messageId });
      } else {
        results.failed.push({ email: recipient.email, error: result.error });
      }
    });

    await Promise.all(batchPromises);

    // Delay between batches to avoid rate limiting
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, batchDelay));
    }
  }

  return {
    success: results.failed.length === 0,
    totalSent: results.sent.length,
    totalFailed: results.failed.length,
    results,
  };
}

/**
 * Renders an HTML template by replacing {{variable}} placeholders
 * @param {string} template - HTML template string
 * @param {Object} data - Key-value data for variable replacement
 * @returns {string} Rendered HTML
 */
function renderTemplate(template, data = {}) {
  let rendered = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, String(value || ''));
  }
  return rendered;
}

/**
 * Strips HTML tags to generate plain text version
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Logs email send attempts to database for audit trail
 * @param {Object} logData - Log data
 * @param {string} logData.to - Recipient
 * @param {string} logData.subject - Subject
 * @param {string} logData.status - 'sent' or 'failed'
 * @param {string} [logData.messageId] - Provider message ID
 * @param {string} [logData.error] - Error message if failed
 * @param {number} [logData.schoolId] - School ID
 */
async function logEmailSend(logData) {
  try {
    await pool.query(
      `INSERT INTO email_logs (school_id, recipient, subject, status, message_id, error_message, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        logData.schoolId || null,
        logData.to,
        logData.subject,
        logData.status,
        logData.messageId || null,
        logData.error || null,
      ]
    );
  } catch (error) {
    // Don't fail the email send if logging fails
    console.error('[Email] Failed to log email send:', error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Built-in email templates for common ERP operations
 * @namespace templates
 */
const templates = {
  /**
   * Fee receipt email template
   * @param {Object} data - Template data
   * @returns {string} Rendered HTML
   */
  feeReceipt(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #2c3e50; margin-bottom: 5px;">{{school_name}}</h2>
          <p style="color: #7f8c8d; margin-top: 0;">Fee Payment Receipt</p>
        </div>
        <div style="padding: 20px 0;">
          <p>Dear {{parent_name}},</p>
          <p>We have received the fee payment for <strong>{{student_name}}</strong> ({{class_name}} - {{section_name}}).</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="background: #ecf0f1;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Receipt No</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">{{receipt_number}}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount Paid</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">₹{{amount}}</td>
            </tr>
            <tr style="background: #ecf0f1;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Mode</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">{{payment_mode}}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">{{date}}</td>
            </tr>
          </table>
          <p style="color: #7f8c8d; font-size: 12px;">This is an auto-generated email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Fee reminder email template
   * @param {Object} data - Template data
   * @returns {string} Rendered HTML
   */
  feeReminder(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
          <h2 style="color: #856404; margin: 0;">Fee Payment Reminder</h2>
        </div>
        <div style="padding: 20px 0;">
          <p>Dear {{parent_name}},</p>
          <p>This is a reminder that fees of <strong>₹{{amount}}</strong> for 
          <strong>{{student_name}}</strong> ({{class_name}}) is due on <strong>{{due_date}}</strong>.</p>
          <p>Please make the payment at the earliest to avoid late fee charges.</p>
          <p style="color: #7f8c8d; font-size: 12px;">
            If you have already made the payment, please ignore this email.
          </p>
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 12px; color: #6c757d;">
          <p style="margin: 0;">{{school_name}} | {{school_phone}} | {{school_email}}</p>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Password reset email template
   * @param {Object} data - Template data
   * @returns {string} Rendered HTML
   */
  passwordReset(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">Password Reset Request</h2>
        <p>Hello {{user_name}},</p>
        <p>We received a request to reset your password for Chalo Schools ERP.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{reset_link}}" style="background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #7f8c8d; font-size: 12px;">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
      </body>
      </html>
    `;
  },

  /**
   * Attendance alert email template
   */
  attendanceAlert(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8d7da; padding: 15px; border-radius: 8px; border-left: 4px solid #dc3545;">
          <h3 style="color: #721c24; margin: 0;">Attendance Alert</h3>
        </div>
        <div style="padding: 20px 0;">
          <p>Dear {{parent_name}},</p>
          <p>Your ward <strong>{{student_name}}</strong> ({{class_name}} - {{section_name}}) 
          was marked <strong>{{attendance_status}}</strong> on {{date}}.</p>
          <p>If you believe this is an error, please contact the school office.</p>
        </div>
        <div style="font-size: 12px; color: #6c757d; border-top: 1px solid #eee; padding-top: 10px;">
          <p>{{school_name}}</p>
        </div>
      </body>
      </html>
    `;
  },
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  configureTransport,
  renderTemplate,
  templates,
  stripHtml,
};
