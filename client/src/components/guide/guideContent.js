import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Megaphone, MessageSquare, MapPin, TrendingUp, Clock, Navigation, MessageCircle, Calendar, AlertCircle, Search, CheckCircle, Recycle, Cpu, Layers } from 'lucide-react';

// Shortcut Button Component
const ShortcutButton = ({ to, children, icon: Icon, onClose }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(to);
    // Close the modal after navigation
    if (onClose) {
      onClose();
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.875rem 1.75rem',
        background: '#3B6535',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'Raleway, sans-serif',
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-2px)';
        e.target.style.boxShadow = '0 6px 12px rgba(59, 101, 53, 0.3)';
        e.target.style.background = '#2d4e29';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = 'none';
        e.target.style.background = '#3B6535';
      }}
    >
      {Icon && <Icon size={20} />}
      {children}
    </button>
  );
};

// Guide Pages Content - Function that accepts onClose callback
export const getGuidePages = (onClose) => [
  // PAGE 1: Getting Started
  {
    title: 'Getting Started with EcoTayo',
    content: (
      <>
        <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>
          New here? Here's how to start recycling smarter in just a few steps:
        </p>

        <ul>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px',
              flexShrink: 0,
            }}>
              <Search size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Step 1: Browse the Feed
              </strong>
              <p style={{ margin: '0 0 0.5rem 0' }}>Scroll through posts in the feed to see what recyclables are available in your area.</p>
            </div>
          </li>

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px',
              flexShrink: 0,
            }}>
              <MapPin size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Step 2: Filter by Location
              </strong>
              <p style={{ margin: '0 0 0.5rem 0' }}>Use the location filter at the top of the feed to find posts near you - by region, city, or barangay.</p>
            </div>
          </li>

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px',
              flexShrink: 0,
            }}>
              <Trash2 size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Step 3: Claim or Post
              </strong>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>Collectors</strong> - click a Waste post to request a pickup.<br/>
                <strong>Givers</strong> - create a Waste post to share your recyclables.
              </p>
            </div>
          </li>

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px',
              flexShrink: 0,
            }}>
              <MessageCircle size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Step 4: Coordinate via Chat
              </strong>
              <p style={{ margin: '0 0 0.5rem 0' }}>Use the built-in chat to propose a pickup schedule, confirm details, and complete the exchange.</p>
            </div>
          </li>
        </ul>

        <div style={{
          background: '#F0FDF4',
          border: '1px solid #B3F2AC',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1.5rem',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <div style={{ minWidth: '24px' }}>
            <CheckCircle size={24} color="#3B6535" />
          </div>
          <p style={{ margin: 0, color: '#3B6535', fontWeight: 500 }}>
            <strong>Tip:</strong> Use the page navigation below to explore more guides - learn about post types, materials, and how to claim a waste post!
          </p>
        </div>
      </>
    ),
    shortcutButton: (
      <ShortcutButton to="/create-post" icon={Trash2} onClose={onClose}>
        Create Your First Post
      </ShortcutButton>
    ),
  },

  // PAGE 2: Post Types & How They Work
  {
    title: 'Understanding Post Types',
    content: (
      <>
        <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>
          EcoTayo has three types of posts, each serving a unique purpose in our circular economy:
        </p>

        <ul>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <Trash2 size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Waste Post (For Givers)
              </strong>
              <p style={{ margin: '0 0 0.5rem 0' }}>Share recyclables you want to give away</p>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Upload photos and specify materials</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Collectors can claim your post</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Set your preferred pickup times/locations</li>
              </ul>
            </div>
          </li>

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <Megaphone size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Initiative Post (For Collectors/Organizations)
              </strong>
              <p style={{ margin: '0 0 0.5rem 0' }}>Request specific materials for projects</p>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Set target amounts and deadlines</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Community members can offer support</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Track progress toward your goal</li>
              </ul>
            </div>
          </li>

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <MessageSquare size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Forum Post (For Community)
              </strong>
              <p style={{ margin: '0 0 0.5rem 0' }}>Share knowledge and engage in discussions</p>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Share recycling tips and knowledge</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Ask questions about waste management</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Build community awareness</li>
              </ul>
            </div>
          </li>
        </ul>
      </>
    ),
    shortcutButton: (
      <ShortcutButton to="/create-post" icon={Trash2} onClose={onClose}>
        Try Creating a Post
      </ShortcutButton>
    ),
  },

  // PAGE 3: Community Stats & Analytics
  {
    title: 'Making Data-Driven Decisions',
    content: (
      <>
        <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>
          The Analytics tab helps you make informed choices about recycling:
        </p>

        <ul>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <TrendingUp size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Community Impact Dashboard: Impact & Stats
              </strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>View total recycling impact</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Track community contribution trends</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>See material-specific statistics</li>
              </ul>
            </div>
          </li>

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <MapPin size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Disposal Hub Locator: Find Nearby Centers
              </strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Discover nearby disposal hubs (MRFs & junk shops)</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>See which facilities accept your materials</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Find convenient drop-off locations</li>
              </ul>
            </div>
          </li>

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B6535" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Recycling Activity Heatmap: Community Activity
              </strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Identify high-activity recycling areas</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Find communities that need more initiatives</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Discover trending recycling locations</li>
              </ul>
            </div>
          </li>
        </ul>

        <div style={{
          background: '#F0FDF4',
          border: '1px solid #B3F2AC',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1.5rem',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <div style={{ minWidth: '24px' }}>
            <TrendingUp size={24} color="#3B6535" />
          </div>
          <p style={{ margin: 0, color: '#3B6535', fontWeight: 500 }}>
            <strong>Tip:</strong> Use these insights to decide where to post or which initiatives to support!
          </p>
        </div>
      </>
    ),
    shortcutButton: (
      <ShortcutButton to="/analytics" icon={TrendingUp} onClose={onClose}>
        View Analytics
      </ShortcutButton>
    ),
  },

  // PAGE 4: Profile Preferences Setup
  {
    title: 'Set Up Your Preferences',
    content: (
      <>
        <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>
          Customize your experience for smoother transactions:
        </p>

        <ul>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <Clock size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Preferred Pickup Times
              </strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Add your available time slots</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Helps collectors plan efficient routes</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Reduces coordination back-and-forth</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Can set multiple time windows</li>
              </ul>
            </div>
          </li>

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <Navigation size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Preferred Locations
              </strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Save frequently used pickup addresses</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Add specific instructions (gate codes, landmarks)</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Set a primary location for quick selection</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Update anytime as needed</li>
              </ul>
            </div>
          </li>

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B6535" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Account Verification
              </strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Complete verification for full access</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Collectors need approval to claim posts</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Organizations can apply for org accounts</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Builds trust in the community</li>
              </ul>
            </div>
          </li>
        </ul>
      </>
    ),
    shortcutButton: (
      <ShortcutButton to="/profile" icon={Clock} onClose={onClose}>
        Go to Profile
      </ShortcutButton>
    ),
  },

  // PAGE 5: Material Types Guide
  {
    title: 'What Do the Material Options Mean?',
    content: (
      <>
        <p style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>
          When creating a post, select the recyclable material type(s) you have. Here's a quick reference:
        </p>

        {[
          {
            category: 'Paper',
            icon: <Layers size={16} color="#3B6535" />,
            color: '#E8F5E9',
            border: '#A5D6A7',
            items: [
              { label: 'Cartons (corrugated, brown)', desc: 'Brown cardboard boxes and packaging' },
              { label: 'White Paper (used)', desc: 'Used office/printer paper, bond paper' },
              { label: 'Newspaper', desc: 'Old newspapers and newsprint' },
              { label: 'Assorted/Mixed waste paper', desc: 'Mixed paper scraps, magazines, junk mail' },
            ],
          },
          {
            category: 'Plastic',
            icon: <Recycle size={16} color="#1565C0" />,
            color: '#E3F2FD',
            border: '#90CAF9',
            items: [
              { label: 'PET Bottles', desc: 'Clear water/soda bottles (marked #1 PET)' },
              { label: 'Plastic (HDPE)', desc: 'Milk jugs, shampoo bottles, containers (marked #2)' },
              { label: 'Plastic (LDPE)', desc: 'Plastic bags, cling wrap, squeeze bottles (marked #4)' },
            ],
          },
          {
            category: 'Glass',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D4C41" strokeWidth="2"><path d="M8 2h8l2 6-2 12H8L6 8z"/></svg>,
            color: '#FBE9E7',
            border: '#FFAB91',
            items: [
              { label: 'Glass Bottles', desc: 'Whole glass jars and bottles (any color)' },
              { label: 'Glass Cullets (Broken glass)', desc: 'Crushed or broken glass pieces' },
            ],
          },
          {
            category: 'Metal',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#37474F" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
            color: '#ECEFF1',
            border: '#B0BEC5',
            items: [
              { label: 'Aluminum Cans', desc: 'Soda and beverage cans' },
              { label: 'Copper Wire – Class A', desc: 'Bare/bright copper wire (highest grade)' },
              { label: 'Copper Wire – Class B', desc: 'Insulated copper wire (medium grade)' },
              { label: 'Copper Wire – Class C', desc: 'Mixed/low-grade copper wire' },
              { label: 'GI Sheet', desc: 'Galvanized iron sheets and roofing' },
              { label: 'Stainless Steel', desc: 'Stainless steel scrap, cookware, sinks' },
              { label: 'Steel (Iron alloys)', desc: 'General scrap iron and steel' },
              { label: 'Tin Can', desc: 'Food cans, aerosol cans (steel-based)' },
            ],
          },
          {
            category: 'Electronics',
            icon: <Cpu size={16} color="#4A148C" />,
            color: '#F3E5F5',
            border: '#CE93D8',
            items: [
              { label: 'Electronic Waste', desc: 'Old phones, cables, boards, batteries, appliances (e-waste)' },
            ],
          },
        ].map(({ category, icon, color, border, items }) => (
          <div key={category} style={{ marginBottom: '0.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.375rem',
              fontWeight: 700,
              fontSize: '0.875rem',
              color: '#1F2937',
            }}>
              {icon} {category}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              {items.map(({ label, desc }) => (
                <div key={label} style={{
                  background: color,
                  border: `1px solid ${border}`,
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                }}>
                  <strong style={{ fontSize: '0.8rem', display: 'block' }}>{label}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#4B5563' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: '8px',
          padding: '0.875rem',
          marginTop: '0.75rem',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <div style={{ minWidth: '24px' }}>
            <AlertCircle size={20} color="#92400E" />
          </div>
          <p style={{ margin: 0, color: '#92400E', fontWeight: 500, fontSize: '0.875rem' }}>
            <strong>Not sure?</strong> Pick the closest match — you can always add more details in your post description!
          </p>
        </div>
      </>
    ),
    shortcutButton: (
      <ShortcutButton to="/create-post" icon={Recycle} onClose={onClose}>
        Create a Waste Post
      </ShortcutButton>
    ),
  },

  // PAGE 6: How to Claim a Waste Post
  {
    title: 'How to Claim a Waste Post',
    content: (
      <>
        <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>
          Ready to collect recyclables? Follow these steps to claim a waste post:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {[
            {
              step: '1',
              icon: <Search size={20} color="#3B6535" />,
              title: 'Find a Claimable Post',
              desc: 'Browse the feed and click on a Waste post that shows the "Collect" button.',
            },
            {
              step: '2',
              icon: <CheckCircle size={20} color="#3B6535" />,
              title: 'Request Pickup & Confirm Interest',
              desc: 'On the post page, click the "Request Pickup" button and confirm your interest.',
            },
            {
              step: '3',
              icon: <MessageCircle size={20} color="#3B6535" />,
              title: 'Propose a Schedule via Chat',
              desc: 'A chat thread opens automatically. Use it to propose a pickup date, time, and location.',
            },
            {
              step: '4',
              icon: <Calendar size={20} color="#3B6535" />,
              title: 'Wait for the Giver\'s Confirmation',
              desc: 'The giver will review your proposed schedule and confirm or suggest a different time.',
            },
            {
              step: '5',
              icon: <Trash2 size={20} color="#3B6535" />,
              title: 'Collect Your Recyclables!',
              desc: 'Show up at the agreed time and place to collect the materials. Mark the pickup as complete once done.',
            },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.875rem',
            }}>
              <div style={{
                background: '#3B6535',
                color: 'white',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem',
                flexShrink: 0,
                marginTop: '2px',
              }}>
                {step}
              </div>
              <div style={{
                flex: 1,
                background: '#F0FDF4',
                border: '1px solid #B3F2AC',
                borderRadius: '8px',
                padding: '0.625rem 0.875rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  {icon}
                  <strong style={{ fontSize: '0.9375rem' }}>{title}</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1.25rem',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <div style={{ minWidth: '24px' }}>
            <AlertCircle size={24} color="#92400E" />
          </div>
          <p style={{ margin: 0, color: '#92400E', fontWeight: 500 }}>
            <strong>Reminder:</strong> Cancel at least 5 hours before the scheduled pickup if you can no longer make it.
          </p>
        </div>
      </>
    ),
    shortcutButton: (
      <ShortcutButton to="/posts" icon={Search} onClose={onClose}>
        Browse Waste Posts
      </ShortcutButton>
    ),
  },

  // PAGE 7: Pickup Coordination via Chat
  {
    title: 'Coordinating Your Pickups',
    content: (
      <>
        <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>
          Use the Chat page to finalize pickup details:
        </p>

        <ul>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <MessageCircle size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Chatting with Collectors/Givers
              </strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Discuss quantities, conditions, and specifics</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Negotiate pickup times within your preferences</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Ask questions before committing</li>
              </ul>
            </div>
          </li>

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <Calendar size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Creating Pickup Schedules
              </strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Once agreed, collector creates formal schedule</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Giver confirms the pickup details</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Both parties receive schedule notifications</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Details include: date, time, location, collector name</li>
              </ul>
            </div>
          </li>

          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              background: '#B3F2AC',
              padding: '0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '48px',
              height: '48px'
            }}>
              <MapPin size={24} color="#3B6535" />
            </div>
            <div>
              <strong style={{ fontSize: '1.125rem', display: 'block', marginBottom: '0.5rem' }}>
                Tracking Your Pickups
              </strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', listStyle: 'disc' }}>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>View active pickups in Pickup Management</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Get reminders before scheduled time</li>
                <li style={{ margin: '0.25rem 0', padding: 0 }}>Complete pickup after collection</li>
              </ul>
            </div>
          </li>
        </ul>

        <div style={{
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1.5rem',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <div style={{ minWidth: '24px' }}>
            <AlertCircle size={24} color="#92400E" />
          </div>
          <p style={{ margin: 0, color: '#92400E', fontWeight: 500 }}>
            <strong>Cancellation Policy:</strong> Cancel at least 5 hours before pickup time
          </p>
        </div>
      </>
    ),
    shortcutButton: (
      <ShortcutButton to="/chat" icon={MessageCircle} onClose={onClose}>
        Open Chat
      </ShortcutButton>
    ),
  },
];
