// client/src/pages/Landing.js
import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '3rem',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '90%'
      }}>
        <h1 style={{ 
          color: '#333', 
          fontSize: '2.5rem', 
          marginBottom: '1rem',
          fontWeight: 'bold'
        }}>
          🌱♻️ EcoConnect
        </h1>
        
        <p style={{ 
          color: '#666', 
          fontSize: '1.2rem', 
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          Connecting waste givers with collectors to promote sustainable recycling practices
        </p>

        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <Link 
            to="/login" 
            style={{
              backgroundColor: '#667eea',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '5px',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: 'bold',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#5a6fd8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#667eea'}
          >
            Sign In
          </Link>
          
          <Link 
            to="/register" 
            style={{
              backgroundColor: 'transparent',
              color: '#667eea',
              padding: '12px 24px',
              borderRadius: '5px',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: 'bold',
              border: '2px solid #667eea',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#667eea';
              e.target.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#667eea';
            }}
          >
            Get Started
          </Link>
        </div>

        <div style={{ 
          marginTop: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          fontSize: '0.9rem',
          color: '#888'
        }}>
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🗑️</div>
            <div>Post Waste</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🚚</div>
            <div>Collect & Earn</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏆</div>
            <div>Get Rewards</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;