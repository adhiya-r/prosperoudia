const auditLogRepository = require('../repositories/auditLogRepository');

function resolveActor(sessionUser) {
  if (!sessionUser) {
    return {
      user_id: null,
      user_role: null
    };
  }

  return {
    user_id: sessionUser.id ?? null,
    user_role: sessionUser.primaryRole?.name ?? sessionUser.role ?? null
  };
}

async function logAction(payload, trx) {
  return auditLogRepository.create(payload, trx);
}

function buildAuditPayload(sessionUser, req, payload) {
  const actor = resolveActor(sessionUser);

  return {
    user_id: actor.user_id,
    user_role: actor.user_role,
    action: payload.action,
    entity_type: payload.entity_type ?? null,
    entity_id: payload.entity_id ?? null,
    old_value: payload.old_value ?? null,
    new_value: payload.new_value ?? null,
    ip_address: req?.ip ?? null,
    user_agent: req?.headers?.['user-agent'] ?? null
  };
}

module.exports = {
  logAction,
  buildAuditPayload,
  resolveActor
};
