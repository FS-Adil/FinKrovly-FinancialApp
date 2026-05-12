import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ALLOWED_ORIGINS, MESSAGE_TYPES, TIMEOUTS } from '../constants';

const EmbeddedApp = ({ 
  id, 
  title, 
  url, 
  isActive, 
  refreshTrigger, 
  onLoad, 
  onLoadingStart, 
  userData 
}) => {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const [height, setHeight] = useState('auto');
  const [width, setWidth] = useState('100%');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const heightRef = useRef(0);
  const hasNotifiedLoadRef = useRef(false);
  const isMountedRef = useRef(false);
  const readyReceivedRef = useRef(false);
  const authSentRef = useRef(false);
  const checkIntervalRef = useRef(null);

  // Обновление ширины контейнера
  const updateContainerWidth = useCallback(() => {
    if (containerRef.current && isMountedRef.current) {
      const containerWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
      setWidth(`${containerWidth}px`);
    }
  }, []);

  useEffect(() => {
    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, [updateContainerWidth]);

  // Отправка данных пользователя в iframe
  const sendUserDataToIframe = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !userData || authSentRef.current) return;
    
    try {
      console.log(`🔐 [${title}] Отправка данных пользователя`);
      iframeRef.current.contentWindow.postMessage({
        type: MESSAGE_TYPES.AUTH_DATA,
        user: userData
      }, url);
      authSentRef.current = true;
    } catch (e) {
      console.log(`⚠️ [${title}] Ошибка отправки auth:`, e.message);
    }
  }, [title, url, userData]);

  // Отправка auth при изменении userData или загрузке
  useEffect(() => {
    if (userData && !isLoading && !hasError && iframeRef.current?.contentWindow) {
      authSentRef.current = false;
      sendUserDataToIframe();
    }
  }, [userData, isLoading, hasError, sendUserDataToIframe]);

  // Проверка доступности iframe
  const checkIframeAvailability = useCallback(() => {
    if (!iframeRef.current || !isMountedRef.current || readyReceivedRef.current) return;
    
    try {
      const iframeDoc = iframeRef.current.contentDocument;
      if (iframeDoc?.readyState === 'complete') {
        console.log(`📄 [${title}] Iframe загружен, ожидаем READY...`);
        
        setTimeout(() => {
          if (!readyReceivedRef.current && !hasNotifiedLoadRef.current && isMountedRef.current) {
            console.log(`⏰ [${title}] Таймаут ожидания READY`);
            setIsLoading(false);
            setHasError(true);
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
          }
        }, TIMEOUTS.READY_MESSAGE);
        
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      }
    } catch (e) {
      // CORS ошибка - игнорируем, iframe может быть загружен
    }
  }, [title]);

  useEffect(() => {
    if (isLoading && isMountedRef.current && !readyReceivedRef.current) {
      checkIntervalRef.current = setInterval(checkIframeAvailability, TIMEOUTS.CHECK_INTERVAL);
      return () => {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      };
    }
  }, [isLoading, checkIframeAvailability]);

  // Обработка сообщений от iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (!ALLOWED_ORIGINS.includes(event.origin)) return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      // Запрос аутентификации от дочернего приложения
      if (event.data.type === MESSAGE_TYPES.REQUEST_AUTH) {
        if (userData) {
          console.log(`🔐 [${title}] Дочернее приложение запросило auth`);
          event.source.postMessage({
            type: MESSAGE_TYPES.AUTH_DATA,
            user: userData
          }, event.origin);
          authSentRef.current = true;
        } else {
          event.source.postMessage({
            type: MESSAGE_TYPES.AUTH_REQUIRED,
            message: 'Требуется авторизация в родительском приложении'
          }, event.origin);
        }
        return;
      }

      // Получение сигнала READY
      if (event.data.type === MESSAGE_TYPES.READY) {
        if (readyReceivedRef.current) return;
        
        console.log(`✅ [${title}] Получен READY`);
        readyReceivedRef.current = true;
        
        if (userData && !authSentRef.current) {
          sendUserDataToIframe();
        }
        
        if (!hasNotifiedLoadRef.current && isMountedRef.current) {
          hasNotifiedLoadRef.current = true;
          setIsLoading(false);
          setHasError(false);
          onLoad?.(id);
          
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
        }
      }

      // Изменение размера
      if (event.data.type === MESSAGE_TYPES.RESIZE && event.data.height) {
        const newHeight = event.data.height;
        if (Math.abs(heightRef.current - newHeight) > 10) {
          heightRef.current = newHeight;
          setHeight(`${newHeight}px`);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, title, onLoad, userData, sendUserDataToIframe]);

  // Перезагрузка iframe
  const reloadIframe = useCallback(() => {
    if (!iframeRef.current || !isMountedRef.current) return;
    
    console.log(`🔄 [${title}] Перезагрузка`);
    
    hasNotifiedLoadRef.current = false;
    readyReceivedRef.current = false;
    authSentRef.current = false;
    
    setIsLoading(true);
    setHasError(false);
    onLoadingStart?.(id);
    
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    const currentSrc = iframeRef.current.src;
    iframeRef.current.src = 'about:blank';
    setTimeout(() => {
      if (iframeRef.current && isMountedRef.current) {
        iframeRef.current.src = url;
      }
    }, TIMEOUTS.RETRY_DELAY);
  }, [id, title, url, onLoadingStart]);

  useEffect(() => {
    if (refreshTrigger > 0 && iframeRef.current && isMountedRef.current) {
      reloadIframe();
    }
  }, [refreshTrigger, reloadIframe]);

  // Глобальный таймаут
  useEffect(() => {
    if (isLoading && isMountedRef.current) {
      const timeout = setTimeout(() => {
        if (isLoading && isMountedRef.current && !hasNotifiedLoadRef.current && !readyReceivedRef.current) {
          console.log(`⏰ [${title}] Глобальный таймаут`);
          setIsLoading(false);
          setHasError(true);
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
        }
      }, TIMEOUTS.IFRAME_LOAD);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, title]);

  // Отправка PARENT_READY при монтировании
  useEffect(() => {
    isMountedRef.current = true;
    
    const sendReadyMessage = () => {
      if (iframeRef.current?.contentWindow && isMountedRef.current) {
        iframeRef.current.contentWindow.postMessage({ type: MESSAGE_TYPES.PARENT_READY }, url);
      }
    };
    
    const timer = setTimeout(sendReadyMessage, 100);
    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
  }, [url]);

  const handleRetry = () => reloadIframe();

  return (
    <div 
      ref={containerRef}
      className={`embedded-app-container ${isActive ? 'active' : ''}`}
      style={{ height, width, maxWidth: '100%', display: isActive ? 'block' : 'none' }}
    >
      {isLoading && (
        <div className="iframe-loader">
          <div className="spinner"></div>
          <p>Загрузка {title}...</p>
          <p className="loader-url">{url}</p>
        </div>
      )}
      
      {hasError && !isLoading && (
        <div className="iframe-error">
          <p>⚠️ Не удалось загрузить {title}</p>
          <p className="error-url">{url}</p>
          <button onClick={handleRetry}>🔄 Повторить попытку</button>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        src={url}
        title={title}
        className="embedded-iframe"
        style={{ display: (isLoading || hasError) ? 'none' : 'block', width: '100%' }}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        onError={() => {
          console.log(`❌ [${title}] Ошибка загрузки`);
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
};

export default EmbeddedApp;