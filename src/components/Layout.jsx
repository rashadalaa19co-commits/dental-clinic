import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './Layout.module.css';

const NAV = [
  { to: '/',             icon: '📊', label: 'Dashboard' },
  { to: '/patients',     icon: '👥', label: 'Patients' },
  { to: '/appointments', icon: '📅', label: 'Appointments' },
  { to: '/gallery',      icon: '📸', label: 'Gallery' },
  { to: '/subscribe',    icon: '💳', label: 'Subscribe' },
  { to: '/finance',      icon: '💰', label: 'Finance' },
  { to: '/tools',        icon: '🔧', label: 'Tools' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🦷</span>
          <div>
            <div className={styles.logoName}>DentaCare</div>
            <div className={styles.logoPro}>Pro</div>
          </div>
        </div>
        <nav className={styles.nav}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <span className={styles.navIcon}>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.userBox}>
          <img src={user?.photoURL} alt="" className={styles.avatar}/>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.displayName}</div>
            <div className={styles.userEmail}>{user?.email}</div>
          </div>
          <button className={styles.logoutBtn} onClick={logout} title="Sign out">⏻</button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet/>
      </main>
    </div>
  );
}
