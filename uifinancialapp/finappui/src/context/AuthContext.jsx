import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    // Проверка credentials из .env (Vite использует import.meta.env)
    if (username === import.meta.env.VITE_ADMIN_LOGIN && 
        password === import.meta.env.VITE_ADMIN_PASSWORD) {
      const userData = { username: 'admin', role: 'admin' };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, user: userData };
    } else if (username === import.meta.env.VITE_USER_LOGIN && 
               password === import.meta.env.VITE_USER_PASSWORD) {
      const userData = { username: 'user', role: 'user' };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, user: userData };
    }
    return { success: false, error: 'Неверный логин или пароль' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};