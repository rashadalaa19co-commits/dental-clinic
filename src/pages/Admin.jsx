import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

const ADMIN_EMAIL = 'rashadalaa19co@gmail.com';

const BILLING_OPTIONS = [
  { key: 'monthly', label: '1 Month', months: 1 },
  { key: 'semi', label: '6 Months', months: 6 },
  { key: 'yearly', label: '1 Year', months: 12 },
];

const PLAN_PRICES = {
  silver: { monthly: 99, semi: 299, yearly: 365 },
  gold: { monthly: 199, semi: 799, yearly: 999 },
};

function addMonthsSafe(date, months) {
  const result = new Date(date);
  const originalDate = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() < originalDate) {
    result.setDate(0);
  }
  return result;
}

function getExpiryFromNow(currentExpiry, months) {
  const now = new Date();
  const base = currentExpiry
    ? (currentExpiry.toDate ? currentExpiry.toDate() : new Date(currentExpiry))
    : now;
  const start = base > now ? base : now;
  return addMonthsSafe(start, months);
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planModal, setPlanModal] = useState(null);
  const [saving, setSaving] = useState(false);

  if (user?.email !== ADMIN_EMAIL) {
    return <div style={{ color: 'white', padding: 40, textAlign: 'center', fontSize: 20 }}>⛔ Access Denied</div>;
  }

  const load = async () => {
    setLoading(true);
    const clinicsSnap = await getDocs(collection(db, 'clinics'));
    const list = await Promise.all(clinicsSnap.docs.map(async d => {
      const data = { id: d.id, ...d.data() };
      try {
        const patientsSnap = await getDocs(collection(db, 'clinics', d.id, 'patients'));
        data.realPatientCount = patientsSnap.size;
        let photoCount = 0;
        patientsSnap.docs.forEach(p => {
          const photos = p.data().photos || [];
          photoCount += photos.length;
        });
        data.photoCount = photoCount;
      } catch (e) {
        data.realPatientCount = data.patientCount || 0;
        data.photoCount = 0;
      }
      return data;
    }));

    list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getDaysLeft = (ts) => {
    if (!ts) return null;
    const expiry = ts.toDate ? ts.toDate() : new Date(ts);
    return Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
  };

  const getLastLogin = (ts) => {
    if (!ts) return 'Never';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((new Date() - d) / (1000 * 60));
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const openPlanModal = (clinic, plan) => {
    setPlanModal({ clinic, plan, billing: 'monthly' });
  };

  const closePlanModal = () => {
    if (saving) return;
    setPlanModal(null);
  };

  const applyPlan = async () => {
    if (!planModal) return;

    const { clinic, plan, billing } = planModal;
    const months = BILLING_OPTIONS.find(item => item.key === billing)?.months || 1;
    const expiry = getExpiryFromNow(plan === 'gold' ? clinic.goldExpiry : clinic.silverExpiry, months);
    const expiryTs = Timestamp.fromDate(expiry);

    setSaving(true);
    try {
      const payload = {
        isActive: true,
        plan,
        billing,
        paymentMethod: 'manual',
        subscriptionStatus: 'active',
        updatedAt: Timestamp.now(),
        lastPaymentAmount: PLAN_PRICES[plan][billing],
      };

      if (plan === 'silver') {
        payload.hasGallery = false;
        payload.silverExpiry = expiryTs;
        payload.goldExpiry = null;
      } else {
        const currentSilverExpiry = clinic.silverExpiry?.toDate ? clinic.silverExpiry.toDate() : clinic.silverExpiry ? new Date(clinic.silverExpiry) : null;
        const silverBaseExpiry = currentSilverExpiry && currentSilverExpiry > expiry ? clinic.silverExpiry : expiryTs;
        payload.hasGallery = true;
        payload.silverExpiry = silverBaseExpiry;
        payload.goldExpiry = expiryTs;
      }

      await updateDoc(doc(db, 'clinics', clinic.id), payload);
      closePlanModal();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const removeGold = async (uid) => {
    await updateDoc(doc(db, 'clinics', uid), {
      hasGallery: false,
      plan: 'silver',
      goldExpiry: null,
      billing: 'monthly',
      updatedAt: Timestamp.now(),
    });
    load();
  };

  const lockAll = async (uid) => {
    if (!confirm('Lock this doctor completely? They will lose Silver and Gold access.')) return;
    await updateDoc(doc(db, 'clinics', uid), {
      isActive: false,
      hasGallery: false,
      plan: 'free',
      billing: null,
      silverExpiry: null,
      goldExpiry: null,
      subscriptionStatus: 'expired',
      updatedAt: Timestamp.now(),
    });
    load();
  };

  const filtered = useMemo(() => users.filter(u => (
    !search ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )), [users, search]);

  const total = users.length;
  const silver = users.filter(u => u.plan === 'silver' && u.isActive && !u.hasGallery).length;
  const gold = users.filter(u => u.plan === 'gold' && u.hasGallery).length;
  const free = users.filter(u => !u.isActive || u.plan === 'free').length;

  return (
    <div className="motionPage" style={{ position: 'relative' }}>
      <h1 className="motionHero" style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>👑 Admin Panel</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>Manage subscriptions by plan and duration</p>

      <div className="motionCard motionCardDelay1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: total, color: 'var(--accent)', icon: '👥' },
          { label: 'Free', value: free, color: 'var(--muted)', icon: '🆓' },
          { label: 'Silver', value: silver, color: '#94a3b8', icon: '🥈' },
          { label: 'Gold', value: gold, color: '#f59e0b', icon: '🥇' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="motionCard motionCardDelay2" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', marginBottom: 16, maxWidth: 320 }}>
        <span style={{ color: 'var(--muted)' }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          style={{ border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', fontSize: 14, width: '100%' }}
        />
      </div>

      <div className="motionCard motionCardDelay3" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1120 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)', fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Doctor</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Last Login</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Plan</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Billing</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Patients</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Photos</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Silver Expiry</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Gold Expiry</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading...</td></tr>
            ) : filtered.map(u => {
              const silverDays = getDaysLeft(u.silverExpiry);
              const goldDays = getDaysLeft(u.goldExpiry);
              const plan = u.plan || 'free';
              const billingLabel = u.billing === 'semi' ? '6 months' : u.billing === 'yearly' ? 'yearly' : u.billing === 'monthly' ? 'monthly' : '—';

              return (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border)', fontSize: 14 }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,212,255,0.15)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {u.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.displayName || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || u.id.slice(0, 16) + '...'}</div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--muted)' }}>{getLastLogin(u.lastLogin)}</td>

                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: plan === 'gold' ? 'rgba(245,158,11,0.15)' : plan === 'silver' ? 'rgba(148,163,184,0.15)' : 'rgba(107,114,128,0.1)',
                      color: plan === 'gold' ? '#f59e0b' : plan === 'silver' ? '#94a3b8' : 'var(--muted)' }}>
                      {plan === 'gold' ? '🥇 Gold' : plan === 'silver' ? '🥈 Silver' : '🆓 Free'}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px', textTransform: 'capitalize', color: 'var(--muted)' }}>{billingLabel}</td>

                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--accent)' }}>{u.realPatientCount ?? u.patientCount ?? 0}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--proth)' }}>{u.photoCount || 0} 📸</td>

                  <td style={{ padding: '14px 16px' }}>
                    {u.isActive && u.silverExpiry ? (
                      <>
                        <div style={{ color: '#7dd3fc', fontWeight: 700 }}>{silverDays} days left</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(u.silverExpiry)}</div>
                      </>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {u.hasGallery && u.goldExpiry ? (
                      <>
                        <div style={{ color: '#fbbf24', fontWeight: 700 }}>{goldDays} days left</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(u.goldExpiry)}</div>
                      </>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        onClick={() => openPlanModal(u, 'silver')}
                        style={{ padding: '5px 10px', background: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        🥈 Silver
                      </button>

                      <button
                        onClick={() => openPlanModal(u, 'gold')}
                        style={{ padding: '5px 10px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        🥇 Gold
                      </button>

                      {u.hasGallery ? (
                        <button
                          onClick={() => removeGold(u.id)}
                          style={{ padding: '5px 10px', background: 'rgba(248,81,73,0.1)', color: 'var(--danger)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          ✕ Gold
                        </button>
                      ) : null}

                      {u.isActive ? (
                        <button
                          onClick={() => lockAll(u.id)}
                          style={{ padding: '5px 10px', background: 'rgba(107,114,128,0.1)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                        >
                          🔒
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {planModal ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 60 }} onClick={closePlanModal}>
          <div style={{ width: '100%', maxWidth: 460, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.35)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>Manual activation</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{planModal.plan === 'gold' ? '🥇 Gold' : '🥈 Silver'} for {planModal.clinic.displayName || 'doctor'}</div>
              </div>
              <button onClick={closePlanModal} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>
              Choose exactly how long this subscription should run. It will expire automatically when the selected period ends.
            </div>

            <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
              {BILLING_OPTIONS.map(option => {
                const selected = planModal.billing === option.key;
                const price = PLAN_PRICES[planModal.plan][option.key];
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setPlanModal(prev => ({ ...prev, billing: option.key }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 14,
                      border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: selected ? 'rgba(0,212,255,0.08)' : 'var(--surface2)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{option.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Expires automatically after {option.months} {option.months === 1 ? 'month' : 'months'}</div>
                    </div>
                    <div style={{ fontWeight: 800 }}>{price} EGP</div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closePlanModal} type="button" style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={applyPlan} type="button" disabled={saving} style={{ padding: '10px 14px', borderRadius: 12, border: 'none', background: planModal.plan === 'gold' ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : 'linear-gradient(135deg, #94a3b8, #cbd5e1)', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Apply subscription'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
