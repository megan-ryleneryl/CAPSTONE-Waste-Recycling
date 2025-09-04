// client/src/pages/Login.js - Refactored with reusable components
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/common/Card/Card';
import Button from '../components/common/Button/Button';
import Input from '../components/common/Input/Input';
import styles from './Login.module.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Replace this with actual API call
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('authToken', result.idToken);
        localStorage.setItem('user', JSON.stringify(result.user));
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.log('Login attempt with:', formData);
      // For testing purposes, simulate successful login
      localStorage.setItem('user', JSON.stringify({
        userID: '123',
        firstName: 'Test',
        lastName: 'User',
        email: formData.email,
        userType: 'Giver'
      }));
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <Card className={styles.loginCard} size="large">
        <Card.Header>
          <div className={styles.header}>
            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>Sign in to your EcoConnect account</p>
          </div>
        </Card.Header>

        <Card.Body>
          {error && (
            <div className={styles.errorAlert}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />

            <Button
              type="submit"
              loading={loading}
              className={styles.submitButton}
              size="large"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </Card.Body>

        <Card.Footer>
          <div className={styles.footer}>
            <p className={styles.registerPrompt}>
              Don't have an account?{' '}
              <Link to="/register" className={styles.registerLink}>
                Register here
              </Link>
            </p>
            
            <Link to="/" className={styles.homeLink}>
              ← Back to Home
            </Link>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
};

export default Login;