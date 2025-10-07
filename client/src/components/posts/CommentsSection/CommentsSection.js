import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './CommentsSection.module.css';

const CommentsSection = ({ post, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (post && post.postID) {
      fetchComments();
    }
  }, [post]);

  const fetchComments = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
        `http://localhost:3001/api/posts/${post.postID}/comments`,
        {
            headers: { 'Authorization': `Bearer ${token}` }
        }
        );

        if (response.data.success) {
        // User data is already attached! No need for extra API calls
        setComments(response.data.comments);
        }
    } catch (err) {
        console.error('Error fetching comments:', err);
    } finally {
        setLoading(false);
    }
    };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    if (!currentUser) {
      setError('Please log in to comment');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Your session has expired. Please log in again.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await axios.post(
        `http://localhost:3001/api/posts/${post.postID}/comment`,
        { content: newComment.trim() },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setNewComment('');
        fetchComments(); // Refresh comments list
        
        // Optional: Update parent component with new count if needed
        console.log('New comment count:', response.data.commentCount);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentID) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:3001/api/posts/comments/${commentID}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        fetchComments(); // Refresh comments
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  const formatCommentTime = (timestamp) => {
    if (!timestamp) return 'just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = now - date;
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (post.postType !== 'Forum') {
    return null; // Only show for forum posts
  }

  if (post.isLocked) {
    return (
      <div className={styles.container}>
        <div className={styles.lockedMessage}>
          🔒 This post is locked. No new comments can be added.
        </div>
        {comments.length > 0 && (
          <div className={styles.commentsList}>
            {comments.map((comment) => (
              <div key={comment.commentID} className={styles.comment}>
                <div className={styles.commentHeader}>
                  <div className={styles.commentAuthor}>
                    <div className={styles.avatar}>
                      {comment.user?.profilePictureUrl ? (
                        <img src={comment.user.profilePictureUrl} alt="avatar" />
                      ) : (
                        <span>{comment.user?.firstName?.[0]?.toUpperCase() || 'U'}</span>
                      )}
                    </div>
                    <div className={styles.authorInfo}>
                      <span className={styles.authorName}>
                        {comment.user?.firstName} {comment.user?.lastName}
                      </span>
                      <span className={styles.commentTime}>
                        {formatCommentTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.commentContent}>
                  {comment.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>
        Comments ({comments.length})
      </h2>

      {/* Comment Form */}
      <form onSubmit={handleSubmitComment} className={styles.commentForm}>
        <div className={styles.formHeader}>
          <div className={styles.avatar}>
            {currentUser?.profilePictureUrl ? (
              <img src={currentUser.profilePictureUrl} alt="Your avatar" />
            ) : (
              <span>{currentUser?.firstName?.[0]?.toUpperCase() || 'U'}</span>
            )}
          </div>
          <div className={styles.formContent}>
            <textarea
              className={styles.commentInput}
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={1000}
              rows={3}
              disabled={submitting}
            />
            <div className={styles.formActions}>
              <span className={styles.charCount}>
                {newComment.length}/1000
              </span>
              {error && <span className={styles.error}>{error}</span>}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || !newComment.trim()}
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className={styles.loading}>Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className={styles.noComments}>
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className={styles.commentsList}>
          {comments.map((comment) => (
            <div key={comment.commentID} className={styles.comment}>
              <div className={styles.commentHeader}>
                <div className={styles.commentAuthor}>
                  <div className={styles.avatar}>
                    {comment.user?.profilePictureUrl ? (
                      <img src={comment.user.profilePictureUrl} alt="avatar" />
                    ) : (
                      <span>{comment.user?.firstName?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div className={styles.authorInfo}>
                    <span className={styles.authorName}>
                      {comment.user?.firstName} {comment.user?.lastName}
                    </span>
                    <span className={styles.commentTime}>
                      {formatCommentTime(comment.createdAt)}
                    </span>
                  </div>
                </div>
                {(currentUser?.userID === comment.userID || currentUser?.isAdmin) && (
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteComment(comment.commentID)}
                    title="Delete comment"
                  >
                    🗑️
                  </button>
                )}
              </div>
              <div className={styles.commentContent}>
                {comment.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsSection;