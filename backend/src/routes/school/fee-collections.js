/**
 * Chalo Schools ERP — Fee Collections Routes
 * Endpoints 149-155: Fee collection, receipts, cancellation, student history, outstanding
 * File: routes/fee-collections.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

/**
 * #149 GET /fee-collections
 * List collections with date/class/mode filter
 * Auth: Accountant+
 */
router.get('/', requireRole('fee_collections.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
      search,
      date_from,
      date_to,
      class_id,
      section_id,
      payment_mode,
      status,
      academic_year_id
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`fc.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    if (search) {
      conditions.push(`(s.name ILIKE $${paramIndex} OR fc.receipt_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (date_from) {
      conditions.push(`fc.collection_date >= $${paramIndex++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`fc.collection_date <= $${paramIndex++}`);
      params.push(date_to);
    }
    if (class_id) {
      conditions.push(`fc.class_id = $${paramIndex++}`);
      params.push(class_id);
    }
    if (section_id) {
      conditions.push(`fc.section_id = $${paramIndex++}`);
      params.push(section_id);
    }
    if (payment_mode) {
      conditions.push(`fc.payment_mode = $${paramIndex++}`);
      params.push(payment_mode);
    }
    if (status) {
      conditions.push(`fc.status = $${paramIndex++}`);
      params.push(status);
    }
    if (academic_year_id) {
      conditions.push(`fc.academic_year_id = $${paramIndex++}`);
      params.push(academic_year_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts = ['created_at', 'collection_date', 'amount', 'receipt_number'];
    const sortCol = allowedSorts.includes(sort) ? `fc.${sort}` : 'fc.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM fee_collections fc
      LEFT JOIN students s ON fc.student_id = s.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Fetch data
    const dataQuery = `
      SELECT fc.id, fc.receipt_number, fc.collection_date, fc.amount, fc.payment_mode,
             fc.status, fc.remarks, fc.created_at,
             s.id as student_id, s.name as student_name, s.admission_number,
             c.name as class_name, sec.name as section_name,
             u.name as collected_by_name
      FROM fee_collections fc
      LEFT JOIN students s ON fc.student_id = s.id
      LEFT JOIN classes c ON fc.class_id = c.id
      LEFT JOIN sections sec ON fc.section_id = sec.id
      LEFT JOIN users u ON fc.collected_by = u.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Fee collections retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing fee collections:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve fee collections', details: error.message }
    });
  }
});

/**
 * #150 POST /fee-collections
 * Collect fees (generate receipt)
 * Auth: Accountant+
 */
router.post('/', requireRole('fee_collections.create'), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      student_id,
      fee_structure_id,
      fee_heads, // Array of { fee_head_id, amount }
      payment_mode, // cash, cheque, upi, online, dd
      total_amount,
      cheque_number,
      cheque_date,
      bank_name,
      transaction_reference,
      remarks,
      academic_year_id,
      late_fee_amount = 0
    } = req.body;

    if (!student_id || !fee_heads || !fee_heads.length || !payment_mode || !total_amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'student_id, fee_heads, payment_mode, and total_amount are required' }
      });
    }

    await client.query('BEGIN');

    // Get student details for receipt
    const studentResult = await client.query(
      'SELECT id, name, class_id, section_id, admission_number FROM students WHERE id = $1 AND school_id = $2',
      [student_id, req.user.school_id]
    );

    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Student not found' }
      });
    }

    const student = studentResult.rows[0];

    // Generate receipt number from auto-number config
    const receiptResult = await client.query(
      `SELECT next_value, prefix, suffix, padding FROM auto_number_config 
       WHERE entity_type = 'fee_receipt' AND school_id = $1`,
      [req.user.school_id]
    );

    let receiptNumber;
    if (receiptResult.rows.length > 0) {
      const config = receiptResult.rows[0];
      const paddedNum = String(config.next_value).padStart(config.padding || 6, '0');
      receiptNumber = `${config.prefix || 'REC'}${paddedNum}${config.suffix || ''}`;
      await client.query(
        `UPDATE auto_number_config SET next_value = next_value + 1 WHERE entity_type = 'fee_receipt' AND school_id = $1`,
        [req.user.school_id]
      );
    } else {
      receiptNumber = `REC${Date.now()}`;
    }

    // Insert fee collection record
    const insertQuery = `
      INSERT INTO fee_collections (
        school_id, student_id, class_id, section_id, fee_structure_id,
        receipt_number, collection_date, amount, late_fee_amount, total_amount,
        payment_mode, cheque_number, cheque_date, bank_name, transaction_reference,
        remarks, status, academic_year_id, collected_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'completed', $16, $17, NOW())
      RETURNING *
    `;

    const insertResult = await client.query(insertQuery, [
      req.user.school_id, student_id, student.class_id, student.section_id,
      fee_structure_id, receiptNumber, total_amount - late_fee_amount, late_fee_amount,
      total_amount, payment_mode, cheque_number || null, cheque_date || null,
      bank_name || null, transaction_reference || null, remarks || null,
      academic_year_id, req.user.id
    ]);

    const collection = insertResult.rows[0];

    // Insert fee head details
    for (const head of fee_heads) {
      await client.query(
        `INSERT INTO fee_collection_details (fee_collection_id, fee_head_id, amount)
         VALUES ($1, $2, $3)`,
        [collection.id, head.fee_head_id, head.amount]
      );
    }

    // Update student fee outstanding
    await client.query(
      `UPDATE student_fee_allocations SET paid_amount = paid_amount + $1, updated_at = NOW()
       WHERE student_id = $2 AND fee_structure_id = $3`,
      [total_amount, student_id, fee_structure_id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: { ...collection, student_name: student.name, admission_number: student.admission_number },
      message: `Fee collected successfully. Receipt: ${receiptNumber}`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error collecting fee:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to collect fee', details: error.message }
    });
  } finally {
    client.release();
  }
});

/**
 * #151 GET /fee-collections/:id
 * Get receipt details
 * Auth: Any authenticated user
 */
router.get('/:id', requireRole('fee_collections.view'), async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT fc.*, 
             s.name as student_name, s.admission_number, s.parent_phone,
             c.name as class_name, sec.name as section_name,
             u.name as collected_by_name,
             cu.name as cancelled_by_name
      FROM fee_collections fc
      LEFT JOIN students s ON fc.student_id = s.id
      LEFT JOIN classes c ON fc.class_id = c.id
      LEFT JOIN sections sec ON fc.section_id = sec.id
      LEFT JOIN users u ON fc.collected_by = u.id
      LEFT JOIN users cu ON fc.cancelled_by = cu.id
      WHERE fc.id = $1 AND fc.school_id = $2
    `;

    const result = await pool.query(query, [id, req.user.school_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Fee collection record not found' }
      });
    }

    // Get fee head details
    const detailsResult = await pool.query(
      `SELECT fcd.*, fh.name as fee_head_name
       FROM fee_collection_details fcd
       LEFT JOIN fee_heads fh ON fcd.fee_head_id = fh.id
       WHERE fcd.fee_collection_id = $1`,
      [id]
    );

    const data = {
      ...result.rows[0],
      fee_heads: detailsResult.rows
    };

    return res.json({
      success: true,
      data,
      message: 'Fee collection details retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching fee collection:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve fee collection', details: error.message }
    });
  }
});

/**
 * #152 GET /fee-collections/:id/receipt-pdf
 * Generate receipt PDF
 * Auth: Any authenticated user
 */
router.get('/:id/receipt-pdf', requireRole('fee_collections.view'), async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch receipt data
    const query = `
      SELECT fc.*, 
             s.name as student_name, s.admission_number, s.father_name,
             c.name as class_name, sec.name as section_name,
             sch.name as school_name, sch.address as school_address, sch.logo_url,
             u.name as collected_by_name
      FROM fee_collections fc
      LEFT JOIN students s ON fc.student_id = s.id
      LEFT JOIN classes c ON fc.class_id = c.id
      LEFT JOIN sections sec ON fc.section_id = sec.id
      LEFT JOIN schools sch ON fc.school_id = sch.id
      LEFT JOIN users u ON fc.collected_by = u.id
      WHERE fc.id = $1 AND fc.school_id = $2
    `;

    const result = await pool.query(query, [id, req.user.school_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Fee collection record not found' }
      });
    }

    // Get fee head details
    const detailsResult = await pool.query(
      `SELECT fcd.*, fh.name as fee_head_name
       FROM fee_collection_details fcd
       LEFT JOIN fee_heads fh ON fcd.fee_head_id = fh.id
       WHERE fcd.fee_collection_id = $1`,
      [id]
    );

    const receiptData = {
      ...result.rows[0],
      fee_heads: detailsResult.rows
    };

    // Generate PDF (using a PDF generation library like pdfkit or puppeteer)
    // This is a placeholder — actual implementation depends on PDF library chosen
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt-${receiptData.receipt_number}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).text(receiptData.school_name, { align: 'center' });
    doc.fontSize(10).text(receiptData.school_address, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('FEE RECEIPT', { align: 'center', underline: true });
    doc.moveDown();

    // Receipt details
    doc.fontSize(10);
    doc.text(`Receipt No: ${receiptData.receipt_number}`);
    doc.text(`Date: ${new Date(receiptData.collection_date).toLocaleDateString('en-IN')}`);
    doc.text(`Student: ${receiptData.student_name} (${receiptData.admission_number})`);
    doc.text(`Father's Name: ${receiptData.father_name || 'N/A'}`);
    doc.text(`Class: ${receiptData.class_name} - ${receiptData.section_name}`);
    doc.text(`Payment Mode: ${receiptData.payment_mode.toUpperCase()}`);
    doc.moveDown();

    // Fee heads table
    doc.text('Fee Details:', { underline: true });
    receiptData.fee_heads.forEach(head => {
      doc.text(`  ${head.fee_head_name}: ₹${parseFloat(head.amount).toFixed(2)}`);
    });

    if (receiptData.late_fee_amount > 0) {
      doc.text(`  Late Fee: ₹${parseFloat(receiptData.late_fee_amount).toFixed(2)}`);
    }

    doc.moveDown();
    doc.fontSize(12).text(`Total: ₹${parseFloat(receiptData.total_amount).toFixed(2)}`, { bold: true });
    doc.moveDown(2);
    doc.fontSize(9).text(`Collected by: ${receiptData.collected_by_name}`, { align: 'right' });

    doc.end();
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate receipt PDF', details: error.message }
    });
  }
});

/**
 * #153 POST /fee-collections/:id/cancel
 * Cancel receipt
 * Auth: Admin
 */
router.post('/:id/cancel', requireRole('fee_collections.cancel'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Cancellation reason is required' }
      });
    }

    await client.query('BEGIN');

    // Fetch the collection
    const collectionResult = await client.query(
      'SELECT * FROM fee_collections WHERE id = $1 AND school_id = $2',
      [id, req.user.school_id]
    );

    if (collectionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Fee collection record not found' }
      });
    }

    const collection = collectionResult.rows[0];

    if (collection.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CANCELLED', message: 'This receipt is already cancelled' }
      });
    }

    // Check if day is closed
    const closureCheck = await client.query(
      'SELECT id FROM day_closures WHERE closure_date = $1 AND school_id = $2',
      [collection.collection_date, req.user.school_id]
    );

    if (closureCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { code: 'DAY_CLOSED', message: 'Cannot cancel receipt. Day has been closed.' }
      });
    }

    // Cancel the collection
    await client.query(
      `UPDATE fee_collections SET status = 'cancelled', cancellation_reason = $1, 
       cancelled_by = $2, cancelled_at = NOW() WHERE id = $3`,
      [reason, req.user.id, id]
    );

    // Reverse student fee allocation
    await client.query(
      `UPDATE student_fee_allocations SET paid_amount = paid_amount - $1, updated_at = NOW()
       WHERE student_id = $2 AND fee_structure_id = $3`,
      [collection.total_amount, collection.student_id, collection.fee_structure_id]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: { id: parseInt(id), status: 'cancelled', cancellation_reason: reason },
      message: 'Receipt cancelled successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling receipt:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to cancel receipt', details: error.message }
    });
  } finally {
    client.release();
  }
});

/**
 * #154 GET /fee-collections/student/:student_id
 * Fee history for student
 * Auth: Any authenticated user
 */
router.get('/student/:student_id', requireRole('fee_collections.view'), async (req, res) => {
  try {
    const { student_id } = req.params;
    const { page = 1, limit = 20, academic_year_id, status } = req.query;

    const offset = (page - 1) * limit;
    const params = [student_id, req.user.school_id];
    let paramIndex = 3;
    const conditions = ['fc.student_id = $1', 'fc.school_id = $2'];

    if (academic_year_id) {
      conditions.push(`fc.academic_year_id = $${paramIndex++}`);
      params.push(academic_year_id);
    }
    if (status) {
      conditions.push(`fc.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM fee_collections fc ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT fc.id, fc.receipt_number, fc.collection_date, fc.amount, fc.late_fee_amount,
             fc.total_amount, fc.payment_mode, fc.status, fc.remarks,
             c.name as class_name, sec.name as section_name,
             u.name as collected_by_name
      FROM fee_collections fc
      LEFT JOIN classes c ON fc.class_id = c.id
      LEFT JOIN sections sec ON fc.section_id = sec.id
      LEFT JOIN users u ON fc.collected_by = u.id
      ${whereClause}
      ORDER BY fc.collection_date DESC, fc.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    // Get total paid
    const totalPaidResult = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_paid
       FROM fee_collections fc ${whereClause} AND fc.status = 'completed'`,
      params.slice(0, paramIndex - 2) // exclude limit/offset params
    );

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Student fee history retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        total_paid: parseFloat(totalPaidResult.rows[0].total_paid)
      }
    });
  } catch (error) {
    console.error('Error fetching student fee history:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve student fee history', details: error.message }
    });
  }
});

/**
 * #155 GET /fee-collections/student/:student_id/outstanding
 * Outstanding fees for student
 * Auth: Any authenticated user
 */
router.get('/student/:student_id/outstanding', requireRole('fee_collections.view'), async (req, res) => {
  try {
    const { student_id } = req.params;
    const { academic_year_id } = req.query;

    const params = [student_id, req.user.school_id];
    let paramIndex = 3;
    let yearCondition = '';

    if (academic_year_id) {
      yearCondition = `AND sfa.academic_year_id = $${paramIndex++}`;
      params.push(academic_year_id);
    }

    const query = `
      SELECT sfa.id, sfa.fee_structure_id, sfa.total_amount, sfa.paid_amount,
             sfa.concession_amount, 
             (sfa.total_amount - sfa.paid_amount - COALESCE(sfa.concession_amount, 0)) as outstanding_amount,
             fs.name as fee_structure_name,
             fh.name as fee_head_name, fh.id as fee_head_id,
             ay.name as academic_year_name,
             sfa.due_date,
             CASE WHEN sfa.due_date < CURRENT_DATE AND (sfa.total_amount - sfa.paid_amount - COALESCE(sfa.concession_amount, 0)) > 0 
                  THEN true ELSE false END as is_overdue
      FROM student_fee_allocations sfa
      LEFT JOIN fee_structures fs ON sfa.fee_structure_id = fs.id
      LEFT JOIN fee_heads fh ON sfa.fee_head_id = fh.id
      LEFT JOIN academic_years ay ON sfa.academic_year_id = ay.id
      WHERE sfa.student_id = $1 AND sfa.school_id = $2
        AND (sfa.total_amount - sfa.paid_amount - COALESCE(sfa.concession_amount, 0)) > 0
        ${yearCondition}
      ORDER BY sfa.due_date ASC
    `;

    const result = await pool.query(query, params);

    // Calculate summary
    const totalOutstanding = result.rows.reduce((sum, row) => sum + parseFloat(row.outstanding_amount), 0);
    const overdueAmount = result.rows
      .filter(row => row.is_overdue)
      .reduce((sum, row) => sum + parseFloat(row.outstanding_amount), 0);

    // Calculate late fee if applicable
    const lateFeeQuery = `
      SELECT lfr.* FROM late_fee_rules lfr
      WHERE lfr.school_id = $1 AND lfr.is_active = true
      ORDER BY lfr.days_after_due ASC
    `;
    const lateFeeResult = await pool.query(lateFeeQuery, [req.user.school_id]);

    let lateFeeApplicable = 0;
    if (lateFeeResult.rows.length > 0) {
      result.rows.forEach(alloc => {
        if (alloc.is_overdue && alloc.due_date) {
          const daysOverdue = Math.floor((new Date() - new Date(alloc.due_date)) / (1000 * 60 * 60 * 24));
          const applicableRule = lateFeeResult.rows
            .filter(rule => daysOverdue >= rule.days_after_due)
            .pop();
          if (applicableRule) {
            if (applicableRule.fee_type === 'fixed') {
              lateFeeApplicable += parseFloat(applicableRule.amount);
            } else {
              lateFeeApplicable += (parseFloat(alloc.outstanding_amount) * parseFloat(applicableRule.percentage)) / 100;
            }
          }
        }
      });
    }

    return res.json({
      success: true,
      data: result.rows,
      message: 'Outstanding fees retrieved successfully',
      meta: {
        total_outstanding: totalOutstanding,
        overdue_amount: overdueAmount,
        late_fee_applicable: lateFeeApplicable,
        total_payable: totalOutstanding + lateFeeApplicable,
        items_count: result.rows.length
      }
    });
  } catch (error) {
    console.error('Error fetching outstanding fees:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve outstanding fees', details: error.message }
    });
  }
});

module.exports = router;
