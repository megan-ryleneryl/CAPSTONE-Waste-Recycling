import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './GoogleLoginButton.module.css';

const GoogleLoginButton = ({ 
  onSuccess, 
  onError, 
  text = "continue_with",
  isRegister = false 
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    try {
      // Call your backend Google auth endpoint
      const response = await axios.post('http://localhost:3001/api/auth/google', {
        token: credentialResponse.credential
      });

      if (response.data.success || response.data.token) {
        // Store the JWT token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        if (onSuccess) {
          onSuccess(response.data);
        } else {
          // Default navigation to posts page
          navigate('/posts');
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
      const errorMessage = error.response?.data?.message || 'Google authentication failed';
      
      if (onError) {
        onError(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google Login Failed');
    const errorMessage = 'Google login was cancelled or failed';
    
    if (onError) {
      onError(errorMessage);
    } else {
      alert(errorMessage);
    }
  };

  return (
    <div className={styles.googleButtonContainer}>
      {/* Divider */}
      <div className={styles.divider}>
        <div className={styles.dividerLine}></div>
        <span className={styles.dividerText}>OR</span>
        <div className={styles.dividerLine}></div>
      </div>
      
      {/* Google Login Button */}
      <div className={styles.googleButtonWrapper}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <span className={styles.spinner}></span>
            Processing Google {isRegister ? 'Sign Up' : 'Sign In'}...
          </div>
        ) : (
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            text={text}
            shape="rectangular"
            width="300"
            locale="en"
            useOneTap={false}
          />
        )}
      </div>
    </div>
  );
};

export default GoogleLoginButton;