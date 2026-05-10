export const COLORS = {
  background: '#0E1117', // Darker background similar to vanilla
  surface: '#161B22',    // Vanilla surface
  surfaceLight: 'rgba(255, 255, 255, 0.04)', // Offset surface
  surfaceHighlight: 'rgba(61, 165, 217, 0.08)',
  primary: '#7C3AED',    // Vibrant premium purple
  primaryHover: '#8B5CF6',
  primaryDark: '#5B21B6',
  text: '#E2E8F0',       
  textMuted: '#64748B',  
  border: 'rgba(255, 255, 255, 0.08)', 
  borderFocus: 'rgba(124, 58, 237, 0.5)',
  error: '#EF4444',      
  errorBg: 'rgba(239, 68, 68, 0.1)',
  success: '#10B981',    
  warning: '#F59E0B',    
  transparent: 'transparent',
  overlay: 'rgba(14, 17, 23, 0.6)', 
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const ROUNDING = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const TYPOGRAPHY = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

export const SHADOWS = {
  glow: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  }
};
