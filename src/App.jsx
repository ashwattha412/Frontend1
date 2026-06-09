import React, { useState } from 'react';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';

function App() {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData || { name: "User", email: "user@example.com" });
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="w-full min-h-screen m-0 p-0 bg-[#fffcfb]">
      {!user ? (
        /* ⚡ THE CRITICAL FIX: Explicitly passing the prop down here! ⚡ */
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;