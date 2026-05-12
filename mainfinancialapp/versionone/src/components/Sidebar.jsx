import React from 'react';
import { MENU_ITEMS } from '../constants';

const Sidebar = ({ activeApp, onAppChange, loadedApps, user, onLogout }) => {
  const loadedCount = Object.values(loadedApps).filter(v => v === true).length;
  const totalApps = MENU_ITEMS.length;

  return (
    <aside className="sidebar">
      <div className="logo">
        <h2>Digital Holding</h2>
        <p className="logo-subtitle">Цифровые ФИНАНСОВЫЕ сервисы</p>
      </div>

      {/* Информация о пользователе */}
      {user && (
        <div className="user-info">
          {/* <div className="user-avatar">
            {user.fullName?.charAt(0) || user.username?.charAt(0)}
          </div> */}
          <div className="user-details">
            <span className="user-name">{user.fullName}</span>
            
            {/* <span className="user-role">{user.role}</span> */}
          </div>
          <button onClick={onLogout} className="logout-btn" title="Выйти">
            Выход
          </button>
        </div>
      )}

      <nav className="menu">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`menu-item ${activeApp === item.id ? 'active' : ''}`}
            onClick={() => onAppChange(item.id)}
          >
            <span className="menu-text">{item.name}</span>
            {loadedApps[item.id] === true && <span className="loaded-badge">✓</span>}
            {loadedApps[item.id] === false && <span className="loading-dot">●</span>}
            {loadedApps[item.id] === undefined && <span className="loading-dot">●</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(loadedCount / totalApps) * 100}%` }}
          />
        </div>
        <div className="status-stats">
          <span>Загружено: {loadedCount}/{totalApps}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;