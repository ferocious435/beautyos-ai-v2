import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={
            <div style={{ color: 'lime', fontSize: '24px', padding: '100px', textAlign: 'center' }}>
              RESTORATION SUCCESSFUL! 🚀
              <br/>
              <span style={{ fontSize: '14px', color: 'gray' }}>Infrastructure is stable. Reintroducing features shortly.</span>
            </div>
          } />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
