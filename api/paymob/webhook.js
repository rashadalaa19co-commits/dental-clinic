const crypto = require('crypto');
const admin = require('./_firebaseAdmin');
const { addMonthsSafe } = require('./_shared');

const db = admin.firestore();

function valueOrEmpty(value) {
  return value === undefined || value === null ? '' : String(value);
}

function verifyHmac(payload, receivedHmac) {
  if (!process.env.PAYMOB_HMAC_SECRET) return true;
  if (!receivedHmac) return false;

  const txn = payload?.obj || {};
  const orderedFields = [
    txn.amount_cents,
    txn.created_at,
    txn.currency,
    txn.error_occured,
    txn.has_parent_transaction,
    txn.id,
    txn.integration_id,
    txn.is_3d_secure,
    txn.is_auth,
    txn.is_capture,
    txn.is_refunded,
    txn.is_standalone_payment,
    txn.is_voided,
    txn.order?.id,
    txn.owner,
    txn.pending,
    txn.source_data?.pan,
    txn.source_data?.sub_type,
    txn.source_data?.type,
    txn.success,
  ].map(valueOrEmpty);

  const calculated = crypto
    .createHmac('sha512', process.env.PAYMOB_HMAC_SECRET)
    .update(orderedFields.join(''))
    .digest('hex');

  return calculated === receivedHmac;
}

function getBaseExpiryDate(currentTs, paidAt) {
  const current = currentTs?.toDate ? currentTs.toDate() : currentTs ? new Date(currentTs) : null;
  if (current && current > paidAt) return current;
  return paidAt;
}

async function updateClinicSubscription({ uid, plan, billing, months, paidAt, amountEgp }) {
  const clinicRef = db.collection('clinics').doc(uid);
  const clinicSnap = await clinicRef.get();

  if (!clinicSnap.exists) {
    throw new Error(`Clinic ${uid} was not found`);
  }

  const clinicData = clinicSnap.data() || {};
  const silverBase = getBaseExpiryDate(clinicData.silverExpiry, paidAt);
  const goldBase = getBaseExpiryDate(clinicData.goldExpiry, paidAt);
  const silverExpiryDate = addMonthsSafe(silverBase, Number(months || 1));
  const goldExpiryDate = addMonthsSafe(goldBase, Number(months || 1));

  const update = {
    plan,
    billing,
    paymentMethod: 'paymob',
    subscriptionStatus: 'active',
    lastPaymentAmount: amountEgp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (plan === 'silver') {
    update.isActive = true;
    update.hasGallery = false;
    update.silverExpiry = admin.firestore.Timestamp.fromDate(silverExpiryDate);
    update.goldExpiry = null;
  }

  if (plan === 'gold') {
    update.isActive = true;
    update.hasGallery = true;
    update.silverExpiry = admin.firestore.Timestamp.fromDate(silverExpiryDate);
    update.goldExpiry = admin.firestore.Timestamp.fromDate(goldExpiryDate);
  }

  await clinicRef.set(update, { merge: true });

  return plan === 'gold' ? goldExpiryDate : silverExpiryDate;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const receivedHmac = req.query?.hmac || req.headers['x-paymob-hmac'] || '';
    if (!verifyHmac(req.body, receivedHmac)) {
      return res.status(401).send('Invalid HMAC');
    }

    const txn = req.body?.obj || {};
    if (!txn.id || txn.pending || !txn.success) {
      return res.status(200).send('Ignored');
    }

    const orderId = String(txn.order?.id || '');
    if (!orderId) {
      return res.status(400).send('Missing order id');
    }

    const orderRef = db.collection('paymobOrders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).send('Order mapping not found');
    }

    const orderData = orderSnap.data();
    if (orderData.status === 'paid') {
      return res.status(200).send('Already processed');
    }

    const paymentRef = db.collection('payments').doc(String(txn.id));
    const paymentSnap = await paymentRef.get();
    if (paymentSnap.exists) {
      await orderRef.set({ status: 'paid', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return res.status(200).send('Already logged');
    }

    const paidAt = txn.created_at ? new Date(txn.created_at) : new Date();
    const finalExpiryDate = await updateClinicSubscription({
      uid: orderData.uid,
      plan: orderData.plan,
      billing: orderData.billing,
      months: Number(orderData.months || 1),
      paidAt,
      amountEgp: Number(txn.amount_cents || 0) / 100,
    });

    await paymentRef.set({
      uid: orderData.uid,
      plan: orderData.plan,
      billing: orderData.billing,
      months: orderData.months,
      amountCents: txn.amount_cents,
      amountEgp: Number(txn.amount_cents || 0) / 100,
      currency: txn.currency || 'EGP',
      paymentMethod: 'paymob',
      status: 'paid',
      paymobTxnId: txn.id,
      paymobOrderId: orderId,
      merchantOrderId: orderData.merchantOrderId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAt: admin.firestore.Timestamp.fromDate(paidAt),
      expiresAt: admin.firestore.Timestamp.fromDate(finalExpiryDate),
      raw: txn,
    });

    await orderRef.set({
      status: 'paid',
      paymobTxnId: txn.id,
      paidAt: admin.firestore.Timestamp.fromDate(paidAt),
      expiresAt: admin.firestore.Timestamp.fromDate(finalExpiryDate),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.status(200).send('OK');
  } catch (error) {
    console.error('paymob webhook error:', error);
    return res.status(500).send('Webhook failed');
  }
};
