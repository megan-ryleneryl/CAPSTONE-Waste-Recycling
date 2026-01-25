import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './Leagues.module.css';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

const Leagues = () => {
  const { currentUser } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all-time'); // 'weekly', 'monthly', 'all-time'

  useEffect(() => {
    loadLeaderboardData();
  }, [timeFilter]);

  const loadLeaderboardData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/leaderboard?period=${timeFilter}`);
      // const data = await response.json();

      // Mock data for now
      const mockData = [
        { userID: 1, username: 'EcoWarrior', points: 2500, rank: 1, recyclables: 45 },
        { userID: 2, username: 'GreenChampion', points: 2300, rank: 2, recyclables: 42 },
        { userID: 3, username: 'RecycleKing', points: 2100, rank: 3, recyclables: 38 },
        { userID: 4, username: 'EarthSaver', points: 1900, rank: 4, recyclables: 35 },
        { userID: 5, username: 'WasteReduction', points: 1700, rank: 5, recyclables: 32 },
      ];

      setLeaderboard(mockData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch(rank) {
      case 1:
        return <Trophy className={styles.goldIcon} size={24} />;
      case 2:
        return <Medal className={styles.silverIcon} size={24} />;
      case 3:
        return <Award className={styles.bronzeIcon} size={24} />;
      default:
        return <span className={styles.rankNumber}>#{rank}</span>;
    }
  };

  const getCurrentUserRank = () => {
    const userRank = leaderboard.find(user => user.userID === currentUser?.userID);
    return userRank || { rank: '-', points: currentUser?.points || 0 };
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  const currentUserRank = getCurrentUserRank();

  return (
    <div className={styles.leagues}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Trophy size={32} />
          Leagues & Leaderboard
        </h1>
        <p className={styles.subtitle}>Compete with others and climb the ranks!</p>
      </div>

      {/* User Stats Card */}
      <div className={styles.userStatsCard}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Your Rank</span>
          <span className={styles.statValue}>
            {typeof currentUserRank.rank === 'number' ? `#${currentUserRank.rank}` : '-'}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Your Points</span>
          <span className={styles.statValue}>{currentUserRank.points}</span>
        </div>
        <div className={styles.statItem}>
          <TrendingUp className={styles.trendIcon} />
          <span className={styles.statLabel}>Keep going!</span>
        </div>
      </div>

      {/* Time Filter */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${timeFilter === 'weekly' ? styles.active : ''}`}
          onClick={() => setTimeFilter('weekly')}
        >
          This Week
        </button>
        <button
          className={`${styles.filterBtn} ${timeFilter === 'monthly' ? styles.active : ''}`}
          onClick={() => setTimeFilter('monthly')}
        >
          This Month
        </button>
        <button
          className={`${styles.filterBtn} ${timeFilter === 'all-time' ? styles.active : ''}`}
          onClick={() => setTimeFilter('all-time')}
        >
          All Time
        </button>
      </div>

      {/* Leaderboard */}
      <div className={styles.leaderboard}>
        <div className={styles.leaderboardHeader}>
          <span className={styles.headerRank}>Rank</span>
          <span className={styles.headerUser}>User</span>
          <span className={styles.headerPoints}>Points</span>
          <span className={styles.headerRecyclables}>Recyclables</span>
        </div>

        {leaderboard.map((user, index) => (
          <div
            key={user.userID}
            className={`${styles.leaderboardRow} ${
              user.userID === currentUser?.userID ? styles.currentUser : ''
            } ${index < 3 ? styles.topThree : ''}`}
          >
            <div className={styles.rankCell}>
              {getRankIcon(user.rank)}
            </div>
            <div className={styles.userCell}>
              <span className={styles.username}>{user.username}</span>
              {user.userID === currentUser?.userID && (
                <span className={styles.youBadge}>You</span>
              )}
            </div>
            <div className={styles.pointsCell}>
              {user.points.toLocaleString()}
            </div>
            <div className={styles.recyclablesCell}>
              {user.recyclables}
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <div className={styles.emptyState}>
          <Trophy size={48} className={styles.emptyIcon} />
          <p>No leaderboard data available yet.</p>
          <p className={styles.emptySubtext}>Start recycling to see your rank!</p>
        </div>
      )}
    </div>
  );
};

export default Leagues;
