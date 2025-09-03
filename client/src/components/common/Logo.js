import React from 'react';
import { colors } from '../../styles/theme';

const Logo = ({ size = 'normal' }) => (
  <div style={{ 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size === 'small' ? '24px' : '32px',
    fontWeight: 'bold'
  }}>
    <span style={{ color: colors.primary }}>🗑️ Bin</span>
    <span style={{ color: colors.secondary }}>Go</span>
  </div>
);

export default Logo;