import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo/logo';
import styles from './Login.module.css';
import axios from 'axios';
import GoogleLoginButton from '../components/common/Button/GoogleLoginButton';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    const token = localStorage.getItem('token');
    
    if (rememberedUser && token) {
      // Auto-redirect to posts if "Remember Me" was previously checked
      navigate('/posts');
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:3001/api/auth/login', {
        email: formData.email,
        password: formData.password
      });
      
      if (response.data.success) {
        // Store token
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Handle "Remember Me"
        if (formData.rememberMe) {
          localStorage.setItem('rememberedUser', JSON.stringify(response.data.user));
        } else {
          localStorage.removeItem('rememberedUser');
        }
        
        // Navigate to posts screen
        navigate('/posts');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google login success
  const handleGoogleSuccess = (data) => {
    console.log('Google login successful:', data);
    
    // Store the token and user data (adjust based on your backend response)
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Navigate to posts
    navigate('/posts');
  };

  // Handle Google login error
  const handleGoogleError = (error) => {
    console.error('Google login error:', error);
    setError('Google login failed. Please try again.');
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.logoSection}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo size="large" />
          </Link>
          <p className={styles.tagline}>Your Partner in a Circular Economy</p>
        </div>

        <h2 className={styles.title}>Log in</h2>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.rememberMe}>
            <input
              type="checkbox"
              id="remember"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleInputChange} 
            />
            <label htmlFor="remember">Remember me</label>
          </div>

          <button 
            type="submit" 
            className={styles.submitButton} 
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {/* Google Login Button */}
        <GoogleLoginButton 
          onSuccess={(data) => {
            console.log('Google login successful:', data);
            // Navigate to posts or dashboard
            navigate('/posts');
          }}
          onError={(errorMessage) => {
            setError(errorMessage);
          }}
          text="signin_with"
          isRegister={false}
        />

        <div className={styles.signupPrompt}>
          <p>Don't have an account?</p>
          <Link to="/register" className={styles.signupLink}>Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;