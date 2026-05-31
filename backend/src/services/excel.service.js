/**
 * @fileoverview Excel Import/Export Service using ExcelJS
 * @description Provides Excel file generation and parsing for bulk data operations.
 * Supports:
 * - Exporting data to formatted XLSX files with auto-sizing, filters, and styling
 * - Importing data from XLSX/CSV files with column mapping
 * - Validating imported data against schemas
 * 
 * @module services/excel.service
 */

'use strict';

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Default export styling configuration
 * @constant {Object}
 */
const STYLE_CONFIG = {
  headerFont: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
  headerFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } },
  headerAlignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  headerBorder: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
  dataFont: { size: 10 },
  dataAlignment: { vertical: 'middle', wrapText: true },
  dataBorder: {
    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  },
  alternateRowFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } },
};

/**
 * Exports data to an Excel (XLSX) file
 * 
 * @param {Array<Object>} data - Array of data objects to export
 * @param {Array<Object>} columns - Column definitions
 * @param {string} columns[].header - Column header display text
 * @param {string} columns[].key - Object property key to extract data from
 * @param {number} [columns[].width] - Column width (auto-calculated if not provided)
 * @param {string} [columns[].type] - Data type: 'string', 'number', 'date', 'currency', 'boolean'
 * @param {Function} [columns[].formatter] - Custom value formatter function
 * @param {string} [sheetName='Sheet1'] - Worksheet name
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.title] - Title row above headers
 * @param {boolean} [options.autoFilter=true] - Enable auto-filter on headers
 * @param {boolean} [options.freezeHeader=true] - Freeze header row
 * @param {string} [options.outputPath] - File path to save (returns buffer if not provided)
 * @param {Object} [options.metadata] - Workbook metadata (creator, company, etc.)
 * @returns {Promise<Buffer|string>} Excel file buffer or file path if outputPath specified
 * 
 * @example
 * const buffer = await exportToExcel(
 *   students,
 *   [
 *     { header: 'Admission No', key: 'admission_number', width: 15 },
 *     { header: 'Student Name', key: 'name', width: 25 },
 *     { header: 'Class', key: 'class_name', width: 10 },
 *     { header: 'Father Name', key: 'father_name', width: 25 },
 *     { header: 'Phone', key: 'phone', width: 15 },
 *     { header: 'Fee Balance', key: 'balance', type: 'currency', width: 15 },
 *   ],
 *   'Students',
 *   { title: 'Student List - Class X', autoFilter: true }
 * );
 * 
 * // Send as download
 * res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 * res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
 * res.send(buffer);
 */
async function exportToExcel(data, columns, sheetName = 'Sheet1', options = {}) {
  try {
    const workbook = new ExcelJS.Workbook();

    // Set metadata
    workbook.creator = options.metadata?.creator || 'Chalo Schools ERP';
    workbook.created = new Date();
    workbook.company = options.metadata?.company || 'Chalo Schools';

    const worksheet = workbook.addWorksheet(sheetName, {
      properties: { defaultRowHeight: 20 },
    });

    // ─── Title Row (optional) ───
    let headerRowNumber = 1;
    if (options.title) {
      worksheet.mergeCells(1, 1, 1, columns.length);
      const titleCell = worksheet.getCell('A1');
      titleCell.value = options.title;
      titleCell.font = { bold: true, size: 14, color: { argb: 'FF2C3E50' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 30;

      // Subtitle row with export date
      worksheet.mergeCells(2, 1, 2, columns.length);
      const subtitleCell = worksheet.getCell('A2');
      subtitleCell.value = `Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`;
      subtitleCell.font = { size: 9, italic: true, color: { argb: 'FF7F8C8D' } };
      subtitleCell.alignment = { horizontal: 'center' };

      headerRowNumber = 4; // Leave a blank row
    }

    // ─── Column Definitions ───
    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || Math.max(col.header.length + 4, 12),
    }));

    // If title exists, we need to set headers manually at the right row
    if (options.title) {
      const headerRow = worksheet.getRow(headerRowNumber);
      columns.forEach((col, index) => {
        headerRow.getCell(index + 1).value = col.header;
      });
      // Remove the auto-generated header in row 1 that ExcelJS adds
      // Re-configure: add data starting after header row
      worksheet.spliceRows(1, headerRowNumber - 1); // This approach can be complex
      // Simpler: just use the worksheet without title if it complicates things
    }

    // ─── Style Header Row ───
    const actualHeaderRow = worksheet.getRow(options.title ? headerRowNumber : 1);
    actualHeaderRow.eachCell((cell) => {
      cell.font = STYLE_CONFIG.headerFont;
      cell.fill = STYLE_CONFIG.headerFill;
      cell.alignment = STYLE_CONFIG.headerAlignment;
      cell.border = STYLE_CONFIG.headerBorder;
    });
    actualHeaderRow.height = 25;

    // ─── Add Data Rows ───
    data.forEach((item, rowIndex) => {
      const rowData = {};
      columns.forEach((col) => {
        let value = item[col.key];

        // Apply custom formatter
        if (col.formatter && typeof col.formatter === 'function') {
          value = col.formatter(value, item);
        }

        // Type-based formatting
        if (col.type === 'date' && value) {
          value = new Date(value);
        } else if (col.type === 'currency' && value != null) {
          value = Number(value);
        } else if (col.type === 'boolean') {
          value = value ? 'Yes' : 'No';
        }

        rowData[col.key] = value ?? '';
      });

      const row = worksheet.addRow(rowData);

      // Style data rows
      row.eachCell((cell, colNumber) => {
        cell.font = STYLE_CONFIG.dataFont;
        cell.alignment = STYLE_CONFIG.dataAlignment;
        cell.border = STYLE_CONFIG.dataBorder;

        // Currency formatting
        const colDef = columns[colNumber - 1];
        if (colDef && colDef.type === 'currency') {
          cell.numFmt = '₹#,##0.00';
        } else if (colDef && colDef.type === 'date') {
          cell.numFmt = 'DD/MM/YYYY';
        }
      });

      // Alternate row coloring
      if (rowIndex % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = STYLE_CONFIG.alternateRowFill;
        });
      }
    });

    // ─── Auto Filter ───
    if (options.autoFilter !== false) {
      const lastCol = columns.length;
      const lastRow = data.length + (options.title ? headerRowNumber : 1);
      const startRow = options.title ? headerRowNumber : 1;
      worksheet.autoFilter = {
        from: { row: startRow, column: 1 },
        to: { row: lastRow, column: lastCol },
      };
    }

    // ─── Freeze Panes ───
    if (options.freezeHeader !== false) {
      const freezeRow = (options.title ? headerRowNumber : 1) + 1;
      worksheet.views = [{ state: 'frozen', ySplit: freezeRow - 1 }];
    }

    // ─── Output ───
    if (options.outputPath) {
      await workbook.xlsx.writeFile(options.outputPath);
      return options.outputPath;
    }

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    console.error('[Excel] Export failed:', error.message);
    throw new Error(`Excel export failed: ${error.message}`);
  }
}

/**
 * Imports data from an Excel or CSV file
 * 
 * @param {string} filePath - Path to the XLSX/CSV file
 * @param {Object} columnMapping - Maps file columns to expected field names
 * @param {Object} [options={}] - Import options
 * @param {number} [options.headerRow=1] - Row number containing headers (1-indexed)
 * @param {number} [options.dataStartRow] - Row to start reading data (defaults to headerRow + 1)
 * @param {string} [options.sheetName] - Specific sheet to read (defaults to first sheet)
 * @param {boolean} [options.skipEmpty=true] - Skip rows where all mapped columns are empty
 * @param {number} [options.maxRows=5000] - Maximum rows to import
 * @returns {Promise<Object>} Import result with parsed rows and metadata
 * 
 * @example
 * const result = await importFromExcel('/path/to/students.xlsx', {
 *   'Student Name': 'name',        // Excel column header -> DB field name
 *   'Father Name': 'father_name',
 *   'Class': 'class_name',
 *   'Date of Birth': 'date_of_birth',
 *   'Phone': 'phone',
 *   'Address': 'address',
 * }, { headerRow: 1 });
 * 
 * // Returns:
 * // {
 * //   success: true,
 * //   rows: [{ name: 'Rahul', father_name: 'Mr. Sharma', ... }, ...],
 * //   totalRows: 150,
 * //   headers: ['Student Name', 'Father Name', ...],
 * //   unmappedColumns: ['Sr No', 'Remarks'],
 * // }
 */
async function importFromExcel(filePath, columnMapping, options = {}) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File not found: ' + filePath };
    }

    if (!columnMapping || Object.keys(columnMapping).length === 0) {
      return { success: false, error: 'Column mapping is required' };
    }

    const workbook = new ExcelJS.Workbook();
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.csv') {
      await workbook.csv.readFile(filePath, {
        dateFormats: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      });
    } else {
      await workbook.xlsx.readFile(filePath);
    }

    // Get worksheet
    let worksheet;
    if (options.sheetName) {
      worksheet = workbook.getWorksheet(options.sheetName);
      if (!worksheet) {
        return { success: false, error: `Sheet "${options.sheetName}" not found` };
      }
    } else {
      worksheet = workbook.worksheets[0];
    }

    if (!worksheet) {
      return { success: false, error: 'No worksheets found in file' };
    }

    // Read headers
    const headerRow = options.headerRow || 1;
    const headerRowData = worksheet.getRow(headerRow);
    const headers = [];
    const headerMap = {}; // Maps column index to field name

    headerRowData.eachCell((cell, colIndex) => {
      const headerValue = String(cell.value || '').trim();
      headers.push(headerValue);

      // Check if this header has a mapping
      if (columnMapping[headerValue]) {
        headerMap[colIndex] = columnMapping[headerValue];
      }
    });

    // Identify unmapped columns
    const mappedHeaders = Object.keys(columnMapping);
    const unmappedColumns = headers.filter((h) => !mappedHeaders.includes(h) && h !== '');

    // Read data rows
    const dataStartRow = options.dataStartRow || headerRow + 1;
    const maxRows = options.maxRows || 5000;
    const rows = [];
    const errors = [];

    for (let rowNum = dataStartRow; rowNum <= worksheet.rowCount && rows.length < maxRows; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowData = {};
      let hasData = false;

      Object.entries(headerMap).forEach(([colIndex, fieldName]) => {
        const cell = row.getCell(Number(colIndex));
        let value = cell.value;

        // Handle ExcelJS rich text objects
        if (value && typeof value === 'object') {
          if (value.richText) {
            value = value.richText.map((rt) => rt.text).join('');
          } else if (value.result !== undefined) {
            value = value.result; // Formula result
          } else if (value instanceof Date) {
            value = value.toISOString().split('T')[0]; // Date to ISO string
          } else if (value.text) {
            value = value.text; // Hyperlink
          }
        }

        // Trim strings
        if (typeof value === 'string') {
          value = value.trim();
        }

        if (value !== null && value !== undefined && value !== '') {
          hasData = true;
        }

        rowData[fieldName] = value ?? null;
      });

      // Add row number for error tracking
      rowData._rowNumber = rowNum;

      // Skip empty rows if configured
      if (options.skipEmpty !== false && !hasData) {
        continue;
      }

      rows.push(rowData);
    }

    return {
      success: true,
      rows,
      totalRows: rows.length,
      headers,
      unmappedColumns,
      mappedFields: Object.values(headerMap),
      sheetName: worksheet.name,
    };
  } catch (error) {
    console.error('[Excel] Import failed:', error.message);
    return {
      success: false,
      error: `Excel import failed: ${error.message}`,
    };
  }
}

/**
 * Validates imported data rows against a validation schema
 * 
 * @param {Array<Object>} rows - Imported data rows (from importFromExcel)
 * @param {Object} schema - Validation schema defining rules per field
 * @param {Object} schema[fieldName] - Rules for a field
 * @param {boolean} [schema[fieldName].required] - Whether field is required
 * @param {string} [schema[fieldName].type] - Expected type: 'string', 'number', 'date', 'email', 'phone'
 * @param {number} [schema[fieldName].minLength] - Minimum string length
 * @param {number} [schema[fieldName].maxLength] - Maximum string length
 * @param {Array} [schema[fieldName].enum] - Allowed values
 * @param {RegExp} [schema[fieldName].pattern] - Regex pattern to match
 * @param {string} [schema[fieldName].label] - Human-readable field label for error messages
 * @param {Function} [schema[fieldName].validate] - Custom validation function
 * @returns {Object} Validation result with valid rows and error details
 * 
 * @example
 * const validationResult = validateImportData(importedRows, {
 *   name: { required: true, type: 'string', minLength: 2, label: 'Student Name' },
 *   date_of_birth: { required: true, type: 'date', label: 'Date of Birth' },
 *   phone: { type: 'phone', label: 'Phone Number' },
 *   gender: { required: true, enum: ['male', 'female', 'other'], label: 'Gender' },
 *   email: { type: 'email', label: 'Email Address' },
 * });
 * 
 * // Returns:
 * // {
 * //   valid: true,
 * //   validRows: [...],
 * //   invalidRows: [...],
 * //   errors: [{ row: 5, field: 'name', message: 'Student Name is required' }],
 * //   summary: { total: 100, valid: 95, invalid: 5 }
 * // }
 */
function validateImportData(rows, schema) {
  if (!rows || !rows.length) {
    return {
      valid: false,
      validRows: [],
      invalidRows: [],
      errors: [{ row: 0, field: '_all', message: 'No data rows to validate' }],
      summary: { total: 0, valid: 0, invalid: 0 },
    };
  }

  const validRows = [];
  const invalidRows = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowErrors = [];
    const rowNumber = row._rowNumber || index + 1;

    Object.entries(schema).forEach(([field, rules]) => {
      const value = row[field];
      const label = rules.label || field;

      // Required check
      if (rules.required && (value === null || value === undefined || value === '')) {
        rowErrors.push({ row: rowNumber, field, message: `${label} is required` });
        return;
      }

      // Skip further validation if value is empty and not required
      if (value === null || value === undefined || value === '') {
        return;
      }

      // Type validation
      if (rules.type) {
        switch (rules.type) {
          case 'number':
            if (isNaN(Number(value))) {
              rowErrors.push({ row: rowNumber, field, message: `${label} must be a number` });
            }
            break;

          case 'date':
            const dateVal = new Date(value);
            if (isNaN(dateVal.getTime())) {
              rowErrors.push({ row: rowNumber, field, message: `${label} must be a valid date` });
            }
            break;

          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(value))) {
              rowErrors.push({ row: rowNumber, field, message: `${label} must be a valid email` });
            }
            break;

          case 'phone':
            const phoneRegex = /^[6-9]\d{9}$/;
            const cleaned = String(value).replace(/[\s\-\+]/g, '').replace(/^91/, '');
            if (!phoneRegex.test(cleaned)) {
              rowErrors.push({ row: rowNumber, field, message: `${label} must be a valid 10-digit phone number` });
            }
            break;

          case 'string':
            if (typeof value !== 'string' && typeof value !== 'number') {
              rowErrors.push({ row: rowNumber, field, message: `${label} must be text` });
            }
            break;
        }
      }

      // String length validation
      const strValue = String(value || '');
      if (rules.minLength && strValue.length < rules.minLength) {
        rowErrors.push({ row: rowNumber, field, message: `${label} must be at least ${rules.minLength} characters` });
      }
      if (rules.maxLength && strValue.length > rules.maxLength) {
        rowErrors.push({ row: rowNumber, field, message: `${label} must not exceed ${rules.maxLength} characters` });
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(String(value).toLowerCase())) {
        rowErrors.push({
          row: rowNumber,
          field,
          message: `${label} must be one of: ${rules.enum.join(', ')}`,
        });
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(String(value))) {
        rowErrors.push({ row: rowNumber, field, message: `${label} format is invalid` });
      }

      // Custom validation function
      if (rules.validate && typeof rules.validate === 'function') {
        const customError = rules.validate(value, row);
        if (customError) {
          rowErrors.push({ row: rowNumber, field, message: customError });
        }
      }
    });

    if (rowErrors.length > 0) {
      invalidRows.push({ ...row, _errors: rowErrors });
      errors.push(...rowErrors);
    } else {
      // Clean up internal fields before adding to valid rows
      const cleanRow = { ...row };
      delete cleanRow._rowNumber;
      validRows.push(cleanRow);
    }
  });

  return {
    valid: invalidRows.length === 0,
    validRows,
    invalidRows,
    errors,
    summary: {
      total: rows.length,
      valid: validRows.length,
      invalid: invalidRows.length,
    },
  };
}

/**
 * Generates a template Excel file for data import
 * Useful for providing users with a properly formatted template to fill.
 * 
 * @param {Array<Object>} columns - Column definitions
 * @param {string} columns[].header - Column header
 * @param {string} [columns[].example] - Example value
 * @param {boolean} [columns[].required] - Whether column is required
 * @param {string} [columns[].description] - Column description/help text
 * @param {string} [sheetName='Import Template'] - Sheet name
 * @returns {Promise<Buffer>} Excel file buffer
 * 
 * @example
 * const templateBuffer = await generateImportTemplate([
 *   { header: 'Student Name', required: true, example: 'Rahul Sharma', description: 'Full name' },
 *   { header: 'Father Name', required: true, example: 'Mr. Amit Sharma' },
 *   { header: 'Date of Birth', required: true, example: '15/05/2010', description: 'DD/MM/YYYY format' },
 *   { header: 'Phone', example: '9876543210', description: '10-digit mobile number' },
 *   { header: 'Gender', required: true, example: 'male', description: 'male/female/other' },
 * ], 'Student Import');
 */
async function generateImportTemplate(columns, sheetName = 'Import Template') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Chalo Schools ERP';

  const worksheet = workbook.addWorksheet(sheetName);

  // Instructions sheet
  const instructionSheet = workbook.addWorksheet('Instructions');
  instructionSheet.getColumn('A').width = 20;
  instructionSheet.getColumn('B').width = 50;
  instructionSheet.getColumn('C').width = 20;
  instructionSheet.getColumn('D').width = 30;

  instructionSheet.addRow(['Column Name', 'Description', 'Required', 'Example']);
  const instrHeaderRow = instructionSheet.getRow(1);
  instrHeaderRow.font = { bold: true };
  instrHeaderRow.fill = STYLE_CONFIG.headerFill;
  instrHeaderRow.font = STYLE_CONFIG.headerFont;

  columns.forEach((col) => {
    instructionSheet.addRow([
      col.header,
      col.description || '',
      col.required ? 'Yes' : 'No',
      col.example || '',
    ]);
  });

  // Main data sheet headers
  worksheet.columns = columns.map((col, index) => ({
    header: col.required ? `${col.header} *` : col.header,
    key: `col_${index}`,
    width: Math.max(col.header.length + 4, 15),
  }));

  // Style headers
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colIndex) => {
    const colDef = columns[colIndex - 1];
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colDef?.required ? 'FFC0392B' : 'FF2C3E50' },
    };
    cell.alignment = { horizontal: 'center' };
  });

  // Add example row
  const exampleData = {};
  columns.forEach((col, index) => {
    exampleData[`col_${index}`] = col.example || '';
  });
  const exRow = worksheet.addRow(exampleData);
  exRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: 'FF7F8C8D' } };
  });

  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  exportToExcel,
  importFromExcel,
  validateImportData,
  generateImportTemplate,
};
