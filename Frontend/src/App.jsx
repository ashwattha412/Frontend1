import React, { useState } from 'react';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import UserInsights from './UserInsights';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage] = useState('chat'); // 'chat' | 'insights'

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setPage('chat');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setPage('chat');
  };

  const handleNavigate = (target) => setPage(target);
  const handleBackToChat = () => setPage('chat');

  if (!user) {
    return (
      <div className="w-full min-h-screen m-0 p-0 bg-[#fffcfb]">
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen m-0 p-0 bg-[#fffcfb]">
      {page === 'insights' && (
        <UserInsights user={user} onBack={handleBackToChat} />
      )}
      {page === 'chat' && (
        <Dashboard user={user} onLogout={handleLogout} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;