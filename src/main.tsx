import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('Main.tsx: Application starting...');
const rootElement = document.getElementById('root');
console.log('Main.tsx: Root element found:', !!rootElement);

createRoot(rootElement!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
console.log('Main.tsx: Render called');
