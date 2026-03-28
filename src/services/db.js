import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const FREE_LIMIT = 10;
const col = (uid, name) => collection(db, 'clinics', uid, name);


const normalizeTreatmentType = (value = '') => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.includes('endo') || raw.includes('rct')) return 'Endo';
  if (raw.includes('operative') || raw.includes('filling') || raw.includes('restoration')) return 'Operative';
  if (raw.includes('surgery') || raw.includes('extraction') || raw.includes('surgical')) return 'Surgery';
  if (raw.includes('proth') || raw.includes('fixed') || raw.includes('crown') || raw.includes('bridge') || raw.includes('denture')) return 'Fixed';
  return value || '';
};

const buildTreatmentsFromLegacy = (data = {}) => {
  const toDateValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value?.toDate) return value.toDate().toISOString();
    if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
    return '';
  };

  const makeTreatment = (type, row = {}, index = 0) => ({
    id: row.id || `${type.toLowerCase()}_${index}_${row.date || row.toothName || row.toothNum || row.teeth || 'item'}`,
    type,
    tooth: row.toothName || row.toothNum || row.teeth || data.tooth || '',
    date: toDateValue(row.date || data.dateStart || ''),
    status: row.status || data.status || 'Not started',
    details: row,
  });

  const legacy = [
    ...(data.endoVisits || []).map((row, index) => makeTreatment('Endo', row, index)),
    ...(data.operativeVisits || []).map((row, index) => makeTreatment('Operative', row, index)),
    ...(data.surgeryVisits || []).map((row, index) => makeTreatment('Surgery', row, index)),
    ...(data.prothVisits || []).map((row, index) => makeTreatment('Fixed', row, index)),
  ];

  if (!legacy.length && data.procedure) {
    legacy.push({
      id: 'legacy_primary',
      type: normalizeTreatmentType(data.procedure),
      tooth: data.tooth || '',
      date: toDateValue(data.dateStart || ''),
      status: data.status || 'Not started',
      details: {},
    });
  }

  return legacy;
};

const buildPatientDerived = (data = {}) => {
  const rawTreatments = Array.isArray(data.treatments) && data.treatments.length ? data.treatments : buildTreatmentsFromLegacy(data);

  const treatments = rawTreatments.map((t, index) => ({
    id: t.id || `treatment_${index}`,
    type: normalizeTreatmentType(t.type || t.procedure || ''),
    tooth: t.tooth || '',
    date: t.date || '',
    status: t.status || data.status || 'Not started',
    details: t.details || {},
  }));

  const sortedTreatments = [...treatments].sort((a, b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    return bd - ad;
  });

  const latestTreatment = sortedTreatments[0] || null;
  const proceduresSummary = [...new Set(treatments.map((t) => t.type).filter(Boolean))];
  const treatedTeeth = [...new Set(treatments.map((t) => t.tooth).filter(Boolean))];

  return {
    treatments,
    lastProcedure: latestTreatment?.type || normalizeTreatmentType(data.lastProcedure || data.procedure || ''),
    proceduresSummary,
    treatedTeeth,
    totalTreatments: treatments.length,
  };
};


export async function checkAccess(uid, userInfo) {
  const ref = doc(db, 'clinics', uid);
  const snap = await getDoc(ref);
  const now = new Date();

  if (!snap.exists()) {
    await setDoc(ref, {
      plan: 'free',
      isActive: false,
      hasGallery: false,
      patientCount: 0,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      displayName: userInfo?.displayName || '',
      email: userInfo?.email || '',
      photoURL: userInfo?.photoURL || '',
      silverExpiry: null,
      goldExpiry: null,
      billing: null,
      paymentMethod: null,
      subscriptionStatus: 'free',
      updatedAt: serverTimestamp(),
    });
    return { allowed: true, isActive: false, hasGallery: false, patientCount: 0, plan: 'free', daysLeft: null, goldDaysLeft: null, billing: null };
  }

  const data = snap.data();

  let isActive = data.isActive || false;
  let hasGallery = data.hasGallery || false;
  let plan = data.plan || 'free';
  let billing = data.billing || null;
  let paymentMethod = data.paymentMethod || null;
  let subscriptionStatus = data.subscriptionStatus || (plan === 'free' ? 'free' : 'active');
  let daysLeft = null;
  let goldDaysLeft = null;

  if (isActive && data.silverExpiry) {
    const expiry = data.silverExpiry.toDate ? data.silverExpiry.toDate() : new Date(data.silverExpiry);
    if (expiry < now) {
      isActive = false;
      hasGallery = false;
      plan = 'free';
      billing = null;
      paymentMethod = null;
      subscriptionStatus = 'expired';
      await updateDoc(ref, {
        isActive: false,
        hasGallery: false,
        plan: 'free',
        billing: null,
        paymentMethod: null,
        subscriptionStatus: 'expired',
        silverExpiry: null,
        goldExpiry: null,
        updatedAt: serverTimestamp(),
      });
    } else {
      daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }
  }

  if (hasGallery && data.goldExpiry) {
    const expiry = data.goldExpiry.toDate ? data.goldExpiry.toDate() : new Date(data.goldExpiry);
    if (expiry < now) {
      hasGallery = false;
      plan = isActive ? 'silver' : 'free';
      subscriptionStatus = isActive ? 'active' : 'expired';
      await updateDoc(ref, {
        hasGallery: false,
        plan,
        goldExpiry: null,
        updatedAt: serverTimestamp(),
      });
    } else {
      goldDaysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }
  }

  await updateDoc(ref, {
    lastLogin: serverTimestamp(),
    displayName: userInfo?.displayName || data.displayName || '',
    email: userInfo?.email || data.email || '',
    photoURL: userInfo?.photoURL || data.photoURL || '',
    updatedAt: serverTimestamp(),
  });

  const patientCount = data.patientCount || 0;
  const allowed = isActive || patientCount < FREE_LIMIT;
  return { allowed, isActive, hasGallery, patientCount, plan, billing, paymentMethod, subscriptionStatus, daysLeft, goldDaysLeft };
}

export async function canAddPatient(uid) {
  const { isActive, patientCount } = await checkAccess(uid);
  if (isActive) return true;
  return patientCount < FREE_LIMIT;
}

export async function getPatients(uid) {
  const q = query(col(uid, 'patients'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, ...buildPatientDerived(data) };
  });
}

export async function addPatient(uid, data) {
  const canAdd = await canAddPatient(uid);
  if (!canAdd) throw new Error('LIMIT_REACHED');
  const prepared = { ...data, ...buildPatientDerived(data) };
  const ref = await addDoc(col(uid, 'patients'), { ...prepared, createdAt: serverTimestamp() });
  const patients = await getPatients(uid);
  await updateDoc(doc(db, 'clinics', uid), { patientCount: patients.length });
  return ref;
}

export async function updatePatient(uid, pid, data) {
  const { endoVisits, operativeVisits, surgeryVisits, prothVisits, ...rest } = data;
  const prepared = buildPatientDerived({ ...rest, endoVisits, operativeVisits, surgeryVisits, prothVisits });
  await updateDoc(doc(db, 'clinics', uid, 'patients', pid), {
    ...rest,
    ...prepared,
    endoVisits: endoVisits || [],
    operativeVisits: operativeVisits || [],
    surgeryVisits: surgeryVisits || [],
    prothVisits: prothVisits || [],
  });
}

export async function deletePatient(uid, pid) {
  for (const sub of ['endoVisits', 'operativeVisits', 'surgeryVisits', 'prothVisits']) {
    const snap = await getDocs(collection(db, 'clinics', uid, 'patients', pid, sub));
    for (const d of snap.docs) await deleteDoc(d.ref);
  }
  await deleteDoc(doc(db, 'clinics', uid, 'patients', pid));
  const patients = await getPatients(uid);
  await updateDoc(doc(db, 'clinics', uid), { patientCount: patients.length });
}

export async function getVisits(uid, pid, type) {
  const snap = await getDocs(
    query(collection(db, 'clinics', uid, 'patients', pid, type), orderBy('date', 'desc'))
  );
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, ...buildPatientDerived(data) };
  });
}

export async function addVisit(uid, pid, type, data) {
  const patientRef = doc(db, 'clinics', uid, 'patients', pid);
  const snap = await getDoc(patientRef);
  if (!snap.exists()) return;
  const current = snap.data()[type] || [];
  const updated = Array.isArray(data) ? [...current, ...data] : [...current, data];
  return updateDoc(patientRef, { [type]: updated });
}

export async function deleteVisit(uid, pid, type, vid) {
  return deleteDoc(doc(db, 'clinics', uid, 'patients', pid, type, vid));
}

export async function getAppointments(uid) {
  const q = query(col(uid, 'appointments'), orderBy('datetime', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, ...buildPatientDerived(data) };
  });
}

export async function addAppointment(uid, data) {
  return addDoc(col(uid, 'appointments'), { ...data, createdAt: serverTimestamp() });
}

export async function updateAppointment(uid, aid, data) {
  return updateDoc(doc(db, 'clinics', uid, 'appointments', aid), data);
}

export async function deleteAppointment(uid, aid) {
  return deleteDoc(doc(db, 'clinics', uid, 'appointments', aid));
}
