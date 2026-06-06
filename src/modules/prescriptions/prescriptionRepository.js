const database = require('../../config/database');

async function createPrescription(trx, payload) {
  const [record] = await trx('prescriptions')
    .insert({
      order_id: payload.order_id,
      customer_id: payload.customer_id,
      uploaded_by_user_id: payload.uploaded_by_user_id,
      doctor_name: payload.doctor_name,
      prescription_number: payload.prescription_number,
      image_path: payload.image_path,
      status: payload.status || 'pending',
      reviewed_notes: payload.reviewed_notes || null,
      verified_by_user_id: payload.verified_by_user_id || null,
      verified_at: payload.verified_at || null,
      rejection_reason: payload.rejection_reason || null
    })
    .returning([
      'id',
      'order_id',
      'customer_id',
      'doctor_name',
      'prescription_number',
      'image_path',
      'status'
    ]);

  return record ?? null;
}

async function findPendingPrescriptions() {
  return database('prescriptions as p')
    .innerJoin('orders as o', 'o.id', 'p.order_id')
    .innerJoin('customers as c', 'c.id', 'p.customer_id')
    .select(
      'p.id',
      'p.order_id',
      'p.doctor_name',
      'p.prescription_number',
      'p.image_path',
      'p.status',
      'p.created_at',
      'o.order_number',
      'o.total_amount',
      'o.fulfillment_method',
      'o.payment_status',
      'c.full_name as customer_name',
      'c.email as customer_email',
      'c.phone as customer_phone'
    )
    .where('p.status', 'pending')
    .orderBy('p.created_at', 'asc');
}

async function findPrescriptionById(prescriptionId) {
  const prescription = await database('prescriptions as p')
    .innerJoin('orders as o', 'o.id', 'p.order_id')
    .innerJoin('customers as c', 'c.id', 'p.customer_id')
    .select(
      'p.id',
      'p.order_id',
      'p.customer_id',
      'p.doctor_name',
      'p.prescription_number',
      'p.image_path',
      'p.status',
      'p.reviewed_notes',
      'p.rejection_reason',
      'p.created_at',
      'o.order_number',
      'o.status as order_status',
      'o.payment_status',
      'o.payment_proof_path',
      'o.payment_proof_uploaded_at',
      'o.total_amount',
      'c.full_name as customer_name',
      'c.email as customer_email',
      'c.phone as customer_phone'
    )
    .where('p.id', prescriptionId)
    .first();

  if (!prescription) {
    return null;
  }

  const items = await database('order_items as oi')
    .innerJoin('medicines as m', 'm.id', 'oi.medicine_id')
    .select(
      'oi.id',
      'oi.medicine_name_snapshot',
      'oi.medicine_sku_snapshot',
      'oi.quantity',
      'oi.total_price',
      'm.requires_prescription'
    )
    .where('oi.order_id', prescription.order_id)
    .orderBy('oi.id', 'asc');

  return {
    ...prescription,
    items
  };
}

async function updatePrescriptionReview(trx, prescriptionId, payload) {
  const [record] = await trx('prescriptions')
    .where('id', prescriptionId)
    .update({
      status: payload.status,
      reviewed_notes: payload.reviewed_notes || null,
      verified_by_user_id: payload.verified_by_user_id || null,
      verified_at: payload.verified_at || trx.fn.now(),
      rejection_reason: payload.rejection_reason || null,
      updated_at: trx.fn.now()
    })
    .returning(['id', 'order_id', 'status']);

  return record ?? null;
}

async function findPrescriptionsByEmail(email) {
  return database('prescriptions as p')
    .innerJoin('orders as o', 'o.id', 'p.order_id')
    .innerJoin('customers as c', 'c.id', 'p.customer_id')
    .select(
      'p.id',
      'p.order_id',
      'p.doctor_name',
      'p.prescription_number',
      'p.image_path',
      'p.status',
      'p.reviewed_notes',
      'p.rejection_reason',
      'p.created_at',
      'o.order_number',
      'o.status as order_status'
    )
    .whereRaw('LOWER(c.email) = LOWER(?)', [email])
    .orderBy('p.created_at', 'desc');
}

module.exports = {
  createPrescription,
  findPendingPrescriptions,
  findPrescriptionById,
  findPrescriptionsByEmail,
  updatePrescriptionReview
};
