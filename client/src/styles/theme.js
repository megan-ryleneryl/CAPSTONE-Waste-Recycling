export const colors = {
  primary: '#5B8C3A',
  primaryDark: '#4A7230',
  secondary: '#FF8C42',
  background: '#F5F5F5',
  cardBg: '#D3D3D3',
  text: '#333333',
  textLight: '#666666',
  white: '#FFFFFF',
  verified: '#90EE90'
};

export const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: colors.background,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  authContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: colors.background
  },
  authCard: {
    backgroundColor: colors.cardBg,
    padding: '40px',
    borderRadius: '20px',
    width: '400px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    fontSize: '32px',
    fontWeight: 'bold'
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    marginRight: '8px'
  },
  tagline: {
    textAlign: 'center',
    color: colors.textLight,
    marginBottom: '30px',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: 'none',
    marginBottom: '16px',
    fontSize: '16px',
    backgroundColor: colors.white
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '25px',
    border: 'none',
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  buttonSecondary: {
    backgroundColor: colors.white,
    color: colors.text,
    marginBottom: '12px'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    fontSize: '14px',
    color: colors.textLight
  },
  link: {
    color: colors.primary,
    textDecoration: 'none',
    cursor: 'pointer'
  },
  navbar: {
    backgroundColor: colors.white,
    borderBottom: `1px solid ${colors.background}`,
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sidebar: {
    width: '280px',
    backgroundColor: colors.white,
    height: 'calc(100vh - 65px)',
    borderRight: `1px solid ${colors.background}`,
    padding: '24px 16px',
    overflowY: 'auto'
  },
  sidebarItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    color: colors.text
  },
  sidebarItemActive: {
    backgroundColor: colors.background
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },
  badge: {
    width: '120px',
    height: '120px',
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    marginRight: '16px'
  },
  verifiedBadge: {
    backgroundColor: colors.verified,
    color: colors.text,
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  },
  userTypeBadge: {
    backgroundColor: colors.cardBg,
    color: colors.text,
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
    marginLeft: '8px'
  },
  ctaCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px'
  },
  ctaButton: {
    backgroundColor: colors.primary,
    color: colors.white,
    padding: '10px 20px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '16px'
  }
};