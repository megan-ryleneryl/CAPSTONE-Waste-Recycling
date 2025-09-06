import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo/logo';
import styles from './Register.module.css';
import axios from 'axios';

const SignUp = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(''); 
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Form submission handler
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:3001/api/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        userType: 'Giver' // Default as specified
      });
      
      if (response.data.success) {
        // Store token
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Navigate to login for first-time verification
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

// 🔄 FIX: Moved SignUpChoice outside of render to prevent recreation
  if (step === 1) {
    return (
      <div className={styles.container}>
        <div className={styles.signUpCard}>
          <div className={styles.logoSection}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Logo size="large" />
            </Link>
            <p className={styles.tagline}>Your Partner in a Circular Economy</p>
          </div>

          <h2 className={styles.title}>Sign up</h2>

          <div className={styles.buttonGroup}>
            <button className={styles.googleButton}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <button 
              className={styles.emailButton}
              onClick={() => setStep(2)}
            >
              Create an Account
            </button>
          </div>

          <p className={styles.loginPrompt}>
            Already have an Account?
          </p>
          <Link to="/login" className={styles.loginButton}>
            Log in
          </Link>
        </div>
      </div>
    );
  }

  // 🔄 FIX: Step 2 - Create Account Form (no longer a nested function)
  return (
    <div className={styles.container}>
      <div className={styles.signUpCard}>
        <div className={styles.logoSection}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo size="large" />
          </Link>
          <p className={styles.tagline}>Your Partner in a Circular Economy</p>
        </div>

        <h2 className={styles.title}>Create an Account</h2>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <form className={styles.form} onSubmit={handleCreateAccount}>
          {/* ✨ NEW: First Name field */}
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            className={styles.input}
            value={formData.firstName}
            onChange={handleInputChange}
            required
          />
          
          {/* ✨ NEW: Last Name field */}
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            className={styles.input}
            value={formData.lastName}
            onChange={handleInputChange}
            required
          />
          
          <input
            type="email"
            name="email"
            placeholder="Email"
            className={styles.input}
            value={formData.email}
            onChange={handleInputChange}
            required
          />
          
          {/* ✨ NEW: Password field with visibility toggle */}
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              className={styles.input}
              value={formData.password}
              onChange={handleInputChange}
              required
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                // Eye slash icon (hide)
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                // Eye icon (show)
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          
          {/* ✨ NEW: Confirm Password field with visibility toggle */}
          <div className={styles.passwordWrapper}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm Password"
              className={styles.input}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={toggleConfirmPasswordVisibility}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                // Eye slash icon (hide)
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                // Eye icon (show)
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          <p className={styles.terms}>
            All new users are Givers by default.
          </p>

          <button 
            type="submit" 
            className={styles.createButton}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUp;