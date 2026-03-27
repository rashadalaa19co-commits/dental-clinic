import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { checkAccess } from '../services/db';
import styles from './Subscribe.module.css';

const BILLING_META = {
  monthly: { label: 'Monthly', period: '/ month' },
  semi: { label: '6 Months', period: '/ 6 months' },
  yearly: { label: 'Yearly', period: '/ year' },
};

const PLAN_PRICES = {
  silver: {
    monthly: { current: '99 EGP', old: null },
    semi: { current: '299 EGP', old: '600 EGP' },
    yearly: { current: '365 EGP 🔥', old: '1200 EGP' },
  },
  gold: {
    monthly: { current: '199 EGP', old: null },
    semi: { current: '799 EGP', old: '1200 EGP' },
    yearly: { current: '999 EGP 🔥', old: '2400 EGP' },
  },
};

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    badge: 'Start Here',
    features: [
      { text: 'Up to 10 patients', available: true },
      { text: 'Appointments management', available: true },
      { text: 'Simple dashboard', available: true },
      { text: 'Gallery', available: false },
      { text: 'WhatsApp reminders', available: false },
    ],
  },
  {
    key: 'silver',
    name: 'Silver',
    badge: 'Value',
    features: [
      { text: 'Unlimited patients', available: true },
      { text: 'Appointments management', available: true },
      { text: 'Full patient records', available: true },
      { text: 'Smart Analysis', available: true },
      { text: 'Gallery', available: false },
      { text: 'WhatsApp reminders', available: false },
    ],
  },
  {
    key: 'gold',
    name: 'Gold',
    badge: 'Popular Choice',
    features: [
      { text: 'Unlimited patients', available: true },
      { text: 'Appointments management', available: true },
      { text: 'Full patient records', available: true },
      { text: 'Smart Analysis', available: true },
      { text: 'Gallery feature', available: true },
      { text: 'WhatsApp reminders', available: true },
    ],
  },
];

function getCurrentPackage(access) {
  if (!access) return 'free';
  if (access.plan === 'gold' && access.billing) return `gold-${access.billing}`;
  if (access.plan === 'silver' && access.billing) return `silver-${access.billing}`;
  return access.plan || 'free';
}

export default function Subscribe() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState('monthly');
  const [phone, setPhone] = useState('');
  const [payingPlan, setPayingPlan] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    checkAccess(user.uid, user)
      .then(setAccess)
      .finally(() => setLoading(false));
  }, [user]);

  const currentPackage = getCurrentPackage(access);
  const currentPlan = access?.plan || 'free';
  const currentBilling = access?.billing || null;
  const currentPackageLabel = currentPlan === 'free'
    ? 'FREE'
    : `${currentPlan.toUpperCase()} • ${BILLING_META[currentBilling]?.label || 'Custom'}`;

  const subscribeLink = useMemo(() => {
    const doctorName = user?.displayName || 'Doctor';

    return (planName) => {
      const billingLabel = BILLING_META[billing]?.label || 'Monthly';
      const text = encodeURIComponent(
        `Hi, I want a manual subscription for the ${planName} plan (${billingLabel}) for ${doctorName}.`
      );

      return `https://wa.me/201555354570?text=${text}`;
    };
  }, [user, billing]);

  const getPriceData = (planKey) => {
    if (planKey === 'free') {
      return { current: '0 EGP', old: null, period: '/ forever' };
    }

    const packagePrice = PLAN_PRICES[planKey]?.[billing];
    return {
      current: packagePrice?.current || '—',
      old: packagePrice?.old || null,
      period: BILLING_META[billing]?.period || '',
    };
  };

  const getButtonText = (planKey) => {
    const selectedPackage = `${planKey}-${billing}`;

    if (planKey === 'free') return 'Back to Dashboard';
    if (selectedPackage === currentPackage) return 'Current Package';
    if (payingPlan === planKey) return 'Opening payment...';

    if (planKey === currentPlan && currentBilling && currentBilling !== billing) {
      return `Upgrade to ${BILLING_META[billing]?.label}`;
    }

    if (currentPlan === 'free') return `Pay ${BILLING_META[billing]?.label}`;
    return `Switch to ${planKey === 'gold' ? 'Gold' : 'Silver'} ${BILLING_META[billing]?.label}`;
  };

  const handlePlanClick = async (planKey) => {
    const selectedPackage = `${planKey}-${billing}`;

    if (selectedPackage === currentPackage) return;

    if (planKey === 'free') {
      navigate('/');
      return;
    }

    setError('');
    setPayingPlan(planKey);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/paymob/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          plan: planKey,
          billing,
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to start payment');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err.message || 'Failed to start payment');
      setPayingPlan('');
    }
  };

  const handleManualClick = (planKey) => {
    window.open(subscribeLink(planKey), '_blank');
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={`${styles.page} motionPage`}>
      <div className={`${styles.hero} motionHero`}>
        <div>
          <div className={styles.eyebrow}>Plans & Pricing</div>
          <h1 className={styles.title}>Choose the plan and the duration that fit your clinic</h1>
          <p className={styles.sub}>
            Every plan is tied to a specific duration. Monthly, 6 months, and yearly are treated as separate subscriptions, so nobody can pay for one month and get one year.
          </p>
        </div>

        <div className={styles.currentBox}>
          <div className={styles.currentLabel}>Current package</div>
          <div className={styles.currentValue}>{currentPackageLabel}</div>
          <div className={styles.currentHint}>
            {currentPlan === 'free' && 'You can add up to 10 patients on the free plan.'}
            {currentPlan === 'silver' && `Unlimited patients are unlocked${currentBilling ? ` on the ${BILLING_META[currentBilling]?.label} package` : ''}.`}
            {currentPlan === 'gold' && `Gallery and WhatsApp are unlocked${currentBilling ? ` on the ${BILLING_META[currentBilling]?.label} package` : ''}.`}
          </div>
          {(access?.daysLeft || access?.goldDaysLeft) ? (
            <div className={styles.currentHint} style={{ marginTop: 8 }}>
              {currentPlan === 'gold'
                ? `Gold expires in ${access.goldDaysLeft ?? access.daysLeft} day(s).`
                : `Silver expires in ${access.daysLeft} day(s).`}
            </div>
          ) : null}
        </div>
      </div>

      <div className={`${styles.checkoutBox} motionCard motionCardDelay1`}>
        <div className={styles.inputLabel}>Phone number for Paymob checkout</div>
        <input
          className={styles.phoneInput}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01xxxxxxxxx"
          inputMode="tel"
        />
        <div className={styles.checkoutHint}>
          Use your Egyptian mobile number. Paymob is automatic. Manual payment stays available under each paid package as a backup.
        </div>
        {error ? <div className={styles.errorBox}>{error}</div> : null}
      </div>

      <div className={`${styles.toggleWrap} motionCard motionCardDelay2`}>
        <button
          className={`${styles.toggleBtn} ${billing === 'monthly' ? styles.toggleActive : ''}`}
          onClick={() => setBilling('monthly')}
        >
          Monthly
        </button>
        <button
          className={`${styles.toggleBtn} ${billing === 'semi' ? styles.toggleActive : ''}`}
          onClick={() => setBilling('semi')}
        >
          6 Months
        </button>
        <button
          className={`${styles.toggleBtn} ${billing === 'yearly' ? styles.toggleActive : ''}`}
          onClick={() => setBilling('yearly')}
        >
          Yearly
        </button>
      </div>

      <div className={`${styles.grid} motionCard motionCardDelay3`}>
        {PLANS.map((plan) => {
          const selectedPackage = `${plan.key}-${billing}`;
          const isCurrent = selectedPackage === currentPackage;
          const isSilver = plan.key === 'silver';
          const isGold = plan.key === 'gold';
          const priceData = getPriceData(plan.key);
          const isPaidPlan = plan.key !== 'free';

          return (
            <div
              key={plan.key}
              className={`${styles.card} ${isSilver ? styles.silverCard : ''} ${isGold ? styles.goldCard : ''} ${isCurrent ? styles.currentCard : ''}`}
            >
              <div className={styles.cardTop}>
                <div
                  className={`${styles.badge} ${isSilver ? styles.badgeSilver : ''} ${isGold ? styles.badgeGold : ''}`}
                >
                  {plan.badge}
                </div>

                <h2 className={styles.planName}>{plan.name}</h2>
                {plan.key !== 'free' ? <div className={styles.currentHint}>{BILLING_META[billing].label} package</div> : null}

                <div className={styles.priceBlock}>
                  {priceData.old && <div className={styles.oldPrice}>{priceData.old}</div>}
                  <div className={styles.priceRow}>
                    <span className={styles.price}>{priceData.current}</span>
                    <span className={styles.period}>{priceData.period}</span>
                  </div>
                </div>
              </div>

              <ul className={styles.features}>
                {plan.features.map((feature) => (
                  <li
                    key={feature.text}
                    className={`${styles.featureItem} ${!feature.available ? styles.featureOff : ''}`}
                  >
                    <span className={feature.available ? styles.check : styles.cross}>
                      {feature.available ? '✓' : '✕'}
                    </span>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <div className={styles.actionsWrap}>
                <button
                  className={`${styles.cta} ${isCurrent ? styles.currentBtn : ''} ${isSilver ? styles.silverBtn : ''} ${isGold ? styles.goldBtn : ''}`}
                  onClick={() => handlePlanClick(plan.key)}
                  disabled={payingPlan === plan.key || isCurrent}
                >
                  {getButtonText(plan.key)}
                </button>

                {isPaidPlan ? (
                  <button
                    className={styles.secondaryBtn}
                    onClick={() => handleManualClick(plan.key)}
                    type="button"
                  >
                    Manual payment / Contact us
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
