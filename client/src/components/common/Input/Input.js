// client/src/components/common/Input/Input.js
import React, { forwardRef } from 'react';
import styles from './Input.module.css';

const Input = forwardRef(({ 
  label,
  error,
  helperText,
  size = 'medium',
  variant = 'default',
  required = false,
  className = '',
  ...props 
}, ref) => {
  const inputClasses = [
    styles.input,
    styles[size],
    styles[variant],
    error && styles.error,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.inputGroup}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      <input
        ref={ref}
        className={inputClasses}
        {...props}
      />
      
      {error && (
        <span className={styles.errorText}>{error}</span>
      )}
      
      {helperText && !error && (
        <span className={styles.helperText}>{helperText}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;