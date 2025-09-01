const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState(null);

  const handleLogin = async (credentials) => {
    // This would connect to your backend API
    console.log('Login attempt:', credentials);
    
    // Simulate successful login
    setUser({
      userID: '123',
      firstName: 'User',
      lastName: 'Name',
      email: credentials.email,
      userType: 'Giver',
      points: 100,
      phone: '0999 999 9999'
    });
    setCurrentPage('dashboard');
  };

  const handleRegister = async (formData) => {
    // This would connect to your backend API
    console.log('Registration attempt:', formData);
    
    // Simulate successful registration
    setUser({
      userID: '123',
      firstName: formData.username.split(' ')[0] || formData.username,
      lastName: formData.username.split(' ')[1] || '',
      email: formData.email,
      userType: 'Giver',
      points: 0,
      phone: ''
    });
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('landing');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  // Render current page
  switch (currentPage) {
    case 'landing':
      return <LandingPage onNavigate={handleNavigate} />;
    case 'login':
      return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;
    case 'register':
      return <RegisterPage onRegister={handleRegister} onNavigate={handleNavigate} />;
    case 'dashboard':
      return <Dashboard user={user} onLogout={handleLogout} />;
    default:
      return <LandingPage onNavigate={handleNavigate} />;
  }
};

export default App;