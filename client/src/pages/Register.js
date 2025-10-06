import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo/logo';
import styles from './Register.module.css';
import axios from 'axios';
import GoogleLoginButton from '../components/common/Button/GoogleLoginButton';

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

  const [showPassword] = useState(false);
  const [showConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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

  // Handle Google Sign Up Success
  const handleGoogleSignUp = (data) => {    
    // If it's a new user, you might want to show a welcome message
    if (data.isNewUser) {
      // Could set a welcome flag in localStorage
      localStorage.setItem('showWelcome', 'true');
    }
    
    // Navigate to posts or onboarding
    navigate('/posts');
  };

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
            <button 
              className={styles.emailButton}
              onClick={() => setStep(2)}
            >
              Create an Account
            </button>

            {/* Google Sign Up Option */}
            <GoogleLoginButton 
              onSuccess={handleGoogleSignUp}
              onError={(errorMessage) => {
                setError(errorMessage);
              }}
              text="signup_with"
              isRegister={true}
            />
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
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            className={styles.input}
            value={formData.firstName}
            onChange={handleInputChange}
            required
          />
          
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
          
          <div className={styles.passwordWrapper}>
            <p className={styles.passwordRequirements}>
              Password must be at least 6 characters
            </p>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              className={styles.input}
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>
          
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

        {/* Google Sign Up Option */}
        <GoogleLoginButton 
          onSuccess={handleGoogleSignUp}
          onError={(errorMessage) => {
            setError(errorMessage);
          }}
          text="signup_with"
          isRegister={true}
        />
      </div>
    </div>
  );
};

export default SignUp;