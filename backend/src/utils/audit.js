const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

/**
 * Write an audit log entry (fire-and-forget; never blocks the request).
 */
function logAudit({ actor, action, resource, resourceId, meta, req }) {
  return AuditLog.create({
    actor,
    action,
    resource,
    resourceId,
    meta,
    ip: req?.ip || '',
    userAgent: req?.get?.('user-agent') || '',
  }).catch((err) => {
    logger.error({ err }, 'audit log write failed');
  });
}

module.exports = { logAudit };
