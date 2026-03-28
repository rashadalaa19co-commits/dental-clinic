import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientForm from './pages/PatientForm';
import PatientDetail from './pages/PatientDetail';
import Appointments from './pages/Appointments';
import Gallery from './pages/Gallery';
import Admin from './pages/Admin';
import Locked from './pages/Locked';
import Subscribe from './pages/Subscribe';
import Analysis from './pages/Analysis';
import './styles/global.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('/sw.js').catch(console.error)
  );
}

function ComingSoon({ title }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',gap:16}}>
      <div style={{fontSize:64}}>🚀</div>
      <h1 style={{fontSize:28,fontWeight:800}}>{title}</h1>
      <p style={{color:'var(--muted)',fontSize:16}}>Coming Soon...</p>
    </div>
  );
}

function AppLoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top, #123d6b 0%, #07111f 55%, #030814 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes pulseLogo {
          0%, 100% {
            transform: scale(1);
            opacity: 0.95;
          }
          50% {
            transform: scale(1.06);
            opacity: 1;
          }
        }

        @keyframes starFloat {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-8px) scale(1.2);
            opacity: 1;
          }
        }
      `}</style>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img
          src="/icon-192.png"
          alt="AuraDent"
          style={{
            width: 90,
            height: 90,
            borderRadius: 24,
            animation: 'pulseLogo 1.8s ease-in-out infinite',
            boxShadow: '0 0 35px rgba(0, 183, 255, 0.35)'
          }}
        />

        <span
          style={{
            position: 'absolute',
            top: -18,
            left: -12,
            fontSize: 18,
            color: '#4FD8FF',
            textShadow: '0 0 12px rgba(79, 216, 255, 0.9)',
            animation: 'starFloat 1.6s ease-in-out infinite'
          }}
        >
          ✨
        </span>

        <span
          style={{
            position: 'absolute',
            top: -10,
            right: -14,
            fontSize: 14,
            color: '#7BE7FF',
            textShadow: '0 0 10px rgba(123, 231, 255, 0.9)',
            animation: 'starFloat 1.8s ease-in-out infinite 0.3s'
          }}
        >
          ✦
        </span>

        <span
          style={{
            position: 'absolute',
            bottom: 8,
            right: -20,
            fontSize: 12,
            color: '#4FD8FF',
            textShadow: '0 0 10px rgba(79, 216, 255, 0.9)',
            animation: 'starFloat 1.9s ease-in-out infinite 0.6s'
          }}
        >
          ✨
        </span>
      </div>

      <div
        style={{
          marginTop: 18,
          fontSize: 15,
          color: 'rgba(255,255,255,0.72)',
          letterSpacing: '0.3px'
        }}
      >
        Loading your clinic data...
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <AppLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function LoginRoute() {
  const { user } = useAuth();
  if (user === undefined) return <AppLoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/locked" element={<ProtectedRoute><Locked /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/new" element={<PatientForm />} />
            <Route path="patients/:id/edit" element={<PatientForm />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="subscribe" element={<Subscribe />} />
            <Route path="finance" element={<ComingSoon title="💰 Finance" />} />
            <Route path="tools" element={<ComingSoon title="🔧 Tools" />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
