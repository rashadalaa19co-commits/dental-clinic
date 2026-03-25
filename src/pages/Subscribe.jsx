import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { checkAccess } from '../services/db';
import styles from './Subscribe.module.css';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '0 EGP',
    period: '/ month',
    badge: 'Start Here',
    features: [
      { text: 'Up to 10 patients', available: true },
      { text: 'Appointments management', available: true },
      { text: 'Patient details', available: true },
      { text: 'Simple dashboard', available: true },
      { text: 'Gallery', available: false },
      { text: 'WhatsApp reminders', available: false },
    ],
  },
  {
    key: 'silver',
    name: 'Silver',
    price: '99 EGP',
    period: '/ month',
    badge: 'Best Value',
    features: [
      { text: 'Unlimited patients', available: true },
      { text: 'Appointments management', available: true },
      { text: 'Full patient records', available: true },
      { text: 'Simple dashboard', available: true },
      { text: 'Gallery', available: false },
      { text: 'WhatsApp reminders', available: false },
    ],
  },
  {
    key: 'gold',
    name: 'Gold',
    price: '149 EGP',
    period: '/ month',
    badge: 'Most Popular',
    features: [
      { text: 'Unlimited patients', available: true },
      { text: 'Appointments management', available: true },
      { text: 'Full patient records', available: true },
      { text: 'Gallery feature', available: true },
      { text: 'WhatsApp reminders', available: true },
      { text: 'Best for active clinics', available: true },
    ],
  },
];

export default function Subscribe() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const text = encodeURIComponent(
        `Hi, I want to subscribe to the ${planName} plan for ${doctorName}.`
      );
      return `https://wa.me/201010562664?text=${text}`;
    };
  }, [user]);

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
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>Plans & Pricing</div>
          <h1 className={styles.title}>Choose the plan that fits your clinic</h1>
          <p className={styles.sub}>
            Start free, upgrade anytime, and unlock more powerful tools as your clinic grows.
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

      <div className={styles.grid}>
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isGold = plan.key === 'gold';

          return (
            <div
              key={plan.key}
              className={`${styles.card} ${isGold ? styles.highlight : ''} ${isCurrent ? styles.currentCard : ''}`}
            >
              <div className={styles.cardTop}>
                <div className={`${styles.badge} ${isGold ? styles.badgeGold : ''}`}>{plan.badge}</div>
                <h2 className={styles.planName}>{plan.name}</h2>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{plan.price}</span>
                  <span className={styles.period}>{plan.period}</span>
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
                className={`${styles.cta} ${isCurrent ? styles.currentBtn : ''} ${isGold ? styles.goldBtn : ''}`}
                onClick={() => handlePlanClick(plan.key)}
              >
                {getButtonText(plan.key)}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className={styles.compareHeader}>
          <h3 className={styles.compareTitle}>Quick comparison</h3>
          <p className={styles.compareSub}>Everything you discussed in one place.</p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free</th>
                <th>Silver</th>
                <th>Gold</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Patients</td>
                <td>10 max</td>
                <td>Unlimited</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Appointments</td>
                <td>Yes</td>
                <td>Yes</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Patient Info</td>
                <td>Basic</td>
                <td>Full</td>
                <td>Full</td>
              </tr>
              <tr>
                <td>Gallery</td>
                <td>No</td>
                <td>No</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>WhatsApp</td>
                <td>No</td>
                <td>No</td>
                <td>Yes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
