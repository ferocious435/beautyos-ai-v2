import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

console.log('CRITICAL: main.tsx is executing');
const rootElement = document.getElementById('root');

if (rootElement) {
  rootElement.innerHTML = '<h1 style="color:white;padding:50px;text-align:center;">JS EXECUTED - MOUNTING...</h1>';
}

createRoot(rootElement!).render(
  <StrictMode>
    <div style={{ color: 'yellow', fontSize: '30px', textAlign: 'center', marginTop: '100px' }}>
      REACT IS RENDERING! 🚀
    </div>
  </StrictMode>
)
