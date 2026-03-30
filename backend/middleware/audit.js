// backend/middleware/audit.js
// Lightweight audit trail — logs important actions to the audit_log table
const { pool } = require('../config/database');

/**
 * Log an auditable action.
 * @param {string} action   – e.g. 'login', 'payment.approve', 'event.delete'
 * @param {number|null} userId – who performed  (null = system / anonymous)
 * @param {object} details  – free-form JSON payload
 * @param {object} [req]    – express request (extracts IP + user-agent)
 */
async function auditLog(action, userId, details = {}, req = null) {
  try {
    const ip = req
      ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null)
      : null;
    const ua = req ? (req.headers['user-agent'] || null) : null;

    await pool.query(
      `INSERT INTO audit_log (action, user_id, ip, user_agent, details) VALUES ($1,$2,$3,$4,$5)`,
      [action, userId, ip, ua, JSON.stringify(details)]
    );
  } catch (err) {
    // Never let audit failure break the main flow
    console.error('[audit]', err.message);
  }
}

module.exports = { auditLog };
