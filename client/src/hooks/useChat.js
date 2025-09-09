import { useState, useEffect, useCallback } from 'react';
import ChatService from '../services/chatService';

export const useConversation = (postID, otherUserID, currentUser) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadConversation = useCallback(async () => {
    if (!postID || !otherUserID) return;
    
    try {
      setLoading(true);
      const conversation = await ChatService.getConversation(
        currentUser.userID,
        otherUserID,
        postID
      );
      setMessages(conversation);
      
      // Mark as read
      await ChatService.markConversationAsRead(
        currentUser.userID,
        otherUserID,
        postID
      );
    } catch (err) {
      setError('Failed to load conversation');
      console.error('Error loading conversation:', err);
    } finally {
      setLoading(false);
    }
  }, [postID, otherUserID, currentUser.userID]);

  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || !postID || !otherUserID) return;

    try {
      const newMessage = await ChatService.sendMessage(
        currentUser,
        otherUserID,
        postID,
        messageText
      );
      
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
      throw err;
    }
  }, [postID, otherUserID, currentUser]);

  const sendPickupRequest = useCallback(async (messageText, pickupDetails) => {
    if (!messageText.trim() || !postID || !otherUserID) return;

    try {
      const newMessage = await ChatService.sendPickupRequest(
        currentUser,
        otherUserID,
        postID,
        messageText,
        pickupDetails
      );
      
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (err) {
      setError('Failed to send pickup request');
      console.error('Error sending pickup request:', err);
      throw err;
    }
  }, [postID, otherUserID, currentUser]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendPickupRequest,
    refreshConversation: loadConversation,
    clearError: () => setError('')
  };
};

export const useConversationList = (userID) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const loadConversations = useCallback(async () => {
    if (!userID) return;
    
    try {
      setLoading(true);
      const userConversations = await ChatService.getUserConversations(userID);
      setConversations(userConversations);
      
      // Calculate total unread count
      const totalUnread = await ChatService.getUnreadCount(userID);
      setUnreadCount(totalUnread);
    } catch (err) {
      setError('Failed to load conversations');
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [userID]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    loading,
    error,
    unreadCount,
    refreshConversations: loadConversations,
    clearError: () => setError('')
  };
};