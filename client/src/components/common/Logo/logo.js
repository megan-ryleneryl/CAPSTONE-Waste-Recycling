import React from 'react';

const Logo = ({ size = 'medium', showText = true, className = '' }) => {
  const sizes = {
    small: { icon: 24, text: 16 },
    medium: { icon: 32, text: 24 },
    large: { icon: 48, text: 32 }
  };
  
  const currentSize = sizes[size] || sizes.medium;
  
  return (
    <div className={`logo ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* Trash Can Icon */}
      <svg 
        width={currentSize.icon} 
        height={currentSize.icon} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" 
          stroke="#3B6535" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2" fill="#F0924C" opacity="0.8"/>
      </svg>
      
      {showText && (
        <div style={{ 
          fontFamily: 'Raleway, sans-serif',
          fontSize: `${currentSize.text}px`,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'baseline'
        }}>
          <span style={{ color: '#3B6535' }}>Bin</span>
          <span style={{ color: '#F0924C' }}>Go</span>
        </div>
      )}
    </div>
  );
};

export default Logo;