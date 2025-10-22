// client/src/components/chat/ConversationList.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MessageCircle, RefreshCw, User, Users } from 'lucide-react';
import ConversationListItem from './ConversationListItem';
import styles from './ConversationList.module.css';

const ConversationList = ({ currentUser, onSelectConversation, selectedConversationId, activeFilter = 'all', onCountsUpdate }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser && currentUser.userID) {
      loadConversations();
      // REMOVED: 30-second polling that was causing excessive reads
      // Users can manually refresh if needed
    }
  }, [currentUser]);

const loadConversations = async () => {
  try {
    setError('');
    
    // Query messages where current user is sender OR receiver
    const messagesRef = collection(db, 'messages');
    
    // OPTIMIZED: Reduce limit from 50 to 20 messages per query
    // We only need the most recent message per conversation
    const receivedQuery = query(
      messagesRef,
      where('receiverID', '==', currentUser.userID),
      orderBy('sentAt', 'desc'),
      limit(20)
    );

    const sentQuery = query(
      messagesRef,
      where('senderID', '==', currentUser.userID),
      orderBy('sentAt', 'desc'),
      limit(20)
    );
    
    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      getDocs(receivedQuery),
      getDocs(sentQuery)
    ]);
    
    // Collect all messages first
    const allMessages = [
      ...receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isReceived: true })),
      ...sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isReceived: false }))
    ];

    // Collect unique user IDs and post IDs
    const userIDs = new Set();
    const postIDs = new Set();

    allMessages.forEach(msg => {
      userIDs.add(msg.senderID);
      userIDs.add(msg.receiverID);
      postIDs.add(msg.postID);
    });

    // Fetch all users and posts in parallel
    const userCache = new Map();
    const postCache = new Map();

    await Promise.all([
      // Fetch all users
      ...Array.from(userIDs).map(async (userID) => {
        try {
          const userDocRef = doc(db, 'users', userID);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userCache.set(userID, {
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User',
              profilePicture: userData.profilePictureUrl || null,
              exists: true
            });
          } else {
            userCache.set(userID, {
              name: 'Unknown User',
              profilePicture: null,
              exists: false
            });
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          userCache.set(userID, {
            name: 'Unknown User',
            profilePicture: null,
            exists: false
          });
        }
      }),
      // Fetch all posts
      ...Array.from(postIDs).map(async (postID) => {
        try {
          const postDocRef = doc(db, 'posts', postID);
          const postDoc = await getDoc(postDocRef);
          if (postDoc.exists()) {
            const postData = postDoc.data();
            postCache.set(postID, {
              title: postData.title || 'Untitled Post',
              postType: postData.postType || 'Unknown',
              status: postData.status || 'Unknown',
              posterID: postData.userID,
              exists: true
            });
          } else {
            postCache.set(postID, {
              title: 'Unknown Post',
              postType: 'Unknown',
              status: 'Unknown',
              posterID: null,
              exists: false
            });
          }
        } catch (error) {
          console.error('Error fetching post:', error);
          postCache.set(postID, {
            title: 'Unknown Post',
            postType: 'Unknown',
            posterID: null,
            exists: false
          });
        }
      })
    ]);

    // Group messages by conversation (postID + otherUserID)
    const conversationsMap = new Map();

    // Process received messages
    for (const doc of receivedSnapshot.docs) {
      const msg = { id: doc.id, ...doc.data() };
      const key = `${msg.postID}-${msg.senderID}`;

      // Get cached user and post data
      const userData = userCache.get(msg.senderID);
      const postData = postCache.get(msg.postID);

      // Skip this conversation if the user or post no longer exists
      if (!userData?.exists || !postData?.exists) {
        continue;
      }

      if (!conversationsMap.has(key) ||
          (msg.sentAt?.toDate() > conversationsMap.get(key).lastMessage.sentAt?.toDate())) {
        conversationsMap.set(key, {
          id: key,
          postID: msg.postID,
          postTitle: postData.title,
          postType: postData.postType,
          postStatus: postData.status,
          posterID: postData.posterID,
          otherUserID: msg.senderID,
          otherUserName: userData.name,
          otherUserProfilePicture: userData.profilePicture,
          lastMessage: msg,
          unreadCount: msg.isRead ? 0 : 1
        });
      }
    }

    // Process sent messages
    for (const doc of sentSnapshot.docs) {
      const msg = { id: doc.id, ...doc.data() };
      const key = `${msg.postID}-${msg.receiverID}`;

      // Get cached user and post data
      const userData = userCache.get(msg.receiverID);
      const postData = postCache.get(msg.postID);

      // Skip this conversation if the user or post no longer exists
      if (!userData?.exists || !postData?.exists) {
        continue;
      }

      if (!conversationsMap.has(key) ||
          (msg.sentAt?.toDate() > conversationsMap.get(key).lastMessage.sentAt?.toDate())) {
        conversationsMap.set(key, {
          id: key,
          postID: msg.postID,
          postTitle: postData.title,
          postType: postData.postType,
          postStatus: postData.status,
          posterID: postData.posterID,
          otherUserID: msg.receiverID,
          otherUserName: userData.name,
          otherUserProfilePicture: userData.profilePicture,
          lastMessage: msg,
          unreadCount: 0 // Sent messages are always read
        });
      }
    }
    
    // Convert to array and sort by most recent
    const conversationsList = Array.from(conversationsMap.values())
      .sort((a, b) => {
        const aTime = a.lastMessage.sentAt?.toDate() || new Date(0);
        const bTime = b.lastMessage.sentAt?.toDate() || new Date(0);
        return bTime - aTime;
      });
    
    setConversations(conversationsList);
  } catch (err) {
    setError('Failed to load conversations');
    console.error('Error loading conversations:', err);
  } finally {
    setLoading(false);
  }
};

  // Filter and group conversations based on active filter from parent
  const getFilteredAndGroupedConversations = () => {
    let filtered = conversations;

    // Filter by post type if not 'all'
    if (activeFilter === 'waste') {
      filtered = conversations.filter(conv => conv.postType === 'Waste');
    } else if (activeFilter === 'initiative') {
      filtered = conversations.filter(conv => conv.postType === 'Initiative');
    } else if (activeFilter === 'forum') {
      filtered = conversations.filter(conv => conv.postType === 'Forum');
    }

    // Group conversations by ownership
    const myConversations = [];
    const othersConversations = [];

    filtered.forEach(conv => {
      const isMyPost = conv.posterID === currentUser.userID;
      if (isMyPost) {
        myConversations.push(conv);
      } else {
        othersConversations.push(conv);
      }
    });

    return {
      myConversations,
      othersConversations,
      allConversations: filtered
    };
  };

  const { myConversations, othersConversations, allConversations } = getFilteredAndGroupedConversations();

  // Calculate counts for all filter types
  useEffect(() => {
    if (!onCountsUpdate) return;

    const counts = {
      all: conversations.length,
      waste: 0,
      initiative: 0,
      forum: 0
    };

    conversations.forEach(conv => {
      if (conv.postType === 'Waste') {
        counts.waste++;
      } else if (conv.postType === 'Initiative') {
        counts.initiative++;
      } else if (conv.postType === 'Forum') {
        counts.forum++;
      }
    });

    onCountsUpdate(counts);
  }, [conversations, onCountsUpdate]);

  if (loading && !conversations.length) {
    return (
      <div className={styles.conversationList}>
        <div className={styles.header}>
          <h2>Messages</h2>
        </div>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className={styles.conversationList}>
        <div className={styles.header}>
          <h2>Messages</h2>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <MessageCircle size={48} strokeWidth={1.5} />
          </div>
          <p>No conversations yet</p>
          <span className={styles.emptyHint}>
            Start by messaging someone about their post
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.conversationList}>
      <div className={styles.header}>
        <h2>Messages</h2>
        <button
          onClick={loadConversations}
          className={styles.refreshButton}
          title="Refresh"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className={styles.conversationItems}>
        {allConversations.length > 0 ? (
          <>
            {/* Show sections for Waste and Initiative filters */}
            {(activeFilter === 'waste' || activeFilter === 'initiative') ? (
              <>
                {/* My Posts Section */}
                {myConversations.length > 0 && (
                  <>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>
                        <User size={16} className={styles.sectionIcon} />
                        {activeFilter === 'waste' ? 'My Waste' : 'My Initiatives'}
                      </h3>
                      <span className={styles.sectionCount}>{myConversations.length}</span>
                    </div>
                    {myConversations.map((conversation) => (
                      <ConversationListItem
                        key={conversation.id}
                        conversation={conversation}
                        currentUser={currentUser}
                        onClick={onSelectConversation}
                        isSelected={selectedConversationId === conversation.id}
                      />
                    ))}
                  </>
                )}

                {/* Others' Posts Section */}
                {othersConversations.length > 0 && (
                  <>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>
                        <Users size={16} className={styles.sectionIcon} />
                        {activeFilter === 'waste' ? 'Others Waste' : 'Other Initiatives'}
                      </h3>
                      <span className={styles.sectionCount}>{othersConversations.length}</span>
                    </div>
                    {othersConversations.map((conversation) => (
                      <ConversationListItem
                        key={conversation.id}
                        conversation={conversation}
                        currentUser={currentUser}
                        onClick={onSelectConversation}
                        isSelected={selectedConversationId === conversation.id}
                      />
                    ))}
                  </>
                )}
              </>
            ) : (
              /* For 'all' and 'forum' filters, show all conversations without sections */
              allConversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  currentUser={currentUser}
                  onClick={onSelectConversation}
                  isSelected={selectedConversationId === conversation.id}
                />
              ))
            )}
          </>
        ) : (
          <div className={styles.emptyTabState}>
            <p>No conversations in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;