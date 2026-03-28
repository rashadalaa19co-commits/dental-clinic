import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Download, Lock, Plus, Search, SlidersHorizontal, UserPlus } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../hooks/useAuth';
import { checkAccess, getPatients, deletePatient } from '../services/db';
import styles from './Patients.module.css';

const STATUS_BADGE = {
  Done: 'badge-done',
  'In progress': 'badge-progress',
  'Not started': 'badge-waiting',
  'Follow Up': 'badge-followup',
  'Lap waiting': 'badge-lap',
};

const FILTERS = ['All', 'Done', 'In progress', 'Follow Up', 'Urgent'];

const getPatientInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return '?';
  return parts.map((part) => part[0]?.toUpperCase()).join('');
};

const toDisplayDate = (value) => {
  if (!value) return '—';

  try {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return value;
    }

    if (value?.toDate) {
      return value.toDate().toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }

    if (typeof value?.seconds === 'number') {
      return new Date(value.seconds * 1000).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  } catch {
    return String(value);
  }

  return '—';
};

const toText = (value) => {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.length ? value.filter(Boolean).join(', ') : '—';
  const text = String(value).trim();
  return text || '—';
};

const buildVisitRows = (rows = [], label) =>
  (Array.isArray(rows) ? rows : []).map((row, index) => [
    index + 1,
    label,
    toDisplayDate(row?.date || row?.visitDate || row?.createdAt || ''),
    toText(row?.toothName || row?.toothNum || row?.teeth || row?.tooth || ''),
    toText(row?.status || ''),
    toText(
      row?.procedure ||
        row?.details ||
        row?.diagnosis ||
        row?.chiefComplaint ||
        row?.note ||
        row?.notes ||
        row?.treatment ||
        ''
    ),
  ]);

const exportPatientsBackupPdf = (patients = [], doctorName = '') => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const exportedAt = new Date();
  const exportStamp = exportedAt.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const drawPageHeader = (pageIndex) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('AuraDent Patients Backup', marginX, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Doctor: ${doctorName || 'AuraDent User'}`, marginX, 58);
    doc.text(`Exported: ${exportStamp}`, marginX, 72);
    doc.text(`Patients: ${patients.length}`, pageWidth - marginX, 58, { align: 'right' });
    doc.text(`Page ${pageIndex}`, pageWidth - marginX, 72, { align: 'right' });

    doc.setDrawColor(226, 191, 72);
    doc.setLineWidth(1.2);
    doc.line(marginX, 84, pageWidth - marginX, 84);
  };

  drawPageHeader(1);
  let currentPage = 1;
  let cursorY = 108;

  if (!patients.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('No patients found', marginX, cursorY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('There are no patient records available in this backup.', marginX, cursorY + 28);
  }

  patients.forEach((patient, index) => {
    if (index > 0) {
      doc.addPage();
      currentPage += 1;
      drawPageHeader(currentPage);
      cursorY = 108;
    }

    doc.setFillColor(250, 246, 230);
    doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 34, 10, 10, 'F');
    doc.setTextColor(104, 76, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${index + 1}. ${toText(patient.name)}`, marginX + 14, cursorY + 22);
    doc.setTextColor(20, 20, 20);
    cursorY += 48;

    autoTable(doc, {
      startY: cursorY,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 6,
        overflow: 'linebreak',
        lineColor: [228, 229, 233],
        lineWidth: 0.4,
      },
      headStyles: {
        fillColor: [24, 30, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: 'bold' },
        1: { cellWidth: pageWidth - marginX * 2 - 120 },
      },
      body: [
        ['Phone', toText(patient.phone)],
        ['Age', toText(patient.age)],
        ['Sex', toText(patient.sex)],
        ['Type', toText(patient.patientType)],
        ['Occupation', toText(patient.occupation)],
        ['Status', toText(patient.status)],
        ['Alert', toText(patient.alert && patient.alert !== 'None' ? patient.alert : 'None')],
        ['Started', toDisplayDate(patient.dateStart)],
        ['Tooth', toText(patient.tooth)],
        ['Last Procedure', toText(patient.lastProcedure)],
        ['All Procedures', toText(patient.proceduresSummary)],
        ['Treated Teeth', toText(patient.treatedTeeth)],
        ['Chief Complaint', toText(patient.chiefComplaint)],
        ['Medical History', toText(patient.medicalHistory)],
        ['Notes', toText(patient.notes)],
      ],
    });

    cursorY = doc.lastAutoTable.finalY + 14;

    const visitRows = [
      ...buildVisitRows(patient.endoVisits, 'Endo'),
      ...buildVisitRows(patient.operativeVisits, 'Operative'),
      ...buildVisitRows(patient.surgeryVisits, 'Surgery'),
      ...buildVisitRows(patient.prothVisits, 'Fixed'),
    ];

    autoTable(doc, {
      startY: cursorY,
      theme: 'striped',
      styles: {
        fontSize: 8.3,
        cellPadding: 5,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [226, 191, 72],
        textColor: [35, 35, 35],
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [45, 45, 45],
      },
      head: [['#', 'Visit Type', 'Date', 'Tooth', 'Status', 'Details']],
      body: visitRows.length ? visitRows : [['—', 'No visits', '—', '—', '—', 'No visit entries recorded']],
    });

    const footerY = pageHeight - 20;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('AuraDent backup export • images excluded', pageWidth / 2, footerY, { align: 'center' });
  });

  const safeDate = exportedAt.toISOString().slice(0, 10);
  doc.save(`AuraDent-Patients-Backup-${safeDate}.pdf`);
};

export default function Patients() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('recent');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [access, setAccess] = useState(null);
  const [exportingBackup, setExportingBackup] = useState(false);

  const load = () => {
    if (!user?.uid) return Promise.resolve();

    return Promise.all([getPatients(user.uid), checkAccess(user.uid, user)])
      .then(([p, acc]) => {
        setPatients(p);
        setAccess(acc);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const searchValue = search.trim().toLowerCase();
  const isGoldPlan = access?.plan === 'gold';

  const suggestions = useMemo(() => {
    if (!searchValue) return [];

    return patients
      .filter((p) => {
        const haystack = [p.name, p.phone, p.status, p.lastProcedure, p.alert, p.patientType, ...(p.proceduresSummary || []), ...(p.treatedTeeth || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchValue);
      })
      .slice(0, 5);
  }, [patients, searchValue]);

  const filtered = useMemo(() => {
    let list = [...patients].filter((p) => {
      const matchesSearch =
        !searchValue ||
        p.name?.toLowerCase().includes(searchValue) ||
        p.phone?.includes(searchValue) ||
        p.status?.toLowerCase().includes(searchValue) ||
        p.lastProcedure?.toLowerCase().includes(searchValue) ||
        (p.proceduresSummary || []).some((proc) => proc?.toLowerCase().includes(searchValue)) ||
        (p.treatedTeeth || []).some((tooth) => tooth?.toLowerCase().includes(searchValue)) ||
        p.alert?.toLowerCase().includes(searchValue) ||
        p.patientType?.toLowerCase().includes(searchValue);

      const matchesFilter =
        activeFilter === 'All' ||
        (activeFilter === 'Urgent' ? p.alert?.toLowerCase() === 'urgent' : p.status === activeFilter);

      return matchesSearch && matchesFilter;
    });

    list.sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      return 0;
    });

    return list;
  }, [patients, searchValue, activeFilter, sortBy]);

  const counts = useMemo(
    () => ({
      total: patients.length,
      done: patients.filter((p) => p.status === 'Done').length,
      progress: patients.filter((p) => p.status === 'In progress').length,
      urgent: patients.filter((p) => p.alert?.toLowerCase() === 'urgent').length,
    }),
    [patients]
  );

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this patient?')) return;
    await deletePatient(user.uid, id);
    load();
  };

  const openPatient = (id) => {
    setShowSuggestions(false);
    nav(`/patients/${id}`);
  };

  const handleBackupExport = async () => {
    if (!isGoldPlan) {
      nav('/subscribe');
      return;
    }

    if (!patients.length) {
      alert('No patients found to export.');
      return;
    }

    try {
      setExportingBackup(true);
      exportPatientsBackupPdf(patients, user?.displayName || access?.displayName || '');
    } catch (error) {
      console.error('Backup export failed:', error);
      alert('Could not create the PDF backup. Please try again.');
    } finally {
      setExportingBackup(false);
    }
  };

  return (
    <div className="motionPage">
      <section className={`${styles.hero} motionHero`}>
        <div>
          <h1 className={styles.title}>Patients</h1>
          <p className={styles.sub}>Manage your patients faster with live search, filters, and quick actions.</p>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStatCard}>
            <span>Total</span>
            <strong>{counts.total}</strong>
            <small>All patients</small>
          </div>
          <div className={styles.heroStatCard}>
            <span>In Progress</span>
            <strong>{counts.progress}</strong>
            <small>Active cases</small>
          </div>
          <div className={styles.heroStatCard}>
            <span>Urgent</span>
            <strong>{counts.urgent}</strong>
            <small>Need attention</small>
          </div>
        </div>
      </section>

      <div className={`${styles.toolbar} motionCard motionCardDelay1`}>
        <div className={styles.toolbarTop}>
          <div className={styles.searchWrap}>
            <Search size={17} className={styles.searchIcon} />
            <input
              className={styles.search}
              placeholder="Search by name, phone, treatment, tooth, alert..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className={styles.suggestions}>
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={styles.suggestionItem}
                    onMouseDown={() => openPatient(p.id)}
                  >
                    <span className={styles.suggestionAvatar}>{getPatientInitials(p.name)}</span>
                    <span className={styles.suggestionContent}>
                      <strong>{p.name}</strong>
                      <small>
                        {p.phone || 'No phone'} · {p.status || 'No status'}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.toolbarActions}>
            <div className={styles.sortBox}>
              <ArrowUpDown size={15} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="recent">Recent</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="status">Status</option>
              </select>
            </div>

            <button
              className={`${styles.backupBtn} ${!isGoldPlan ? styles.lockedBackupBtn : ''}`}
              onClick={handleBackupExport}
              title={isGoldPlan ? 'Download full patients backup PDF' : 'Gold feature'}
              disabled={exportingBackup}
            >
              {isGoldPlan ? <Download size={16} /> : <Lock size={16} />}
              {exportingBackup ? 'Preparing PDF...' : isGoldPlan ? 'Backup PDF' : 'Backup Gold'}
            </button>

            <button className={styles.addBtn} onClick={() => nav('/patients/new')}>
              <UserPlus size={16} />
              Add Patient
            </button>
          </div>
        </div>

        <div className={styles.filtersRow}>
          <div className={styles.filtersLabel}>
            <SlidersHorizontal size={14} />
            Quick filters
          </div>

          <div className={styles.filterChips}>
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`${styles.filterChip} ${activeFilter === filter ? styles.filterChipActive : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.backupHintRow}>
          <span className={styles.backupHintBadge}>
            {isGoldPlan ? <Download size={13} /> : <Lock size={13} />}
            {isGoldPlan ? 'Gold backup ready' : 'Gold only feature'}
          </span>
          <p className={styles.backupHintText}>
            Download one PDF backup with all patient files and visits, without gallery photos.
          </p>
        </div>
      </div>

      {loading ? (
        <p className={styles.empty}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className={`${styles.emptyState} motionCard motionCardDelay2`}>
          <strong>No patients found</strong>
          <span>Try another search term or switch the selected filter.</span>
        </div>
      ) : (
        <div className={`${styles.tableWrap} motionCard motionCardDelay2`}>
          <div className={styles.tableHeader}>
            <div>
              <h2>Patient List</h2>
              <p>
                Showing {filtered.length} of {patients.length} patients
              </p>
            </div>
          </div>

          <div className={styles.table}>
            <div className={styles.thead}>
              <span className={styles.colName}>Name</span>
              <span className={styles.colPhone}>Phone</span>
              <span className={styles.colType}>Type</span>
              <span className={styles.colProcedure}>Procedure</span>
              <span className={styles.colStatus}>Status</span>
              <span className={styles.colAlert}>Alert</span>
              <span className={styles.colActions}>Actions</span>
            </div>

            {filtered.map((p) => (
              <div key={p.id} className={styles.row} onClick={() => nav(`/patients/${p.id}`)}>
                <span className={`${styles.nameCell} ${styles.colName}`}>
                  <span className={styles.avatar}>{getPatientInitials(p.name)}</span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>ID: {p.id?.slice(0, 6) || '--'}</small>
                  </span>
                </span>
                <span className={`${styles.muted} ${styles.colPhone}`}>{p.phone || '-'}</span>
                <span className={`${styles.muted} ${styles.colType}`}>{p.patientType || '-'}</span>
                <span className={`${styles.muted} ${styles.colProcedure}`}>{p.lastProcedure || 'No treatments yet'}</span>
                <span className={styles.colStatus}>
                  <span className={`badge ${STATUS_BADGE[p.status] || 'badge-waiting'}`}>
                    {p.status || '-'}
                  </span>
                </span>
                <span className={styles.colAlert}>
                  {p.alert && p.alert !== 'None' ? (
                    <span className={`badge ${p.alert === 'Urgent' ? 'badge-lap' : 'badge-followup'}`}>
                      {p.alert}
                    </span>
                  ) : (
                    <span className={styles.muted}>-</span>
                  )}
                </span>
                <span className={`${styles.rowActions} ${styles.colActions}`}>
                  <button
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      nav(`/patients/${p.id}`);
                    }}
                    title="View patient"
                  >
                    👁️
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      nav(`/patients/${p.id}/edit`);
                    }}
                    title="Edit patient"
                  >
                    ✏️
                  </button>
                  <button className={styles.deleteBtn} onClick={(e) => handleDelete(e, p.id)} title="Delete patient">
                    🗑️
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className={styles.floatingAddBtn} onClick={() => nav('/patients/new')} title="Add patient">
        <Plus size={18} />
        New Patient
      </button>
    </div>
  );
}
