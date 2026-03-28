import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X, FolderOpen, Images } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getPatients, updatePatient, checkAccess } from '../services/db';
import { useNavigate } from 'react-router-dom';

const CLOUD_NAME = 'dvpbbawh2';
const UPLOAD_PRESET = 'ntjnefxv';

const FREE_GALLERY_PATIENT_LIMIT = 5;
const FREE_GALLERY_PHOTO_LIMIT = 5;

const VISIT_CONFIGS = [
  { key: 'endoVisits', label: 'Endo', icon: '🔵', getTitle: (row = {}) => row.toothName || row.diagnosis || 'Visit' },
  { key: 'operativeVisits', label: 'Operative', icon: '🦷', getTitle: (row = {}) => row.toothName || row.classType || 'Visit' },
  { key: 'surgeryVisits', label: 'Surgery', icon: '🩺', getTitle: (row = {}) => row.toothName || row.toothNum || row.typeOfEx || 'Visit' },
  { key: 'prothVisits', label: 'Fixed', icon: '👑', getTitle: (row = {}) => row.toothName || row.teeth || row.labStage || 'Visit' },
];

const getPatientInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return '?';
  return parts.map((part) => part[0]?.toUpperCase()).join('');
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const toSortableTime = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const formatVisitDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const getPhotoItems = (patient = {}) =>
  (patient.photos || [])
    .map((photo, index) => {
      if (typeof photo === 'string') {
        return {
          id: `legacy_${index}`,
          url: photo,
          visitId: null,
          visitLabel: '',
          visitType: '',
          visitDate: '',
          createdAt: '',
          isLegacy: true,
        };
      }

      return {
        id: photo.id || `photo_${index}`,
        url: photo.url || photo.secure_url || '',
        visitId: photo.visitId || null,
        visitLabel: photo.visitLabel || '',
        visitType: photo.visitType || '',
        visitDate: photo.visitDate || '',
        createdAt: photo.createdAt || '',
        isLegacy: false,
      };
    })
    .filter((photo) => photo.url);

const getVisitOptions = (patient = {}) => {
  const visits = VISIT_CONFIGS.flatMap((config) =>
    (patient[config.key] || []).map((row, index) => {
      const date = row?.date || '';
      const title = config.getTitle(row);
      const datePart = formatVisitDate(date);
      const label = `${config.icon} ${config.label}${title ? ` • ${title}` : ''}${datePart ? ` • ${datePart}` : ''}`;

      return {
        id: `${config.key}_${index}_${row?.date || title || 'visit'}`,
        key: config.key,
        label,
        title,
        date,
        sortTime: toSortableTime(date),
      };
    })
  );

  return visits.sort((a, b) => b.sortTime - a.sortTime);
};

const getLatestVisitOption = (patient = {}) => getVisitOptions(patient)[0] || null;

const getCoverPhotos = (patient = {}) => {
  const photos = getPhotoItems(patient);
  if (!photos.length) return [];

  const latestVisit = getLatestVisitOption(patient);
  if (latestVisit) {
    const visitPhotos = photos.filter((photo) => photo.visitId === latestVisit.id);
    if (visitPhotos.length) return visitPhotos;
  }

  const groupedVisitPhotos = [...photos]
    .filter((photo) => photo.visitId)
    .sort((a, b) => {
      const visitDiff = toSortableTime(b.visitDate) - toSortableTime(a.visitDate);
      if (visitDiff !== 0) return visitDiff;
      return toSortableTime(b.createdAt) - toSortableTime(a.createdAt);
    });

  if (groupedVisitPhotos.length) return groupedVisitPhotos;
  return photos;
};

const getGalleryUsage = (list = []) => ({
  patientsUsed: list.filter((patient) => getPhotoItems(patient).length > 0).length,
  totalPhotos: list.reduce((sum, patient) => sum + getPhotoItems(patient).length, 0),
});

const getPatientUploadState = (patient, list, plan) => {
  const photos = getPhotoItems(patient);

  if (plan === 'gold') {
    return {
      canUpload: true,
      buttonLabel: 'Add Visit',
      helperText: `${photos.length} photo${photos.length !== 1 ? 's' : ''} stored`,
      reason: '',
      isUpgrade: false,
    };
  }

  if (plan !== 'free') {
    return {
      canUpload: false,
      buttonLabel: 'Upgrade',
      helperText: 'Gallery is unlocked on Gold only',
      reason: 'Gallery is unlocked on Gold only.',
      isUpgrade: true,
    };
  }

  const { patientsUsed } = getGalleryUsage(list);
  const isNewGalleryPatient = photos.length === 0;
  const patientLimitReached = isNewGalleryPatient && patientsUsed >= FREE_GALLERY_PATIENT_LIMIT;
  const photoLimitReached = photos.length >= FREE_GALLERY_PHOTO_LIMIT;

  if (patientLimitReached) {
    return {
      canUpload: false,
      buttonLabel: 'Upgrade',
      helperText: `Free plan reached ${FREE_GALLERY_PATIENT_LIMIT}/${FREE_GALLERY_PATIENT_LIMIT} gallery patients`,
      reason: `Free plan allows photos for only ${FREE_GALLERY_PATIENT_LIMIT} patients. Upgrade to Gold for unlimited gallery access.`,
      isUpgrade: true,
    };
  }

  if (photoLimitReached) {
    return {
      canUpload: false,
      buttonLabel: 'Upgrade',
      helperText: `Free plan reached ${FREE_GALLERY_PHOTO_LIMIT}/${FREE_GALLERY_PHOTO_LIMIT} photos for this patient`,
      reason: `Free plan allows only ${FREE_GALLERY_PHOTO_LIMIT} photos per patient. Upgrade to Gold for unlimited uploads.`,
      isUpgrade: true,
    };
  }

  return {
    canUpload: true,
    buttonLabel: 'Add Visit',
    helperText: `${photos.length}/${FREE_GALLERY_PHOTO_LIMIT} photos for this patient`,
    reason: '',
    isUpgrade: false,
  };
};

const groupPhotosByVisit = (patient = {}) => {
  const photos = getPhotoItems(patient);
  const latestVisit = getLatestVisitOption(patient);
  const groupsMap = new Map();

  photos.forEach((photo) => {
    const groupKey = photo.visitId || `ungrouped_${photo.id}`;
    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        key: groupKey,
        visitId: photo.visitId || null,
        title: photo.visitLabel || 'General photos',
        visitDate: photo.visitDate || '',
        isLatest: latestVisit ? latestVisit.id === photo.visitId : false,
        items: [],
      });
    }
    groupsMap.get(groupKey).items.push(photo);
  });

  return [...groupsMap.values()].sort((a, b) => {
    const visitDiff = toSortableTime(b.visitDate) - toSortableTime(a.visitDate);
    if (visitDiff !== 0) return visitDiff;
    return b.items.length - a.items.length;
  });
};

export default function Gallery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAllPatients, setShowAllPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [visitPickerOpen, setVisitPickerOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState('');
  const [pendingUploadVisit, setPendingUploadVisit] = useState(null);
  const [filters, setFilters] = useState({
    photoMode: 'all',
    status: 'all',
    procedure: 'all',
  });
  const fileRef = useRef(null);

  const loadData = async () => {
    if (!user) return;
    const [p, acc] = await Promise.all([getPatients(user.uid), checkAccess(user.uid)]);
    setPatients(p);
    setAccess(acc);
    return p;
  };

  useEffect(() => {
    if (!user) return;
    loadData().finally(() => setLoading(false));
  }, [user]);

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST', body: formData,
    });
    const data = await res.json();
    return data.secure_url;
  };

  const handleUpload = async (e, patient, visitMeta = pendingUploadVisit) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (!visitMeta) {
      alert('Please choose a visit first.');
      e.target.value = '';
      return;
    }

    const latestPatients = await getPatients(user.uid);
    const freshPatient = latestPatients.find((item) => item.id === patient.id) || patient;
    const uploadState = getPatientUploadState(freshPatient, latestPatients, access?.plan);

    if (!uploadState.canUpload) {
      alert(uploadState.reason);
      e.target.value = '';
      return;
    }

    if (access?.plan === 'free') {
      const remainingSlots = FREE_GALLERY_PHOTO_LIMIT - getPhotoItems(freshPatient).length;
      if (files.length > remainingSlots) {
        alert(`Free plan allows only ${remainingSlots} more photo${remainingSlots !== 1 ? 's' : ''} for this patient.`);
        e.target.value = '';
        return;
      }
    }

    setUploadingId(patient.id);
    try {
      const urls = await Promise.all(files.map(uploadToCloudinary));
      const current = freshPatient.photos || [];
      const createdAt = new Date().toISOString();
      const appended = urls.map((url, index) => ({
        id: `${visitMeta.id}_${createdAt}_${index}`,
        url,
        visitId: visitMeta.id,
        visitLabel: visitMeta.label,
        visitType: visitMeta.key,
        visitDate: visitMeta.date || '',
        createdAt,
      }));
      const updated = { ...freshPatient, photos: [...current, ...appended] };
      await updatePatient(user.uid, patient.id, updated);
      const refreshed = await getPatients(user.uid);
      setPatients(refreshed);
      if (selectedPatient?.id === patient.id) {
        setSelectedPatient(refreshed.find((p) => p.id === patient.id) || null);
      }
      setVisitPickerOpen(false);
      setSelectedVisitId('');
      setPendingUploadVisit(null);
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (patient, idx) => {
    if (idx < 0) return;
    if (!confirm('Delete this photo?')) return;
    const current = [...(patient.photos || [])];
    current.splice(idx, 1);
    await updatePatient(user.uid, patient.id, { ...patient, photos: current });
    const refreshed = await getPatients(user.uid);
    setPatients(refreshed);
    if (selectedPatient?.id === patient.id) {
      setSelectedPatient(refreshed.find((p) => p.id === patient.id) || null);
    }
  };

  const searchValue = normalize(search);

  const statusOptions = useMemo(() => {
    const values = [...new Set(patients.map((p) => p.status).filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b));
  }, [patients]);

  const procedureOptions = useMemo(() => {
    const values = [...new Set(patients.map((p) => p.procedure).filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b));
  }, [patients]);

  const matchesSearch = (patient) => {
    if (!searchValue) return true;
    return [patient.name, patient.phone, patient.status, patient.procedure, patient.alert, patient.patientType]
      .filter(Boolean)
      .some((value) => normalize(value).includes(searchValue));
  };

  const matchesFilters = (patient) => {
    const photosCount = getPhotoItems(patient).length;
    const statusMatch = filters.status === 'all' || normalize(patient.status) === normalize(filters.status);
    const procedureMatch = filters.procedure === 'all' || normalize(patient.procedure) === normalize(filters.procedure);
    const photoMatch =
      filters.photoMode === 'all' ||
      (filters.photoMode === 'withPhotos' && photosCount > 0) ||
      (filters.photoMode === 'withoutPhotos' && photosCount === 0);

    return statusMatch && procedureMatch && photoMatch;
  };

  const filteredPatients = useMemo(() => patients.filter((patient) => matchesSearch(patient) && matchesFilters(patient)), [patients, searchValue, filters]);
  const filteredPatientsWithPhotos = filteredPatients.filter((p) => getPhotoItems(p).length > 0);
  const galleryUsage = useMemo(() => getGalleryUsage(patients), [patients]);
  const totalPhotos = galleryUsage.totalPhotos;
  const isFreePlan = access?.plan === 'free';
  const isSilverPlan = access?.plan === 'silver';

  const suggestions = useMemo(() => {
    if (!searchValue) return [];

    return patients
      .filter((p) => [p.name, p.phone, p.status, p.procedure, p.alert, p.patientType].filter(Boolean).join(' ').toLowerCase().includes(searchValue))
      .slice(0, 5);
  }, [patients, searchValue]);

  const activeFiltersCount = [filters.photoMode !== 'all', filters.status !== 'all', filters.procedure !== 'all'].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({ photoMode: 'all', status: 'all', procedure: 'all' });
  };

  const openPatient = (patient) => {
    setShowSuggestions(false);
    setSearch(patient.name || '');
    setSelectedPatient(patient);
    setVisitPickerOpen(false);
    setSelectedVisitId('');
    setPendingUploadVisit(null);
  };

  const startAddVisit = (patient) => {
    const uploadState = getPatientUploadState(patient, patients, access?.plan);
    if (!uploadState.canUpload) {
      navigate('/subscribe');
      return;
    }

    const options = getVisitOptions(patient);
    if (!options.length) {
      alert('No visits found yet for this patient. Add a visit first inside Patient File.');
      return;
    }

    setSelectedPatient(patient);
    setVisitPickerOpen(true);
    setSelectedVisitId(options[0].id);
    setPendingUploadVisit(options[0]);
  };

  const continueVisitUpload = () => {
    const patient = patients.find((item) => item.id === selectedPatient?.id) || selectedPatient;
    if (!patient) return;
    const options = getVisitOptions(patient);
    const chosenVisit = options.find((option) => option.id === selectedVisitId);
    if (!chosenVisit) {
      alert('Please select a visit first.');
      return;
    }
    setPendingUploadVisit(chosenVisit);
    fileRef.current?.click();
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted)' }}>Loading...</div>;
  }

  if (isSilverPlan) {
    return (
      <div className="motionPage motionHero" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 16, textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: 64 }}>📸</div>
        <div style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg,#f59e0b,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Gold Plan Feature
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 400 }}>
          Silver does not include Gallery. Upgrade to Gold to unlock unlimited patient photos!
        </p>
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: '24px 32px', maxWidth: 380, width: '100%' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🥇 Gold Plan</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', marginBottom: 4 }}>
            150 EGP<span style={{ fontSize: 14, color: 'var(--muted)' }}>/month</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Unlimited patients + Gallery + Photos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href="https://wa.me/201010562664"
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: '#25D366', color: 'white', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
            >
              📱 WhatsApp to Subscribe
            </a>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Vodafone Cash</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>01010562664</div>
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>InstaPay</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>01010562664</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedPatient) {
    const p = patients.find((x) => x.id === selectedPatient.id) || selectedPatient;
    const photoItems = getPhotoItems(p);
    const photoGroups = groupPhotosByVisit(p);
    const visitOptions = getVisitOptions(p);

    return (
      <div className="motionPage">
        <div className="motionHero" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setSelectedPatient(null);
              setVisitPickerOpen(false);
              setSelectedVisitId('');
              setPendingUploadVisit(null);
            }}
            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
          >
            ← Back
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>{p.name}</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>{photoItems.length} photos · {visitOptions.length} visits · {p.procedure || '-'}</p>
            {isFreePlan ? (
              <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                Free preview: {galleryUsage.patientsUsed}/{FREE_GALLERY_PATIENT_LIMIT} gallery patients · {photoItems.length}/{FREE_GALLERY_PHOTO_LIMIT} photos for this patient
              </p>
            ) : null}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => handleUpload(e, p)} style={{ display: 'none' }} />
          {(() => {
            const uploadState = getPatientUploadState(p, patients, access?.plan);
            return (
              <button
                onClick={() => startAddVisit(p)}
                disabled={uploadingId === p.id}
                style={{
                  padding: '9px 20px',
                  background: uploadState.isUpgrade ? 'linear-gradient(135deg, rgba(245,158,11,0.22), rgba(251,191,36,0.16))' : 'var(--accent)',
                  color: uploadState.isUpgrade ? '#f7c766' : '#000',
                  border: uploadState.isUpgrade ? '1px solid rgba(245,158,11,0.42)' : 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: uploadingId === p.id ? 0.6 : 1,
                }}
                title={uploadState.helperText}
              >
                {uploadingId === p.id ? '⏳ Uploading...' : uploadState.isUpgrade ? '🥇 Upgrade' : '🗂️ Add Visit'}
              </button>
            );
          })()}
        </div>

        {visitPickerOpen && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Choose visit for this upload</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Each uploaded photo will be linked to the selected visit.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVisitPickerOpen(false);
                  setSelectedVisitId('');
                  setPendingUploadVisit(null);
                }}
                style={{ padding: '7px 12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 10, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
            {visitOptions.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No visits found yet for this patient.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
                <select
                  value={selectedVisitId}
                  onChange={(e) => {
                    setSelectedVisitId(e.target.value);
                    setPendingUploadVisit(visitOptions.find((option) => option.id === e.target.value) || null);
                  }}
                  style={filterInputStyle}
                >
                  {visitOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={continueVisitUpload}
                  style={{ minHeight: 44, padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#000', fontWeight: 700, cursor: 'pointer' }}
                >
                  Upload photos
                </button>
              </div>
            )}
          </div>
        )}

        {photoItems.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--muted)', gap: 12, background: 'var(--surface)', borderRadius: 12, border: '2px dashed var(--border)' }}>
            <div style={{ fontSize: 48 }}>📷</div>
            <p style={{ fontSize: 16 }}>No photos yet</p>
            <button
              onClick={() => startAddVisit(p)}
              style={{ padding: '10px 24px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Add first visit photos
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 18 }}>
            {photoGroups.map((group) => (
              <div key={group.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 15 }}>{group.title}</strong>
                      {group.isLatest ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#000', background: 'rgba(0,212,255,0.88)', padding: '4px 8px', borderRadius: 999 }}>Cover visit</span>
                      ) : null}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{group.items.length} photo{group.items.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                  {group.items.map((photo) => {
                    const globalIndex = (p.photos || []).findIndex((entry, index) => {
                      const originalUrl = typeof entry === 'string' ? entry : entry?.url || entry?.secure_url;
                      const originalId = typeof entry === 'string' ? `legacy_${index}` : entry?.id || `photo_${index}`;
                      return originalUrl === photo.url && originalId === photo.id;
                    });

                    return (
                      <div
                        key={photo.id}
                        style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '1', cursor: 'pointer', background: 'var(--surface2)' }}
                        onClick={() => setLightbox({ url: photo.url, patient: p, idx: globalIndex })}
                      >
                        <img src={photo.url} alt={group.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(p, globalIndex);
                          }}
                          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          X
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <img src={lightbox.url} alt="Preview" style={{ maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: 14 }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="motionPage">
      <div className="motionHero" style={{ display: 'grid', gap: 18, marginBottom: 26 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatCard label="Patients" value={patients.length} icon="👥" />
          <StatCard label="Gallery Patients" value={galleryUsage.patientsUsed} icon="📁" />
          <StatCard label="Total Photos" value={totalPhotos} icon="📷" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'start' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '0 14px' }}>
              <Search size={16} color="var(--muted)" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                placeholder="Search patient..."
                style={{ border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', fontSize: 14, width: '100%', height: 48 }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setShowSuggestions(false);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', zIndex: 30, boxShadow: '0 18px 45px rgba(0,0,0,0.22)', maxHeight: 320, overflowY: 'auto' }}>
                {suggestions.map((p, index) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => openPatient(p)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'transparent', border: 'none', borderBottom: index === suggestions.length - 1 ? 'none' : '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,212,255,0.14)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {getPatientInitials(p.name)}
                    </span>
                    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong>
                      <small style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.phone || 'No phone'} · {p.status || 'No status'}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            style={{ minHeight: 48, padding: '0 14px', background: showFilters ? 'rgba(0,212,255,0.12)' : 'var(--surface2)', color: showFilters ? 'var(--accent)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 14, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            <SlidersHorizontal size={16} />
            Filters{activeFiltersCount ? ` (${activeFiltersCount})` : ''}
          </button>
        </div>

        {showFilters && (
          <div style={{ marginTop: -4, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <select value={filters.photoMode} onChange={(e) => setFilters((prev) => ({ ...prev, photoMode: e.target.value }))} style={filterInputStyle}>
              <option value="all">All photos</option>
              <option value="withPhotos">With photos</option>
              <option value="withoutPhotos">Without photos</option>
            </select>

            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} style={filterInputStyle}>
              <option value="all">All status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select value={filters.procedure} onChange={(e) => setFilters((prev) => ({ ...prev, procedure: e.target.value }))} style={filterInputStyle}>
              <option value="all">All procedures</option>
              {procedureOptions.map((procedure) => (
                <option key={procedure} value={procedure}>{procedure}</option>
              ))}
            </select>

            <button type="button" onClick={clearFilters} style={{ ...filterInputStyle, cursor: 'pointer', fontWeight: 600 }}>
              Reset filters
            </button>
          </div>
        )}
      </div>

      {filteredPatientsWithPhotos.length > 0 && !searchValue && filters.photoMode !== 'withoutPhotos' && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            📷 Patients with Photos
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {filteredPatientsWithPhotos.map((p) => (
              <PatientCard key={p.id} p={p} patients={patients} plan={access?.plan} onSelect={openPatient} onAddVisit={startAddVisit} uploadingId={uploadingId} onUpgrade={() => navigate('/subscribe')} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            {searchValue || activeFiltersCount ? `Search results (${filteredPatients.length})` : '👥 All Patients'}
          </h3>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--text)', fontSize: 13, fontWeight: 600, userSelect: 'none', cursor: 'pointer' }}>
            <input type="checkbox" checked={showAllPatients} onChange={(e) => setShowAllPatients(e.target.checked)} style={{ display: 'none' }} />
            <span style={{ width: 46, height: 26, borderRadius: 999, background: showAllPatients ? 'rgba(0,212,255,0.28)' : 'rgba(255,255,255,0.09)', border: `1px solid ${showAllPatients ? 'rgba(0,212,255,0.45)' : 'var(--border)'}`, position: 'relative', transition: 'all 0.2s ease', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: showAllPatients ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: showAllPatients ? 'var(--accent)' : 'rgba(255,255,255,0.75)', transition: 'all 0.2s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.25)' }} />
            </span>
            <span>{showAllPatients ? 'Show all patients' : 'Hide all patients'}</span>
          </label>
        </div>

        {!searchValue && !activeFiltersCount && !showAllPatients ? (
          <div className="motionCard motionCardDelay2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '26px 20px', color: 'var(--muted)', textAlign: 'center' }}>
            All patients are hidden by default to keep the gallery cleaner.
          </div>
        ) : filteredPatients.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>No patients found</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {filteredPatients.map((p) => (
              <PatientCard key={p.id} p={p} patients={patients} plan={access?.plan} onSelect={openPatient} onAddVisit={startAddVisit} uploadingId={uploadingId} onUpgrade={() => navigate('/subscribe')} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PatientCard({ p, patients, plan, onSelect, onAddVisit, uploadingId, onUpgrade }) {
  const photos = getPhotoItems(p);
  const coverPhotos = getCoverPhotos(p);
  const uploadState = getPatientUploadState(p, patients, plan);
  const latestVisit = getLatestVisitOption(p);

  return (
    <div
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s,transform 0.2s', cursor: 'pointer' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div onClick={() => onSelect(p)} style={{ aspectRatio: '16/9', background: 'var(--surface2)', position: 'relative', overflow: 'hidden' }}>
        {photos.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8, color: 'var(--muted)' }}>
            <div style={{ fontSize: 32 }}>📷</div>
            <div style={{ fontSize: 12 }}>No photos</div>
          </div>
        ) : coverPhotos.length === 1 ? (
          <img src={coverPhotos[0].url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', gap: 1 }}>
            {coverPhotos.slice(0, 4).map((photo, i) => (
              <div key={photo.id || i} style={{ overflow: 'hidden', position: 'relative' }}>
                <img src={photo.url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {i === 3 && coverPhotos.length > 4 && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700 }}>
                    +{coverPhotos.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {latestVisit ? (
          <div style={{ position: 'absolute', left: 10, bottom: 10, right: 10, background: 'rgba(0,0,0,0.58)', color: '#fff', borderRadius: 10, padding: '7px 9px', fontSize: 11, fontWeight: 600, backdropFilter: 'blur(6px)' }}>
            Cover: latest visit
          </div>
        ) : null}
      </div>

      <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) auto', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,212,255,0.15)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
          {getPatientInitials(p.name)}
        </div>
        <div style={{ minWidth: 0 }} onClick={() => onSelect(p)}>
          <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', lineHeight: 1.4 }}>
            <span style={{ whiteSpace: 'nowrap' }}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, maxWidth: '100%' }}>{latestVisit?.label || p.procedure || '-'}</span>
          </div>
          {plan === 'free' ? (
            <div style={{ fontSize: 11, color: uploadState.isUpgrade ? '#f7c766' : 'var(--muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {uploadState.helperText}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(p);
            }}
            title="Open patient file"
            style={{ width: 40, height: 36, background: 'rgba(255,255,255,0.04)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <FolderOpen size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!uploadState.canUpload) {
                onUpgrade?.();
                return;
              }
              onAddVisit?.(p);
            }}
            disabled={uploadingId === p.id}
            title={uploadState.helperText}
            style={{ width: 44, height: 36, background: uploadState.isUpgrade ? 'linear-gradient(135deg, rgba(245,158,11,0.22), rgba(251,191,36,0.16))' : 'rgba(0,212,255,0.1)', color: uploadState.isUpgrade ? '#f7c766' : 'var(--accent)', border: uploadState.isUpgrade ? '1px solid rgba(245,158,11,0.36)' : '1px solid rgba(0,212,255,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: uploadingId === p.id ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            {uploadingId === p.id ? '⏳' : uploadState.isUpgrade ? '🥇' : <Images size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="motionCard" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

const filterInputStyle = {
  minHeight: 44,
  background: 'var(--surface2)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '0 12px',
  outline: 'none',
};
