const RegisterPage = ({ onRegister, onNavigate }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      alert('Please fill in all fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    onRegister(formData);
  };

  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <Logo />
        <p style={styles.tagline}>Your Partner in a Circular Economy</p>
        
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Create an Account</h2>
        
        <div>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            style={styles.input}
          />
          
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
          />
          
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            style={styles.input}
          />
          
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            style={styles.input}
          />
          
          <p style={{ fontSize: '12px', color: colors.textLight, marginBottom: '20px' }}>
            All new users are Givers by default
          </p>
          
          <button onClick={handleSubmit} style={styles.button}>
            Create Account
          </button>
        </div>
        
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          Already have an account?{' '}
          <a 
            style={styles.link}
            onClick={() => onNavigate('login')}
          >
            Log in
          </a>
        </p>
      </div>
    </div>
  );
};