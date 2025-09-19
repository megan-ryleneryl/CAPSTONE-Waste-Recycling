import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

const ModalPortal = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Add modal root div if it doesn't exist
    let modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'modal-root';
      document.body.appendChild(modalRoot);
    }

    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  // Render children into the modal-root div, which is outside the app root
  return createPortal(
    children,
    document.getElementById('modal-root')
  );
};

export default ModalPortal;