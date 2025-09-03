const LoginPage = ({ onLogin, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = () => {
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }
    onLogin({ email, password, rememberMe });
  };

  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <Logo />
        <p style={styles.tagline}>Your Partner in a Circular Economy</p>
        
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Log in</h2>
        
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          
          <div style={styles.checkbox}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <label htmlFor="rememberMe">Remember me</label>
          </div>
          
          <button onClick={handleSubmit} style={styles.button}>
            Log in
          </button>
        </div>
        
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          <a 
            style={styles.link}
            onClick={() => onNavigate('landing')}
          >
            Back to Sign up
          </a>
        </p>
      </div>
    </div>
  );
};