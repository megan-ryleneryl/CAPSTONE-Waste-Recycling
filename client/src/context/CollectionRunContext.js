import React, { createContext, useState, useContext, useCallback } from 'react';

const CollectionRunContext = createContext();

export const useCollectionRun = () => {
  const context = useContext(CollectionRunContext);
  if (!context) {
    throw new Error('useCollectionRun must be used within CollectionRunProvider');
  }
  return context;
};

export const CollectionRunProvider = ({ children }) => {
  const [runPosts, setRunPosts] = useState([]);

  const addToRun = useCallback((post) => {
    setRunPosts(prev => {
      if (prev.some(p => p.postID === post.postID)) return prev;
      return [...prev, post];
    });
  }, []);

  const removeFromRun = useCallback((postID) => {
    setRunPosts(prev => prev.filter(p => p.postID !== postID));
  }, []);

  const clearRun = useCallback(() => {
    setRunPosts([]);
  }, []);

  const isInRun = useCallback((postID) => {
    return runPosts.some(p => p.postID === postID);
  }, [runPosts]);

  const totalValue = runPosts.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

  return (
    <CollectionRunContext.Provider value={{ runPosts, addToRun, removeFromRun, clearRun, isInRun, totalValue }}>
      {children}
    </CollectionRunContext.Provider>
  );
};
