// Application.js - Firestore Application Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');
const User = require('./Users');

class Application {
  constructor(data = {}) {
    this.applicationID = data.applicationID || uuidv4();
    this.userID = data.userID || '';
    this.applicationType = data.applicationType || ''; // Account_Verification, Org_Verification, Collector_Privilege
    this.justification = data.justification || null;
    this.organizationName = data.organizationName || '';
    this.documents = data.documents || []; // Array of file URLs
    this.status = data.status || 'Pending'; // Pending, Submitted, Approved, Rejected
    this.reviewedBy = data.reviewedBy || null;
    this.submittedAt = data.submittedAt || new Date();
    this.reviewedAt = data.reviewedAt || null;
  }

  // Validation
  validate() {
    const errors = [];
    
    if (!this.userID) errors.push('User ID is required');
    if (!this.applicationType || !['Account_Verification', 'Org_Verification', 'Collector_Privilege'].includes(this.applicationType)) {
      errors.push('Valid application type is required');
    }
    if (!['Pending', 'Submitted', 'Approved', 'Rejected'].includes(this.status)) {
      errors.push('Valid status is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      applicationID: this.applicationID,
      userID: this.userID,
      applicationType: this.applicationType,
      justification: this.justification,
      organizationName: this.organizationName,
      documents: this.documents,
      status: this.status,
      reviewedBy: this.reviewedBy,
      submittedAt: this.submittedAt,
      reviewedAt: this.reviewedAt
    };
  }

  // Static methods for database operations
  static async create(applicationData) {
    const db = getFirestore();
    const application = new Application(applicationData);
    
    const validation = application.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const applicationRef = doc(db, 'applications', application.applicationID);
      await setDoc(applicationRef, application.toFirestore());
      return application;
    } catch (error) {
      throw new Error(`Failed to create application: ${error.message}`);
    }
  }

  static async findById(applicationID) {
    const db = getFirestore();
    try {
      const applicationRef = doc(db, 'applications', applicationID);
      const applicationSnap = await getDoc(applicationRef);
      
      if (applicationSnap.exists()) {
        return new Application(applicationSnap.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find application: ${error.message}`);
    }
  }

  static async findByUserID(userID) {
    const db = getFirestore();
    try {
      const applicationsRef = collection(db, 'applications');
      const q = query(applicationsRef, where('userID', '==', userID), orderBy('submittedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const applications = [];
      querySnapshot.forEach((doc) => {
        applications.push(new Application(doc.data()));
      });
      
      return applications;
    } catch (error) {
      throw new Error(`Failed to find applications by user: ${error.message}`);
    }
  }

  static async findByStatus(status) {
    const db = getFirestore();
    try {
      const applicationsRef = collection(db, 'applications');
      const q = query(applicationsRef, where('status', '==', status), orderBy('submittedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const applications = [];
      querySnapshot.forEach((doc) => {
        applications.push(new Application(doc.data()));
      });
      
      return applications;
    } catch (error) {
      throw new Error(`Failed to find applications by status: ${error.message}`);
    }
  }

  static async findByType(applicationType) {
    const db = getFirestore();
    try {
      const applicationsRef = collection(db, 'applications');
      const q = query(applicationsRef, where('applicationType', '==', applicationType), orderBy('submittedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const applications = [];
      querySnapshot.forEach((doc) => {
        applications.push(new Application(doc.data()));
      });
      
      return applications;
    } catch (error) {
      throw new Error(`Failed to find applications by type: ${error.message}`);
    }
  }

  static async update(applicationID, updateData) {
    const db = getFirestore();
    try {
      const applicationRef = doc(db, 'applications', applicationID);
      await updateDoc(applicationRef, updateData);
      
      // Return updated application
      return await Application.findById(applicationID);
    } catch (error) {
      throw new Error(`Failed to update application: ${error.message}`);
    }
  }

  static async delete(applicationID) {
    const db = getFirestore();
    try {
      const applicationRef = doc(db, 'applications', applicationID);
      await deleteDoc(applicationRef);
      return { success: true, message: 'Application deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete application: ${error.message}`);
    }
  }

  // Instance methods
  async save() {
    return await Application.create(this.toFirestore());
  }

  async update(updateData) {
    Object.assign(this, updateData);
    return await Application.update(this.applicationID, updateData);
  }

  async delete() {
    return await Application.delete(this.applicationID);
  }

  // Review application
  async review(reviewerID, status, justification = null) {
    if (!['Approved', 'Rejected'].includes(status)) {
      throw new Error('Invalid review status');
    }

    const updateData = {
      status: status,
      reviewedBy: reviewerID,
      reviewedAt: new Date()
    };

    if (justification) {
      updateData.justification = justification;
    }

    await this.update(updateData);
    const user = await User.findById(this.userID);

    if (user) {
      let userUpdate = {};
      
      if (status === 'Approved') {
        switch (this.applicationType) {
          case 'Account_Verification':
            userUpdate.status = 'Verified';
            break;
          case 'Org_Verification':
            userUpdate.status = 'Verified';
            userUpdate.isOrganization = true;
            break;
          case 'Collector_Privilege':
            if (user.userType !== 'Collector') {
              userUpdate.userType = 'Collector';
            }
            userUpdate.status = 'Verified';
            break;
        }
      } else if (status === 'Rejected') {
        // CRITICAL: Reset user status to Pending when rejected
        // This allows them to resubmit verification
        userUpdate.status = 'Pending';
      }
      
      await User.update(user.userID, userUpdate);
    }

    return this;
  }

  // Add document to application
  async addDocument(documentURL) {
    this.documents.push(documentURL);
    await this.update({ documents: this.documents });
  }
}

module.exports = Application;