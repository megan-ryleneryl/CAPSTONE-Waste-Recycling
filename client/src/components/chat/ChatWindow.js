import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Calendar, X, Check, Clock, MapPin, Phone, User, AlertCircle } from 'lucide-react';

// Mock services for demonstration
const mockServices = {
  getMessages: async (postID, userID) => {
    return [
      {
        messageID: '1',
        senderID: 'user1',
        senderName: 'John Collector',
        senderType: 'Collector',
        message: 'Hi, I can collect your plastic bottles tomorrow.',
        sentAt: new Date(Date.now() - 3600000),
        messageType: 'text'
      },
      {
        messageID: '2',
        senderID: 'currentUser',
        senderName: 'You',
        senderType: 'Giver',
        message: 'Great! What time works for you?',
        sentAt: new Date(Date.now() - 1800000),
        messageType: 'text'
      }
    ];
  },
  
  getActivePickup: async (postID) => {
    return null; // No active pickup initially
  },
  
  sendMessage: async (data) => {
    return { ...data, messageID: Date.now().toString(), sentAt: new Date() };
  },
  
  createPickup: async (data) => {
    return { 
      pickupID: 'pickup_' + Date.now(),
      ...data,
      status: 'Proposed',
      createdAt: new Date()
    };
  }
};

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [activePickup, setActivePickup] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Mock data
  const currentUser = { userID: 'currentUser', userType: 'Giver', name: 'Jane Doe' };
  const otherUser = { userID: 'user1', userType: 'Collector', name: 'John Collector' };
  const post = { 
    postID: 'post1', 
    title: 'Plastic Bottles - 5kg',
    wasteType: 'Plastic',
    amount: 5,
    unit: 'kg'
  };

  useEffect(() => {
    loadMessages();
    checkActivePickup();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const msgs = await mockServices.getMessages(post.postID, otherUser.userID);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
    setLoading(false);
  };

  const checkActivePickup = async () => {
    try {
      const pickup = await mockServices.getActivePickup(post.postID);
      setActivePickup(pickup);
    } catch (error) {
      console.error('Error checking active pickup:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData = {
      senderID: currentUser.userID,
      senderName: currentUser.name,
      senderType: currentUser.userType,
      receiverID: otherUser.userID,
      postID: post.postID,
      message: newMessage,
      messageType: 'text'
    };

    try {
      const sentMessage = await mockServices.sendMessage(messageData);
      setMessages([...messages, sentMessage]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
              {otherUser.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{otherUser.name}</h2>
              <p className="text-sm text-gray-500">{otherUser.userType} • {post.title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {currentUser.userType === 'Collector' && !activePickup && (
              <button
                onClick={() => setShowScheduleForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule Pickup</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pickup Status Banner */}
      {activePickup && (
        <PickupStatusBanner pickup={activePickup} userType={currentUser.userType} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : (
          messages.map((msg) => (
            <MessageBubble 
              key={msg.messageID} 
              message={msg} 
              isOwn={msg.senderID === currentUser.userID}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Send
          </button>
        </div>
      </div>

      {/* Schedule Form Modal */}
      {showScheduleForm && (
        <PickupScheduleForm
          post={post}
          onSubmit={async (data) => {
            const pickup = await mockServices.createPickup(data);
            setActivePickup(pickup);
            setShowScheduleForm(false);
            
            // Add system message
            const systemMsg = {
              messageID: 'sys_' + Date.now(),
              senderID: 'system',
              messageType: 'pickup_request',
              message: 'Pickup scheduled',
              metadata: pickup,
              sentAt: new Date()
            };
            setMessages([...messages, systemMsg]);
          }}
          onCancel={() => setShowScheduleForm(false)}
        />
      )}
    </div>
  );
};

const MessageBubble = ({ message, isOwn }) => {
  const isSystem = message.messageType === 'system' || message.messageType === 'pickup_request';
  
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-600 max-w-md">
          {message.messageType === 'pickup_request' && message.metadata ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 font-semibold text-green-700">
                <Calendar className="w-4 h-4" />
                <span>Pickup Scheduled</span>
              </div>
              <div className="text-xs space-y-1">
                <p>📅 {message.metadata.pickupDate} at {message.metadata.pickupTime}</p>
                <p>📍 {message.metadata.pickupLocation}</p>
                <p>👤 {message.metadata.contactPerson}</p>
              </div>
            </div>
          ) : (
            <span>{message.message}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isOwn ? 'bg-green-600 text-white' : 'bg-white border'
      }`}>
        {!isOwn && (
          <p className="text-xs font-semibold mb-1 text-gray-500">
            {message.senderName}
          </p>
        )}
        <p className={isOwn ? 'text-white' : 'text-gray-800'}>{message.message}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-green-100' : 'text-gray-400'}`}>
          {formatTime(message.sentAt)}
        </p>
      </div>
    </div>
  );
};

const PickupStatusBanner = ({ pickup, userType }) => {
  const getStatusColor = () => {
    switch (pickup.status) {
      case 'Proposed': return 'bg-yellow-100 text-yellow-800';
      case 'Confirmed': return 'bg-green-100 text-green-800';
      case 'In-Progress': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`px-4 py-3 ${getStatusColor().split(' ')[0]} border-b`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5" />
          <div>
            <p className="font-semibold">Pickup {pickup.status}</p>
            <p className="text-sm">
              {pickup.pickupDate} at {pickup.pickupTime} • {pickup.pickupLocation}
            </p>
          </div>
        </div>
        {pickup.status === 'Proposed' && userType === 'Giver' && (
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
              Confirm
            </button>
            <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
};



export default ChatWindow;