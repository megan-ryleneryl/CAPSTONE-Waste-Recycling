// client/src/components/common/Card/Card.js
import React from 'react';
import styles from './Card.module.css';

const Card = ({ 
  children, 
  variant = 'default',
  size = 'medium',
  hoverable = false,
  className = '',
  ...props 
}) => {
  const cardClasses = [
    styles.card,
    styles[variant],
    styles[size],
    hoverable && styles.hoverable,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

// Sub-components for better composition
const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`${styles.header} ${className}`} {...props}>
    {children}
  </div>
);

const CardBody = ({ children, className = '', ...props }) => (
  <div className={`${styles.body} ${className}`} {...props}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`${styles.footer} ${className}`} {...props}>
    {children}
  </div>
);

// Attach sub-components to main component
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;