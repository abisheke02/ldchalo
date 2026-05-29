const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/books', authenticate, async (req, res, next) => {
  try {
    const { search } = req.query;
    let q = `SELECT b.*, sub.name AS subject_name FROM books b LEFT JOIN subjects sub ON sub.id = b.subject_id WHERE b.school_id=$1`;
    const params = [req.user.school_id];
    if (search) { params.push(`%${search}%`); q += ` AND (b.title ILIKE $${params.length} OR b.author ILIKE $${params.length} OR b.isbn ILIKE $${params.length})`; }
    q += ' ORDER BY b.title';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/books', authenticate, authorize('school_admin'), async (req, res, next) => {
  try {
    const { isbn, title, author, publisher, subject_id, total_copies, location } = req.body;
    const { rows: [book] } = await pool.query(
      `INSERT INTO books (school_id, isbn, title, author, publisher, subject_id, total_copies, available_copies, location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8) RETURNING *`,
      [req.user.school_id, isbn, title, author, publisher, subject_id, total_copies || 1, location]
    );
    res.status(201).json(book);
  } catch (err) { next(err); }
});

router.post('/issue', authenticate, authorize('school_admin', 'teacher'), async (req, res, next) => {
  try {
    const { book_id, student_id, due_days } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [book] } = await client.query('SELECT * FROM books WHERE id=$1 FOR UPDATE', [book_id]);
      if (book.available_copies < 1) throw Object.assign(new Error('No copies available'), { status: 400 });
      const due_date = new Date(); due_date.setDate(due_date.getDate() + (due_days || 14));
      const { rows: [issue] } = await client.query(
        `INSERT INTO book_issues (school_id, book_id, student_id, issued_by, due_date)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.user.school_id, book_id, student_id, req.user.sub, due_date.toISOString().slice(0, 10)]
      );
      await client.query(`UPDATE books SET available_copies = available_copies - 1 WHERE id=$1`, [book_id]);
      await client.query('COMMIT');
      res.status(201).json(issue);
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (err) { next(err); }
});

router.post('/return/:issue_id', authenticate, authorize('school_admin', 'teacher'), async (req, res, next) => {
  try {
    const { rows: [issue] } = await pool.query('SELECT * FROM book_issues WHERE id=$1', [req.params.issue_id]);
    const today = new Date();
    const due = new Date(issue.due_date);
    const overdue_days = Math.max(0, Math.floor((today - due) / 86400000));
    const fine = overdue_days * 2; // Rs 2/day
    await pool.query(
      `UPDATE book_issues SET return_date=CURRENT_DATE, status='returned', fine_amount=$1 WHERE id=$2`,
      [fine, issue.id]
    );
    await pool.query(`UPDATE books SET available_copies = available_copies + 1 WHERE id=$1`, [issue.book_id]);
    res.json({ returned: true, fine_amount: fine, overdue_days });
  } catch (err) { next(err); }
});

module.exports = router;
