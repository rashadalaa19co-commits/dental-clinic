import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { checkAccess, getAppointments, addAppointment, updateAppointment, deleteAppointment, getPatients, addPatient } from '../services/db';
import { format, isToday, isTomorrow, parseISO, isAfter, startOfDay, differenceInMinutes, compareAsc, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import styles from './Appointments.module.css';

const STATUS_OPTIONS = ['Scheduled', 'Confirmed', 'Done', 'Cancelled', 'No Show'];
const TYPE_OPTIONS = ['Endo', 'Operative', 'Surgery', 'Proth', 'Scaling', 'Consultation', 'Follow Up', 'Other'];
const emptyForm = {
  patientName: '',
  patientId: '',
  patientPhone: '',
  datetime: '',
  type: '',
  status: 'Scheduled',
  notes: '',
};

const normalizePhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('20')) return digits;
  if (digits.startsWith('0')) return `20${digits.slice(1)}`;
  return digits;
};

const normalizeName = (name = '') => String(name || '').trim().toLowerCase();

function PatientFolder({ pf, nav, onEdit, onDelete, onStatus, onWhatsApp }) {
  const [open, setOpen] = useState(false);
  const upcoming = pf.appts.filter((a) => a.datetime && isAfter(parseISO(a.datetime), new Date())).length;
  const past = pf.appts.length - upcoming;

  return (
    <div className={styles.folderCard}>
      <div onClick={() => setOpen((o) => !o)} className={styles.folderHead}>
        <div className={styles.folderAvatar}>{pf.name?.[0]?.toUpperCase() || '?'}</div>
        <div className={styles.folderInfo}>
          <div className={styles.folderName}>{pf.name}</div>
          <div className={styles.folderMeta}>{past} past · {upcoming} upcoming</div>
        </div>
        <div className={styles.folderActions}>
          {pf.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nav(`/patients/${pf.id}`);
              }}
              className={styles.profileBtn}
            >
              Profile
            </button>
          )}
          <span className={styles.folderChevron}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className={styles.folderBody}>
          {pf.appts
            .slice()
            .sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''))
            .map((a, i) => {
              const d = a.datetime ? parseISO(a.datetime) : null;
              const isPast = d && !isAfter(d, new Date());
              return (
                <div key={a.id || i} className={styles.folderItem}>
                  <div className={`${styles.folderDot} ${isPast ? styles.folderDotPast : styles.folderDotUpcoming}`}></div>
                  <div className={styles.folderItemInfo}>
                    <div className={styles.folderItemDate}>{d ? format(d, 'd MMM · hh:mm a') : '--'}</div>
                    <div className={styles.folderItemMeta}>{a.type || '-'} {a.notes ? `· ${a.notes}` : ''}</div>
                  </div>
                  <select value={a.status || 'Scheduled'} onChange={(e) => onStatus(a.id, e.target.value)} className={styles.inlineSelect}>
                    {STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <button onClick={() => onEdit(a)} className={styles.inlineIconBtn}>✏️</button>
                  <button onClick={() => onWhatsApp(a)} className={styles.inlineIconBtn}>💬</button>
                  <button onClick={() => onDelete(a.id)} className={styles.inlineDangerBtn}>🗑️</button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default function Appointments() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [appts, setAppts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [access, setAccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [patientMode, setPatientMode] = useState('existing');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('upcoming');
  const [conflict, setConflict] = useState(null);
  const [mobileView, setMobileView] = useState('timeline');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [patientQuery, setPatientQuery] = useState('');

  const load = () =>
    Promise.all([getAppointments(user.uid), getPatients(user.uid), checkAccess(user.uid, user)]).then(([a, p, acc]) => {
      setAppts(a);
      setPatients(p);
      setAccess(acc);
    });

  useEffect(() => {
    if (user) load();
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const patientsMap = useMemo(() => {
    const map = new Map();
    patients.forEach((p) => {
      if (p.id) map.set(p.id, p);
    });
    return map;
  }, [patients]);

  const matchingExistingPatients = useMemo(() => {
    const search = normalizeName(form.patientName);
    if (!search || patientMode !== 'existing') return [];

    return patients
      .filter((p) => {
        const name = normalizeName(p.name);
        const phone = String(p.phone || '');
        return name.includes(search) || phone.includes(form.patientName.trim());
      })
      .slice(0, 6);
  }, [patients, form.patientName, patientMode]);

  const findExistingPatient = (name, phone = '') => {
    const normalizedName = normalizeName(name);
    const normalizedPhone = normalizePhone(phone);

    return patients.find((p) => {
      const samePhone = normalizedPhone && normalizePhone(p.phone || '') === normalizedPhone;
      const sameName = normalizedName && normalizeName(p.name) === normalizedName;
      return samePhone || sameName;
    });
  };

  const selectPatient = (pid) => {
    const p = patients.find((x) => x.id === pid);
    setForm((f) => ({
      ...f,
      patientId: pid,
      patientName: p?.name || '',
      patientPhone: p?.phone || f.patientPhone || '',
    }));
  };

  const changePatientMode = (mode) => {
    setPatientMode(mode);
    setConflict(null);
    setForm((f) => ({
      ...f,
      patientId: mode === 'new' ? '' : f.patientId,
      patientPhone: mode === 'existing' ? '' : f.patientPhone,
      patientName: mode === 'new' && f.patientId ? '' : f.patientName,
    }));
  };

  const checkConflict = (datetime) => {
    if (!datetime) return null;
    const newTime = parseISO(datetime);
    for (const appt of appts) {
      if (editingAppt && appt.id === editingAppt.id) continue;
      if (!appt.datetime) continue;
      const existing = parseISO(appt.datetime);
      const diff = Math.abs(differenceInMinutes(newTime, existing));
      if (diff < 60) return { patient: appt.patientName, time: format(existing, 'hh:mm a'), diff };
    }
    return null;
  };

  const handleDateChange = (datetime) => {
    set('datetime', datetime);
    setConflict(checkConflict(datetime));
  };

  const buildPatientPayload = () => ({
    name: form.patientName.trim(),
    phone: form.patientPhone.trim(),
    age: '',
    occupation: '',
    patientType: '',
    medicalHistory: [],
    chiefComplaint: '',
    tooth: '',
    status: 'Not started',
    sex: '',
    alert: 'None',
    dateStart: form.datetime || '',
    notes: '',
    endoVisits: [],
    operativeVisits: [],
    surgeryVisits: [],
    prothVisits: [],
  });

  const resolvePatientForSave = async () => {
    if (patientMode === 'existing') {
      if (form.patientId) {
        const selected = patientsMap.get(form.patientId);
        return {
          patientId: form.patientId,
          patientName: selected?.name || form.patientName.trim(),
          phone: selected?.phone || '',
        };
      }

      const matched = findExistingPatient(form.patientName);
      if (!matched) {
        throw new Error('PATIENT_NOT_FOUND');
      }

      return {
        patientId: matched.id,
        patientName: matched.name || form.patientName.trim(),
        phone: matched.phone || '',
      };
    }

    const matched = findExistingPatient(form.patientName, form.patientPhone);
    if (matched) {
      return {
        patientId: matched.id,
        patientName: matched.name || form.patientName.trim(),
        phone: matched.phone || form.patientPhone.trim(),
      };
    }

    const newPatientRef = await addPatient(user.uid, buildPatientPayload());
    return {
      patientId: newPatientRef.id,
      patientName: form.patientName.trim(),
      phone: form.patientPhone.trim(),
    };
  };

  const handleSave = async (force = false) => {
    const cleanName = form.patientName.trim();
    const cleanPhone = form.patientPhone.trim();

    if (!cleanName || !form.datetime) return alert('Please fill patient and date/time');
    if (patientMode === 'new' && !cleanPhone) return alert('Please enter patient phone');
    if (!force && conflict) return;

    setSaving(true);
    try {
      const resolvedPatient = await resolvePatientForSave();
      const payload = {
        ...form,
        patientName: resolvedPatient.patientName,
        patientId: resolvedPatient.patientId || '',
        phone: resolvedPatient.phone || cleanPhone || '',
      };

      if (editingAppt) await updateAppointment(user.uid, editingAppt.id, payload);
      else await addAppointment(user.uid, payload);

      await load();
      cancelForm();
    } catch (error) {
      if (error.message === 'PATIENT_NOT_FOUND') {
        alert('Patient not found. Choose an existing patient from the list or switch to New patient.');
      } else if (error.message === 'LIMIT_REACHED') {
        alert('Free plan patient limit reached. Upgrade your plan to add a new patient file.');
      } else {
        alert('Something went wrong while saving the appointment.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (appt) => {
    const linkedPatient = appt.patientId ? patientsMap.get(appt.patientId) : findExistingPatient(appt.patientName, appt.phone);
    const mode = linkedPatient?.id || appt.patientId ? 'existing' : 'new';

    setEditingAppt(appt);
    setPatientMode(mode);
    setForm({
      patientName: linkedPatient?.name || appt.patientName || '',
      patientId: linkedPatient?.id || appt.patientId || '',
      patientPhone: linkedPatient?.phone || appt.phone || '',
      datetime: appt.datetime || '',
      type: appt.type || '',
      status: appt.status || 'Scheduled',
      notes: appt.notes || '',
    });
    setShowForm(true);
    setConflict(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete appointment?')) return;
    await deleteAppointment(user.uid, id);
    load();
  };

  const handleStatus = async (id, status) => {
    await updateAppointment(user.uid, id, { status });
    load();
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingAppt(null);
    setConflict(null);
    setPatientMode('existing');
    setForm(emptyForm);
  };

  const getAppointmentPhone = (appt) => {
    if (appt.phone) return normalizePhone(appt.phone);
    if (appt.patientId && patientsMap.has(appt.patientId)) return normalizePhone(patientsMap.get(appt.patientId)?.phone || '');
    const matchedPatient = patients.find((p) => normalizeName(p.name) === normalizeName(appt.patientName));
    return normalizePhone(matchedPatient?.phone || '');
  };

  const buildWhatsAppMessage = (appt) => {
    const time = appt.datetime ? format(parseISO(appt.datetime), 'hh:mm a') : '--';
    const date = appt.datetime ? format(parseISO(appt.datetime), 'dd/MM/yyyy') : '--';
    return `Hello ${appt.patientName || ''},\nThis is a reminder of your appointment at AuraDent.\nDate: ${date}\nTime: ${time}\nType: ${appt.type || 'Dental appointment'}\n\nPlease contact us if you need to reschedule.`;
  };

  const ensureGoldWhatsApp = () => {
    if (access?.plan === 'gold') return true;
    alert('WhatsApp reminders are a Gold feature. Please upgrade your plan to use WhatsApp.');
    return false;
  };

  const sendWhatsApp = (appt) => {
    if (!ensureGoldWhatsApp()) return;
    const phone = getAppointmentPhone(appt);
    if (!phone) {
      alert(`No phone number found for ${appt.patientName || 'this patient'}`);
      return;
    }
    const message = buildWhatsAppMessage(appt);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const sendTodayReminders = () => {
    if (!ensureGoldWhatsApp()) return;
    if (!todayAppts.length) {
      alert('No appointments scheduled for today');
      return;
    }
    const firstWithPhone = todayAppts.find((appt) => getAppointmentPhone(appt));
    if (!firstWithPhone) {
      alert("No phone numbers found for today's appointments");
      return;
    }
    sendWhatsApp(firstWithPhone);
  };

  const now = new Date();
  const nextWeek = addDays(now, 7);
  const patientAppts = {};
  appts.forEach((a) => {
    const key = a.patientId || a.patientName;
    if (!patientAppts[key]) patientAppts[key] = { name: a.patientName, id: a.patientId, appts: [] };
    patientAppts[key].appts.push(a);
  });

  const todayAppts = useMemo(
    () => appts.filter((a) => a.datetime && isToday(parseISO(a.datetime))).sort((a, b) => compareAsc(parseISO(a.datetime), parseISO(b.datetime))),
    [appts]
  );

  const summary = useMemo(() => {
    const upcoming = appts.filter((a) => a.datetime && isAfter(parseISO(a.datetime), startOfDay(now))).length;
    const thisWeek = appts.filter((a) => a.datetime && isAfter(parseISO(a.datetime), startOfDay(now)) && parseISO(a.datetime) <= nextWeek).length;
    const needsReminder = appts.filter((a) => {
      if (!a.datetime) return false;
      const date = parseISO(a.datetime);
      return (isToday(date) || isTomorrow(date)) && ['Scheduled', 'Confirmed'].includes(a.status || 'Scheduled');
    }).length;
    const missed = appts.filter((a) => a.datetime && parseISO(a.datetime) < now && ['Scheduled', 'Confirmed'].includes(a.status || 'Scheduled')).length;
    return { upcoming, thisWeek, needsReminder, missed };
  }, [appts]);

  const filtered = appts.filter((a) => {
    if (!a.datetime && filter !== 'all') return false;
    const d = a.datetime ? parseISO(a.datetime) : null;
    if (filter === 'today' && d && !isToday(d)) return false;
    if (filter === 'upcoming' && d && !isAfter(d, startOfDay(now))) return false;
    if (filter === 'past' && d && isAfter(d, startOfDay(now))) return false;
    if (filter === 'reminders' && d && !(isToday(d) || isTomorrow(d))) return false;
    if (filter === 'missed' && d && !(d < now && ['Scheduled', 'Confirmed'].includes(a.status || 'Scheduled'))) return false;
    if (statusFilter !== 'all' && (a.status || 'Scheduled') !== statusFilter) return false;
    if (typeFilter !== 'all' && (a.type || 'Other') !== typeFilter) return false;
    if (query.trim()) {
      const hay = `${a.patientName || ''} ${a.type || ''} ${a.notes || ''}`.toLowerCase();
      if (!hay.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  const patientFolders = Object.values(patientAppts)
    .filter((pf) => pf.name?.toLowerCase().includes(patientQuery.trim().toLowerCase()))
    .sort((a, b) => {
      const lastA = a.appts[a.appts.length - 1]?.datetime || '';
      const lastB = b.appts[b.appts.length - 1]?.datetime || '';
      return lastB.localeCompare(lastA);
    });

  const todayCount = todayAppts.length;

  return (
    <div className="motionPage">
      <div className={`${styles.topbar} motionHero`}>
        <div>
          <h1 className={styles.title}>Appointments</h1>
          <p className={styles.sub}>{todayCount} today · {appts.length} total</p>
        </div>

        <div className={styles.topbarActions}>
          <button className={styles.secondaryBtn} onClick={sendTodayReminders}>
            {access?.plan === 'gold' ? '💬 Send Today Reminders' : '🔒 WhatsApp Gold'}
          </button>
          <button className={styles.addBtn} onClick={() => { setShowForm((s) => !s); setEditingAppt(null); setConflict(null); if (showForm) cancelForm(); }}>
            {showForm && !editingAppt ? '✕ Close' : '➕ New Appointment'}
          </button>
        </div>
      </div>

      <div className={`${styles.summaryGrid} motionCard motionCardDelay1`}>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>Today</span><strong>{todayCount}</strong><p>appointments scheduled</p></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>Upcoming</span><strong>{summary.upcoming}</strong><p>future bookings</p></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>Needs Reminder</span><strong>{summary.needsReminder}</strong><p>today & tomorrow</p></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>Missed</span><strong>{summary.missed}</strong><p>scheduled but not done</p></div>
      </div>

      {showForm && (
        <div className={`card ${styles.formCard} motionCard motionCardDelay1`}>
          <h3 className={styles.formTitle}>{editingAppt ? '✏️ Edit Appointment' : '➕ New Appointment'}</h3>

          <div className={styles.modeCard}>
            <span className={styles.modeLabel}>Patient</span>
            <div className={styles.modeSwitch}>
              <button type="button" className={`${styles.modeBtn} ${patientMode === 'existing' ? styles.modeBtnActive : ''}`} onClick={() => changePatientMode('existing')}>
                Existing
              </button>
              <button type="button" className={`${styles.modeBtn} ${patientMode === 'new' ? styles.modeBtnActive : ''}`} onClick={() => changePatientMode('new')}>
                New
              </button>
            </div>
          </div>

          <div className={styles.formGrid}>
            {patientMode === 'existing' ? (
              <>
                <div className={`${styles.field} ${styles.full}`}>
                  <label>Type patient name *</label>
                  <input
                    value={form.patientName}
                    onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value, patientId: '' }))}
                    placeholder="Search existing patient by name or phone"
                  />
                  {matchingExistingPatients.length > 0 && (
                    <div className={styles.patientSearchList}>
                      {matchingExistingPatients.map((p) => (
                        <button key={p.id} type="button" className={styles.patientSearchItem} onClick={() => selectPatient(p.id)}>
                          <span>{p.name}</span>
                          <small>{p.phone || 'No phone'}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.field}>
                  <label>Quick select</label>
                  <select value={form.patientId} onChange={(e) => selectPatient(e.target.value)}>
                    <option value="">Select patient...</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className={styles.field}>
                  <label>New patient name *</label>
                  <input value={form.patientName} onChange={(e) => set('patientName', e.target.value)} placeholder="Patient name" />
                </div>
                <div className={styles.field}>
                  <label>Phone *</label>
                  <input value={form.patientPhone} onChange={(e) => set('patientPhone', e.target.value)} placeholder="01xxxxxxxxx" />
                </div>
              </>
            )}

            <div className={styles.field}>
              <label>Date & Time *</label>
              <input type="datetime-local" value={form.datetime} onChange={(e) => handleDateChange(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Type</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="">Select type...</option>
                {TYPE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label>Notes</label>
              <input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>

          {conflict && (
            <div className={styles.conflictBox}>
              <div className={styles.conflictTitle}>⚠️ Time Conflict!</div>
              <div className={styles.conflictText}>
                <strong>{conflict.patient}</strong> has appointment at <strong>{conflict.time}</strong> — only <strong>{conflict.diff} min</strong> apart
              </div>
              <div className={styles.conflictActions}>
                <button onClick={() => handleSave(true)} className={styles.conflictPrimary}>Book Anyway</button>
                <button onClick={() => { set('datetime', ''); setConflict(null); }} className={styles.conflictGhost}>Choose Another Time</button>
              </div>
            </div>
          )}

          {!conflict && (
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={cancelForm}>Cancel</button>
              <button className={styles.saveBtn} onClick={() => handleSave(false)} disabled={saving}>
                {saving ? 'Saving...' : editingAppt ? '💾 Save Changes' : '💾 Save'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className={`${styles.toolbar} motionCard motionCardDelay2`}>
        <div className={styles.tabs}>
          {[
            ['today', 'Today'],
            ['upcoming', 'Upcoming'],
            ['reminders', 'Needs Reminder'],
            ['missed', 'Missed'],
            ['past', 'Past'],
            ['all', 'All'],
          ].map(([key, label]) => (
            <button key={key} className={`${styles.tab} ${filter === key ? styles.activeTab : ''}`} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>

        <div className={styles.filterRow}>
          <input className={styles.searchInput} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, type, notes..." />
          <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
          <select className={styles.filterSelect} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            {TYPE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.viewTabs}>
        <button className={`${styles.viewTab} ${mobileView === 'timeline' ? styles.activeViewTab : ''}`} onClick={() => setMobileView('timeline')}>📅 Timeline</button>
        <button className={`${styles.viewTab} ${mobileView === 'folders' ? styles.activeViewTab : ''}`} onClick={() => setMobileView('folders')}>📁 Folders</button>
      </div>

      <div className={`${styles.grid} motionCard motionCardDelay3`}>
        <div className={`${styles.timelinePane} ${mobileView !== 'timeline' ? styles.mobileHidden : ''}`}>
          <div className={styles.panelHead}>
            <div>
              <div className={styles.gridTitle}>📅 TIMELINE</div>
              <div className={styles.panelSub}>{filtered.length} matching appointments</div>
            </div>
            <button className={styles.panelAction} onClick={sendTodayReminders}>{access?.plan === 'gold' ? 'Send reminders' : 'Unlock WhatsApp'}</button>
          </div>

          {filtered.length === 0 ? (
            <p className={styles.empty}>No appointments found</p>
          ) : (
            <div className={styles.list}>
              {filtered.map((a) => {
                const d = a.datetime ? parseISO(a.datetime) : null;
                const isNow = d && isToday(d);
                const isTom = d && isTomorrow(d);
                const isMissed = d && d < now && ['Scheduled', 'Confirmed'].includes(a.status || 'Scheduled');
                const hasPhone = !!getAppointmentPhone(a);
                return (
                  <div key={a.id} className={`${styles.apptCard} ${isNow ? styles.today : ''}`}>
                    <div className={styles.apptDate}>
                      <div className={styles.apptDay}>{d ? format(d, 'EEE') : '--'}</div>
                      <div className={styles.apptNum}>{d ? format(d, 'd') : '-'}</div>
                      <div className={styles.apptMonth}>{d ? format(d, 'MMM') : '-'}</div>
                    </div>

                    <div className={styles.apptTimeWrap}>
                      <div className={styles.apptTime}>{d ? format(d, 'hh:mm a') : '--:--'}</div>
                      <div className={styles.apptMini}>{isNow ? 'Today' : isTom ? 'Tomorrow' : d ? format(d, 'dd MMM') : '--'}</div>
                    </div>

                    <div className={styles.apptInfo}>
                      <div className={styles.apptName}>{a.patientName}</div>
                      <div className={styles.apptMeta}>
                        {a.type && <span className={styles.apptType}>{a.type}</span>}
                        {isNow && <span className={styles.todayTag}>Today</span>}
                        {isTom && <span className={styles.tomTag}>Tomorrow</span>}
                        {isMissed && <span className={styles.missedTag}>Missed</span>}
                        {!hasPhone && <span className={styles.noPhoneTag}>No phone</span>}
                      </div>
                      {a.notes && <div className={styles.apptNotes}>{a.notes}</div>}
                    </div>

                    <div className={styles.apptRight}>
                      <select className={styles.statusSelect} value={a.status || 'Scheduled'} onChange={(e) => handleStatus(a.id, e.target.value)}>
                        {STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                      </select>
                      <div className={styles.rowActions}>
                        <button onClick={() => handleEdit(a)} className={styles.iconBtn}>✏️</button>
                        {a.patientId && <button onClick={() => nav(`/patients/${a.patientId}`)} className={styles.iconBtn}>👤</button>}
                        <button onClick={() => sendWhatsApp(a)} className={styles.whatsBtn}>💬</button>
                        <button className={styles.delApptBtn} onClick={() => handleDelete(a.id)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`${styles.foldersPane} ${mobileView !== 'folders' ? styles.mobileHidden : ''}`}>
          <div className={styles.panelHead}>
            <div>
              <div className={styles.gridTitle}>📁 PATIENT FOLDERS</div>
              <div className={styles.panelSub}>{patientFolders.length} patient folders</div>
            </div>
          </div>

          <input className={styles.searchInput} value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} placeholder="Search patients..." />

          {patientFolders.length === 0 ? (
            <p className={styles.empty}>No appointments yet</p>
          ) : patientFolders.map((pf) => (
            <PatientFolder
              key={pf.id || pf.name}
              pf={pf}
              nav={nav}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatus={handleStatus}
              onWhatsApp={sendWhatsApp}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
