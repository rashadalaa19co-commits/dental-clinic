import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const FREE_LIMIT = 10;
const col = (uid, name) => collection(db, 'clinics', uid, name);

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
    });
    return { allowed: true, isActive: false, hasGallery: false, patientCount: 0, plan: 'free', daysLeft: null, goldDaysLeft: null };
  }

  const data = snap.data();

  // Check silver expiry — if one-time purchase, silverExpiry = null means lifetime
  let isActive = data.isActive || false;
  let hasGallery = data.hasGallery || false;
  let plan = data.plan || 'free';
  let daysLeft = null;
  let goldDaysLeft = null;

  // Check silver expiry (monthly silver)
  if (isActive && data.silverExpiry) {
    const expiry = data.silverExpiry.toDate ? data.silverExpiry.toDate() : new Date(data.silverExpiry);
    if (expiry < now) {
      isActive = false;
      plan = 'free';
      await updateDoc(ref, { isActive: false, plan: 'free' });
    } else {
      daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }
  }

  // Check gold expiry (monthly gold)
  if (hasGallery && data.goldExpiry) {
    const expiry = data.goldExpiry.toDate ? data.goldExpiry.toDate() : new Date(data.goldExpiry);
    if (expiry < now) {
      hasGallery = false;
      if (plan === 'gold') plan = 'silver';
      await updateDoc(ref, { hasGallery: false, plan: isActive ? 'silver' : 'free' });
    } else {
      goldDaysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }
  }

  await updateDoc(ref, {
    lastLogin: serverTimestamp(),
    displayName: userInfo?.displayName || data.displayName || '',
    email: userInfo?.email || data.email || '',
    photoURL: userInfo?.photoURL || data.photoURL || '',
  });

  const patientCount = data.patientCount || 0;
  const allowed = isActive || patientCount < FREE_LIMIT;
  return { allowed, isActive, hasGallery, patientCount, plan, daysLeft, goldDaysLeft };
}

export async function canAddPatient(uid) {
  const { isActive, patientCount } = await checkAccess(uid);
  if (isActive) return true;
  return patientCount < FREE_LIMIT;
}

export async function getPatients(uid) {
  const q = query(col(uid, 'patients'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addPatient(uid, data) {
  const canAdd = await canAddPatient(uid);
  if (!canAdd) throw new Error('LIMIT_REACHED');
  const ref = await addDoc(col(uid, 'patients'), { ...data, createdAt: serverTimestamp() });
  const patients = await getPatients(uid);
  await updateDoc(doc(db, 'clinics', uid), { patientCount: patients.length });
  return ref;
}

export async function updatePatient(uid, pid, data) {
  const { endoVisits, operativeVisits, surgeryVisits, prothVisits, ...rest } = data;
  await updateDoc(doc(db, 'clinics', uid, 'patients', pid), {
    ...rest,
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
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
