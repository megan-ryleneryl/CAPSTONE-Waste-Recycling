import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import styles from './NotificationsModal.module.css';

const NotificationsModal = ({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  formatDate,
  getNotificationIcon
}) => {
  const navigate = useNavigate();

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    if (!notification.isRead) {
      onMarkAsRead(notification.notificationID);
    }

    // Navigate based on notification type
    if (notification.actionURL) {
      navigate(notification.actionURL);
      onClose();
    } else if (notification.referenceID && notification.referenceType) {
      if (notification.referenceType === 'pickup') {
        navigate(`/tracking/${notification.referenceID}`);
      } else if (notification.referenceType === 'post') {
        navigate(`/posts/${notification.referenceID}`);
      } else if (notification.referenceType === 'message') {
        navigate('/chat');
      }
      onClose();
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>All Notifications</h2>
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button className={styles.markAllButton} onClick={onMarkAllAsRead}>
                Mark all as read
              </button>
            )}
            <button className={styles.closeButton} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {notifications.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const { icon, color } = getNotificationIcon(notification);
              return (
                <div
                  key={notification.notificationID}
                  className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className={styles.notificationIcon}
                    style={{ backgroundColor: `${color}20`, color: color }}
                  >
                    {icon}
                  </div>
                  <div className={styles.notificationContent}>
                    {notification.title && (
                      <span className={styles.notificationTitle}>{notification.title}</span>
                    )}
                    <p className={styles.notificationMessage}>{notification.message}</p>
                    <span className={styles.time}>
                      {notification.createdAt ? formatDate(notification.createdAt) : 'Just now'}
                    </span>
                  </div>
                  {!notification.isRead && <div className={styles.unreadDot} />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
