// API endpoints - настройте под ваш бэкенд
const API_BASE_URL ='http://localhost:5000';

class AuthService {
  /**
   * Аутентификация пользователя на сервере
   * @param {string} username - Логин
   * @param {string} password - Пароль
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
   */
  static async login(username, password) {
    try {
      // РЕАЛЬНЫЙ ЗАПРОС К СЕРВЕРУ
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Ошибка входа' };
      }

      const data = await response.json();
      
      // Сохраняем токен для будущих запросов
      localStorage.setItem('auth_token', data.token);
      
      return {
        success: true,
        user: {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.role,
          fullName: data.user.fullName,
          token: data.token,
          permissions: data.user.permissions || [],
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      
      // ДЛЯ ТЕСТИРОВАНИЯ БЕЗ БЭКЕНДА - раскомментировать при необходимости
      if (username === 'admin' && password === 'admin123') {
        return {
          success: true,
          user: {
            id: 1,
            username: 'admin',
            email: 'admin@digital-holding.com',
            role: 'administrator',
            fullName: 'Администратор',
            token: 'demo_token_' + Date.now(),
            permissions: ['read', 'write', 'delete'],
          },
        };
      }
      if (username === 'user' && password === 'user123') {
        return {
          success: true,
          user: {
            id: 2,
            username: 'user',
            email: 'user@digital-holding.com',
            role: 'user',
            fullName: 'Пользователь',
            token: 'demo_token_' + Date.now(),
            permissions: ['read'],
          },
        };
      }
      
      return { success: false, error: 'Ошибка подключения к серверу' };
    }
  }

  /**
   * Выход из системы
   */
  static async logout() {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }

  /**
   * Проверка валидности сохраненного токена
   */
  static async validateToken() {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * Получение сохраненного пользователя из localStorage
   */
  static getStoredUser() {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Сохранение пользователя в localStorage
   */
  static storeUser(user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  /**
   * Очистка данных пользователя
   */
  static clearUser() {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  }
}

export default AuthService;