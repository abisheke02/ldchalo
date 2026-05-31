/**
 * @fileoverview PDF Generation Service using PDFKit
 * @description Generates PDF documents for:
 * - Fee receipts
 * - Transfer Certificates (TC)
 * - Bonafide Certificates
 * - Progress Cards / Report Cards
 * 
 * Each function returns a Buffer that can be streamed to response or saved to disk.
 * 
 * @module services/pdf.service
 */

'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Default PDF configuration
 * @constant {Object}
 */
const PDF_CONFIG = {
  defaultFont: 'Helvetica',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  colors: {
    primary: '#2c3e50',
    secondary: '#7f8c8d',
    accent: '#3498db',
    border: '#bdc3c7',
    lightBg: '#ecf0f1',
  },
  pageSize: 'A4',
};

/**
 * Converts a number to words (Indian numbering system)
 * @param {number} num - Number to convert
 * @returns {string} Number in words
 */
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));

  let words = '';

  if (Math.floor(num / 10000000) > 0) {
    words += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }
  if (Math.floor(num / 100000) > 0) {
    words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }
  if (Math.floor(num / 1000) > 0) {
    words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  if (Math.floor(num / 100) > 0) {
    words += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num > 0) {
    if (num < 20) {
      words += ones[num];
    } else {
      words += tens[Math.floor(num / 10)];
      if (num % 10 > 0) words += '-' + ones[num % 10];
    }
  }

  return words.trim();
}

/**
 * Formats a date to DD/MM/YYYY format
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount (e.g., "₹15,000.00")
 */
function formatCurrency(amount) {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Adds school header to PDF (logo, name, address)
 * @param {PDFDocument} doc - PDFKit document instance
 * @param {Object} school - School data
 */
function addSchoolHeader(doc, school) {
  const startY = doc.y;

  // School logo (if exists)
  if (school.logo_path && fs.existsSync(school.logo_path)) {
    doc.image(school.logo_path, 50, startY, { width: 60, height: 60 });
    doc.moveDown(0.5);
  }

  // School name
  const textX = school.logo_path && fs.existsSync(school.logo_path) ? 120 : 50;
  doc.fontSize(16)
    .font('Helvetica-Bold')
    .fillColor(PDF_CONFIG.colors.primary)
    .text(school.name || 'School Name', textX, startY, { align: school.logo_path ? 'left' : 'center' });

  // School address
  doc.fontSize(9)
    .font('Helvetica')
    .fillColor(PDF_CONFIG.colors.secondary);

  if (school.address) {
    doc.text(school.address, textX, doc.y, { align: school.logo_path ? 'left' : 'center' });
  }

  const contactParts = [];
  if (school.phone) contactParts.push(`Phone: ${school.phone}`);
  if (school.email) contactParts.push(`Email: ${school.email}`);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(' | '), textX, doc.y, { align: school.logo_path ? 'left' : 'center' });
  }

  if (school.affiliation_number) {
    doc.text(`Affiliation No: ${school.affiliation_number}`, textX, doc.y, { align: school.logo_path ? 'left' : 'center' });
  }

  // Divider line
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .strokeColor(PDF_CONFIG.colors.border)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.5);
}

/**
 * Generates a Fee Receipt PDF
 * 
 * @param {Object} collectionData - Fee collection data
 * @param {Object} collectionData.school - School information
 * @param {Object} collectionData.student - Student information
 * @param {Object} collectionData.receipt - Receipt details
 * @param {Array} collectionData.fee_items - Array of fee items collected
 * @returns {Promise<Buffer>} PDF document as Buffer
 * 
 * @example
 * const pdfBuffer = await generateFeeReceipt({
 *   school: { name: 'DAV Public School', address: '123 Main St', phone: '011-12345678' },
 *   student: { name: 'Rahul Sharma', class: 'X-A', admission_number: 'ADM/2025/0042' },
 *   receipt: { number: 'REC/2026/001234', date: '2026-05-29', payment_mode: 'Cash' },
 *   fee_items: [
 *     { head: 'Tuition Fee', amount: 5000 },
 *     { head: 'Computer Fee', amount: 500 },
 *   ]
 * });
 */
async function generateFeeReceipt(collectionData) {
  return new Promise((resolve, reject) => {
    try {
      const { school, student, receipt, fee_items } = collectionData;
      const doc = new PDFDocument({
        size: PDF_CONFIG.pageSize,
        margins: PDF_CONFIG.margins,
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ─── Header ───
      addSchoolHeader(doc, school);

      // ─── Title ───
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(PDF_CONFIG.colors.primary)
        .text('FEE RECEIPT', { align: 'center' });
      doc.moveDown(0.5);

      // ─── Receipt Info ───
      const infoStartY = doc.y;
      doc.fontSize(10).font('Helvetica');

      // Left column
      doc.fillColor('#333')
        .text(`Receipt No: `, 50, infoStartY, { continued: true })
        .font('Helvetica-Bold')
        .text(receipt.number || 'N/A');
      doc.font('Helvetica')
        .text(`Student: `, 50, doc.y, { continued: true })
        .font('Helvetica-Bold')
        .text(student.name || 'N/A');
      doc.font('Helvetica')
        .text(`Class: ${student.class || 'N/A'}`, 50);
      doc.text(`Adm. No: ${student.admission_number || 'N/A'}`, 50);

      // Right column
      doc.font('Helvetica')
        .text(`Date: ${formatDate(receipt.date)}`, 350, infoStartY);
      doc.text(`Mode: ${receipt.payment_mode || 'Cash'}`, 350);
      if (receipt.cheque_number) {
        doc.text(`Cheque/Ref: ${receipt.cheque_number}`, 350);
      }
      if (receipt.transaction_id) {
        doc.text(`Txn ID: ${receipt.transaction_id}`, 350);
      }

      doc.moveDown(1);

      // ─── Fee Items Table ───
      const tableTop = doc.y;
      const colWidths = { sno: 40, head: 250, amount: 100 };
      const tableWidth = 495;

      // Table header
      doc.rect(50, tableTop, tableWidth, 25)
        .fillColor(PDF_CONFIG.colors.lightBg)
        .fill();

      doc.fillColor(PDF_CONFIG.colors.primary)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('S.No', 55, tableTop + 7)
        .text('Fee Head', 95, tableTop + 7)
        .text('Amount (₹)', 395, tableTop + 7, { width: colWidths.amount, align: 'right' });

      let yPos = tableTop + 30;
      let totalAmount = 0;
      let totalConcession = 0;
      let totalLateFee = 0;

      // Table rows
      doc.font('Helvetica').fillColor('#333');
      fee_items.forEach((item, index) => {
        const itemAmount = Number(item.amount) || 0;
        const concession = Number(item.concession_amount) || 0;
        const lateFee = Number(item.late_fee) || 0;
        const netAmount = itemAmount - concession + lateFee;

        doc.text(String(index + 1), 55, yPos)
          .text(item.head || item.fee_head_name || 'Fee', 95, yPos)
          .text(formatCurrency(netAmount), 395, yPos, { width: colWidths.amount, align: 'right' });

        totalAmount += itemAmount;
        totalConcession += concession;
        totalLateFee += lateFee;
        yPos += 22;

        // Row separator
        doc.moveTo(50, yPos - 5).lineTo(545, yPos - 5)
          .strokeColor('#eee').lineWidth(0.5).stroke();
      });

      // ─── Totals ───
      const grandTotal = totalAmount - totalConcession + totalLateFee;
      yPos += 5;

      doc.moveTo(50, yPos).lineTo(545, yPos)
        .strokeColor(PDF_CONFIG.colors.border).lineWidth(1).stroke();
      yPos += 10;

      if (totalConcession > 0) {
        doc.fontSize(9).text('Concession:', 95, yPos)
          .text(`- ${formatCurrency(totalConcession)}`, 395, yPos, { width: colWidths.amount, align: 'right' });
        yPos += 18;
      }
      if (totalLateFee > 0) {
        doc.fontSize(9).text('Late Fee:', 95, yPos)
          .text(`+ ${formatCurrency(totalLateFee)}`, 395, yPos, { width: colWidths.amount, align: 'right' });
        yPos += 18;
      }

      doc.rect(50, yPos, tableWidth, 28)
        .fillColor(PDF_CONFIG.colors.lightBg).fill();

      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(PDF_CONFIG.colors.primary)
        .text('TOTAL', 95, yPos + 7)
        .text(formatCurrency(grandTotal), 395, yPos + 7, { width: colWidths.amount, align: 'right' });

      yPos += 35;

      // Amount in words
      doc.fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#555')
        .text(`Amount in words: Rupees ${numberToWords(Math.round(grandTotal))} Only`, 50, yPos);

      // ─── Footer ───
      yPos += 40;
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor(PDF_CONFIG.colors.secondary)
        .text('Note: This is a computer-generated receipt and does not require a signature.', 50, yPos, { align: 'center' });

      yPos += 30;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#333')
        .text('Authorized Signatory', 380, yPos);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generates a Transfer Certificate (TC) PDF
 * 
 * @param {Object} tcData - TC data
 * @param {Object} tcData.school - School information
 * @param {Object} tcData.student - Student details
 * @param {Object} tcData.tc - TC specific fields
 * @returns {Promise<Buffer>} PDF document as Buffer
 * 
 * @example
 * const pdfBuffer = await generateTC({
 *   school: { name: 'DAV Public School', address: '...' },
 *   student: { name: 'Rahul Sharma', father_name: 'Mr. Amit Sharma', ... },
 *   tc: { number: 'TC/2026/0045', date_of_issue: '2026-05-29', ... }
 * });
 */
async function generateTC(tcData) {
  return new Promise((resolve, reject) => {
    try {
      const { school, student, tc } = tcData;
      const doc = new PDFDocument({
        size: PDF_CONFIG.pageSize,
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ─── Header ───
      addSchoolHeader(doc, school);
      doc.moveDown(0.3);

      // ─── Title ───
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(PDF_CONFIG.colors.primary)
        .text('TRANSFER CERTIFICATE', { align: 'center' });
      doc.moveDown(0.3);

      // TC Number and Book Number
      doc.fontSize(10).font('Helvetica').fillColor('#333');
      doc.text(`TC No: ${tc.number || 'N/A'}`, 60, doc.y);
      doc.text(`Book No: ${tc.book_number || ''}`, 400, doc.y - 14);
      doc.moveDown(0.5);

      // ─── TC Details (Serial numbered items) ───
      const items = [
        { label: 'Name of the Student', value: student.name },
        { label: "Father's Name / Guardian's Name", value: student.father_name || student.guardian_name },
        { label: "Mother's Name", value: student.mother_name || '' },
        { label: 'Nationality', value: student.nationality || 'Indian' },
        { label: 'Religion / Caste / Community', value: [student.religion, student.caste, student.community].filter(Boolean).join(' / ') },
        { label: 'Date of Birth (in figures)', value: formatDate(student.date_of_birth) },
        { label: 'Date of Birth (in words)', value: tc.dob_in_words || '' },
        { label: 'Date of Admission in School', value: formatDate(student.admission_date) },
        { label: 'Class in which admitted', value: student.admission_class || '' },
        { label: 'Class from which leaving', value: tc.leaving_class || '' },
        { label: 'School Board/Exam passed with year', value: tc.last_exam_passed || '' },
        { label: 'Subject studied', value: tc.subjects_studied || '' },
        { label: 'Whether fee has been paid', value: tc.fees_paid ? 'Yes' : 'No, Dues: ₹' + (tc.fee_dues || 0) },
        { label: 'Total Working Days', value: String(tc.total_working_days || '') },
        { label: 'Total Days Present', value: String(tc.total_days_present || '') },
        { label: 'Whether NCC/Scout/Guide', value: tc.ncc_scout || 'N/A' },
        { label: 'Games played / Extra-curricular activities', value: tc.extra_curricular || 'N/A' },
        { label: 'General Conduct', value: tc.conduct || 'Good' },
        { label: 'Date of Application for TC', value: tc.application_date ? formatDate(tc.application_date) : '' },
        { label: 'Date of Issue of Certificate', value: tc.date_of_issue ? formatDate(tc.date_of_issue) : '' },
        { label: 'Reason for leaving', value: tc.reason || 'As per request' },
        { label: 'Remarks', value: tc.remarks || '' },
      ];

      doc.fontSize(10).font('Helvetica');
      let yPosition = doc.y;

      items.forEach((item, index) => {
        const lineHeight = 20;
        if (yPosition > doc.page.height - 100) {
          doc.addPage();
          yPosition = 50;
        }

        // Serial number and label
        doc.fillColor('#333')
          .font('Helvetica')
          .text(`${index + 1}.`, 60, yPosition, { width: 25 });
        doc.text(item.label, 85, yPosition, { width: 220 });

        // Value
        doc.font('Helvetica-Bold')
          .text(`: ${item.value || ''}`, 310, yPosition, { width: 220 });

        yPosition += lineHeight + 2;
      });

      // ─── Signatures ───
      yPosition += 30;
      if (yPosition > doc.page.height - 80) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(10).font('Helvetica').fillColor('#333');
      doc.text('Class Teacher', 60, yPosition);
      doc.text('Checked by', 230, yPosition);
      doc.text('Principal', 420, yPosition);

      // Date
      yPosition += 40;
      doc.fontSize(9).fillColor(PDF_CONFIG.colors.secondary);
      doc.text(`Date: ${formatDate(tc.date_of_issue || new Date())}`, 60, yPosition);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generates a Bonafide Certificate PDF
 * 
 * @param {Object} studentData - Student and school data
 * @param {Object} studentData.school - School information
 * @param {Object} studentData.student - Student details
 * @param {Object} [studentData.certificate] - Certificate metadata
 * @returns {Promise<Buffer>} PDF document as Buffer
 * 
 * @example
 * const pdfBuffer = await generateBonafide({
 *   school: { name: 'DAV Public School', ... },
 *   student: { name: 'Rahul Sharma', class: 'X-A', father_name: 'Mr. Sharma', dob: '2010-05-15' },
 *   certificate: { number: 'BON/2026/0012', purpose: 'Bank Account Opening' }
 * });
 */
async function generateBonafide(studentData) {
  return new Promise((resolve, reject) => {
    try {
      const { school, student, certificate = {} } = studentData;
      const doc = new PDFDocument({
        size: PDF_CONFIG.pageSize,
        margins: { top: 60, bottom: 60, left: 70, right: 70 },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ─── Header ───
      addSchoolHeader(doc, school);
      doc.moveDown(1);

      // ─── Title ───
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(PDF_CONFIG.colors.primary)
        .text('BONAFIDE CERTIFICATE', { align: 'center', underline: true });
      doc.moveDown(0.5);

      // Certificate number and date
      doc.fontSize(10).font('Helvetica').fillColor('#555');
      doc.text(`Ref No: ${certificate.number || 'N/A'}`, 70, doc.y);
      doc.text(`Date: ${formatDate(certificate.date || new Date())}`, 400, doc.y - 14);
      doc.moveDown(1.5);

      // ─── Body ───
      const pronoun = student.gender === 'female' ? 'her' : 'his';
      const pronounCap = student.gender === 'female' ? 'Her' : 'His';
      const childOf = student.gender === 'female' ? 'daughter' : 'son';

      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#333')
        .text(
          `This is to certify that `,
          { continued: true, lineGap: 8 }
        )
        .font('Helvetica-Bold')
        .text(student.name || 'Student Name', { continued: true })
        .font('Helvetica')
        .text(
          `, ${childOf} of `,
          { continued: true }
        )
        .font('Helvetica-Bold')
        .text(student.father_name || 'Father Name', { continued: true })
        .font('Helvetica')
        .text(
          `, is a bonafide student of this school. ${pronounCap} date of birth as per our school records is `,
          { continued: true }
        )
        .font('Helvetica-Bold')
        .text(
          student.date_of_birth ? formatDate(student.date_of_birth) : 'DD/MM/YYYY',
          { continued: true }
        )
        .font('Helvetica')
        .text(
          `. ${pronounCap} is currently studying in class `,
          { continued: true }
        )
        .font('Helvetica-Bold')
        .text(student.class || 'Class', { continued: true })
        .font('Helvetica')
        .text(
          ` during the academic year ${student.academic_year || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)}.`
        );

      doc.moveDown(1);

      if (certificate.purpose) {
        doc.font('Helvetica')
          .text(`This certificate is issued on ${pronoun} request for the purpose of `)
          .font('Helvetica-Bold')
          .text(certificate.purpose, { continued: true })
          .font('Helvetica')
          .text('.');
      } else {
        doc.text(`This certificate is issued on ${pronoun} request.`);
      }

      doc.moveDown(1);
      doc.font('Helvetica')
        .text(`We wish ${student.gender === 'female' ? 'her' : 'him'} all the best in ${pronoun} future endeavours.`);

      // ─── Signature ───
      doc.moveDown(4);
      doc.fontSize(11)
        .font('Helvetica-Bold')
        .text('Principal', 400, doc.y);
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#555')
        .text(school.name || '', 400);

      // ─── Footer note ───
      const footerY = doc.page.height - 80;
      doc.fontSize(8)
        .font('Helvetica-Oblique')
        .fillColor(PDF_CONFIG.colors.secondary)
        .text(
          'Note: This certificate is issued based on the records available in the school. No correction/alteration is permissible.',
          70,
          footerY,
          { align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generates a Progress Card / Report Card PDF
 * 
 * @param {Object} examData - Exam and student data
 * @param {Object} examData.school - School information
 * @param {Object} examData.student - Student details
 * @param {Object} examData.academic_year - Academic year info
 * @param {Array} examData.exams - Array of exam results with subjects
 * @param {Object} [examData.attendance] - Attendance summary
 * @param {Object} [examData.remarks] - Teacher/principal remarks
 * @returns {Promise<Buffer>} PDF document as Buffer
 * 
 * @example
 * const pdfBuffer = await generateProgressCard({
 *   school: { name: 'DAV Public School', ... },
 *   student: { name: 'Rahul Sharma', class: 'X-A', roll: '12' },
 *   academic_year: { name: '2025-2026' },
 *   exams: [
 *     { name: 'FA-1', subjects: [{ name: 'Mathematics', marks: 85, max_marks: 100 }, ...] },
 *     { name: 'SA-1', subjects: [{ name: 'Mathematics', marks: 78, max_marks: 100 }, ...] },
 *   ],
 *   attendance: { total_days: 220, present: 205 },
 *   remarks: { teacher: 'Good student', principal: 'Keep it up' }
 * });
 */
async function generateProgressCard(examData) {
  return new Promise((resolve, reject) => {
    try {
      const { school, student, academic_year, exams, attendance, remarks } = examData;
      const doc = new PDFDocument({
        size: PDF_CONFIG.pageSize,
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ─── Header ───
      addSchoolHeader(doc, school);

      // ─── Title ───
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(PDF_CONFIG.colors.primary)
        .text('PROGRESS REPORT', { align: 'center' });
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(PDF_CONFIG.colors.secondary)
        .text(`Academic Year: ${academic_year?.name || ''}`, { align: 'center' });
      doc.moveDown(0.5);

      // ─── Student Info ───
      const infoY = doc.y;
      doc.fontSize(10).font('Helvetica').fillColor('#333');
      doc.text(`Name: ${student.name}`, 40, infoY);
      doc.text(`Class: ${student.class || ''}`, 300, infoY);
      doc.text(`Adm. No: ${student.admission_number || ''}`, 40, infoY + 16);
      doc.text(`Roll No: ${student.roll_number || ''}`, 300, infoY + 16);
      doc.moveDown(1.5);

      // ─── Marks Table ───
      if (exams && exams.length > 0) {
        // Collect all unique subjects
        const allSubjects = [...new Set(exams.flatMap((e) => e.subjects.map((s) => s.name)))];

        // Table dimensions
        const tableLeft = 40;
        const subjectColWidth = 130;
        const examColWidth = Math.min(70, (515 - subjectColWidth - 70) / exams.length);
        const totalColWidth = 70;
        let tableY = doc.y;

        // Table header row
        const headerHeight = 30;
        doc.rect(tableLeft, tableY, 515, headerHeight)
          .fillColor(PDF_CONFIG.colors.lightBg).fill();

        doc.fillColor(PDF_CONFIG.colors.primary)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Subject', tableLeft + 5, tableY + 9, { width: subjectColWidth });

        exams.forEach((exam, i) => {
          const xPos = tableLeft + subjectColWidth + (i * examColWidth);
          doc.text(exam.name, xPos, tableY + 3, { width: examColWidth, align: 'center' });
          doc.fontSize(7).font('Helvetica')
            .text(`(${exam.max_marks || 100})`, xPos, tableY + 16, { width: examColWidth, align: 'center' });
          doc.fontSize(9).font('Helvetica-Bold');
        });

        doc.text('Total', tableLeft + subjectColWidth + (exams.length * examColWidth), tableY + 9,
          { width: totalColWidth, align: 'center' });

        tableY += headerHeight + 2;

        // Subject rows
        doc.font('Helvetica').fontSize(9).fillColor('#333');
        allSubjects.forEach((subject, idx) => {
          if (tableY > doc.page.height - 100) {
            doc.addPage();
            tableY = 50;
          }

          // Alternate row background
          if (idx % 2 === 0) {
            doc.rect(tableLeft, tableY - 2, 515, 20)
              .fillColor('#f9f9f9').fill();
            doc.fillColor('#333');
          }

          doc.text(subject, tableLeft + 5, tableY + 2, { width: subjectColWidth });

          let subjectTotal = 0;
          let maxTotal = 0;

          exams.forEach((exam, i) => {
            const subjectResult = exam.subjects.find((s) => s.name === subject);
            const marks = subjectResult ? subjectResult.marks : '-';
            const maxMarks = subjectResult ? (subjectResult.max_marks || 100) : 0;
            const xPos = tableLeft + subjectColWidth + (i * examColWidth);

            doc.text(
              subjectResult?.is_absent ? 'AB' : String(marks),
              xPos, tableY + 2,
              { width: examColWidth, align: 'center' }
            );

            if (typeof marks === 'number') {
              subjectTotal += marks;
              maxTotal += maxMarks;
            }
          });

          // Total column
          doc.font('Helvetica-Bold')
            .text(`${subjectTotal}/${maxTotal}`,
              tableLeft + subjectColWidth + (exams.length * examColWidth), tableY + 2,
              { width: totalColWidth, align: 'center' });
          doc.font('Helvetica');

          tableY += 20;
        });

        // Grand total row
        tableY += 5;
        doc.moveTo(tableLeft, tableY).lineTo(tableLeft + 515, tableY)
          .strokeColor(PDF_CONFIG.colors.border).lineWidth(1).stroke();
        tableY += 8;

        doc.font('Helvetica-Bold').fillColor(PDF_CONFIG.colors.primary);
        doc.text('Grand Total / Percentage', tableLeft + 5, tableY);

        // Calculate grand totals
        let grandTotal = 0;
        let grandMax = 0;
        allSubjects.forEach((subject) => {
          exams.forEach((exam) => {
            const subjectResult = exam.subjects.find((s) => s.name === subject);
            if (subjectResult && typeof subjectResult.marks === 'number') {
              grandTotal += subjectResult.marks;
              grandMax += subjectResult.max_marks || 100;
            }
          });
        });

        const percentage = grandMax > 0 ? ((grandTotal / grandMax) * 100).toFixed(2) : '0.00';
        doc.text(
          `${grandTotal}/${grandMax} (${percentage}%)`,
          tableLeft + subjectColWidth + (exams.length * examColWidth), tableY,
          { width: totalColWidth + 50, align: 'center' }
        );

        doc.y = tableY + 25;
      }

      // ─── Attendance ───
      if (attendance) {
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#333')
          .text('Attendance Summary:');
        doc.fontSize(9).font('Helvetica')
          .text(`Total Working Days: ${attendance.total_days || 0}  |  Days Present: ${attendance.present || 0}  |  Percentage: ${attendance.total_days ? ((attendance.present / attendance.total_days) * 100).toFixed(1) : 0}%`);
      }

      // ─── Remarks ───
      if (remarks) {
        doc.moveDown(0.5);
        if (remarks.teacher) {
          doc.fontSize(9).font('Helvetica-Bold').text("Class Teacher's Remarks: ", { continued: true })
            .font('Helvetica').text(remarks.teacher);
        }
        if (remarks.principal) {
          doc.fontSize(9).font('Helvetica-Bold').text("Principal's Remarks: ", { continued: true })
            .font('Helvetica').text(remarks.principal);
        }
      }

      // ─── Signatures ───
      doc.moveDown(2);
      const sigY = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor('#333');
      doc.text('Class Teacher', 40, sigY);
      doc.text('Parent/Guardian', 220, sigY);
      doc.text('Principal', 430, sigY);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateFeeReceipt,
  generateTC,
  generateBonafide,
  generateProgressCard,
  // Utilities exported for custom PDF generation
  addSchoolHeader,
  formatDate,
  formatCurrency,
  numberToWords,
  PDF_CONFIG,
};
