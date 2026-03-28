import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Plus, Search, SlidersHorizontal, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getPatients, deletePatient } from '../services/db';
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

export default function Patients() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('recent');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const load = () => {
    getPatients(user.uid).then((p) => {
      setPatients(p);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const searchValue = search.trim().toLowerCase();

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
        (activeFilter === 'Urgent'
          ? p.alert?.toLowerCase() === 'urgent'
          : p.status === activeFilter);

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

  const counts = useMemo(() => ({
    total: patients.length,
    done: patients.filter((p) => p.status === 'Done').length,
    progress: patients.filter((p) => p.status === 'In progress').length,
    urgent: patients.filter((p) => p.alert?.toLowerCase() === 'urgent').length,
  }), [patients]);

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
