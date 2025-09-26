import React, { useState } from 'react';

const PickupScheduleForm = ({ onSubmit, onCancel, giverPreferences = {} }) => {
  const [formData, setFormData] = useState({
    pickupDate: '',
    pickupTime: '',
    location: giverPreferences.preferredLocation || '',
    contactPerson: '',
    contactNumber: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.pickupDate) {
      newErrors.pickupDate = 'Pickup date is required';
    } else {
      const selectedDate = new Date(formData.pickupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.pickupDate = 'Pickup date cannot be in the past';
      }
    }
    
    if (!formData.pickupTime) {
      newErrors.pickupTime = 'Pickup time is required';
    }
    
    if (!formData.location) {
      newErrors.location = 'Pickup location is required';
    }
    
    if (!formData.contactPerson) {
      newErrors.contactPerson = 'Contact person name is required';
    }
    
    if (!formData.contactNumber) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.contactNumber)) {
      newErrors.contactNumber = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Combine date and time
      const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime}`);
      
      onSubmit({
        pickupTime: pickupDateTime.toISOString(),
        location: formData.location,
        contactPerson: formData.contactPerson,
        contactNumber: formData.contactNumber,
        notes: formData.notes
      });
    }
  };

  // Get tomorrow's date as minimum date
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Schedule Pickup</h2>
        
        {/* Show giver preferences if available */}
        {giverPreferences.preferredTimes && (
          <div className="bg-blue-50 p-3 rounded mb-4">
            <p className="text-sm text-blue-800">
              <strong>Giver's preferred times:</strong> {giverPreferences.preferredTimes}
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Date *
            </label>
            <input
              type="date"
              name="pickupDate"
              value={formData.pickupDate}
              onChange={handleChange}
              min={getTomorrowDate()}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.pickupDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.pickupDate && (
              <p className="mt-1 text-sm text-red-600">{errors.pickupDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Time *
            </label>
            <input
              type="time"
              name="pickupTime"
              value={formData.pickupTime}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.pickupTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.pickupTime && (
              <p className="mt-1 text-sm text-red-600">{errors.pickupTime}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Location *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Front gate, Building A"
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person *
            </label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="Name of person who will pickup"
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.contactPerson ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.contactPerson && (
              <p className="mt-1 text-sm text-red-600">{errors.contactPerson}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number *
            </label>
            <input
              type="tel"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              placeholder="e.g., 09123456789"
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.contactNumber ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.contactNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.contactNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Any special instructions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Schedule Pickup
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PickupScheduleForm;