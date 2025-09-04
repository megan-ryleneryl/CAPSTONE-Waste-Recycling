// client/src/pages/Register.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'Giver'
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Replace this with actual API call
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Store token and redirect
        localStorage.setItem('authToken', result.idToken);
        localStorage.setItem('user', JSON.stringify(result.user));
        navigate('/dashboard');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      console.log('Registration attempt:', formData);
      // For testing, simulate successful registration
      const newUser = {
        userID: '123',
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        userType: formData.userType,
        points: 0
      };
      
      localStorage.setItem('user', JSON.stringify(newUser));
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '500px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#333', fontSize: '2rem', marginBottom: '0.5rem' }}>
            Join EcoConnect
          </h1>
          <p style={{ color: '#666' }}>Create your account and start recycling</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '0.75rem',
            borderRadius: '5px',
            marginBottom: '1rem',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                color: '#333', 
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter first name"
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                color: '#333', 
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              color: '#333', 
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your email"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              color: '#333', 
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}>
              Account Type
            </label>
            <select
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="Giver">Waste Giver</option>
              <option value="Collector">Waste Collector</option>
            </select>
            <small style={{ color: '#666', fontSize: '0.8rem' }}>
              Giver: Post waste for collection | Collector: Collect waste from others
            </small>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                color: '#333', 
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
                placeholder="Password"
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                color: '#333', 
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
                placeholder="Confirm password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: loading ? '#ccc' : '#667eea',
              color: 'white',
              padding: '0.75rem',
              border: 'none',
              borderRadius: '5px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem',
              transition: 'background-color 0.3s'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ 
          textAlign: 'center', 
          color: '#666',
          marginBottom: '1rem'
        }}>
          Already have an account?{' '}
          <Link 
            to="/login" 
            style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold' }}
          >
            Sign in here
          </Link>
        </div>

        <div style={{ 
          textAlign: 'center' 
        }}>
          <Link 
            to="/" 
            style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;