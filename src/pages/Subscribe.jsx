import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { checkAccess } from '../services/db';
import styles from './Subscribe.module.css';

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

export default function Subscribe() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState('monthly');

  useEffect(() => {
    if (!user) return;

    checkAccess(user.uid, user)
      .then(setAccess)
      .finally(() => setLoading(false));
  }, [user]);

  const currentPlan = access?.plan || 'free';

  const subscribeLink = useMemo(() => {
    const doctorName = user?.displayName || 'Doctor';
    return (planName) => {
      const billingLabel =
        billing === 'monthly' ? 'monthly' : billing === 'semi' ? '6 months' : 'yearly';

      const text = encodeURIComponent(
        `Hi, I want to subscribe to the ${planName} plan (${billingLabel}) for ${doctorName}.`
      );
      return `https://wa.me/201010562664?text=${text}`;
    };
  }, [user, billing]);

  const getPriceData = (planKey) => {
    if (planKey === 'free') {
      return { current: '0 EGP', old: null, period: '/ forever' };
    }

    if (planKey === 'silver') {
      if (billing === 'monthly') return { current: '99 EGP', old: null, period: '/ month' };
      if (billing === 'semi') return { current: '299 EGP', old: '600 EGP', period: '/ 6 months' };
      return { current: '365 EGP 🔥', old: '1200 EGP', period: '/ year' };
    }

    if (billing === 'monthly') return { current: '199 EGP', old: null, period: '/ month' };
    if (billing === 'semi') return { current: '799 EGP', old: '1200 EGP', period: '/ 6 months' };
    return { current: '1599 EGP', old: '2400 EGP', period: '/ year' };
  };

  const getButtonText = (planKey) => {
    if (planKey === currentPlan) return 'Current Plan';
    if (planKey === 'free') return 'Back to Dashboard';
    if (planKey === 'silver') return 'Choose Silver';
    return 'Choose Gold';
  };

  const handlePlanClick = (planKey) => {
    if (planKey === currentPlan) return;
    if (planKey === 'free') {
      navigate('/');
      return;
    }
    window.open(subscribeLink(planKey), '_blank');
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={`pageEnter ${styles.page}`}>
      <div className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>Plans & Pricing</div>
          <h1 className={styles.title}>Choose the plan that fits your clinic</h1>
          <p className={styles.sub}>
            Start free, upgrade anytime, and pick the billing cycle that works best for your clinic.
          </p>
        </div>

        <div className={styles.currentBox}>
          <div className={styles.currentLabel}>Current plan</div>
          <div className={styles.currentValue}>{currentPlan.toUpperCase()}</div>
          <div className={styles.currentHint}>
            {currentPlan === 'free' && 'You can add up to 10 patients on the free plan.'}
            {currentPlan === 'silver' && 'Unlimited patients are unlocked for your clinic.'}
            {currentPlan === 'gold' && 'Gallery and WhatsApp are unlocked for your clinic.'}
          </div>
        </div>
      </div>

      <div className={styles.toggleWrap}>
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

      <div className={styles.grid}>
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isSilver = plan.key === 'silver';
          const isGold = plan.key === 'gold';
          const priceData = getPriceData(plan.key);

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

              <button
                className={`${styles.cta} ${isCurrent ? styles.currentBtn : ''} ${isSilver ? styles.silverBtn : ''} ${isGold ? styles.goldBtn : ''}`}
                onClick={() => handlePlanClick(plan.key)}
              >
                {getButtonText(plan.key)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
