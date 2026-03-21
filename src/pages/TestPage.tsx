
const TestPage = () => {
  return (
    <div style={{ 
      backgroundColor: '#0a0a20', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      color: 'white',
      padding: '40px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '48px', color: '#eab308' }}>🚀 V2.1 ACTIVE</h1>
      <p style={{ fontSize: '24px' }}>Если вы видите этот синий экран — ваш Mini App обновился.</p>
      <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}>
        <p>Время: {new Date().toLocaleTimeString()}</p>
        <p>Статус: УСПЕХ</p>
      </div>
      <button 
        onClick={() => window.location.href = '/'}
        style={{ marginTop: '40px', padding: '20px 40px', background: '#eab308', color: '#000', border: 'none', borderRadius: '16px', fontWeight: 'bold' }}
      >
        Вернуться на главную
      </button>
    </div>
  );
};

export default TestPage;
