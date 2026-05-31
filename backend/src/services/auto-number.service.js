/**
 * @fileoverview Auto-Number Generation Service
 * @description Generates sequential, formatted auto-numbers for various entities
 * in the school ERP (admission numbers, receipt numbers, TC numbers, etc.)
 * 
 * Uses atomic database operations (SELECT FOR UPDATE) to prevent race conditions
 * in concurrent environments.
 * 
 * Number Format: {prefix}/{year_format}/{padded_counter}
 * Example: ADM/2026/0001, REC/2025-26/001234, TC/2026/0045
 * 
 * Configuration stored in `auto_number_config` table:
 * - school_id, entity_type, prefix, separator, year_format,
 *   counter_padding, current_counter, reset_on_year_change
 * 
 * @module services/auto-number.service
 */

'use strict';

const { pool } = require('../config/database');

/**
 * Supported entity types for auto-numbering
 * @constant {Object}
 */
const ENTITY_TYPES = {
  ADMISSION: 'admission',
  FEE_RECEIPT: 'fee_receipt',
  TRANSFER_CERTIFICATE: 'transfer_certificate',
  BONAFIDE: 'bonafide',
  ENQUIRY: 'enquiry',
  INVOICE: 'invoice',
  REFUND: 'refund',
  STUDENT_ID: 'student_id',
  STAFF_ID: 'staff_id',
  VOUCHER: 'voucher',
};

/**
 * Default configurations for each entity type
 * These are used when no custom config exists in the database.
 * @constant {Object}
 */
const DEFAULT_CONFIGS = {
  [ENTITY_TYPES.ADMISSION]: {
    prefix: 'ADM',
    separator: '/',
    year_format: 'YYYY',
    counter_padding: 4,
    reset_on_year_change: true,
  },
  [ENTITY_TYPES.FEE_RECEIPT]: {
    prefix: 'REC',
    separator: '/',
    year_format: 'YYYY-YY',
    counter_padding: 6,
    reset_on_year_change: true,
  },
  [ENTITY_TYPES.TRANSFER_CERTIFICATE]: {
    prefix: 'TC',
    separator: '/',
    year_format: 'YYYY',
    counter_padding: 4,
    reset_on_year_change: true,
  },
  [ENTITY_TYPES.BONAFIDE]: {
    prefix: 'BON',
    separator: '/',
    year_format: 'YYYY',
    counter_padding: 4,
    reset_on_year_change: true,
  },
  [ENTITY_TYPES.ENQUIRY]: {
    prefix: 'ENQ',
    separator: '/',
    year_format: 'YYYY-YY',
    counter_padding: 4,
    reset_on_year_change: true,
  },
  [ENTITY_TYPES.INVOICE]: {
    prefix: 'INV',
    separator: '/',
    year_format: 'YYYY-YY',
    counter_padding: 6,
    reset_on_year_change: true,
  },
  [ENTITY_TYPES.REFUND]: {
    prefix: 'RFD',
    separator: '/',
    year_format: 'YYYY-YY',
    counter_padding: 4,
    reset_on_year_change: true,
  },
  [ENTITY_TYPES.STUDENT_ID]: {
    prefix: 'STU',
    separator: '',
    year_format: 'YY',
    counter_padding: 5,
    reset_on_year_change: false,
  },
  [ENTITY_TYPES.STAFF_ID]: {
    prefix: 'EMP',
    separator: '',
    year_format: 'YY',
    counter_padding: 4,
    reset_on_year_change: false,
  },
  [ENTITY_TYPES.VOUCHER]: {
    prefix: 'VCH',
    separator: '/',
    year_format: 'YYYY-YY',
    counter_padding: 5,
    reset_on_year_change: true,
  },
};

/**
 * Formats year string based on format pattern
 * @param {string} format - Year format: 'YYYY', 'YY', 'YYYY-YY', 'YYYY-YYYY'
 * @param {Date} [date] - Date to extract year from (defaults to now)
 * @returns {string} Formatted year string
 * 
 * @example
 * formatYear('YYYY');     // '2026'
 * formatYear('YY');       // '26'
 * formatYear('YYYY-YY');  // '2025-26' (academic year: April to March)
 * formatYear('YYYY-YYYY'); // '2025-2026'
 */
function formatYear(format, date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  // Academic year: April (month 3) onwards is current year, Jan-Mar is previous year
  const academicStartYear = month >= 3 ? year : year - 1;
  const academicEndYear = academicStartYear + 1;

  switch (format) {
    case 'YYYY':
      return String(academicStartYear);
    case 'YY':
      return String(academicStartYear).slice(-2);
    case 'YYYY-YY':
      return `${academicStartYear}-${String(academicEndYear).slice(-2)}`;
    case 'YYYY-YYYY':
      return `${academicStartYear}-${academicEndYear}`;
    default:
      return String(academicStartYear);
  }
}

/**
 * Gets the academic year identifier for reset tracking
 * @param {Date} [date] - Reference date
 * @returns {string} Academic year identifier (e.g., '2025-2026')
 */
function getAcademicYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/**
 * Generates the next auto-number for a given entity type
 * 
 * Uses PostgreSQL row-level locking (SELECT FOR UPDATE) to ensure
 * atomic counter increments even under concurrent access.
 * 
 * @param {number} schoolId - School ID
 * @param {string} entityType - Entity type (from ENTITY_TYPES constant)
 * @param {Object} [options={}] - Options
 * @param {Date} [options.date] - Reference date for year formatting (default: now)
 * @param {Object} [options.client] - Existing pg client for transaction context
 * @returns {Promise<Object>} Result with generated number
 * 
 * @example
 * const result = await getNextNumber(1, 'admission');
 * // { success: true, number: 'ADM/2026/0001', counter: 1, config: {...} }
 * 
 * @example
 * const result = await getNextNumber(1, 'fee_receipt');
 * // { success: true, number: 'REC/2025-26/001234', counter: 1234 }
 * 
 * @example
 * // Within a transaction
 * const client = await pool.connect();
 * try {
 *   await client.query('BEGIN');
 *   const { number } = await getNextNumber(schoolId, 'fee_receipt', { client });
 *   await client.query('INSERT INTO fee_collections (receipt_number, ...) VALUES ($1, ...)', [number]);
 *   await client.query('COMMIT');
 * } catch (e) {
 *   await client.query('ROLLBACK');
 * } finally {
 *   client.release();
 * }
 */
async function getNextNumber(schoolId, entityType, options = {}) {
  const useExternalClient = !!options.client;
  const client = options.client || await pool.connect();
  const referenceDate = options.date || new Date();

  try {
    if (!useExternalClient) {
      await client.query('BEGIN');
    }

    // ─── Get current config with row lock ───
    const { rows: configRows } = await client.query(
      `SELECT id, prefix, separator, year_format, counter_padding, 
              current_counter, reset_on_year_change, last_reset_year
       FROM auto_number_config
       WHERE school_id = $1 AND entity_type = $2
       FOR UPDATE`,
      [schoolId, entityType]
    );

    let config;
    let configId;

    if (configRows.length > 0) {
      config = configRows[0];
      configId = config.id;
    } else {
      // No config exists — create with defaults
      const defaults = DEFAULT_CONFIGS[entityType];
      if (!defaults) {
        throw new Error(`Unknown entity type: ${entityType}. Valid types: ${Object.values(ENTITY_TYPES).join(', ')}`);
      }

      const { rows: insertedRows } = await client.query(
        `INSERT INTO auto_number_config 
         (school_id, entity_type, prefix, separator, year_format, counter_padding, 
          current_counter, reset_on_year_change, last_reset_year)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, prefix, separator, year_format, counter_padding, 
                   current_counter, reset_on_year_change, last_reset_year`,
        [
          schoolId,
          entityType,
          defaults.prefix,
          defaults.separator,
          defaults.year_format,
          defaults.counter_padding,
          0,
          defaults.reset_on_year_change,
          getAcademicYear(referenceDate),
        ]
      );

      config = insertedRows[0];
      configId = config.id;
    }

    // ─── Check if counter needs to be reset (new academic year) ───
    const currentAcademicYear = getAcademicYear(referenceDate);
    let currentCounter = config.current_counter || 0;

    if (config.reset_on_year_change && config.last_reset_year !== currentAcademicYear) {
      // Reset counter for new academic year
      currentCounter = 0;
      await client.query(
        `UPDATE auto_number_config 
         SET current_counter = 0, last_reset_year = $1, updated_at = NOW()
         WHERE id = $2`,
        [currentAcademicYear, configId]
      );
    }

    // ─── Increment counter atomically ───
    const nextCounter = currentCounter + 1;

    await client.query(
      `UPDATE auto_number_config 
       SET current_counter = $1, updated_at = NOW()
       WHERE id = $2`,
      [nextCounter, configId]
    );

    // ─── Format the number ───
    const yearPart = formatYear(config.year_format, referenceDate);
    const counterPart = String(nextCounter).padStart(config.counter_padding, '0');
    const sep = config.separator || '/';

    let formattedNumber;
    if (config.separator === '') {
      // No separator: PREFIX + YEAR + COUNTER (e.g., STU260001)
      formattedNumber = `${config.prefix}${yearPart}${counterPart}`;
    } else {
      // With separator: PREFIX/YEAR/COUNTER (e.g., ADM/2026/0001)
      formattedNumber = `${config.prefix}${sep}${yearPart}${sep}${counterPart}`;
    }

    if (!useExternalClient) {
      await client.query('COMMIT');
    }

    return {
      success: true,
      number: formattedNumber,
      counter: nextCounter,
      config: {
        prefix: config.prefix,
        separator: config.separator,
        year_format: config.year_format,
        counter_padding: config.counter_padding,
        academic_year: currentAcademicYear,
      },
    };
  } catch (error) {
    if (!useExternalClient) {
      await client.query('ROLLBACK');
    }
    console.error('[AutoNumber] Generation failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    if (!useExternalClient) {
      client.release();
    }
  }
}

/**
 * Previews the next number without incrementing the counter
 * Useful for showing users what the next number will be.
 * 
 * @param {number} schoolId - School ID
 * @param {string} entityType - Entity type
 * @returns {Promise<Object>} Preview of next number
 * 
 * @example
 * const preview = await previewNextNumber(1, 'admission');
 * // { success: true, number: 'ADM/2026/0042', counter: 42 }
 */
async function previewNextNumber(schoolId, entityType) {
  try {
    const { rows } = await pool.query(
      `SELECT prefix, separator, year_format, counter_padding, 
              current_counter, reset_on_year_change, last_reset_year
       FROM auto_number_config
       WHERE school_id = $1 AND entity_type = $2`,
      [schoolId, entityType]
    );

    let config;
    if (rows.length > 0) {
      config = rows[0];
    } else {
      const defaults = DEFAULT_CONFIGS[entityType];
      if (!defaults) {
        return { success: false, error: `Unknown entity type: ${entityType}` };
      }
      config = { ...defaults, current_counter: 0, last_reset_year: null };
    }

    const currentAcademicYear = getAcademicYear();
    let nextCounter = (config.current_counter || 0) + 1;

    // If year changed and reset is enabled, preview from 1
    if (config.reset_on_year_change && config.last_reset_year !== currentAcademicYear) {
      nextCounter = 1;
    }

    const yearPart = formatYear(config.year_format);
    const counterPart = String(nextCounter).padStart(config.counter_padding, '0');
    const sep = config.separator || '/';

    let formattedNumber;
    if (config.separator === '') {
      formattedNumber = `${config.prefix}${yearPart}${counterPart}`;
    } else {
      formattedNumber = `${config.prefix}${sep}${yearPart}${sep}${counterPart}`;
    }

    return {
      success: true,
      number: formattedNumber,
      counter: nextCounter,
      isPreview: true,
    };
  } catch (error) {
    console.error('[AutoNumber] Preview failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Gets the current auto-number configuration for a school
 * 
 * @param {number} schoolId - School ID
 * @param {string} [entityType] - Specific entity type (returns all if not specified)
 * @returns {Promise<Object>} Configuration data
 */
async function getConfig(schoolId, entityType) {
  try {
    let queryText = `SELECT * FROM auto_number_config WHERE school_id = $1`;
    const params = [schoolId];

    if (entityType) {
      queryText += ` AND entity_type = $2`;
      params.push(entityType);
    }

    queryText += ` ORDER BY entity_type`;

    const { rows } = await pool.query(queryText, params);

    // For entity types without config, include defaults
    if (!entityType) {
      const configuredTypes = rows.map((r) => r.entity_type);
      const allConfigs = [...rows];

      Object.entries(DEFAULT_CONFIGS).forEach(([type, defaults]) => {
        if (!configuredTypes.includes(type)) {
          allConfigs.push({
            entity_type: type,
            ...defaults,
            current_counter: 0,
            is_default: true,
          });
        }
      });

      return { success: true, configs: allConfigs };
    }

    return {
      success: true,
      config: rows[0] || { entity_type: entityType, ...DEFAULT_CONFIGS[entityType], current_counter: 0, is_default: true },
    };
  } catch (error) {
    console.error('[AutoNumber] Get config failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Updates the auto-number configuration for a specific entity type
 * 
 * @param {number} schoolId - School ID
 * @param {string} entityType - Entity type to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.prefix] - New prefix
 * @param {string} [updates.separator] - New separator
 * @param {string} [updates.year_format] - New year format
 * @param {number} [updates.counter_padding] - New padding length
 * @param {boolean} [updates.reset_on_year_change] - Reset counter on year change
 * @param {number} [updates.current_counter] - Manual counter override (use with caution)
 * @returns {Promise<Object>} Update result
 * 
 * @example
 * await updateConfig(1, 'admission', { prefix: 'ADMN', counter_padding: 5 });
 */
async function updateConfig(schoolId, entityType, updates) {
  try {
    const allowedFields = ['prefix', 'separator', 'year_format', 'counter_padding', 'reset_on_year_change', 'current_counter'];
    const setClause = [];
    const values = [schoolId, entityType];
    let paramIndex = 3;

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    setClause.push(`updated_at = NOW()`);

    // UPSERT approach
    const upsertQuery = `
      UPDATE auto_number_config
      SET ${setClause.join(', ')}
      WHERE school_id = $1 AND entity_type = $2
      RETURNING *
    `;

    const { rows } = await pool.query(upsertQuery, values);

    if (rows.length === 0) {
      // Config doesn't exist yet — create it
      const defaults = DEFAULT_CONFIGS[entityType] || {};
      const mergedConfig = { ...defaults, ...updates };

      const { rows: insertedRows } = await pool.query(
        `INSERT INTO auto_number_config 
         (school_id, entity_type, prefix, separator, year_format, counter_padding, 
          current_counter, reset_on_year_change)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          schoolId,
          entityType,
          mergedConfig.prefix || 'NUM',
          mergedConfig.separator || '/',
          mergedConfig.year_format || 'YYYY',
          mergedConfig.counter_padding || 4,
          mergedConfig.current_counter || 0,
          mergedConfig.reset_on_year_change !== undefined ? mergedConfig.reset_on_year_change : true,
        ]
      );

      return { success: true, config: insertedRows[0], created: true };
    }

    return { success: true, config: rows[0], updated: true };
  } catch (error) {
    console.error('[AutoNumber] Update config failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Resets the counter for a specific entity type
 * 
 * @param {number} schoolId - School ID
 * @param {string} entityType - Entity type to reset
 * @param {number} [newCounter=0] - New counter value (default: 0)
 * @returns {Promise<Object>} Reset result
 */
async function resetCounter(schoolId, entityType, newCounter = 0) {
  try {
    const { rows } = await pool.query(
      `UPDATE auto_number_config 
       SET current_counter = $3, last_reset_year = $4, updated_at = NOW()
       WHERE school_id = $1 AND entity_type = $2
       RETURNING *`,
      [schoolId, entityType, newCounter, getAcademicYear()]
    );

    if (rows.length === 0) {
      return { success: false, error: 'Configuration not found' };
    }

    return {
      success: true,
      config: rows[0],
      message: `Counter reset to ${newCounter} for ${entityType}`,
    };
  } catch (error) {
    console.error('[AutoNumber] Reset counter failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getNextNumber,
  previewNextNumber,
  getConfig,
  updateConfig,
  resetCounter,
  // Constants
  ENTITY_TYPES,
  DEFAULT_CONFIGS,
  // Utility
  formatYear,
  getAcademicYear,
};
