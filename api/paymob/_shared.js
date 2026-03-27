const PLAN_CONFIG = {
  silver: {
    monthly: { amountCents: 9900, amountEgp: 99, months: 1, label: 'AuraDent Silver Monthly' },
    semi: { amountCents: 29900, amountEgp: 299, months: 6, label: 'AuraDent Silver 6 Months' },
    yearly: { amountCents: 36500, amountEgp: 365, months: 12, label: 'AuraDent Silver Yearly' },
  },
  gold: {
    monthly: { amountCents: 19900, amountEgp: 199, months: 1, label: 'AuraDent Gold Monthly' },
    semi: { amountCents: 79900, amountEgp: 799, months: 6, label: 'AuraDent Gold 6 Months' },
    yearly: { amountCents: 99900, amountEgp: 999, months: 12, label: 'AuraDent Gold Yearly' },
  },
};

function getPlanDetails(plan, billing) {
  return PLAN_CONFIG[plan]?.[billing] || null;
}

function addMonthsSafe(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

module.exports = {
  PLAN_CONFIG,
  getPlanDetails,
  addMonthsSafe,
};
