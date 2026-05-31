/**
 * School Routes Index
 * Re-exports all school-specific route modules for easy mounting in the main app.
 * 
 * Usage in src/index.js:
 *   const schoolRoutes = require('./routes/school');
 *   // Then mount each route individually or use the helper
 */

// Existing school routes
const attendance = require('./attendance');
const fees = require('./fees');
const staff = require('./staff');
const timetable = require('./timetable');
const admissions = require('./admissions');
const examinations = require('./examinations');
const communications = require('./communications');

// New expanded routes (from Chalo ERP Blueprint)
const branches = require('./branches');
const roles = require('./roles');
const users = require('./users');
const holidays = require('./holidays');
const events = require('./events');
const feeCollections = require('./fee-collections');
const feeConcessions = require('./fee-concessions');
const feeRefunds = require('./fee-refunds');
const dayClosure = require('./day-closure');
const paymentsOnline = require('./payments-online');
const communicationExtended = require('./communication-extended');
const transport = require('./transport');
const visitors = require('./visitors');
const approvals = require('./approvals');

// Masters sub-routes
const mastersAcademic = require('./masters/academic');
const mastersDemographics = require('./masters/demographics');
const mastersTimeConfig = require('./masters/time-config');

module.exports = {
  // Existing
  attendance,
  fees,
  staff,
  timetable,
  admissions,
  examinations,
  communications,

  // New routes
  branches,
  roles,
  users,
  holidays,
  events,
  feeCollections,
  feeConcessions,
  feeRefunds,
  dayClosure,
  paymentsOnline,
  communicationExtended,
  transport,
  visitors,
  approvals,

  // Masters
  masters: {
    academic: mastersAcademic,
    demographics: mastersDemographics,
    timeConfig: mastersTimeConfig,
  },
};
