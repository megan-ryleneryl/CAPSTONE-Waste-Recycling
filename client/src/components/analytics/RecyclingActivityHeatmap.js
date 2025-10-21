import React, { useState, useMemo } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import styles from './RecyclingActivityHeatmap.module.css';
import { Info, Calendar, TrendingUp } from 'lucide-react';

const RecyclingActivityHeatmap = ({ data = [] }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);

  // Get date range for the last 365 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 1);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalActivity: 0,
        avgDaily: 0,
        maxDay: 0,
        activeDays: 0
      };
    }

    const totalActivity = data.reduce((sum, item) => sum + (item.count || 0), 0);
    const activeDays = data.filter(item => item.count > 0).length;
    const maxDay = Math.max(...data.map(item => item.count || 0), 0);
    const avgDaily = activeDays > 0 ? (totalActivity / activeDays).toFixed(1) : 0;

    return {
      totalActivity,
      avgDaily,
      maxDay,
      activeDays
    };
  }, [data]);

  // Get activity level based on count
  const getActivityLevel = (count) => {
    if (!count || count === 0) return 0;
    if (count < 3) return 1;
    if (count < 6) return 2;
    if (count < 10) return 3;
    return 4;
  };

  // Handle mouse enter on a date cell
  const handleMouseEnter = (value) => {
    if (value && value.date) {
      setTooltipData(value);
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  // Handle click on a date
  const handleClick = (value) => {
    if (value && value.date) {
      setSelectedDate(value);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get month labels for the heatmap
  const getMonthLabels = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months;
  };

  return (
    <div className={styles.heatmapContainer}>
      <div className={styles.heatmapHeader}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>
            <Calendar className={styles.titleIcon} />
            Recycling Activity Heatmap
          </h2>
          <p className={styles.subtitle}>
            Daily recycling activity over the past year
          </p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.totalActivity}</span>
            <span className={styles.statLabel}>Total Activities</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.avgDaily}</span>
            <span className={styles.statLabel}>Avg per Active Day</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.activeDays}</span>
            <span className={styles.statLabel}>Active Days</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.maxDay}</span>
            <span className={styles.statLabel}>Most in One Day</span>
          </div>
        </div>
      </div>

      <div className={styles.heatmapWrapper}>
        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          values={data}
          classForValue={(value) => {
            if (!value) {
              return 'color-empty';
            }
            const level = getActivityLevel(value.count);
            return `color-scale-${level}`;
          }}
          tooltipDataAttrs={(value) => {
            if (!value || !value.date) {
              return null;
            }
            return {
              'data-tip': `${formatDate(value.date)}: ${value.count || 0} activities`
            };
          }}
          showWeekdayLabels={true}
          onMouseOver={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />

        {/* Custom Tooltip */}
        {tooltipData && (
          <div className={styles.customTooltip}>
            <div className={styles.tooltipDate}>
              {formatDate(tooltipData.date)}
            </div>
            <div className={styles.tooltipCount}>
              <TrendingUp size={14} />
              <strong>{tooltipData.count || 0}</strong> recycling {tooltipData.count === 1 ? 'activity' : 'activities'}
            </div>
            {tooltipData.details && (
              <div className={styles.tooltipDetails}>
                <div>{tooltipData.details.posts || 0} posts</div>
                <div>{tooltipData.details.pickups || 0} pickups</div>
                <div>{tooltipData.details.initiatives || 0} initiative actions</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendLabel}>Less</span>
        <div className={styles.legendScale}>
          <div className={`${styles.legendBox} ${styles.level0}`}></div>
          <div className={`${styles.legendBox} ${styles.level1}`}></div>
          <div className={`${styles.legendBox} ${styles.level2}`}></div>
          <div className={`${styles.legendBox} ${styles.level3}`}></div>
          <div className={`${styles.legendBox} ${styles.level4}`}></div>
        </div>
        <span className={styles.legendLabel}>More</span>
      </div>

      {selectedDate && (
        <div className={styles.selectedDateInfo}>
          <div className={styles.infoHeader}>
            <Info size={18} />
            <h3>Activity Details</h3>
          </div>
          <div className={styles.infoContent}>
            <p className={styles.infoDate}>{formatDate(selectedDate.date)}</p>
            <p className={styles.infoCount}>
              <strong>{selectedDate.count || 0}</strong> total recycling activities
            </p>
            {selectedDate.details && (
              <ul className={styles.activityBreakdown}>
                <li><span className={styles.dot}></span>{selectedDate.details.posts || 0} waste posts created</li>
                <li><span className={styles.dot}></span>{selectedDate.details.pickups || 0} pickups completed</li>
                <li><span className={styles.dot}></span>{selectedDate.details.initiatives || 0} initiative participations</li>
              </ul>
            )}
          </div>
        </div>
      )}

      <div className={styles.infoPanel}>
        <Info size={16} className={styles.infoPanelIcon} />
        <p>Click on any day to see detailed activity breakdown. The darker the color, the more recycling activities occurred that day.</p>
      </div>
    </div>
  );
};

export default RecyclingActivityHeatmap;
