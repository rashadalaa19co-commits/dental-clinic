import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// Each clinic is isolated by uid (Google user id)
const col = (uid, name) => collection(db, 'clinics', uid, name);

// ── PATIENTS ──────────────────────────────────────────
export async function getPatients(uid) {
  const q = query(col(uid, 'patients'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addPatient(uid, data) {
  return addDoc(col(uid, 'patients'), { ...data, createdAt: serverTimestamp() });
}

export async function updatePatient(uid, pid, data) {
  return updateDoc(doc(db, 'clinics', uid, 'patients', pid), data);
}

export async function deletePatient(uid, pid) {
  // delete subcollections first
  for (const sub of ['endoVisits', 'operativeVisits', 'surgeryVisits', 'prothVisits']) {
    const snap = await getDocs(col(uid, 'patients').path ? 
      collection(db, 'clinics', uid, 'patients', pid, sub) : 
      collection(db, 'clinics', uid, 'patients', pid, sub));
    for (const d of snap.docs) await deleteDoc(d.ref);
  }
  return deleteDoc(doc(db, 'clinics', uid, 'patients', pid));
}

// ── VISITS (sub-collections) ──────────────────────────
export async function getVisits(uid, pid, type) {
  const snap = await getDocs(
    query(collection(db, 'clinics', uid, 'patients', pid, type), orderBy('date', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addVisit(uid, pid, type, data) {
  return addDoc(collection(db, 'clinics', uid, 'patients', pid, type), {
    ...data, createdAt: serverTimestamp()
  });
}

export async function deleteVisit(uid, pid, type, vid) {
  return deleteDoc(doc(db, 'clinics', uid, 'patients', pid, type, vid));
}

// ── APPOINTMENTS ──────────────────────────────────────
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
