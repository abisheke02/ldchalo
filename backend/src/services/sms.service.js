/**
 * @fileoverview SMS Service Wrapper
 * @description Supports MSG91 and Twilio SMS providers with template variable
 * replacement, bulk SMS, delivery status tracking, and balance checking.
 * 
 * Environment Variables Required:
 * - SMS_PROVIDER: 'msg91' or 'twilio' (default: 'msg91')
 * - MSG91_AUTH_KEY: MSG91 authentication key
 * - MSG91_SENDER_ID: 6-character sender ID
 * - MSG91_ROUTE: MSG91 route (4 = transactional, 1 = promotional)
 * - MSG91_COUNTRY_CODE: Country code (default: '91')
 * - TWILIO_ACCOUNT_SID: Twilio account SID
 * - TWILIO_AUTH_TOKEN: Twilio auth token
 * - TWILIO_PHONE_NUMBER: Twilio sender phone number
 * 
 * @module services/sms.service
 */

'use strict';

const axios = require('axios');

/**
 * SMS Provider configuration
 * @constant {Object}
 */
const CONFIG = {
  provider: process.env.SMS_PROVIDER || 'msg91',
  msg91: {
    authKey: process.env.MSG91_AUTH_KEY,
    senderId: process.env.MSG91_SENDER_ID || 'CHALSC',
    route: process.env.MSG91_ROUTE || '4',
    countryCode: process.env.MSG91_COUNTRY_CODE || '91',
    baseUrl: 'https://control.msg91.com/api/v5',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    baseUrl: null, // Twilio SDK handles URL construction
  },
};

/**
 * SMS template variable placeholders
 * These variables can be used in SMS templates and will be replaced
 * with actual values at send time.
 * 
 * @constant {string[]}
 * @example
 * "Dear {{parent_name}}, {{student_name}} fees of ₹{{amount}} is due on {{due_date}}"
 */
const TEMPLATE_VARIABLES = [
  '{{student_name}}',
  '{{parent_name}}',
  '{{father_name}}',
  '{{mother_name}}',
  '{{class_name}}',
  '{{section_name}}',
  '{{amount}}',
  '{{due_date}}',
  '{{receipt_number}}',
  '{{admission_number}}',
  '{{school_name}}',
  '{{date}}',
  '{{time}}',
  '{{exam_name}}',
  '{{marks}}',
  '{{percentage}}',
  '{{attendance_status}}',
  '{{balance_amount}}',
  '{{tc_number}}',
  '{{otp}}',
];

/**
 * Replaces template variables in a message string
 * 
 * @param {string} message - Message template with {{variable}} placeholders
 * @param {Object} variables - Key-value pairs for replacement
 * @returns {string} Message with variables replaced
 * 
 * @example
 * replaceTemplateVariables(
 *   'Dear {{parent_name}}, fees of ₹{{amount}} received for {{student_name}}',
 *   { parent_name: 'Mr. Sharma', amount: '5000', student_name: 'Rahul' }
 * );
 * // Returns: "Dear Mr. Sharma, fees of ₹5000 received for Rahul"
 */
function replaceTemplateVariables(message, variables = {}) {
  let result = message;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value || ''));
  }
  return result;
}

/**
 * Formats phone number to include country code
 * @param {string} phone - Phone number (10 digits or with country code)
 * @returns {string} Formatted phone number with country code
 */
function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.length === 10) {
    return `${CONFIG.msg91.countryCode}${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `${CONFIG.msg91.countryCode}${cleaned.substring(1)}`;
  }
  return cleaned;
}

// ─────────────────────────────────────────────────────────────────────────────
// MSG91 PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

const msg91Provider = {
  /**
   * Send SMS via MSG91
   * @param {string} phone - Recipient phone number
   * @param {string} message - SMS message text
   * @param {string} [templateId] - MSG91 DLT template ID
   * @returns {Promise<Object>} Send result
   */
  async sendSMS(phone, message, templateId) {
    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      const payload = {
        sender: CONFIG.msg91.senderId,
        route: CONFIG.msg91.route,
        country: CONFIG.msg91.countryCode,
        sms: [
          {
            message,
            to: [formattedPhone],
          },
        ],
      };

      // Add DLT template ID if provided (required in India)
      if (templateId) {
        payload.DLT_TE_ID = templateId;
      }

      const response = await axios.post(
        `${CONFIG.msg91.baseUrl}/flow/`,
        payload,
        {
          headers: {
            'authkey': CONFIG.msg91.authKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        provider: 'msg91',
        messageId: response.data.request_id || response.data.message,
        phone: formattedPhone,
        status: 'sent',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error('[SMS:MSG91] Send failed:', errorMessage);
      return {
        success: false,
        provider: 'msg91',
        error: errorMessage,
        phone,
      };
    }
  },

  /**
   * Send bulk SMS via MSG91
   * @param {string[]} phones - Array of recipient phone numbers
   * @param {string} message - SMS message text
   * @param {string} [templateId] - MSG91 DLT template ID
   * @returns {Promise<Object>} Bulk send result
   */
  async sendBulkSMS(phones, message, templateId) {
    try {
      const formattedPhones = phones.map(formatPhoneNumber);

      const payload = {
        sender: CONFIG.msg91.senderId,
        route: CONFIG.msg91.route,
        country: CONFIG.msg91.countryCode,
        sms: [
          {
            message,
            to: formattedPhones,
          },
        ],
      };

      if (templateId) {
        payload.DLT_TE_ID = templateId;
      }

      const response = await axios.post(
        `${CONFIG.msg91.baseUrl}/flow/`,
        payload,
        {
          headers: {
            'authkey': CONFIG.msg91.authKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return {
        success: true,
        provider: 'msg91',
        messageId: response.data.request_id,
        totalSent: formattedPhones.length,
        status: 'sent',
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error('[SMS:MSG91] Bulk send failed:', errorMessage);
      return {
        success: false,
        provider: 'msg91',
        error: errorMessage,
        totalAttempted: phones.length,
      };
    }
  },

  /**
   * Get MSG91 account balance
   * @returns {Promise<Object>} Balance information
   */
  async getBalance() {
    try {
      const response = await axios.get(
        `https://control.msg91.com/api/balance.php`,
        {
          params: {
            authkey: CONFIG.msg91.authKey,
            type: CONFIG.msg91.route,
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        provider: 'msg91',
        balance: response.data,
        route: CONFIG.msg91.route === '4' ? 'transactional' : 'promotional',
      };
    } catch (error) {
      console.error('[SMS:MSG91] Balance check failed:', error.message);
      return {
        success: false,
        provider: 'msg91',
        error: error.message,
      };
    }
  },

  /**
   * Get delivery status of a message
   * @param {string} messageId - MSG91 request/message ID
   * @returns {Promise<Object>} Delivery status
   */
  async getDeliveryStatus(messageId) {
    try {
      const response = await axios.get(
        `${CONFIG.msg91.baseUrl}/report/${messageId}`,
        {
          headers: { 'authkey': CONFIG.msg91.authKey },
          timeout: 10000,
        }
      );

      return {
        success: true,
        provider: 'msg91',
        messageId,
        status: response.data,
      };
    } catch (error) {
      console.error('[SMS:MSG91] Status check failed:', error.message);
      return {
        success: false,
        provider: 'msg91',
        error: error.message,
      };
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TWILIO PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

const twilioProvider = {
  /**
   * Get Twilio client (lazy initialization)
   * @returns {Object} Twilio client instance
   */
  getClient() {
    if (!this._client) {
      const twilio = require('twilio');
      this._client = twilio(CONFIG.twilio.accountSid, CONFIG.twilio.authToken);
    }
    return this._client;
  },

  /**
   * Send SMS via Twilio
   * @param {string} phone - Recipient phone number
   * @param {string} message - SMS message text
   * @returns {Promise<Object>} Send result
   */
  async sendSMS(phone, message) {
    try {
      const client = this.getClient();
      const formattedPhone = `+${formatPhoneNumber(phone)}`;

      const result = await client.messages.create({
        body: message,
        from: CONFIG.twilio.phoneNumber,
        to: formattedPhone,
      });

      return {
        success: true,
        provider: 'twilio',
        messageId: result.sid,
        phone: formattedPhone,
        status: result.status,
      };
    } catch (error) {
      console.error('[SMS:Twilio] Send failed:', error.message);
      return {
        success: false,
        provider: 'twilio',
        error: error.message,
        phone,
      };
    }
  },

  /**
   * Send bulk SMS via Twilio (sequential with rate limiting)
   * @param {string[]} phones - Array of recipient phone numbers
   * @param {string} message - SMS message text
   * @returns {Promise<Object>} Bulk send results
   */
  async sendBulkSMS(phones, message) {
    const results = { sent: [], failed: [] };

    for (const phone of phones) {
      const result = await this.sendSMS(phone, message);
      if (result.success) {
        results.sent.push(result);
      } else {
        results.failed.push(result);
      }
      // Rate limiting: 1 message per 100ms
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      success: results.failed.length === 0,
      provider: 'twilio',
      totalSent: results.sent.length,
      totalFailed: results.failed.length,
      results,
    };
  },

  /**
   * Get Twilio account balance
   * @returns {Promise<Object>} Balance information
   */
  async getBalance() {
    try {
      const client = this.getClient();
      const balance = await client.balance.fetch();

      return {
        success: true,
        provider: 'twilio',
        balance: balance.balance,
        currency: balance.currency,
      };
    } catch (error) {
      console.error('[SMS:Twilio] Balance check failed:', error.message);
      return {
        success: false,
        provider: 'twilio',
        error: error.message,
      };
    }
  },

  /**
   * Get delivery status of a Twilio message
   * @param {string} messageId - Twilio message SID
   * @returns {Promise<Object>} Delivery status
   */
  async getDeliveryStatus(messageId) {
    try {
      const client = this.getClient();
      const message = await client.messages(messageId).fetch();

      return {
        success: true,
        provider: 'twilio',
        messageId,
        status: message.status,
        dateSent: message.dateSent,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error) {
      console.error('[SMS:Twilio] Status check failed:', error.message);
      return {
        success: false,
        provider: 'twilio',
        error: error.message,
      };
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets the active SMS provider based on configuration
 * @returns {Object} Provider implementation
 */
function getProvider() {
  return CONFIG.provider === 'twilio' ? twilioProvider : msg91Provider;
}

/**
 * Send a single SMS
 * 
 * @param {string} phone - Recipient phone number (10 digits or with country code)
 * @param {string} message - SMS message (can contain {{template_variables}})
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.templateId] - DLT template ID (required for MSG91 in India)
 * @param {Object} [options.variables] - Template variable replacements
 * @returns {Promise<Object>} Result with success status and message ID
 * 
 * @example
 * await sendSMS('9876543210', 'Dear {{parent_name}}, fees received: ₹{{amount}}', {
 *   templateId: '1234567890',
 *   variables: { parent_name: 'Mr. Kumar', amount: '15000' }
 * });
 */
async function sendSMS(phone, message, options = {}) {
  if (!phone || !message) {
    return { success: false, error: 'Phone number and message are required' };
  }

  // Replace template variables if provided
  let finalMessage = message;
  if (options.variables) {
    finalMessage = replaceTemplateVariables(message, options.variables);
  }

  const provider = getProvider();
  return provider.sendSMS(phone, finalMessage, options.templateId);
}

/**
 * Send SMS to multiple recipients
 * 
 * @param {string[]} phones - Array of phone numbers
 * @param {string} message - SMS message (can contain {{template_variables}})
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.templateId] - DLT template ID
 * @param {Object} [options.variables] - Template variable replacements (same for all)
 * @returns {Promise<Object>} Bulk send result
 * 
 * @example
 * await sendBulkSMS(
 *   ['9876543210', '9876543211', '9876543212'],
 *   'School is closed tomorrow due to {{reason}}.',
 *   { templateId: '1234567890', variables: { reason: 'heavy rain' } }
 * );
 */
async function sendBulkSMS(phones, message, options = {}) {
  if (!phones || !phones.length || !message) {
    return { success: false, error: 'Phone numbers array and message are required' };
  }

  // Replace template variables
  let finalMessage = message;
  if (options.variables) {
    finalMessage = replaceTemplateVariables(message, options.variables);
  }

  const provider = getProvider();
  return provider.sendBulkSMS(phones, finalMessage, options.templateId);
}

/**
 * Get SMS account balance/credits
 * 
 * @returns {Promise<Object>} Balance information
 * 
 * @example
 * const balance = await getBalance();
 * // { success: true, provider: 'msg91', balance: '2450', route: 'transactional' }
 */
async function getBalance() {
  const provider = getProvider();
  return provider.getBalance();
}

/**
 * Get delivery status of a sent message
 * 
 * @param {string} messageId - Provider-specific message/request ID
 * @returns {Promise<Object>} Delivery status
 * 
 * @example
 * const status = await getDeliveryStatus('5f2b3c4d5e6f7a8b9c0d1e2f');
 * // { success: true, provider: 'msg91', messageId: '...', status: 'delivered' }
 */
async function getDeliveryStatus(messageId) {
  if (!messageId) {
    return { success: false, error: 'Message ID is required' };
  }

  const provider = getProvider();
  return provider.getDeliveryStatus(messageId);
}

/**
 * Send personalized bulk SMS (different variables per recipient)
 * 
 * @param {Array<{phone: string, variables: Object}>} recipients - Recipients with individual variables
 * @param {string} messageTemplate - Message template with {{variables}}
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.templateId] - DLT template ID
 * @returns {Promise<Object>} Personalized bulk send results
 * 
 * @example
 * await sendPersonalizedBulkSMS(
 *   [
 *     { phone: '9876543210', variables: { parent_name: 'Mr. Sharma', amount: '5000' } },
 *     { phone: '9876543211', variables: { parent_name: 'Mrs. Patel', amount: '7500' } },
 *   ],
 *   'Dear {{parent_name}}, outstanding fees: ₹{{amount}}. Please pay by {{due_date}}.',
 *   { templateId: '1234567890' }
 * );
 */
async function sendPersonalizedBulkSMS(recipients, messageTemplate, options = {}) {
  if (!recipients || !recipients.length || !messageTemplate) {
    return { success: false, error: 'Recipients array and message template are required' };
  }

  const results = { sent: [], failed: [] };

  for (const recipient of recipients) {
    const personalizedMessage = replaceTemplateVariables(messageTemplate, recipient.variables || {});
    const result = await sendSMS(recipient.phone, personalizedMessage, {
      templateId: options.templateId,
    });

    if (result.success) {
      results.sent.push({ phone: recipient.phone, messageId: result.messageId });
    } else {
      results.failed.push({ phone: recipient.phone, error: result.error });
    }

    // Small delay between sends to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return {
    success: results.failed.length === 0,
    totalSent: results.sent.length,
    totalFailed: results.failed.length,
    results,
  };
}

module.exports = {
  sendSMS,
  sendBulkSMS,
  sendPersonalizedBulkSMS,
  getBalance,
  getDeliveryStatus,
  replaceTemplateVariables,
  TEMPLATE_VARIABLES,
};
