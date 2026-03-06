// Application.js - Firestore Application Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');
const User = require('./Users');
const Notification = require('./Notification');

class Application {
  constructor(data = {}) {
    this.applicationID = data.applicationID || uuidv4();
    this.userID = data.userID || '';
    this.applicationType = data.applicationType || ''; // Account_Verification, Org_Verification, Collector_Privilege
    this.justification = data.justification || null;
    this.organizationName = data.organizationName || ''; // For 'create' requests
    this.requestType = data.requestType || null; // 'join' or 'create' (for Org_Verification only)
    this.targetOrganizationID = data.targetOrganizationID || null; // For 'join' requests
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
    
    // Org_Verification specific validation
    // Only validate for NEW applications (Pending/Submitted), not old approved/rejected ones
    if (this.applicationType === 'Org_Verification' && 
        (this.status === 'Pending' || this.status === 'Submitted')) {
      if (!this.requestType || !['join', 'create'].includes(this.requestType)) {
        errors.push('Request type (join/create) is required for organization applications');
      }
      if (this.requestType === 'join' && !this.targetOrganizationID) {
        errors.push('Target organization ID is required for join requests');
      }
      if (this.requestType === 'create' && !this.organizationName) {
        errors.push('Organization name is required for create requests');
      }
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
      requestType: this.requestType,
      targetOrganizationID: this.targetOrganizationID,
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
        const Point = require('./Point');

        switch (this.applicationType) {
          case 'Account_Verification':
            userUpdate.status = 'Verified';
            // Award 5 points for account verification
            await Point.create({
              userID: this.userID,
              pointsEarned: 5,
              transaction: 'Profile_Completion',
              description: 'Account verified'
            });
            break;
            
          case 'Org_Verification':
            userUpdate.status = 'Verified';
            
            // Handle organization membership based on request type
            const Organization = require('./Organizations');
            
            // Default to 'create' for old applications without requestType
            const requestType = this.requestType || 'create';
            
            // Award 10 points for organization verification
            await Point.create({
              userID: this.userID,
              pointsEarned: 10,
              transaction: 'Profile_Completion',
              description: 'Organization account approved'
            });
            
            if (requestType === 'create') {
              // CREATE new organization
              const orgName = this.organizationName || 'Unnamed Organization';
              const org = await Organization.create({
                organizationName: orgName,
                members: [this.userID],
                admins: [this.userID],
                description: this.justification || '',
                createdAt: new Date()
              });
              
              // Link user to organization
              userUpdate.organizationID = org.organizationID;
              userUpdate.organizationName = org.organizationName;
              
            } else if (requestType === 'join') {
              // JOIN existing organization
              const org = await Organization.findById(this.targetOrganizationID);
              
              if (!org) {
                throw new Error('Target organization not found');
              }
              
              // Add user as member (this also sets their organizationID and organizationName)
              await org.addMember(this.userID);
              
              // Note: addMember already updates the user, but we set it here too for consistency
              userUpdate.organizationID = org.organizationID;
              userUpdate.organizationName = org.organizationName;
            }
            break;
            
          case 'Collector_Privilege':
            if (!user.isCollector) {
              userUpdate.isCollector = true;
            }
            // Award 10 points for becoming a collector
              await Point.create({
                userID: this.userID,
                pointsEarned: 10,
                transaction: 'Profile_Completion',
                description: 'Collector privilege approved'
              });
            userUpdate.status = 'Verified';
            break;
        }
      } else if (status === 'Rejected') {
        // CRITICAL: Reset user status to Pending when rejected
        // This allows them to resubmit verification
        userUpdate.status = 'Pending';
        
        // If rejecting org application, clear any org data
        if (this.applicationType === 'Org_Verification') {
          userUpdate.organizationID = null;
          userUpdate.organizationName = null;
        }
      }
      
      await User.update(user.userID, userUpdate);

      // Send notification to applicant
      try {
        await this.sendApplicationNotification(status, justification);
      } catch (error) {
        console.error('Failed to send application notification:', error);
        // Don't throw - notification failure shouldn't block the review process
      }
    }

    return this;
  }

  // Send notification for application approval/rejection
  async sendApplicationNotification(status, justification = null) {
    const applicationTypeNames = {
      'Account_Verification': 'Account Verification',
      'Org_Verification': 'Organization Verification',
      'Collector_Privilege': 'Collector Privilege'
    };

    const applicationTypeName = applicationTypeNames[this.applicationType] || this.applicationType;

    if (status === 'Approved') {
      await Notification.create({
        userID: this.userID,
        type: 'Application',
        title: 'Application Approved! ✓',
        message: `Your ${applicationTypeName} application has been approved! You now have access to additional features.`,
        referenceID: this.applicationID,
        referenceType: 'application',
        actionURL: '/profile',
        priority: 'high',
        metadata: {
          applicationID: this.applicationID,
          applicationType: this.applicationType,
          reviewedBy: this.reviewedBy,
          reviewedAt: this.reviewedAt
        }
      });
    } else if (status === 'Rejected') {
      await Notification.create({
        userID: this.userID,
        type: 'Application',
        title: 'Application Update',
        message: `Your ${applicationTypeName} application was not approved. ${justification ? `Reason: ${justification}` : 'Please review and resubmit if needed.'}`,
        referenceID: this.applicationID,
        referenceType: 'application',
        actionURL: '/profile',
        priority: 'high',
        metadata: {
          applicationID: this.applicationID,
          applicationType: this.applicationType,
          reviewedBy: this.reviewedBy,
          reviewedAt: this.reviewedAt,
          justification: justification
        }
      });
    }
  }

  // Add document to application
  async addDocument(documentURL) {
    this.documents.push(documentURL);
    await this.update({ documents: this.documents });
  }
}

module.exports = Application;