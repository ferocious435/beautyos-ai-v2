import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';

function App() {
  console.log('App.tsx: Rendering simple version');
  
  return (
    <div style={{ color: 'cyan', fontSize: '24px', padding: '100px', textAlign: 'center' }}>
      APP COMPONENT LOADED! 💎
      <br/>
      <span style={{ fontSize: '14px', color: 'gray' }}>Next step: Restoring Layout and Routes...</span>
    </div>
  );
}

export default App;
