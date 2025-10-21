// client/src/components/chat/ConversationList.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MessageCircle, RefreshCw } from 'lucide-react';
import ConversationListItem from './ConversationListItem';
import styles from './ConversationList.module.css';

const ConversationList = ({ currentUser, onSelectConversation, selectedConversationId }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');

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
              posterID: postData.userID,
              exists: true
            });
          } else {
            postCache.set(postID, {
              title: 'Unknown Post',
              postType: 'Unknown',
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

  // Filter conversations based on active tab
  const getFilteredConversations = () => {
    if (activeTab === 'all') return conversations;

    return conversations.filter(conv => {
      const isGiver = conv.posterID === currentUser.userID;
      const isCollector = !isGiver;

      switch (activeTab) {
        case 'waste-giving':
          return conv.postType === 'Waste' && isGiver;
        case 'waste-collecting':
          return conv.postType === 'Waste' && isCollector;
        case 'initiative-owner':
          return conv.postType === 'Initiative' && isGiver;
        case 'initiative-supporter':
          return conv.postType === 'Initiative' && isCollector;
        case 'forum':
          return conv.postType === 'Forum';
        default:
          return true;
      }
    });
  };

  const filteredConversations = getFilteredConversations();

  // Count conversations for each tab
  const getCounts = () => {
    const counts = {
      all: conversations.length,
      wasteGiving: 0,
      wasteCollecting: 0,
      initiativeOwner: 0,
      initiativeSupporter: 0,
      forum: 0
    };

    conversations.forEach(conv => {
      const isGiver = conv.posterID === currentUser.userID;

      if (conv.postType === 'Waste') {
        if (isGiver) counts.wasteGiving++;
        else counts.wasteCollecting++;
      } else if (conv.postType === 'Initiative') {
        if (isGiver) counts.initiativeOwner++;
        else counts.initiativeSupporter++;
      } else if (conv.postType === 'Forum') {
        counts.forum++;
      }
    });

    return counts;
  };

  const counts = getCounts();

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

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All {counts.all > 0 && `(${counts.all})`}
        </button>
        {counts.wasteGiving > 0 && (
          <button
            className={`${styles.tab} ${activeTab === 'waste-giving' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('waste-giving')}
          >
            Giving Waste ({counts.wasteGiving})
          </button>
        )}
        {counts.wasteCollecting > 0 && (
          <button
            className={`${styles.tab} ${activeTab === 'waste-collecting' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('waste-collecting')}
          >
            Collecting Waste ({counts.wasteCollecting})
          </button>
        )}
        {counts.initiativeOwner > 0 && (
          <button
            className={`${styles.tab} ${activeTab === 'initiative-owner' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('initiative-owner')}
          >
            My Initiatives ({counts.initiativeOwner})
          </button>
        )}
        {counts.initiativeSupporter > 0 && (
          <button
            className={`${styles.tab} ${activeTab === 'initiative-supporter' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('initiative-supporter')}
          >
            Supporting ({counts.initiativeSupporter})
          </button>
        )}
        {counts.forum > 0 && (
          <button
            className={`${styles.tab} ${activeTab === 'forum' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('forum')}
          >
            Forum ({counts.forum})
          </button>
        )}
      </div>

      <div className={styles.conversationItems}>
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              currentUser={currentUser}
              onClick={onSelectConversation}
              isSelected={selectedConversationId === conversation.id}
            />
          ))
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