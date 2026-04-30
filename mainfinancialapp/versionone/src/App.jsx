import React, { useState, useCallback } from 'react';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import EmbeddedApp from './components/EmbeddedApp';
import LoginModal from './components/LoginModal';
import Sidebar from './components/Sidebar';
import { MENU_ITEMS } from './constants';
import './App.css';

// Внутренний компонент, который использует контекст
const AppContent = () => {
  const { user, isAuthenticated, showLoginModal, login, logout, setShowLoginModal } = React.useContext(AuthContext);
  
  const [activeApp, setActiveApp] = useState(1);
  const [loadedApps, setLoadedApps] = useState({});
  const [refreshTriggers, setRefreshTriggers] = useState({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  });
  const [authError, setAuthError] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleLogin = async (username, password) => {
    setIsAuthLoading(true);
    setAuthError(null);
    const result = await login(username, password);
    if (!result.success) {
      setAuthError(result.error);
    }
    setIsAuthLoading(false);
  };

  const handleLoadingStart = useCallback((appId) => {
    setLoadedApps(prev => ({ ...prev, [appId]: false }));
  }, []);

  const handleAppLoad = useCallback((appId) => {
    setLoadedApps(prev => ({ ...prev, [appId]: true }));
  }, []);

  const refreshActiveApp = () => {
    setRefreshTriggers(prev => ({ ...prev, [activeApp]: prev[activeApp] + 1 }));
  };

  const refreshAllApps = () => {
    setRefreshTriggers(prev => ({
      1: prev[1] + 1,
      2: prev[2] + 1,
      3: prev[3] + 1,
      4: prev[4] + 1,
      5: prev[5] + 1,
      6: prev[6] + 1,
      7: prev[7] + 1,
      8: prev[8] + 1,
      9: prev[8] + 1,
    }));
  };

  const activeItem = MENU_ITEMS.find(item => item.id === activeApp);

  if (!isAuthenticated && !showLoginModal) {
    return null;
  }

  return (
    <>
      <LoginModal 
        isOpen={showLoginModal}
        onLogin={handleLogin}
        error={authError}
        isLoading={isAuthLoading}
      />
      
      {user && (
        <div className="app">
          <Sidebar 
            activeApp={activeApp}
            onAppChange={setActiveApp}
            loadedApps={loadedApps}
            user={user}
            onLogout={logout}
          />

          <main className="content">
            <header className="header">
              <div className="header-info">
                <h1>{activeItem?.name}</h1>
                <div className="header-meta">
                  {/* <span className="meta-badge">Активное приложение</span> */}
                  <span className="meta-url">{activeItem?.url}</span>
                </div>
              </div>
              <div className="header-actions">
                <button className="btn btn-secondary" onClick={refreshAllApps}>
                  🔄 Обновить все
                </button>
                <button className="btn btn-primary" onClick={refreshActiveApp}>
                  🔄 Обновить
                </button>
              </div>
            </header>

            <div className="iframe-container">
              {MENU_ITEMS.map((item) => (
                <EmbeddedApp
                  key={item.id}
                  id={item.id}
                  title={item.name}
                  url={item.url}
                  isActive={activeApp === item.id}
                  refreshTrigger={refreshTriggers[item.id]}
                  onLoad={handleAppLoad}
                  onLoadingStart={handleLoadingStart}
                  userData={user}
                />
              ))}
            </div>
          </main>
        </div>
      )}
    </>
  );
};

// Главный компонент с провайдером контекста
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;