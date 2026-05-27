require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { runMigrations } = require('./config/runMigrations');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const schoolRoutes = require('./routes/schools');
const studentRoutes = require('./routes/students');
const staffRoutes = require('./routes/staff');
const admissionRoutes = require('./routes/admissions');
const attendanceRoutes = require('./routes/attendance');
const timetableRoutes = require('./routes/timetable');
const examinationRoutes = require('./routes/examinations');
const feeRoutes = require('./routes/fees');
const communicationRoutes = require('./routes/communications');
const reportRoutes = require('./routes/reports');
const libraryRoutes = require('./routes/library');
const transportRoutes = require('./routes/transport');
const payrollRoutes = require('./routes/payroll');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
app.use(globalLimiter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'school-mgmt-api' }));

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/examinations', examinationRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(errorHandler);

// Cron jobs
cron.schedule('0 20 * * *', () => {
  console.log('[CRON] Running daily fee reconciliation...');
  // feeService.runDailyReconciliation();
});

cron.schedule('0 8 * * 1', () => {
  console.log('[CRON] Sending weekly fee reminders via WhatsApp...');
  // communicationService.sendFeeReminders();
});

cron.schedule('30 18 * * *', () => {
  console.log('[CRON] Generating daily stats aggregation...');
  // analyticsService.aggregateDailyStats();
});

async function start() {
  await connectDB();
  await connectRedis();
  await runMigrations();
  app.listen(PORT, () => console.log(`School Mgmt API running on port ${PORT}`));
}

start();
