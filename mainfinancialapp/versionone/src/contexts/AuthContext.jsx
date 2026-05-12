import React, { createContext, useState, useEffect, useCallback } from 'react';
import AuthService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Проверка сохраненной сессии при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const storedUser = AuthService.getStoredUser();
      const isValid = await AuthService.validateToken();
      
      if (storedUser && isValid) {
        setUser(storedUser);
        setIsAuthenticated(true);
        setShowLoginModal(false);
      } else {
        setShowLoginModal(true);
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  // Функция входа
  const login = useCallback(async (username, password) => {
    const result = await AuthService.login(username, password);
    
    if (result.success && result.user) {
      setUser(result.user);
      setIsAuthenticated(true);
      AuthService.storeUser(result.user);
      setShowLoginModal(false);
      return { success: true };
    }
    
    return { success: false, error: result.error };
  }, []);

  // Функция выхода
  const logout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setShowLoginModal(true);
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    showLoginModal,
    login,
    logout,
    setShowLoginModal,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};