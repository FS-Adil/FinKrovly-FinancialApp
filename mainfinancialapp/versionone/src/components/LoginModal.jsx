import React, { useState, useEffect, useRef } from 'react';

const LoginModal = ({ isOpen, onLogin, error, isLoading }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef(null);
  const usernameRef = useRef(null);

  // Очищаем поля при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      // Принудительно очищаем DOM элементы
      if (usernameRef.current) {
        usernameRef.current.value = '';
      }
      if (passwordRef.current) {
        passwordRef.current.value = '';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Вход в Digital Holding</h2>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label>Логин:</label>
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите ваш логин"
              required
              autoFocus
              disabled={isLoading}
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label>Пароль:</label>
            <input
              ref={passwordRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>
          {error && <div className="error-message">❌ {error}</div>}
          {isLoading && <div className="loading-message">⏳ Проверка учетных данных...</div>}
          <div className="modal-buttons">
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </div>
        </form>
        <div className="modal-footer">
          {/* <small>Тестовые учетные данные: admin / admin123</small> */}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;