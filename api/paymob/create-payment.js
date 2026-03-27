const admin = require('./_firebaseAdmin');
const { getPlanDetails } = require('./_shared');

const db = admin.firestore();

async function paymobRequest(path, body) {
  const response = await fetch(`https://accept.paymob.com/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || `Paymob request failed: ${path}`);
  }

  return data;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { idToken, plan, billing, phone } = req.body || {};

    if (!idToken) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const doctorEmail = decoded.email || 'doctor@auradent.app';
    const doctorName = decoded.name || 'Doctor User';

    const planDetails = getPlanDetails(plan, billing);
    if (!planDetails) {
      return res.status(400).json({ error: 'Invalid plan or billing period' });
    }

    const cleanPhone = String(phone || '').replace(/\s+/g, '');
    if (!/^\+?20\d{10,11}$/.test(cleanPhone) && !/^01\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Enter a valid Egyptian phone number' });
    }

    const normalizedPhone = cleanPhone.startsWith('+')
      ? cleanPhone
      : cleanPhone.startsWith('20')
        ? `+${cleanPhone}`
        : `+2${cleanPhone}`;

    const authData = await paymobRequest('/auth/tokens', {
      api_key: process.env.PAYMOB_API_KEY,
    });

    const merchantOrderId = `auradent_${uid}_${plan}_${billing}_${Date.now()}`;

    const orderData = await paymobRequest('/ecommerce/orders', {
      auth_token: authData.token,
      delivery_needed: false,
      amount_cents: planDetails.amountCents,
      currency: 'EGP',
      merchant_order_id: merchantOrderId,
      items: [
        {
          name: planDetails.label,
          amount_cents: planDetails.amountCents,
          description: `${planDetails.label} subscription`,
          quantity: 1,
        },
      ],
    });

    await db.collection('paymobOrders').doc(String(orderData.id)).set({
      uid,
      plan,
      billing,
      months: planDetails.months,
      amountCents: planDetails.amountCents,
      amountEgp: planDetails.amountEgp,
      merchantOrderId,
      phone: normalizedPhone,
      email: doctorEmail,
      displayName: doctorName,
      source: 'paymob',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const [firstName, ...restName] = doctorName.split(' ');
    const lastName = restName.join(' ') || 'User';

    const paymentKeyData = await paymobRequest('/acceptance/payment_keys', {
      auth_token: authData.token,
      amount_cents: planDetails.amountCents,
      expiration: 3600,
      order_id: orderData.id,
      billing_data: {
        apartment: 'NA',
        email: doctorEmail,
        floor: 'NA',
        first_name: firstName || 'Doctor',
        last_name: lastName,
        street: 'NA',
        building: 'NA',
        phone_number: normalizedPhone,
        shipping_method: 'NA',
        postal_code: 'NA',
        city: 'Cairo',
        country: 'EG',
        state: 'Cairo',
      },
      currency: 'EGP',
      integration_id: Number(process.env.PAYMOB_INTEGRATION_ID),
      lock_order_when_paid: true,
    });

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKeyData.token}`;

    return res.status(200).json({
      url: iframeUrl,
      orderId: orderData.id,
    });
  } catch (error) {
    console.error('create-payment error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create payment session',
    });
  }
};
