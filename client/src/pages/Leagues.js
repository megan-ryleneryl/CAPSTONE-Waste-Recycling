import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import styles from './Leagues.module.css';
import { TrendingUp, TrendingDown, Minus, Share2, Award, Clipboard } from 'lucide-react';

// City tier icons as simple components (placeholder SVGs)
const TierIcon = ({ tier, size = 24 }) => {
  const getColor = () => {
    switch(tier) {
      case 3: return '#3B6535'; // 500+ users - darkest green
      case 2: return '#5A9A52'; // 101-500 users - medium green
      case 1:
      default: return '#8BC485'; // 1-100 users - light green
    }
  };

  // Render buildings based on tier
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={getColor()}>
      {tier >= 1 && <rect x="2" y="14" width="6" height="10" rx="1" />}
      {tier >= 2 && <rect x="9" y="10" width="6" height="14" rx="1" />}
      {tier >= 3 && <rect x="16" y="6" width="6" height="18" rx="1" />}
    </svg>
  );
};

const Leagues = () => {
  const { currentUser } = useAuth();
  const [cityLeaderboard, setCityLeaderboard] = useState([]);
  const [userCity, setUserCity] = useState(null);
  const [heavyLifters, setHeavyLifters] = useState([]);
  const [wasteDistribution, setWasteDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 });

  // Calculate time until next Sunday midnight (weekly reset)
  const calculateCountdown = useCallback(() => {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    nextSunday.setHours(0, 0, 0, 0);

    const diff = nextSunday - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    setCountdown({ days, hours, mins });
  }, []);

  // Get city tier based on user count
  const getCityTier = (userCount) => {
    if (userCount >= 500) return 3;
    if (userCount >= 101) return 2;
    return 1;
  };

  // Calculate city score: Total Points / Number of Users
  const calculateCityScore = (totalPoints, userCount) => {
    if (userCount === 0) return 0;
    return Math.round(totalPoints / userCount);
  };

  useEffect(() => {
    loadLeaderboardData();
    calculateCountdown();

    // Update countdown every minute
    const interval = setInterval(calculateCountdown, 60000);
    return () => clearInterval(interval);
  }, [calculateCountdown]);

  const loadLeaderboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Fetch city leaderboard data
      const response = await axios.get(
        'http://localhost:3001/api/analytics/city-leaderboard',
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const { cities, userCityData, topUsersInCity, wasteByType } = response.data.data;

        // Sort cities by score (points / users)
        const sortedCities = cities.map(city => ({
          ...city,
          score: calculateCityScore(city.totalPoints, city.userCount),
          tier: getCityTier(city.userCount)
        })).sort((a, b) => b.score - a.score);

        // Assign ranks and calculate rank changes
        sortedCities.forEach((city, index) => {
          city.rank = index + 1;
          // Mock rank change for now (would come from backend comparing to previous week)
          city.rankChange = city.previousRank ? city.previousRank - city.rank : 0;
        });

        setCityLeaderboard(sortedCities);
        setUserCity(userCityData);
        setHeavyLifters(topUsersInCity || []);

        // Transform waste distribution
        if (wasteByType) {
          const total = Object.values(wasteByType).reduce((sum, val) => sum + val, 0);
          const distribution = Object.entries(wasteByType).map(([type, value]) => ({
            type,
            percentage: total > 0 ? Math.round((value / total) * 100) : 0,
            color: getWasteColor(type)
          }));
          setWasteDistribution(distribution);
        }
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      // Use mock data for development
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const getWasteColor = (type) => {
    const colors = {
      'Plastic': '#F4A460',
      'Paper': '#90EE90',
      'Metal': '#87CEEB',
      'Glass': '#DDA0DD',
      'E-waste': '#FFD700',
      'Organic': '#8FBC8F',
      'Textile': '#FF6B6B',
      'Other': '#D3D3D3'
    };
    return colors[type] || '#90EE90';
  };

  const loadMockData = () => {
    // Mock city data
    const mockCities = [
      { cityCode: '1', cityName: 'Taguig City', totalPoints: 24000, userCount: 4, previousRank: 1 },
      { cityCode: '2', cityName: 'Manila City', totalPoints: 5000, userCount: 676, previousRank: 3 },
      { cityCode: '3', cityName: 'Caloocan City', totalPoints: 12000, userCount: 3, previousRank: 2 },
    ].map(city => ({
      ...city,
      score: calculateCityScore(city.totalPoints, city.userCount),
      tier: getCityTier(city.userCount)
    })).sort((a, b) => b.score - a.score);

    mockCities.forEach((city, index) => {
      city.rank = index + 1;
      city.rankChange = city.previousRank ? city.previousRank - city.rank : 0;
    });

    setCityLeaderboard(mockCities);

    // Mock user city data
    const userCityName = currentUser?.userLocation?.city?.name || 'Manila City';
    const userCityData = mockCities.find(c => c.cityName === userCityName) || mockCities[1];
    setUserCity({
      ...userCityData,
      pointsToOvertake: 1000,
      nextCity: mockCities[0]?.cityName
    });

    // Mock heavy lifters
    setHeavyLifters([
      { rank: 1, name: 'Kenneth Vidal', points: 300 },
      { rank: 2, name: 'Luke Aniago', points: 267 },
      { rank: 3, name: 'Megan Sioco', points: 150 },
    ]);

    // Mock waste distribution
    setWasteDistribution([
      { type: 'Plastic', percentage: 45, color: '#F4A460' },
      { type: 'Paper', percentage: 30, color: '#90EE90' },
      { type: 'Metal', percentage: 15, color: '#87CEEB' },
      { type: 'Glass', percentage: 10, color: '#DDA0DD' },
    ]);
  };

  const getRankChangeIcon = (change) => {
    if (change > 0) return <TrendingUp size={16} className={styles.rankUp} />;
    if (change < 0) return <TrendingDown size={16} className={styles.rankDown} />;
    return <Minus size={16} className={styles.rankSame} />;
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.leagues}>
      {/* Header with Title and Countdown */}
      <div className={styles.header}>
        <h1 className={styles.title}>League</h1>
        <div className={styles.countdownSection}>
          <span className={styles.countdownLabel}>This week Top City:</span>
          <div className={styles.countdown}>
            <div className={styles.countdownItem}>
              <span className={styles.countdownValue}>{String(countdown.days).padStart(2, '0')}</span>
              <span className={styles.countdownUnit}>Days</span>
            </div>
            <span className={styles.countdownSeparator}>:</span>
            <div className={styles.countdownItem}>
              <span className={styles.countdownValue}>{String(countdown.hours).padStart(2, '0')}</span>
              <span className={styles.countdownUnit}>Hours</span>
            </div>
            <span className={styles.countdownSeparator}>:</span>
            <div className={styles.countdownItem}>
              <span className={styles.countdownValue}>{String(countdown.mins).padStart(2, '0')}</span>
              <span className={styles.countdownUnit}>Mins</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Left Section - Leaderboard and User City */}
        <div className={styles.leftSection}>
          {/* City Leaderboard Table */}
          <div className={styles.leaderboardCard}>
            <div className={styles.leaderboardHeader}>
              <span className={styles.headerRank}>Rank</span>
              <span className={styles.headerCity}>City</span>
              <span className={styles.headerTier}>Tier</span>
              <span className={styles.headerPoints}>Points</span>
              <span className={styles.headerChange}></span>
            </div>

            {cityLeaderboard.slice(0, 10).map((city) => (
              <div
                key={city.cityCode}
                className={`${styles.leaderboardRow} ${
                  city.cityName === userCity?.cityName ? styles.userCityRow : ''
                }`}
              >
                <div className={styles.rankCell}>
                  <span className={styles.rankNumber}>#{city.rank}</span>
                </div>
                <div className={styles.cityCell}>
                  <span className={styles.cityName}>{city.cityName}</span>
                </div>
                <div className={styles.tierCell}>
                  <TierIcon tier={city.tier} size={20} />
                </div>
                <div className={styles.pointsCell}>
                  <span className={styles.scoreValue}>{city.score.toLocaleString()}</span>
                </div>
                <div className={styles.changeCell}>
                  {getRankChangeIcon(city.rankChange)}
                </div>
              </div>
            ))}
          </div>

          {/* User's City Card */}
          {userCity && (
            <div className={styles.userCityCard}>
              <div className={styles.userCityHeader}>
                <span className={styles.userCityRank}>#{userCity.rank}</span>
                <div className={styles.userCityTierInfo}>
                  <TierIcon tier={userCity.tier} size={24} />
                  <span className={styles.userCityUsers}>{userCity.userCount} users</span>
                </div>
              </div>
              <div className={styles.userCityName}>{userCity.cityName}</div>
              <div className={styles.userCityScore}>{userCity.score?.toLocaleString() || userCity.totalPoints?.toLocaleString()} points</div>

              {userCity.pointsToOvertake > 0 && userCity.nextCity && (
                <div className={styles.overtakeMessage}>
                  Only {userCity.pointsToOvertake.toLocaleString()} more points to overtake {userCity.nextCity}!
                </div>
              )}

              {/* Heavy Lifters */}
              <div className={styles.heavyLiftersSection}>
                <h3 className={styles.heavyLiftersTitle}>Heavy Lifters</h3>
                <div className={styles.heavyLiftersList}>
                  {heavyLifters.map((user) => (
                    <div key={user.rank} className={styles.heavyLifterRow}>
                      <span className={styles.lifterRank}>#{user.rank}</span>
                      <span className={styles.lifterName}>{user.name}</span>
                      <span className={styles.lifterPoints}>{user.points} points</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Section - Waste Distribution and Scoring Info */}
        <div className={styles.rightSection}>
          {/* Scoring Info Card */}
          <div className={styles.scoringInfoCard}>
            <h3 className={styles.scoringTitle}>Scoring Info</h3>
            <div className={styles.scoringIcons}>
              <div className={styles.scoringItem}>
                <div className={styles.scoringIconWrapper}>
                  <Clipboard size={24} className={styles.scoringIcon} />
                </div>
                <span className={styles.scoringLabel}>Log your recycling</span>
              </div>
              <div className={styles.scoringItem}>
                <div className={styles.scoringIconWrapper}>
                  <Share2 size={24} className={styles.scoringIcon} />
                </div>
                <span className={styles.scoringLabel}>Points go to your city</span>
              </div>
              <div className={styles.scoringItem}>
                <div className={styles.scoringIconWrapper}>
                  <Award size={24} className={styles.scoringIcon} />
                </div>
                <span className={styles.scoringLabel}>Most active city wins</span>
              </div>
            </div>

            <div className={styles.scoringDescription}>
              <p>Our leaderboard isn't just about who is the biggest, it's about who is the most committed. We use an Engagement Score to ensure every city, big or small, has a fair shot at the #1 spot.</p>
              <p>Every waste action you log earns points for you and your city.</p>
              <p>We rank cities by Average Engagement to keep it fair for everyone</p>
            </div>

            {/* City Tier Legend */}
            <div className={styles.tierLegend}>
              <h4 className={styles.tierTitle}>City Tier</h4>
              <div className={styles.tierItems}>
                <div className={styles.tierItem}>
                  <TierIcon tier={1} size={20} />
                  <span>1-100 users</span>
                </div>
                <div className={styles.tierItem}>
                  <TierIcon tier={2} size={20} />
                  <span>101-500 users</span>
                </div>
                <div className={styles.tierItem}>
                  <TierIcon tier={3} size={20} />
                  <span>500+ users</span>
                </div>
              </div>
            </div>
          </div>

          {/* Waste Distribution */}
          {wasteDistribution.length > 0 && (
            <div className={styles.wasteDistributionCard}>
              <h3 className={styles.wasteTitle}>Waste Distribution</h3>
              <div className={styles.wasteChart}>
                {wasteDistribution.map((item) => (
                  <div
                    key={item.type}
                    className={styles.wasteBar}
                    style={{
                      height: `${item.percentage}%`,
                      backgroundColor: item.color
                    }}
                    title={`${item.type}: ${item.percentage}%`}
                  />
                ))}
              </div>
              <div className={styles.wasteLegend}>
                {wasteDistribution.map((item) => (
                  <div key={item.type} className={styles.wasteLegendItem}>
                    <span
                      className={styles.wasteLegendColor}
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={styles.wasteLegendLabel}>{item.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* No User Location Warning */}
      {!currentUser?.userLocation && (
        <div className={styles.noLocationWarning}>
          <p>Set your recycling community in your Profile to join the city competition!</p>
        </div>
      )}
    </div>
  );
};

export default Leagues;
