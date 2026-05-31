/**
 * Chalo Schools ERP — Transport Routes
 * Endpoints 211-224: Vehicles, drivers, routes, student assignment, documents
 * File: routes/transport.js
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// File upload config for vehicle documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/transport-docs'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, and PNG files are allowed'));
    }
  }
});

// Apply authentication to all routes
router.use(requireAuth);

// ============================================
// VEHICLES (Endpoints 211-213)
// ============================================

/**
 * #211 GET /transport/vehicles
 * List vehicles
 * Auth: Any authenticated user
 */
router.get('/vehicles', requireRole('transport.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'vehicle_number',
      order = 'asc',
      search,
      status, // active, inactive, maintenance
      vehicle_type // bus, van, auto
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`v.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    if (search) {
      conditions.push(`(v.vehicle_number ILIKE $${paramIndex} OR v.make ILIKE $${paramIndex} OR v.model ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (status) {
      conditions.push(`v.status = $${paramIndex++}`);
      params.push(status);
    }
    if (vehicle_type) {
      conditions.push(`v.vehicle_type = $${paramIndex++}`);
      params.push(vehicle_type);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const allowedSorts = ['vehicle_number', 'make', 'capacity', 'created_at'];
    const sortCol = allowedSorts.includes(sort) ? `v.${sort}` : 'v.vehicle_number';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM transport_vehicles v ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT v.id, v.vehicle_number, v.vehicle_type, v.make, v.model, v.year,
             v.capacity, v.status, v.gps_device_id, v.fuel_type,
             v.insurance_expiry, v.fitness_expiry, v.permit_expiry,
             v.assigned_driver_id, v.created_at,
             d.name as driver_name, d.phone as driver_phone,
             (SELECT COUNT(*) FROM transport_route_students trs 
              JOIN transport_routes tr ON trs.route_id = tr.id 
              WHERE tr.vehicle_id = v.id AND trs.is_active = true) as students_assigned
      FROM transport_vehicles v
      LEFT JOIN transport_drivers d ON v.assigned_driver_id = d.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Vehicles retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing vehicles:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve vehicles', details: error.message }
    });
  }
});

/**
 * #212 POST /transport/vehicles
 * Add vehicle
 * Auth: Admin
 */
router.post('/vehicles', requireRole('transport.manage'), async (req, res) => {
  try {
    const {
      vehicle_number,
      vehicle_type, // bus, van, auto, tempo
      make,
      model,
      year,
      capacity,
      fuel_type,
      chassis_number,
      engine_number,
      gps_device_id,
      insurance_expiry,
      fitness_expiry,
      permit_expiry,
      assigned_driver_id
    } = req.body;

    if (!vehicle_number || !vehicle_type || !capacity) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'vehicle_number, vehicle_type, and capacity are required' }
      });
    }

    // Check for duplicate vehicle number
    const duplicate = await pool.query(
      'SELECT id FROM transport_vehicles WHERE vehicle_number = $1 AND school_id = $2',
      [vehicle_number, req.user.school_id]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'Vehicle with this number already exists' }
      });
    }

    const result = await pool.query(
      `INSERT INTO transport_vehicles (
        school_id, vehicle_number, vehicle_type, make, model, year, capacity,
        fuel_type, chassis_number, engine_number, gps_device_id,
        insurance_expiry, fitness_expiry, permit_expiry, assigned_driver_id,
        status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active', $16, NOW())
      RETURNING *`,
      [req.user.school_id, vehicle_number.toUpperCase(), vehicle_type, make || null,
       model || null, year || null, capacity, fuel_type || null,
       chassis_number || null, engine_number || null, gps_device_id || null,
       insurance_expiry || null, fitness_expiry || null, permit_expiry || null,
       assigned_driver_id || null, req.user.id]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Vehicle added successfully'
    });
  } catch (error) {
    console.error('Error adding vehicle:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to add vehicle', details: error.message }
    });
  }
});

/**
 * #213 PUT /transport/vehicles/:id
 * Update vehicle
 * Auth: Admin
 */
router.put('/vehicles/:id', requireRole('transport.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vehicle_number, vehicle_type, make, model, year, capacity,
      fuel_type, chassis_number, engine_number, gps_device_id,
      insurance_expiry, fitness_expiry, permit_expiry,
      assigned_driver_id, status
    } = req.body;

    const result = await pool.query(
      `UPDATE transport_vehicles SET
        vehicle_number = COALESCE($1, vehicle_number),
        vehicle_type = COALESCE($2, vehicle_type),
        make = COALESCE($3, make), model = COALESCE($4, model),
        year = COALESCE($5, year), capacity = COALESCE($6, capacity),
        fuel_type = COALESCE($7, fuel_type),
        chassis_number = COALESCE($8, chassis_number),
        engine_number = COALESCE($9, engine_number),
        gps_device_id = COALESCE($10, gps_device_id),
        insurance_expiry = COALESCE($11, insurance_expiry),
        fitness_expiry = COALESCE($12, fitness_expiry),
        permit_expiry = COALESCE($13, permit_expiry),
        assigned_driver_id = COALESCE($14, assigned_driver_id),
        status = COALESCE($15, status),
        updated_by = $16, updated_at = NOW()
       WHERE id = $17 AND school_id = $18
       RETURNING *`,
      [vehicle_number, vehicle_type, make, model, year, capacity,
       fuel_type, chassis_number, engine_number, gps_device_id,
       insurance_expiry, fitness_expiry, permit_expiry,
       assigned_driver_id, status, req.user.id, id, req.user.school_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vehicle not found' }
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Vehicle updated successfully'
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update vehicle', details: error.message }
    });
  }
});

// ============================================
// DRIVERS (Endpoints 214-216)
// ============================================

/**
 * #214 GET /transport/drivers
 * List drivers
 * Auth: Any authenticated user
 */
router.get('/drivers', requireRole('transport.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status, // active, inactive
      license_expiring // true = filter for expiring within 30 days
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`d.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    if (search) {
      conditions.push(`(d.name ILIKE $${paramIndex} OR d.phone ILIKE $${paramIndex} OR d.license_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (status) {
      conditions.push(`d.status = $${paramIndex++}`);
      params.push(status);
    }
    if (license_expiring === 'true') {
      conditions.push(`d.license_expiry <= CURRENT_DATE + INTERVAL '30 days'`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM transport_drivers d ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT d.id, d.name, d.phone, d.alternate_phone, d.email, d.address,
             d.license_number, d.license_type, d.license_expiry,
             d.date_of_birth, d.blood_group, d.emergency_contact,
             d.status, d.photo_url, d.created_at,
             v.vehicle_number as assigned_vehicle,
             CASE WHEN d.license_expiry <= CURRENT_DATE THEN 'expired'
                  WHEN d.license_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
                  ELSE 'valid' END as license_status
      FROM transport_drivers d
      LEFT JOIN transport_vehicles v ON v.assigned_driver_id = d.id
      ${whereClause}
      ORDER BY d.name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Drivers retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing drivers:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve drivers', details: error.message }
    });
  }
});

/**
 * #215 POST /transport/drivers
 * Add driver
 * Auth: Admin
 */
router.post('/drivers', requireRole('transport.manage'), async (req, res) => {
  try {
    const {
      name, phone, alternate_phone, email, address,
      license_number, license_type, license_expiry,
      date_of_birth, blood_group, emergency_contact,
      aadhar_number, photo_url
    } = req.body;

    if (!name || !phone || !license_number || !license_expiry) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name, phone, license_number, and license_expiry are required' }
      });
    }

    // Check for duplicate license number
    const duplicate = await pool.query(
      'SELECT id FROM transport_drivers WHERE license_number = $1 AND school_id = $2',
      [license_number, req.user.school_id]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'Driver with this license number already exists' }
      });
    }

    const result = await pool.query(
      `INSERT INTO transport_drivers (
        school_id, name, phone, alternate_phone, email, address,
        license_number, license_type, license_expiry,
        date_of_birth, blood_group, emergency_contact,
        aadhar_number, photo_url, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15, NOW())
      RETURNING *`,
      [req.user.school_id, name, phone, alternate_phone || null, email || null,
       address || null, license_number, license_type || null, license_expiry,
       date_of_birth || null, blood_group || null, emergency_contact || null,
       aadhar_number || null, photo_url || null, req.user.id]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Driver added successfully'
    });
  } catch (error) {
    console.error('Error adding driver:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to add driver', details: error.message }
    });
  }
});

/**
 * #216 PUT /transport/drivers/:id
 * Update driver
 * Auth: Admin
 */
router.put('/drivers/:id', requireRole('transport.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, phone, alternate_phone, email, address,
      license_number, license_type, license_expiry,
      date_of_birth, blood_group, emergency_contact,
      aadhar_number, photo_url, status
    } = req.body;

    const result = await pool.query(
      `UPDATE transport_drivers SET
        name = COALESCE($1, name), phone = COALESCE($2, phone),
        alternate_phone = COALESCE($3, alternate_phone),
        email = COALESCE($4, email), address = COALESCE($5, address),
        license_number = COALESCE($6, license_number),
        license_type = COALESCE($7, license_type),
        license_expiry = COALESCE($8, license_expiry),
        date_of_birth = COALESCE($9, date_of_birth),
        blood_group = COALESCE($10, blood_group),
        emergency_contact = COALESCE($11, emergency_contact),
        aadhar_number = COALESCE($12, aadhar_number),
        photo_url = COALESCE($13, photo_url),
        status = COALESCE($14, status),
        updated_by = $15, updated_at = NOW()
       WHERE id = $16 AND school_id = $17
       RETURNING *`,
      [name, phone, alternate_phone, email, address,
       license_number, license_type, license_expiry,
       date_of_birth, blood_group, emergency_contact,
       aadhar_number, photo_url, status, req.user.id, id, req.user.school_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Driver not found' }
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Driver updated successfully'
    });
  } catch (error) {
    console.error('Error updating driver:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update driver', details: error.message }
    });
  }
});

// ============================================
// ROUTES (Endpoints 217-221)
// ============================================

/**
 * #217 GET /transport/routes
 * List routes
 * Auth: Any authenticated user
 */
router.get('/routes', requireRole('transport.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      vehicle_id
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`r.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    if (search) {
      conditions.push(`(r.route_name ILIKE $${paramIndex} OR r.route_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (status) {
      conditions.push(`r.status = $${paramIndex++}`);
      params.push(status);
    }
    if (vehicle_id) {
      conditions.push(`r.vehicle_id = $${paramIndex++}`);
      params.push(vehicle_id);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM transport_routes r ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT r.id, r.route_number, r.route_name, r.start_point, r.end_point,
             r.distance_km, r.estimated_time_minutes, r.monthly_fee,
             r.stops, r.status, r.created_at,
             v.vehicle_number, v.vehicle_type,
             d.name as driver_name, d.phone as driver_phone,
             (SELECT COUNT(*) FROM transport_route_students trs 
              WHERE trs.route_id = r.id AND trs.is_active = true) as student_count
      FROM transport_routes r
      LEFT JOIN transport_vehicles v ON r.vehicle_id = v.id
      LEFT JOIN transport_drivers d ON r.driver_id = d.id
      ${whereClause}
      ORDER BY r.route_number ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Routes retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing routes:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve routes', details: error.message }
    });
  }
});

/**
 * #218 POST /transport/routes
 * Create route
 * Auth: Admin
 */
router.post('/routes', requireRole('transport.manage'), async (req, res) => {
  try {
    const {
      route_number,
      route_name,
      start_point,
      end_point,
      stops, // Array of { name, latitude, longitude, pickup_time, drop_time, sequence }
      distance_km,
      estimated_time_minutes,
      monthly_fee,
      vehicle_id,
      driver_id
    } = req.body;

    if (!route_name || !start_point || !end_point) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'route_name, start_point, and end_point are required' }
      });
    }

    const result = await pool.query(
      `INSERT INTO transport_routes (
        school_id, route_number, route_name, start_point, end_point,
        stops, distance_km, estimated_time_minutes, monthly_fee,
        vehicle_id, driver_id, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12, NOW())
      RETURNING *`,
      [req.user.school_id, route_number || null, route_name, start_point, end_point,
       JSON.stringify(stops || []), distance_km || null, estimated_time_minutes || null,
       monthly_fee || 0, vehicle_id || null, driver_id || null, req.user.id]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Route created successfully'
    });
  } catch (error) {
    console.error('Error creating route:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create route', details: error.message }
    });
  }
});

/**
 * #219 PUT /transport/routes/:id
 * Update route
 * Auth: Admin
 */
router.put('/routes/:id', requireRole('transport.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      route_number, route_name, start_point, end_point, stops,
      distance_km, estimated_time_minutes, monthly_fee,
      vehicle_id, driver_id, status
    } = req.body;

    const result = await pool.query(
      `UPDATE transport_routes SET
        route_number = COALESCE($1, route_number),
        route_name = COALESCE($2, route_name),
        start_point = COALESCE($3, start_point),
        end_point = COALESCE($4, end_point),
        stops = COALESCE($5, stops),
        distance_km = COALESCE($6, distance_km),
        estimated_time_minutes = COALESCE($7, estimated_time_minutes),
        monthly_fee = COALESCE($8, monthly_fee),
        vehicle_id = COALESCE($9, vehicle_id),
        driver_id = COALESCE($10, driver_id),
        status = COALESCE($11, status),
        updated_by = $12, updated_at = NOW()
       WHERE id = $13 AND school_id = $14
       RETURNING *`,
      [route_number, route_name, start_point, end_point,
       stops ? JSON.stringify(stops) : null,
       distance_km, estimated_time_minutes, monthly_fee,
       vehicle_id, driver_id, status, req.user.id, id, req.user.school_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Route not found' }
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Route updated successfully'
    });
  } catch (error) {
    console.error('Error updating route:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update route', details: error.message }
    });
  }
});

/**
 * #220 GET /transport/routes/:id/students
 * Students on route
 * Auth: Any authenticated user
 */
router.get('/routes/:id/students', requireRole('transport.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, search, is_active } = req.query;

    const offset = (page - 1) * limit;
    const params = [id, req.user.school_id];
    let paramIndex = 3;
    const conditions = ['trs.route_id = $1', 'r.school_id = $2'];

    if (search) {
      conditions.push(`(s.name ILIKE $${paramIndex} OR s.admission_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (is_active !== undefined) {
      conditions.push(`trs.is_active = $${paramIndex++}`);
      params.push(is_active === 'true');
    } else {
      conditions.push('trs.is_active = true');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM transport_route_students trs
       JOIN transport_routes r ON trs.route_id = r.id
       JOIN students s ON trs.student_id = s.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT trs.id, trs.student_id, trs.pickup_stop, trs.drop_stop,
             trs.pickup_time, trs.drop_time, trs.transport_type, trs.is_active,
             trs.start_date, trs.end_date,
             s.name as student_name, s.admission_number,
             c.name as class_name, sec.name as section_name,
             s.parent_phone
      FROM transport_route_students trs
      JOIN transport_routes r ON trs.route_id = r.id
      JOIN students s ON trs.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      ${whereClause}
      ORDER BY trs.pickup_stop, s.name
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Route students retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing route students:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve route students', details: error.message }
    });
  }
});

/**
 * #221 POST /transport/routes/:id/assign-student
 * Assign student to route
 * Auth: Admin
 */
router.post('/routes/:id/assign-student', requireRole('transport.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      student_id,
      pickup_stop,
      drop_stop,
      pickup_time,
      drop_time,
      transport_type, // both, pickup_only, drop_only
      start_date
    } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'student_id is required' }
      });
    }

    // Verify route exists
    const routeResult = await pool.query(
      'SELECT id, vehicle_id, route_name FROM transport_routes WHERE id = $1 AND school_id = $2',
      [id, req.user.school_id]
    );

    if (routeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Route not found' }
      });
    }

    // Check vehicle capacity
    if (routeResult.rows[0].vehicle_id) {
      const capacityCheck = await pool.query(
        `SELECT v.capacity,
                (SELECT COUNT(*) FROM transport_route_students trs 
                 JOIN transport_routes tr ON trs.route_id = tr.id 
                 WHERE tr.vehicle_id = v.id AND trs.is_active = true) as current_count
         FROM transport_vehicles v WHERE id = $1`,
        [routeResult.rows[0].vehicle_id]
      );

      if (capacityCheck.rows.length > 0) {
        const { capacity, current_count } = capacityCheck.rows[0];
        if (parseInt(current_count) >= parseInt(capacity)) {
          return res.status(400).json({
            success: false,
            error: { code: 'CAPACITY_EXCEEDED', message: 'Vehicle capacity exceeded for this route' }
          });
        }
      }
    }

    // Check if student already assigned to a route
    const existingAssignment = await pool.query(
      `SELECT trs.id, r.route_name FROM transport_route_students trs
       JOIN transport_routes r ON trs.route_id = r.id
       WHERE trs.student_id = $1 AND trs.is_active = true AND r.school_id = $2`,
      [student_id, req.user.school_id]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_ASSIGNED',
          message: `Student is already assigned to route: ${existingAssignment.rows[0].route_name}`
        }
      });
    }

    const result = await pool.query(
      `INSERT INTO transport_route_students (
        route_id, student_id, pickup_stop, drop_stop, pickup_time, drop_time,
        transport_type, start_date, is_active, assigned_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, NOW())
      RETURNING *`,
      [id, student_id, pickup_stop || null, drop_stop || null,
       pickup_time || null, drop_time || null,
       transport_type || 'both', start_date || new Date().toISOString().split('T')[0],
       req.user.id]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Student assigned to route successfully'
    });
  } catch (error) {
    console.error('Error assigning student to route:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to assign student to route', details: error.message }
    });
  }
});

// ============================================
// DOCUMENTS (Endpoints 222-224)
// ============================================

/**
 * #222 GET /transport/documents
 * Vehicle docs (filter expiring)
 * Auth: Any authenticated user
 */
router.get('/documents', requireRole('transport.view'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      vehicle_id,
      document_type, // insurance, fitness, permit, rc, puc
      status // valid, expiring_soon, expired
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    const conditions = [`td.school_id = $${paramIndex++}`];
    params.push(req.user.school_id);

    if (search) {
      conditions.push(`(v.vehicle_number ILIKE $${paramIndex} OR td.document_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (vehicle_id) {
      conditions.push(`td.vehicle_id = $${paramIndex++}`);
      params.push(vehicle_id);
    }
    if (document_type) {
      conditions.push(`td.document_type = $${paramIndex++}`);
      params.push(document_type);
    }
    if (status === 'expired') {
      conditions.push('td.expiry_date < CURRENT_DATE');
    } else if (status === 'expiring_soon') {
      conditions.push(`td.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`);
    } else if (status === 'valid') {
      conditions.push(`td.expiry_date > CURRENT_DATE + INTERVAL '30 days'`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM transport_documents td
       LEFT JOIN transport_vehicles v ON td.vehicle_id = v.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT td.id, td.vehicle_id, td.document_type, td.document_number,
             td.issue_date, td.expiry_date, td.file_url, td.remarks, td.created_at,
             v.vehicle_number,
             CASE WHEN td.expiry_date < CURRENT_DATE THEN 'expired'
                  WHEN td.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
                  ELSE 'valid' END as document_status,
             CASE WHEN td.expiry_date >= CURRENT_DATE 
                  THEN (td.expiry_date - CURRENT_DATE) ELSE 0 END as days_remaining
      FROM transport_documents td
      LEFT JOIN transport_vehicles v ON td.vehicle_id = v.id
      ${whereClause}
      ORDER BY td.expiry_date ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const dataResult = await pool.query(dataQuery, params);

    return res.json({
      success: true,
      data: dataResult.rows,
      message: 'Transport documents retrieved successfully',
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing transport documents:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve documents', details: error.message }
    });
  }
});

/**
 * #223 POST /transport/documents
 * Upload vehicle document
 * Auth: Admin
 */
router.post('/documents', requireRole('transport.manage'), upload.single('file'), async (req, res) => {
  try {
    const {
      vehicle_id,
      document_type, // insurance, fitness, permit, rc, puc, registration
      document_number,
      issue_date,
      expiry_date,
      remarks
    } = req.body;

    if (!vehicle_id || !document_type || !expiry_date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'vehicle_id, document_type, and expiry_date are required' }
      });
    }

    // Verify vehicle exists
    const vehicleCheck = await pool.query(
      'SELECT id FROM transport_vehicles WHERE id = $1 AND school_id = $2',
      [vehicle_id, req.user.school_id]
    );

    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vehicle not found' }
      });
    }

    const fileUrl = req.file ? `/uploads/transport-docs/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO transport_documents (
        school_id, vehicle_id, document_type, document_number,
        issue_date, expiry_date, file_url, remarks, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [req.user.school_id, vehicle_id, document_type, document_number || null,
       issue_date || null, expiry_date, fileUrl, remarks || null, req.user.id]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to upload document', details: error.message }
    });
  }
});

/**
 * #224 GET /transport/documents/expiring
 * Docs expiring in 30 days
 * Auth: Any authenticated user
 */
router.get('/documents/expiring', requireRole('transport.view'), async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const query = `
      SELECT td.id, td.vehicle_id, td.document_type, td.document_number,
             td.expiry_date, td.file_url,
             v.vehicle_number, v.vehicle_type,
             (td.expiry_date - CURRENT_DATE) as days_remaining,
             CASE WHEN td.expiry_date < CURRENT_DATE THEN 'expired'
                  ELSE 'expiring_soon' END as urgency
      FROM transport_documents td
      LEFT JOIN transport_vehicles v ON td.vehicle_id = v.id
      WHERE td.school_id = $1 
        AND td.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $2
      ORDER BY td.expiry_date ASC
    `;

    const result = await pool.query(query, [req.user.school_id, parseInt(days)]);

    // Group by vehicle
    const grouped = {};
    result.rows.forEach(doc => {
      if (!grouped[doc.vehicle_number]) {
        grouped[doc.vehicle_number] = {
          vehicle_id: doc.vehicle_id,
          vehicle_number: doc.vehicle_number,
          vehicle_type: doc.vehicle_type,
          documents: []
        };
      }
      grouped[doc.vehicle_number].documents.push(doc);
    });

    return res.json({
      success: true,
      data: {
        items: result.rows,
        by_vehicle: Object.values(grouped),
        summary: {
          total_expiring: result.rows.length,
          already_expired: result.rows.filter(d => d.urgency === 'expired').length,
          expiring_soon: result.rows.filter(d => d.urgency === 'expiring_soon').length
        }
      },
      message: `Found ${result.rows.length} documents expiring within ${days} days`
    });
  } catch (error) {
    console.error('Error fetching expiring documents:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve expiring documents', details: error.message }
    });
  }
});

module.exports = router;
