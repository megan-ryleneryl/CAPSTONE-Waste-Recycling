import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useCollectionRun } from '../../../context/CollectionRunContext';
import { useAuth } from '../../../context/AuthContext';
import {
  Route, X, Trash2, MapPin, Calendar, Coins,
  ChevronUp, ChevronDown, CheckCircle, AlertCircle, XCircle,
  MessageCircle, Loader
} from 'lucide-react';
import styles from './CollectionRunPanel.module.css';

// Step constants
const STEP_REVIEW = 'review';
const STEP_CONFIRM = 'confirm';
const STEP_SUBMITTING = 'submitting';
const STEP_DONE = 'done';

const CollectionRunPanel = () => {
  const { currentUser } = useAuth();
  const { runPosts, removeFromRun, clearRun, totalValue } = useCollectionRun();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(STEP_REVIEW);
  const [results, setResults] = useState([]);
  const [submitProgress, setSubmitProgress] = useState(0);

  // Only show for collectors with posts in run
  if (!currentUser?.isCollector || runPosts.length === 0) return null;

  const formatLocation = (loc) => {
    if (!loc) return '';
    return loc.barangay?.name || loc.city?.name || '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const closeModal = () => {
    setModalOpen(false);
    // Reset step only after animation; if done, also clear run
    setTimeout(() => setStep(STEP_REVIEW), 300);
  };

  const openModal = () => {
    setStep(STEP_REVIEW);
    setResults([]);
    setSubmitProgress(0);
    setModalOpen(true);
  };

  // Claim all posts in the run
  const handleConfirmRun = async () => {
    setStep(STEP_SUBMITTING);
    setSubmitProgress(0);

    const token = localStorage.getItem('token');
    const runSnapshot = [...runPosts]; // snapshot before clearing
    const newResults = [];

    for (let i = 0; i < runSnapshot.length; i++) {
      const post = runSnapshot[i];
      try {
        await axios.post(
          `http://localhost:3001/api/posts/${post.postID}/claim`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        newResults.push({ postID: post.postID, title: post.title, status: 'success' });
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to register interest';
        // "already claimed" is not a true error — treat it as a soft warning
        const isAlready = msg.toLowerCase().includes('already');
        newResults.push({
          postID: post.postID,
          title: post.title,
          status: isAlready ? 'already' : 'error',
          message: msg
        });
      }
      setSubmitProgress(i + 1);
    }

    setResults(newResults);
    clearRun();
    setStep(STEP_DONE);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const alreadyCount = results.filter(r => r.status === 'already').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  const previewPosts = runPosts.slice(0, 3);
  const extraCount = runPosts.length - 3;

  return (
    <>
      {/* Floating bottom panel */}
      <div className={styles.panel}>
        <div className={styles.panelLeft}>
          <Route size={20} className={styles.panelIcon} />
          <div className={styles.panelInfo}>
            <span className={styles.panelTitle}>
              Collection Run &middot; {runPosts.length} {runPosts.length === 1 ? 'post' : 'posts'}
            </span>
            <span className={styles.panelSub}>
              Est. total: <strong>₱{totalValue.toFixed(2)}</strong>
              {previewPosts.length > 0 && (
                <> &nbsp;&middot;&nbsp; {previewPosts.map(p => p.title).join(', ')}{extraCount > 0 ? ` +${extraCount} more` : ''}</>
              )}
            </span>
          </div>
        </div>
        <div className={styles.panelActions}>
          <button className={styles.viewBtn} onClick={openModal}>
            View Run <ChevronUp size={15} />
          </button>
          <button className={styles.clearBtn} onClick={clearRun} title="Clear run">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={step === STEP_SUBMITTING ? undefined : closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            {/* ── STEP: REVIEW ── */}
            {step === STEP_REVIEW && (
              <>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}><Route size={20} /> Collection Run</div>
                  <button className={styles.modalClose} onClick={closeModal}><X size={20} /></button>
                </div>

                <div className={styles.modalSummary}>
                  <span>{runPosts.length} {runPosts.length === 1 ? 'post' : 'posts'} selected</span>
                  <span className={styles.totalValue}>Estimated total: <strong>₱{totalValue.toFixed(2)}</strong></span>
                </div>

                <div className={styles.modalList}>
                  {runPosts.map(post => (
                    <div key={post.postID} className={styles.runItem}>
                      <div className={styles.runItemInfo}>
                        <div className={styles.runItemTitle}>{post.title}</div>
                        <div className={styles.runItemDetails}>
                          {formatLocation(post.location) && (
                            <span><MapPin size={12} /> {formatLocation(post.location)}</span>
                          )}
                          {post.pickupDate && (
                            <span><Calendar size={12} /> {formatDate(post.pickupDate)}{post.pickupTime ? ` at ${post.pickupTime}` : ''}</span>
                          )}
                          {post.price > 0 && (
                            <span><Coins size={12} /> ₱{parseFloat(post.price).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <button className={styles.removeBtn} onClick={() => removeFromRun(post.postID)} title="Remove">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className={styles.modalFooter}>
                  <button className={styles.clearAllBtn} onClick={() => { clearRun(); closeModal(); }}>
                    <Trash2 size={15} /> Clear All
                  </button>
                  <button className={styles.confirmRunBtn} onClick={() => setStep(STEP_CONFIRM)}>
                    Confirm Run <ChevronUp size={15} />
                  </button>
                </div>
              </>
            )}

            {/* ── STEP: CONFIRM ── */}
            {step === STEP_CONFIRM && (
              <>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}><Route size={20} /> Confirm Collection Run</div>
                  <button className={styles.modalClose} onClick={closeModal}><X size={20} /></button>
                </div>

                <div className={styles.confirmBody}>
                  <div className={styles.confirmNotice}>
                    <MessageCircle size={22} className={styles.confirmIcon} />
                    <div>
                      <strong>Here's what happens next:</strong>
                      <ul className={styles.confirmList}>
                        <li>You'll be registered as an <strong>interested collector</strong> for each post below.</li>
                        <li>A <strong>chat conversation</strong> will automatically open with each poster.</li>
                        <li>Coordinate with each poster in chat to finalize the <strong>pickup schedule</strong>.</li>
                      </ul>
                    </div>
                  </div>

                  <div className={styles.confirmPostList}>
                    {runPosts.map(post => (
                      <div key={post.postID} className={styles.confirmPostItem}>
                        <Route size={14} className={styles.confirmPostIcon} />
                        <div>
                          <div className={styles.confirmPostTitle}>{post.title}</div>
                          <div className={styles.confirmPostSub}>
                            {formatLocation(post.location) && <span><MapPin size={11} /> {formatLocation(post.location)}</span>}
                            {post.pickupDate && <span><Calendar size={11} /> {formatDate(post.pickupDate)}</span>}
                            {post.price > 0 && <span><Coins size={11} /> ₱{parseFloat(post.price).toFixed(2)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button className={styles.backBtn} onClick={() => setStep(STEP_REVIEW)}>
                    <ChevronDown size={15} /> Back
                  </button>
                  <button className={styles.confirmRunBtn} onClick={handleConfirmRun}>
                    <CheckCircle size={15} /> Confirm &amp; Start Chats
                  </button>
                </div>
              </>
            )}

            {/* ── STEP: SUBMITTING ── */}
            {step === STEP_SUBMITTING && (
              <>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}><Route size={20} /> Registering Interest...</div>
                </div>

                <div className={styles.submittingBody}>
                  <div className={styles.spinnerWrap}>
                    <Loader size={36} className={styles.spinnerIcon} />
                  </div>
                  <p className={styles.submittingText}>
                    Processing {submitProgress} of {runPosts.length} {runPosts.length === 1 ? 'post' : 'posts'}...
                  </p>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${(submitProgress / runPosts.length) * 100}%` }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── STEP: DONE ── */}
            {step === STEP_DONE && (
              <>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}><CheckCircle size={20} /> Run Submitted</div>
                  <button className={styles.modalClose} onClick={closeModal}><X size={20} /></button>
                </div>

                <div className={styles.doneBody}>
                  <div className={styles.doneSummaryRow}>
                    {successCount > 0 && (
                      <span className={styles.doneStat + ' ' + styles.doneSuccess}>
                        <CheckCircle size={15} /> {successCount} registered
                      </span>
                    )}
                    {alreadyCount > 0 && (
                      <span className={styles.doneStat + ' ' + styles.doneWarning}>
                        <AlertCircle size={15} /> {alreadyCount} already interested
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className={styles.doneStat + ' ' + styles.doneError}>
                        <XCircle size={15} /> {errorCount} failed
                      </span>
                    )}
                  </div>

                  <div className={styles.modalList}>
                    {results.map(r => (
                      <div key={r.postID} className={`${styles.runItem} ${styles['runItem--' + r.status]}`}>
                        <div className={styles.runItemInfo}>
                          <div className={styles.runItemTitle}>{r.title}</div>
                          {r.message && <div className={styles.resultMsg}>{r.message}</div>}
                        </div>
                        {r.status === 'success' && <CheckCircle size={18} className={styles.resultIconSuccess} />}
                        {r.status === 'already' && <AlertCircle size={18} className={styles.resultIconWarning} />}
                        {r.status === 'error' && <XCircle size={18} className={styles.resultIconError} />}
                      </div>
                    ))}
                  </div>

                  {(successCount + alreadyCount) > 0 && (
                    <div className={styles.doneChatHint}>
                      <MessageCircle size={15} />
                      Head to <strong>Chat</strong> to coordinate pickup schedules with each poster.
                    </div>
                  )}
                </div>

                <div className={styles.modalFooter}>
                  <button className={styles.backBtn} onClick={closeModal}>
                    Close
                  </button>
                  {(successCount + alreadyCount) > 0 && (
                    <button className={styles.confirmRunBtn} onClick={() => { closeModal(); navigate('/chat'); }}>
                      <MessageCircle size={15} /> Go to Chats
                    </button>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default CollectionRunPanel;
