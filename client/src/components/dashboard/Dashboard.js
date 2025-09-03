const Dashboard = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState('profile');

  const sidebarItems = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'charts', label: 'Charts and Data', icon: BarChart },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare },
    { id: 'about', label: 'About', icon: Info },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const filterItems = [
    { id: 'recyclables', label: 'Recyclables', icon: Recycle },
    { id: 'initiatives', label: 'Initiatives', icon: FileText },
    { id: 'forums', label: 'Forums', icon: Users }
  ];

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Logo size="small" />
        </div>
        
        <div style={{ 
          flex: 1, 
          maxWidth: '500px', 
          margin: '0 32px',
          position: 'relative'
        }}>
          <Search style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: colors.textLight,
            width: '20px',
            height: '20px'
          }} />
          <input
            type="text"
            placeholder="Search..."
            style={{
              ...styles.input,
              margin: 0,
              paddingLeft: '40px',
              backgroundColor: colors.background
            }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <MessageSquare style={{ cursor: 'pointer', color: colors.text }} />
          <Bell style={{ cursor: 'pointer', color: colors.text }} />
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            backgroundColor: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.white,
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            {user?.firstName?.[0] || 'U'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Navigation Items */}
          <div style={{ marginBottom: '32px' }}>
            {sidebarItems.map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  style={{
                    ...styles.sidebarItem,
                    ...(activeSection === item.id ? styles.sidebarItemActive : {})
                  }}
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon size={20} style={{ marginRight: '12px' }} />
                  {item.label}
                </div>
              );
            })}
          </div>

          {/* Filter Posts Section */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: colors.background,
              borderRadius: '8px',
              marginBottom: '16px',
              cursor: 'pointer'
            }}>
              <span style={{ fontWeight: '600' }}>Filter Posts</span>
              <ChevronDown size={20} />
            </div>
            
            {filterItems.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.id} style={styles.sidebarItem}>
                  <Icon size={20} style={{ marginRight: '12px' }} />
                  {item.label}
                </div>
              );
            })}
          </div>

          {/* Create Post Button */}
          <button style={{
            ...styles.button,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <Plus size={20} />
            Create Post
          </button>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '32px' }}>
          {activeSection === 'profile' && (
            <div>
              {/* Profile Card */}
              <div style={styles.profileCard}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    borderRadius: '50%', 
                    backgroundColor: colors.cardBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    marginRight: '20px'
                  }}>
                    {user?.firstName?.[0] || 'U'}
                  </div>
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      {user?.firstName} {user?.lastName}
                      <span style={styles.userTypeBadge}>{user?.userType || 'Giver'}</span>
                    </h2>
                    <span style={styles.verifiedBadge}>Verified</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '32px', marginBottom: '24px' }}>
                  <div>
                    <strong>{user?.points || 100}</strong> Points
                  </div>
                  <div>
                    <strong>50 kg</strong> Donations
                  </div>
                </div>

                <div style={{ color: colors.textLight }}>
                  <p><strong>Phone number:</strong> {user?.phone || '0999 999 9999'}</p>
                  <p><strong>Address:</strong> Quezon City</p>
                </div>
              </div>

              {/* CTA Cards */}
              <div style={styles.ctaCard}>
                <p style={{ marginBottom: '12px' }}>
                  Join BinGo as a Collector and help close the loop on recycling in your community. Claim posts, manage pickups, and turn waste into a resource. Apply now and start earning points for every successful collection!
                </p>
                <button style={styles.ctaButton}>
                  Apply to be a Collector
                </button>
              </div>

              <div style={styles.ctaCard}>
                <p style={{ marginBottom: '12px' }}>
                  Join BinGo as a Verified Organization and connect directly with thousands of givers. Showcase your projects, collect materials at scale, and build your reputation as a leader in sustainable waste management.
                </p>
                <button style={styles.ctaButton}>
                  Apply for an Org Account
                </button>
              </div>

              {/* Badges Section */}
              <div style={{ marginTop: '32px' }}>
                <h3 style={{ marginBottom: '16px' }}>Badges:</h3>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={styles.badge}></div>
                  <div style={styles.badge}></div>
                  <div style={styles.badge}></div>
                </div>
              </div>
            </div>
          )}

          {activeSection !== 'profile' && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '400px',
              color: colors.textLight
            }}>
              <h2>{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Section</h2>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};