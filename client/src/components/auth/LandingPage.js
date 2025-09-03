const LandingPage = ({ onNavigate }) => (
  <div style={styles.authContainer}>
    <div style={styles.authCard}>
      <Logo />
      <p style={styles.tagline}>Your Partner in a Circular Economy</p>
      
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Sign up</h2>
      
      <button 
        style={{ ...styles.button, ...styles.buttonSecondary }}
        onClick={() => alert('Google Sign-In would be implemented here')}
      >
        Sign up with Google
      </button>
      
      <p style={{ textAlign: 'center', margin: '16px 0', color: colors.textLight }}>or</p>
      
      <button 
        style={{ ...styles.button, ...styles.buttonSecondary }}
        onClick={() => onNavigate('register')}
      >
        Create an Account
      </button>
      
      <p style={{ textAlign: 'center', marginTop: '30px', color: colors.textLight }}>
        Already have an Account?
      </p>
      
      <button 
        style={styles.button}
        onClick={() => onNavigate('login')}
      >
        Log in
      </button>
    </div>
  </div>
);