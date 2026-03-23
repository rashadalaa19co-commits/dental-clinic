import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const FREE_LIMIT = 7;
const col = (uid, name) => collection(db, 'clinics', uid, name);

export async function checkAccess(uid, userInfo) {
  const ref = doc(db, 'clinics', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      isActive: false,
      patientCount: 0,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      displayName: userInfo?.displayName || '',
      email: userInfo?.email || '',
      photoURL: userInfo?.photoURL || '',
    });
    return { allowed: true, isActive: false, patientCount: 0 };
  }
  const data = snap.data();
  await updateDoc(ref, {
    lastLogin: serverTimestamp(),
    displayName: userInfo?.displayName || data.displayName || '',
    email: userInfo?.email || data.email || '',
    photoURL: userInfo?.photoURL || data.photoURL || '',
  });
  const isActive = data.isActive || false;
  const patientCount = data.patientCount || 0;
  const allowed = isActive || patientCount < FREE_LIMIT;
  return { allowed, isActive, patientCount };
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
