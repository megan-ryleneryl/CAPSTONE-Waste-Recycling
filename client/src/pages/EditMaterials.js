import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styles from './EditMaterials.module.css';
import ModalPortal from '../components/modal/ModalPortal';

const EditMaterials = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    type: '',
    category: '',
    averagePricePerKg: '',
    standardMarketPrice: '',
    maxPricePerKg: ''
  });
  const [filters, setFilters] = useState({
    category: 'all',
    searchTerm: ''
  });

  const materialTypes = [
    'cartons_corrugated',
    'white_paper_used',
    'newspaper',
    'mixed_paper',
    'pet_bottles',
    'plastic_hdpe',
    'plastic_ldpe',
    'glass_bottles',
    'glass_cullets',
    'aluminum_cans',
    'copper_wire_a',
    'copper_wire_b',
    'copper_wire_c',
    'gi_sheet',
    'stainless_steel',
    'steel',
    'tin_can',
    'electronic_waste'
  ];

  const categories = ['Recyclable', 'Metal', 'Plastic', 'Paper', 'Glass', 'Organic', 'Textile', 'Electronics'];

  useEffect(() => {
    if (!authLoading && currentUser) {
      if (!currentUser.isAdmin) {
        alert('You do not have permission to view this page');
        navigate('/posts');
        return;
      }
      fetchMaterials();
    } else if (!authLoading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, authLoading, navigate]);

  const formatDate = (date) => {
    if (!date) return 'Not available';

    let dateObj;

    if (date?.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date?.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date?._seconds) {
      dateObj = new Date(date._seconds * 1000);
    } else if (typeof date === 'string') {
      dateObj = new Date(date.replace(/,/g, ''));
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }

    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/admin/materials', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.data && response.data.materials) {
        setMaterials(response.data.materials);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else if (error.response?.status === 403) {
        alert('You do not have permission to view this page');
        navigate('/posts');
      } else {
        alert('Failed to fetch materials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetFormData = () => ({
    displayName: '',
    type: '',
    category: '',
    averagePricePerKg: '',
    standardMarketPrice: '',
    maxPricePerKg: ''
  });

  const handleAddMaterial = () => {
    setIsEditMode(false);
    setFormData(resetFormData());
    setSelectedMaterial(null);
    setShowModal(true);
  };

  const handleEditMaterial = (material) => {
    setIsEditMode(true);
    setSelectedMaterial(material);
    setFormData({
      displayName: material.displayName,
      type: material.type,
      category: material.category,
      averagePricePerKg: (material.averagePricePerKg || 0).toString(),
      standardMarketPrice: (material.standardMarketPrice || 0).toString(),
      maxPricePerKg: (material.maxPricePerKg || 0).toString()
    });
    setShowModal(true);
  };

  const handleViewDetails = (material) => {
    setSelectedMaterial(material);
    setIsEditMode(false);
    setShowModal(true);
  };

  const handleSaveMaterial = async () => {
    if (!formData.displayName || !formData.type || !formData.category) {
      alert('Please fill in Display Name, Type, and Category');
      return;
    }

    const avgPrice = parseFloat(formData.averagePricePerKg) || 0;
    const stdPrice = parseFloat(formData.standardMarketPrice) || 0;
    const maxPrice = parseFloat(formData.maxPricePerKg) || 0;

    if (avgPrice < 0 || stdPrice < 0 || maxPrice < 0) {
      alert('Prices cannot be negative');
      return;
    }

    // Warn if standard market price is higher than max
    if (maxPrice > 0 && stdPrice > maxPrice) {
      if (!window.confirm('Standard market price is higher than the max price cap. Continue anyway?')) {
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      const url = isEditMode
        ? `http://localhost:3001/api/admin/materials/${selectedMaterial.materialID}`
        : 'http://localhost:3001/api/admin/materials';

      const method = isEditMode ? 'put' : 'post';

      const response = await axios[method](
        url,
        {
          displayName: formData.displayName,
          type: formData.type,
          category: formData.category,
          averagePricePerKg: avgPrice,
          standardMarketPrice: stdPrice,
          maxPricePerKg: maxPrice
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data && response.data.success) {
        alert(isEditMode ? 'Material updated successfully' : 'Material created successfully');
        fetchMaterials();
        closeModal();
      }
    } catch (error) {
      console.error('Error saving material:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to save material');
    }
  };

  const handleDeleteMaterial = async (materialID) => {
    if (!window.confirm('Are you sure you want to delete this material?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:3001/api/admin/materials/${materialID}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data && response.data.success) {
        alert('Material deleted successfully');
        fetchMaterials();
        closeModal();
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      alert(error.response?.data?.error || 'Failed to delete material');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedMaterial(null);
    setIsEditMode(false);
    setFormData(resetFormData());
  };

  const filteredMaterials = materials.filter(material => {
    const categoryMatch = filters.category === 'all' || material.category === filters.category;
    const searchMatch = filters.searchTerm === '' ||
      material.displayName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      material.type?.toLowerCase().includes(filters.searchTerm.toLowerCase());

    return categoryMatch && searchMatch;
  });

  // Compute display price for a material (mirrors backend logic)
  const getDisplayPrice = (material) => {
    const base = material.standardMarketPrice > 0
      ? material.standardMarketPrice
      : material.averagePricePerKg || 0;
    // If pricing info from API is available, use it
    if (material.pricing?.displayPrice != null) {
      return material.pricing.displayPrice;
    }
    return base;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading materials...</p>
      </div>
    );
  }

  return (
    <div className={styles.editMaterialsContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Manage Materials</h1>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleAddMaterial}>
            + Add Material
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <span className={styles.statItem}>Total: {materials.length}</span>
        <span className={styles.statItem}>
          Active: {materials.length}
        </span>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search by name or type..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Category:</span>
            <button
              className={filters.category === 'all' ? styles.filterActive : styles.filterButton}
              onClick={() => setFilters({ ...filters, category: 'all' })}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={filters.category === cat ? styles.filterActive : styles.filterButton}
                onClick={() => setFilters({ ...filters, category: cat })}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className={styles.materialsContainer}>
        {filteredMaterials.length === 0 ? (
          <div className={styles.noMaterials}>
            <p>No materials found matching your filters.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.materialsTable}>
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Category</th>
                  <th>Std. Market</th>
                  <th>Max (Cap)</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map(material => (
                  <tr key={material.materialID}>
                    <td className={styles.displayNameCell}>
                      {material.displayName}
                    </td>
                    <td>
                      <span className={styles.categoryBadge}>
                        {material.category}
                      </span>
                    </td>
                    <td className={styles.priceCell}>
                      {material.standardMarketPrice > 0
                        ? `₱${material.standardMarketPrice.toFixed(2)}`
                        : <span className={styles.noData}>—</span>
                      }
                    </td>
                    <td className={styles.maxPriceCell}>
                      {material.maxPricePerKg > 0
                        ? `₱${material.maxPricePerKg.toFixed(2)}`
                        : <span className={styles.noData}>—</span>
                      }
                    </td>
                    <td className={styles.dateCell}>
                      {formatDate(material.updatedAt)}
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.tableActions}>
                        <button
                          className={styles.viewBtn}
                          onClick={() => handleViewDetails(material)}
                          title="View Details"
                        >
                          View
                        </button>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleEditMaterial(material)}
                          title="Edit Material"
                        >
                          Edit
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteMaterial(material.materialID)}
                          title="Delete Material"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ModalPortal>
          <div className={styles.modalBackdrop} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div className={styles.modalContent} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div className={styles.modalHeader}>
                  <h2>{isEditMode ? 'Edit Material' : selectedMaterial ? 'Material Details' : 'Add New Material'}</h2>
                  <button className={styles.closeButton} onClick={closeModal}>
                    ×
                  </button>
                </div>

                <div className={styles.detailsContent} style={{ overflowY: 'auto', flex: 1 }}>
                  {isEditMode || !selectedMaterial ? (
                    /* ──── ADD / EDIT FORM ──── */
                    <>
                      <div className={styles.formGroup}>
                        <label htmlFor="displayName">Display Name *</label>
                        <input
                          id="displayName"
                          type="text"
                          className={styles.formInput}
                          value={formData.displayName}
                          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                          placeholder="e.g., Stainless Steel"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="type">Material Type *</label>
                        <select
                          id="type"
                          className={styles.formSelect}
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                          <option value="">Select a type...</option>
                          {materialTypes.map(type => (
                            <option key={type} value={type}>
                              {type.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="category">Category *</label>
                        <select
                          id="category"
                          className={styles.formSelect}
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                          <option value="">Select a category...</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Pricing section header */}
                      <div className={styles.formSectionHeader}>Pricing</div>

                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label htmlFor="standardMarketPrice">
                            Standard Market Price/kg
                            <span className={styles.fieldHint}>Base rate (1/5 of junk shop price)</span>
                          </label>
                          <input
                            id="standardMarketPrice"
                            type="number"
                            className={styles.formInput}
                            value={formData.standardMarketPrice}
                            onChange={(e) => setFormData({ ...formData, standardMarketPrice: e.target.value })}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label htmlFor="maxPricePerKg">
                            Max Price/kg (Cap)
                            <span className={styles.fieldHint}>Factory price ceiling</span>
                          </label>
                          <input
                            id="maxPricePerKg"
                            type="number"
                            className={styles.formInput}
                            value={formData.maxPricePerKg}
                            onChange={(e) => setFormData({ ...formData, maxPricePerKg: e.target.value })}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="price">
                          Community Avg Price/kg
                          <span className={styles.fieldHint}>Updated via transactions (averagePricePerKg)</span>
                        </label>
                        <input
                          id="price"
                          type="number"
                          className={styles.formInput}
                          value={formData.averagePricePerKg}
                          onChange={(e) => setFormData({ ...formData, averagePricePerKg: e.target.value })}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>

                      {/* Live preview of display price */}
                      {(parseFloat(formData.standardMarketPrice) > 0 || parseFloat(formData.averagePricePerKg) > 0) && (
                        <div className={styles.pricePreview}>
                          <span className={styles.pricePreviewLabel}>Display Price Preview:</span>
                          <span className={styles.pricePreviewValue}>
                            ₱{(() => {
                              const base = parseFloat(formData.standardMarketPrice) > 0
                                ? parseFloat(formData.standardMarketPrice)
                                : parseFloat(formData.averagePricePerKg) || 0;
                              // Without live market data, show base only
                              return base.toFixed(2);
                            })()}
                            <span className={styles.pricePreviewNote}> (base only — market avg applied at runtime)</span>
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    /* ──── VIEW DETAILS ──── */
                    <>
                      <p><strong>Display Name:</strong> {selectedMaterial.displayName}</p>
                      <p><strong>Material Type:</strong> {selectedMaterial.type.replace(/_/g, ' ')}</p>
                      <p><strong>Category:</strong> {selectedMaterial.category}</p>

                      <div className={styles.pricingDetailsGrid}>
                        <div className={styles.pricingDetailCard}>
                          <span className={styles.pricingDetailLabel}>Standard Market</span>
                          <span className={styles.pricingDetailValue}>
                            {selectedMaterial.standardMarketPrice > 0
                              ? `₱${selectedMaterial.standardMarketPrice.toFixed(2)}`
                              : '—'}
                          </span>
                          <span className={styles.pricingDetailHint}>Base (70%)</span>
                        </div>
                        <div className={styles.pricingDetailCard}>
                          <span className={styles.pricingDetailLabel}>Community Avg</span>
                          <span className={styles.pricingDetailValue}>
                            ₱{(selectedMaterial.averagePricePerKg || 0).toFixed(2)}
                          </span>
                          <span className={styles.pricingDetailHint}>From transactions</span>
                        </div>
                        <div className={styles.pricingDetailCard}>
                          <span className={styles.pricingDetailLabel}>Display Price</span>
                          <span className={`${styles.pricingDetailValue} ${styles.highlightGreen}`}>
                            ₱{getDisplayPrice(selectedMaterial).toFixed(2)}
                          </span>
                          <span className={styles.pricingDetailHint}>Shown to users</span>
                        </div>
                        <div className={styles.pricingDetailCard}>
                          <span className={styles.pricingDetailLabel}>Max (Cap)</span>
                          <span className={`${styles.pricingDetailValue} ${styles.highlightOrange}`}>
                            {selectedMaterial.maxPricePerKg > 0
                              ? `₱${selectedMaterial.maxPricePerKg.toFixed(2)}`
                              : '—'}
                          </span>
                          <span className={styles.pricingDetailHint}>Factory ceiling</span>
                        </div>
                      </div>

                      {/* Market average from API if available */}
                      {selectedMaterial.pricing?.marketAverage != null && (
                        <p style={{ marginTop: '0.5rem' }}>
                          <strong>Market Avg (qty-weighted, 180d):</strong> ₱{selectedMaterial.pricing.marketAverage.toFixed(2)}
                        </p>
                      )}

                      <p><strong>Created:</strong> {formatDate(selectedMaterial.createdAt)}</p>
                      <p><strong>Last Updated:</strong> {formatDate(selectedMaterial.updatedAt)}</p>

                      {selectedMaterial.pricingHistory && selectedMaterial.pricingHistory.length > 0 && (
                        <div className={styles.pricingHistorySection}>
                          <strong>Recent Transaction History</strong>
                          {selectedMaterial.pricingHistory.slice(-5).reverse().map((entry, index) => (
                            <div key={index} className={styles.historyItem}>
                              <span>₱{(entry.price || 0).toFixed(2)}</span>
                              {entry.quantity && (
                                <span className={styles.historyQty}>{entry.quantity} kg</span>
                              )}
                              <span className={styles.historyDate}>{formatDate(entry.date)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className={styles.modalActions}>
                  {isEditMode || !selectedMaterial ? (
                    <>
                      <button
                        className={styles.saveButton}
                        onClick={handleSaveMaterial}
                      >
                        {isEditMode ? 'Update Material' : 'Create Material'}
                      </button>
                      <button className={styles.cancelButton} onClick={closeModal}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleEditMaterial(selectedMaterial)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteMaterial(selectedMaterial.materialID)}
                      >
                        Delete
                      </button>
                      <button className={styles.cancelButton} onClick={closeModal}>
                        Close
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default EditMaterials;