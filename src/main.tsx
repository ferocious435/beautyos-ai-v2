import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Глобальные обработчики для диагностики ошибок до монтирования React
window.onerror = (message, source, lineno, colno, error) => {
  console.error('GLOBAL ERROR:', message, 'at', source, ':', lineno, ':', colno, error);
};
window.onunhandledrejection = (event) => {
  console.error('UNHANDLED REJECTION:', event.reason);
};

console.log('MAIN: Debugging root mount initialization');
const rootElement = document.getElementById('root');

if (rootElement) {
  console.log('MAIN: Root element found, rendering...');
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('MAIN: Render call finished');
  } catch (err) {
    console.error('MAIN: Render crash:', err);
  }
} else {
  console.error('MAIN: Root element NOT found!');
}

