const AuditLog = require('../models/AuditLog');

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
    // eslint-disable-next-line no-console
    console.error('audit log write failed', err.message);
  });
}

module.exports = { logAudit };
