import React, { useState } from 'react';
import styles from './DeleteAccountModal.module.css';
import ModalPortal from '../common/ModalPortal';

const DeleteAccountModal = ({ onClose, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <ModalPortal>
      <div className={styles.modalBackdrop} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Delete Account</h2>
              <button className={styles.closeButton} onClick={onClose}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.warningSection}>
                <div className={styles.warningIcon}></div>
                <h3>Are you absolutely sure?</h3>
                <p className={styles.warningText}>
                  This action <strong>cannot be undone</strong>. This will permanently delete your account and remove all your data including:
                </p>
                <ul className={styles.dataList}>
                  <li>Your profile information</li>
                  <li>All your posts and contributions</li>
                  <li>Your points and badges</li>
                  <li>Your application history</li>
                  <li>All messages and notifications</li>
                </ul>
              </div>

              <div className={styles.confirmSection}>
                <p>Please type <strong>DELETE</strong> to confirm:</p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className={styles.confirmInput}
                  placeholder="Type DELETE here"
                  disabled={isDeleting}
                />
              </div>

              <div className={styles.buttonGroup}>
                <button 
                  className={styles.cancelButton} 
                  onClick={onClose}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  className={styles.deleteButton}
                  onClick={handleDelete}
                  disabled={confirmText !== 'DELETE' || isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete My Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default DeleteAccountModal;