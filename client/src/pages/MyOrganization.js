import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import styles from './MyOrganization.module.css';
import { 
  Building2, 
  Users, 
  Shield, 
  Heart, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Edit3, 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  ChevronRight,
  Crown,
  Search,
  MoreVertical,
  Leaf,
  Droplets,
  Clock,
  Home,
  Star,
  Recycle,
  BarChart3,
  PieChart,
  Target,
  Award,
  Zap,
  CheckCircle,
  X,
  Download
} from 'lucide-react';

// Tree icon component (not in lucide-react standard)
const Trees = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/>
    <path d="M7 16v6"/>
    <path d="M13 19v3"/>
    <path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>
  </svg>
);

const MyOrganization = () => {
  const navigate = useNavigate();
  const { currentUser, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Organization data
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  // UI state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    address: ''
  });

  // Get auth token helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // Construct profile picture URL
  const getProfilePictureUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const baseUrl = 'http://localhost:3001';
    return url.startsWith('/') ? baseUrl + url : baseUrl + '/' + url;
  };

  // Check if user has organization access
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    fetchOrganizationData();
  }, [currentUser, navigate]);

  // Fetch all organization data
  const fetchOrganizationData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const headers = getAuthHeaders();
      
      // 1. Fetch organization details
      let orgData = null;
      try {
        const orgResponse = await axios.get(
          'http://localhost:3001/api/organizations/my/organization',
          { headers }
        );
        
        if (orgResponse.data.success) {
          const org = orgResponse.data.organization;
          orgData = {
            id: org.organizationID,
            name: org.organizationName || '',
            description: org.description || '',
            profilePictureUrl: getProfilePictureUrl(org.profilePicture),
            contactEmail: org.contactEmail || '',
            contactPhone: org.contactPhone || '',
            address: org.address || '',
            createdAt: org.createdAt,
            memberCount: org.members?.length || 1,
            adminCount: org.admins?.length || 1
          };
        }
      } catch (orgError) {
      }
      
      setOrganization(orgData);
      setEditForm({
        name: orgData.name,
        description: orgData.description,
        contactEmail: orgData.contactEmail,
        contactPhone: orgData.contactPhone,
        address: orgData.address
      });
      
      // 2. Fetch members, initiatives, and analytics in parallel
      const [membersResult, initiativesResult, analyticsResult] = await Promise.allSettled([
        fetchMembers(headers),
        fetchInitiatives(headers),
        fetchAnalyticsData(headers, selectedTimeRange)
      ]);

      if (membersResult.status === 'fulfilled') {
        setMembers(membersResult.value);
      } else {
        console.error('Members fetch failed:', membersResult.reason);
        // Fallback: at least show current user
        setMembers([{
          userID: currentUser.userID,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          email: currentUser.email,
          isOrgAdmin: true,
          profilePictureUrl: getProfilePictureUrl(currentUser.profilePictureUrl)
        }]);
      }

      if (initiativesResult.status === 'fulfilled') {
        setInitiatives(initiativesResult.value);
      } else {
        console.error('Initiatives fetch failed:', initiativesResult.reason);
        setInitiatives([]);
      }

      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value);
      } else {
        console.error('Analytics fetch failed:', analyticsResult.reason);
        setAnalytics(getDefaultAnalytics());
      }
      
    } catch (err) {
      console.error('Error fetching organization data:', err);
      setError('Failed to load organization data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedTimeRange]);

  // Fetch members from the organization endpoint
  const fetchMembers = async (headers) => {
    try {
      const response = await axios.get(
        'http://localhost:3001/api/organizations/my/organization/members',
        { headers }
      );
      if (response.data.success) {
        return response.data.members.map(m => ({
          ...m,
          profilePictureUrl: getProfilePictureUrl(m.profilePictureUrl)
        }));
      }
    } catch (err) {
      console.warn('Members endpoint error, falling back:', err.message);
    }
    // Fallback
    return [{
      userID: currentUser.userID,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
      isOrgAdmin: true,
      profilePictureUrl: getProfilePictureUrl(currentUser.profilePictureUrl)
    }];
  };

  // Fetch initiatives from all org members
  const fetchInitiatives = async (headers) => {
    try {
      const response = await axios.get(
        'http://localhost:3001/api/organizations/my/organization/initiatives',
        { headers }
      );
      if (response.data.success) {
        return response.data.initiatives || [];
      }
    } catch (err) {
      console.warn('Org initiatives endpoint error, falling back:', err.message);
    }
    // Fallback: fetch just the current user's initiatives
    try {
      const response = await axios.get(
        `http://localhost:3001/api/posts?postType=Initiative&userID=${currentUser.userID}`,
        { headers }
      );
      if (response.data.success) {
        return response.data.posts || [];
      }
    } catch (e) {
      console.error('Initiative fallback also failed:', e.message);
    }
    return [];
  };

  // Fetch analytics data
  const fetchAnalyticsData = async (headers, timeRange) => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/organizations/my/organization/analytics?timeRange=${timeRange || selectedTimeRange}`,
        { headers: headers || getAuthHeaders() }
      );
      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('Org analytics endpoint error, falling back:', err.message);
    }
    // Fallback: try the general analytics endpoint and normalize response
    try {
      const response = await axios.get(
        `http://localhost:3001/api/analytics/dashboard?timeRange=${timeRange || selectedTimeRange}`,
        { headers: headers || getAuthHeaders() }
      );
      if (response.data.success) {
        const raw = response.data.data || response.data;
        // Normalize community analytics structure to match org analytics structure
        return {
          earnings: raw.earnings || getDefaultAnalytics().earnings,
          operations: raw.operations || {
            totalPickups: raw.totalPickups || 0,
            completedPickups: raw.totalPickups || 0,
            successRate: 0,
            repeatGivers: 0,
            activeGivers: 0
          },
          volume: raw.volume || {
            totalCollected: raw.totalRecycled || 0,
            thisMonth: 0,
            lastMonth: 0,
            growthRate: 0
          },
          impact: raw.impact || {
            co2Saved: raw.communityImpact?.co2Saved || 0,
            treesEquivalent: raw.communityImpact?.treesEquivalent || 0,
            waterSaved: raw.communityImpact?.waterSaved || 0,
            landfillDiverted: 0,
            householdsServed: 0,
            barrangaysCovered: 0
          },
          materialBreakdown: raw.materialBreakdown || [],
          platformInsights: raw.platformInsights || getDefaultAnalytics().platformInsights
        };
      }
    } catch (e) {
      console.warn('General analytics also failed:', e.message);
    }
    return getDefaultAnalytics();
  };

  // Refetch analytics when time range changes
  useEffect(() => {
    if (organization && activeTab === 'analytics') {
      const refetch = async () => {
        const data = await fetchAnalyticsData(null, selectedTimeRange);
        setAnalytics(data);
      };
      refetch();
    }
  }, [selectedTimeRange]);

  // Default analytics structure
  const getDefaultAnalytics = () => ({
    earnings: {
      totalEarnings: 0,
      thisMonth: 0,
      lastMonth: 0,
      growthRate: 0,
      avgPerPickup: 0,
      projectedMonthly: 0
    },
    operations: {
      totalPickups: 0,
      completedPickups: 0,
      successRate: 0,
      repeatGivers: 0,
      activeGivers: 0
    },
    volume: {
      totalCollected: 0,
      thisMonth: 0,
      lastMonth: 0,
      growthRate: 0,
      avgPerPickup: 0
    },
    impact: {
      co2Saved: 0,
      treesEquivalent: 0,
      waterSaved: 0,
      landfillDiverted: 0,
      householdsServed: 0,
      barrangaysCovered: 0
    },
    materialBreakdown: [],
    platformInsights: {
      rankInArea: 0,
      totalOrgsInArea: 0,
      percentileMaterials: 0,
      avgPickupRating: 0,
      giverSatisfaction: 0,
      returnGiverRate: 0,
      peakCollectionDay: 'N/A',
      peakCollectionTime: 'N/A',
      topBarangay: 'N/A',
      untappedBarangays: 0
    }
  });

  // Helper functions
  const formatDate = (date) => {
    if (!date) return 'N/A';
    let d;
    if (date?.seconds) {
      d = new Date(date.seconds * 1000);
    } else if (date?.toDate) {
      d = date.toDate();
    } else {
      d = new Date(date);
    }
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount) => {
    return `₱${(amount || 0).toLocaleString()}`;
  };

  // Handle profile picture upload
  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await axios.post(
        'http://localhost:3001/api/organizations/my/organization/profile-picture',
        formData,
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setOrganization(prev => ({
          ...prev,
          profilePictureUrl: getProfilePictureUrl(response.data.fileUrl)
        }));
        alert('Organization profile picture updated!');
      }
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      alert('Failed to upload organization profile picture.');
    } finally {
      setUploadingPicture(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Try the organization update endpoint first
      try {
        const response = await axios.put(
          'http://localhost:3001/api/organizations/my/organization',
          {
            organizationName: editForm.name,
            description: editForm.description,
            contactEmail: editForm.contactEmail,
            contactPhone: editForm.contactPhone,
            address: editForm.address
          },
          { headers: getAuthHeaders() }
        );
        
        if (response.data.success) {
          setOrganization(prev => ({
            ...prev,
            name: editForm.name,
            description: editForm.description,
            contactEmail: editForm.contactEmail,
            contactPhone: editForm.contactPhone,
            address: editForm.address
          }));
          setShowEditModal(false);
          alert('Organization details updated!');
          return;
        }
      } catch (orgErr) {
        console.warn('Org update endpoint failed, trying profile:', orgErr.message);
      }

      // Fallback: update via profile endpoint
      const response = await axios.put(
        'http://localhost:3001/api/protected/profile',
        {
          organizationName: editForm.name,
          organizationDescription: editForm.description,
          phone: editForm.contactPhone,
          address: editForm.address
        },
        { headers: getAuthHeaders() }
      );
      
      if (response.data.success) {
        setOrganization(prev => ({
          ...prev,
          name: editForm.name,
          description: editForm.description,
          contactPhone: editForm.contactPhone,
          address: editForm.address
        }));
        setShowEditModal(false);
        alert('Organization details updated!');
      }
    } catch (err) {
      console.error('Error updating organization:', err);
      setError('Failed to update organization details.');
    }
  };

  // Handle impact report download
  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    try {
      // Fetch impact report data
      let reportData;
      try {
        const response = await axios.get(
          'http://localhost:3001/api/organizations/my/organization/impact-report',
          { headers: getAuthHeaders() }
        );
        if (response.data.success) {
          reportData = response.data.report;
        }
      } catch (err) {
        console.warn('Impact report endpoint unavailable, using local data');
      }

      // Fall back to analytics data if endpoint not available
      if (!reportData) {
        const data = analytics || getDefaultAnalytics();
        reportData = {
          organizationName: organization?.name || 'Organization',
          generatedAt: new Date().toISOString(),
          memberCount: members.length,
          totalPickups: data.operations?.completedPickups || 0,
          totalKgCollected: data.volume?.totalCollected || 0,
          co2Prevented: data.impact?.co2Saved || 0,
          treesSaved: data.impact?.treesEquivalent || 0,
          waterSaved: data.impact?.waterSaved || 0,
          landfillDiverted: data.impact?.landfillDiverted || 0,
          uniqueHouseholds: data.impact?.householdsServed || 0
        };
      }

      // Dynamically import jsPDF and generate PDF
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      // --- Header ---
      pdf.setFillColor(59, 101, 53);
      pdf.rect(0, 0, pageWidth, 45, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text(reportData.organizationName || 'Organization', pageWidth / 2, 18, { align: 'center' });
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Environmental Impact Report', pageWidth / 2, 28, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setFillColor(179, 242, 172);
      pdf.roundedRect(pageWidth / 2 - 20, 32, 40, 7, 2, 2, 'F');
      pdf.setTextColor(59, 101, 53);
      pdf.text('EcoTayo Verified', pageWidth / 2, 37, { align: 'center' });

      y = 55;
      pdf.setTextColor(51, 51, 51);

      // --- Environmental Impact Section ---
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 101, 53);
      pdf.text('Environmental Impact', margin, y);
      y += 3;
      pdf.setDrawColor(59, 101, 53);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      const impactMetrics = [
        { value: `${(reportData.co2Prevented || 0).toLocaleString()} kg`, label: 'CO2 Emissions Prevented' },
        { value: `${reportData.treesSaved || 0}`, label: 'Trees Equivalent Saved' },
        { value: `${(reportData.waterSaved || 0).toLocaleString()} L`, label: 'Water Saved' },
        { value: `${reportData.landfillDiverted || 0} tons`, label: 'Landfill Waste Diverted' },
        { value: `${reportData.uniqueHouseholds || 0}`, label: 'Households Served' },
        { value: `${(reportData.totalKgCollected || 0).toLocaleString()} kg`, label: 'Total Waste Collected' }
      ];

      const colWidth = contentWidth / 3;
      impactMetrics.forEach((metric, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = margin + col * colWidth;
        const boxY = y + row * 35;

        pdf.setFillColor(248, 249, 250);
        pdf.roundedRect(x + 2, boxY, colWidth - 4, 30, 3, 3, 'F');
        pdf.setDrawColor(224, 224, 224);
        pdf.roundedRect(x + 2, boxY, colWidth - 4, 30, 3, 3, 'S');

        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(59, 101, 53);
        pdf.text(metric.value, x + colWidth / 2, boxY + 14, { align: 'center' });

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(102, 102, 102);
        pdf.text(metric.label, x + colWidth / 2, boxY + 23, { align: 'center' });
      });

      y += 80;

      // --- Operations Summary Section ---
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 101, 53);
      pdf.text('Operations Summary', margin, y);
      y += 3;
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      const opsMetrics = [
        { value: `${reportData.memberCount || 0}`, label: 'Team Members' },
        { value: `${reportData.totalPickups || 0}`, label: 'Completed Pickups' },
        { value: `${(reportData.totalKgCollected || 0).toLocaleString()} kg`, label: 'Materials Collected' }
      ];

      opsMetrics.forEach((metric, idx) => {
        const x = margin + idx * colWidth;
        pdf.setFillColor(248, 249, 250);
        pdf.roundedRect(x + 2, y, colWidth - 4, 30, 3, 3, 'F');
        pdf.setDrawColor(224, 224, 224);
        pdf.roundedRect(x + 2, y, colWidth - 4, 30, 3, 3, 'S');

        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(59, 101, 53);
        pdf.text(metric.value, x + colWidth / 2, y + 14, { align: 'center' });

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(102, 102, 102);
        pdf.text(metric.label, x + colWidth / 2, y + 23, { align: 'center' });
      });

      y += 45;

      // --- Summary Paragraph ---
      pdf.setFillColor(240, 247, 238);
      pdf.roundedRect(margin, y, contentWidth, 40, 3, 3, 'F');
      pdf.setDrawColor(59, 101, 53);
      pdf.setLineWidth(1);
      pdf.line(margin, y, margin, y + 40);
      pdf.setLineWidth(0.5);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 51, 51);
      const summaryLines = [
        `${reportData.organizationName} has made a significant contribution to environmental`,
        `sustainability through the EcoTayo platform.`,
        ``,
        `By collecting ${(reportData.totalKgCollected || 0).toLocaleString()} kg of recyclable materials, the organization has`,
        `prevented ${(reportData.co2Prevented || 0).toLocaleString()} kg of CO2 emissions, the equivalent of saving ${reportData.treesSaved || 0} trees.`,
        `These efforts have served ${reportData.uniqueHouseholds || 0} households and diverted ${reportData.landfillDiverted || 0} tons from landfills.`
      ];
      summaryLines.forEach((line, i) => {
        pdf.text(line, margin + 5, y + 8 + i * 5.5);
      });

      y += 50;

      // --- Footer ---
      pdf.setDrawColor(224, 224, 224);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;
      pdf.setFontSize(9);
      pdf.setTextColor(153, 153, 153);
      pdf.text(
        `Generated on ${new Date(reportData.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        pageWidth / 2, y, { align: 'center' }
      );
      pdf.text('Powered by EcoTayo - Building a Circular Economy Together', pageWidth / 2, y + 6, { align: 'center' });

      // Save PDF
      const fileName = `${(reportData.organizationName || 'Organization').replace(/\s+/g, '_')}_Impact_Report.pdf`;
      pdf.save(fileName);

    } catch (err) {
      console.error('Error generating impact report:', err);
      alert('Failed to generate impact report. Make sure jspdf is installed (npm install jspdf).');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Filter members based on search and filter
  const filteredMembers = members.filter(member => {
    const matchesSearch = `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = memberFilter === 'all' ||
      (memberFilter === 'admins' && member.isOrgAdmin) ||
      (memberFilter === 'members' && !member.isOrgAdmin);
    return matchesSearch && matchesFilter;
  });

  // Calculate initiative stats
  const initiativeStats = {
    active: initiatives.filter(i => i.status === 'Active').length,
    completed: initiatives.filter(i => i.status === 'Completed').length,
    total: initiatives.length
  };

  // Initiative Progress Card Component
  const InitiativeProgressCard = ({ initiative }) => {
    const targetAmount = initiative.targetAmount || 100;
    const currentAmount = initiative.currentAmount || 0;
    const progress = Math.round((currentAmount / targetAmount) * 100);
    
    let targetDate;
    const endDateVal = initiative.endDate || initiative.targetDate;
    if (endDateVal?.seconds) {
      targetDate = new Date(endDateVal.seconds * 1000);
    } else if (endDateVal) {
      targetDate = new Date(endDateVal);
    } else {
      targetDate = new Date();
    }
    const daysLeft = Math.max(0, Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24)));
    
    return (
      <div className={styles.initiativeCard}>
        <div 
          className={styles.initiativeProgress} 
          style={{ 
            background: initiative.status === 'Completed' 
              ? 'var(--primary-color)' 
              : `linear-gradient(90deg, var(--primary-color) ${progress}%, var(--border-color) ${progress}%)` 
          }} 
        />
        
        <div className={styles.initiativeContent}>
          <div className={styles.initiativeHeader}>
            <h4 className={styles.initiativeTitle}>{initiative.title}</h4>
            <span className={`${styles.initiativeStatus} ${initiative.status === 'Active' ? styles.statusActive : styles.statusCompleted}`}>
              {initiative.status}
            </span>
          </div>
          
          <p className={styles.initiativeDescription}>
            {initiative.description?.substring(0, 80)}{initiative.description?.length > 80 ? '...' : ''}
          </p>

          {initiative.authorName && (
            <p className={styles.initiativeAuthor}>
              <Users size={12} /> by {initiative.authorName}
            </p>
          )}
          
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span>Collection Progress</span>
              <span className={`${styles.progressPercent} ${progress >= 100 ? styles.complete : ''}`}>
                {progress}%
              </span>
            </div>
            
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ 
                  width: `${Math.min(progress, 100)}%`,
                  background: progress >= 100 
                    ? 'linear-gradient(90deg, var(--primary-color), var(--primary-light))' 
                    : progress >= 75 
                      ? 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))' 
                      : 'linear-gradient(90deg, var(--secondary-color), var(--secondary-light))'
                }}
              >
                {progress >= 100 && <CheckCircle size={10} className={styles.checkIcon} />}
              </div>
            </div>
            
            <div className={styles.progressDetails}>
              <span>{currentAmount} kg collected</span>
              <span>Target: {targetAmount} kg</span>
            </div>
          </div>
          
          <div className={styles.initiativeFooter}>
            <div className={styles.initiativeStats}>
              <span className={styles.stat}>
                <Users size={14} /> {initiative.supportCount || 0} supporters
              </span>
              {initiative.status === 'Active' && (
                <span className={`${styles.stat} ${daysLeft <= 7 ? styles.urgent : ''}`}>
                  <Clock size={14} /> {daysLeft} days left
                </span>
              )}
            </div>
            <button 
              className={styles.viewButton}
              onClick={() => navigate(`/posts/${initiative.postID}`)}
            >
              View
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Overview Tab
  const renderOverviewTab = () => (
    <div className={styles.tabContent}>
      {/* Quick Stats Grid */}
      <div className={styles.statsGrid}>
        {[
          { icon: <Users size={24} />, value: members.length, label: 'Total Members' },
          { icon: <Shield size={24} />, value: members.filter(m => m.isOrgAdmin).length, label: 'Admins' },
          { icon: <Heart size={24} />, value: initiativeStats.active, label: 'Active Initiatives' },
          { icon: <Package size={24} />, value: analytics?.operations?.completedPickups || 0, label: 'Completed Pickups' }
        ].map((stat, idx) => (
          <div key={idx} className={styles.statCard}>
            <div className={styles.statIcon}>{stat.icon}</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Environmental Impact */}
      <div className={styles.impactSection}>
        <h3 className={styles.sectionTitle}>Environmental Impact</h3>
        <div className={styles.impactGrid}>
          {[
            { icon: <Leaf size={32} />, value: `${(analytics?.impact?.co2Saved || 0).toLocaleString()} kg`, label: 'CO₂ Emissions Saved' },
            { icon: <Trees size={32} />, value: analytics?.impact?.treesEquivalent || 0, label: 'Trees Equivalent' },
            { icon: <Droplets size={32} />, value: `${(analytics?.impact?.waterSaved || 0).toLocaleString()} L`, label: 'Water Saved' }
          ].map((impact, idx) => (
            <div key={idx} className={styles.impactCard}>
              <div className={styles.impactIcon}>{impact.icon}</div>
              <h4 className={styles.impactValue}>{impact.value}</h4>
              <p className={styles.impactLabel}>{impact.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Initiatives */}
      <div className={styles.recentSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Active Initiatives</h3>
          <button 
            className={styles.viewAllButton}
            onClick={() => setActiveTab('initiatives')}
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
        
        {initiatives.length > 0 ? (
          <div className={styles.initiativesGrid}>
            {initiatives.filter(i => i.status === 'Active').slice(0, 3).map(initiative => (
              <InitiativeProgressCard key={initiative.postID} initiative={initiative} />
            ))}
            {initiatives.filter(i => i.status === 'Active').length === 0 && (
              <div className={styles.emptyState}>
                <Heart size={48} />
                <p>No active initiatives. All initiatives have been completed or none created yet!</p>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Heart size={48} />
            <p>No initiatives yet. Create your first initiative to engage your community!</p>
            <button 
              className={styles.createButton}
              onClick={() => navigate('/create-post', { state: { postType: 'Initiative' } })}
            >
              Create Initiative
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Render Members Tab
  const renderMembersTab = () => (
    <div className={styles.tabContent}>
      {/* Search and Filters */}
      <div className={styles.membersToolbar}>
        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search members by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterButtons}>
          {[
            { key: 'all', label: `All (${members.length})` },
            { key: 'admins', label: `Admins (${members.filter(m => m.isOrgAdmin).length})` },
            { key: 'members', label: `Members (${members.filter(m => !m.isOrgAdmin).length})` }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setMemberFilter(filter.key)}
              className={`${styles.filterButton} ${memberFilter === filter.key ? styles.active : ''}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className={styles.tableContainer}>
        <table className={styles.membersTable}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(member => (
              <tr key={member.userID}>
                <td>
                  <div className={styles.memberCell}>
                    <div className={styles.memberAvatar}>
                      {member.profilePictureUrl ? (
                        <img 
                          src={member.profilePictureUrl} 
                          alt="" 
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
                        />
                      ) : (
                        `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`
                      )}
                    </div>
                    <span className={styles.memberName}>{member.firstName} {member.lastName}</span>
                  </div>
                </td>
                <td className={styles.emailCell}>{member.email}</td>
                <td>
                  <span className={`${styles.roleTag} ${member.isOrgAdmin ? styles.adminRole : ''}`}>
                    {member.isOrgAdmin && <Crown size={12} />}
                    {member.isOrgAdmin ? 'Admin' : 'Member'}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => { setSelectedMember(member); setShowMemberModal(true); }}
                    className={styles.actionButton}
                  >
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredMembers.length === 0 && (
        <div className={styles.emptyState}>
          <Users size={48} />
          <p>No members found matching your search.</p>
        </div>
      )}
    </div>
  );

  // Render Initiatives Tab
  const renderInitiativesTab = () => (
    <div className={styles.tabContent}>
      {/* Stats Row */}
      <div className={styles.initiativeStatsRow}>
        {[
          { value: initiativeStats.total, label: 'Total', color: 'default' },
          { value: initiativeStats.active, label: 'Active', color: 'primary' },
          { value: initiativeStats.completed, label: 'Completed', color: 'muted' }
        ].map((stat, idx) => (
          <div key={idx} className={`${styles.initiativeStat} ${styles[stat.color]}`}>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Create Button */}
      <div className={styles.createSection}>
        <button 
          className={styles.createInitiativeButton}
          onClick={() => navigate('/create-post', { state: { postType: 'Initiative' } })}
        >
          <Heart size={18} /> Create New Initiative
        </button>
      </div>

      {/* Initiatives Grid */}
      {initiatives.length > 0 ? (
        <div className={styles.initiativesGrid}>
          {initiatives.map(initiative => (
            <InitiativeProgressCard key={initiative.postID} initiative={initiative} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Heart size={48} />
          <p>No initiatives yet. Create your first initiative to start making an impact!</p>
        </div>
      )}
    </div>
  );

  // Render Analytics Tab
  const renderAnalyticsTab = () => {
    const data = analytics || getDefaultAnalytics();
    
    return (
      <div className={styles.tabContent}>
        {/* Time Range Selector */}
        <div className={styles.timeRangeSelector}>
          {['all', 'week', 'month', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`${styles.timeRangeButton} ${selectedTimeRange === range ? styles.active : ''}`}
            >
              {range === 'all' ? 'All Time' : range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>

        {/* Earnings Dashboard */}
        <div className={styles.earningsDashboard}>
          <div className={styles.earningsHeader}>
            <div>
              <h2>Organization Earnings</h2>
              <p>Track your revenue and growth</p>
            </div>
            <div className={styles.totalEarnings}>
              <p>Total Earnings</p>
              <p className={styles.earningsAmount}>{formatCurrency(data.earnings?.totalEarnings)}</p>
            </div>
          </div>

          <div className={styles.earningsGrid}>
            {[
              { 
                label: 'This Month', 
                value: formatCurrency(data.earnings?.thisMonth),
                change: `${data.earnings?.growthRate >= 0 ? '+' : ''}${data.earnings?.growthRate || 0}%`,
                positive: (data.earnings?.growthRate || 0) >= 0,
                icon: <TrendingUp size={18} />
              },
              { 
                label: 'Last Month', 
                value: formatCurrency(data.earnings?.lastMonth),
                subtext: 'vs previous',
                icon: <Calendar size={18} />
              },
              { 
                label: 'Avg per Pickup', 
                value: formatCurrency(data.earnings?.avgPerPickup),
                subtext: 'revenue',
                icon: <Package size={18} />
              },
              { 
                label: 'Projected', 
                value: formatCurrency(data.earnings?.projectedMonthly),
                subtext: 'this month',
                icon: <Target size={18} />
              }
            ].map((stat, idx) => (
              <div key={idx} className={styles.earningCard}>
                <div className={styles.earningCardHeader}>
                  <span>{stat.label}</span>
                  <span className={styles.earningIcon}>{stat.icon}</span>
                </div>
                <p className={styles.earningValue}>{stat.value}</p>
                {stat.change && (
                  <span className={`${styles.earningChange} ${stat.positive ? styles.positive : styles.negative}`}>
                    {stat.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {stat.change} from last month
                  </span>
                )}
                {stat.subtext && (
                  <span className={styles.earningSubtext}>{stat.subtext}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Operational Performance */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <Zap size={20} className={styles.sectionIcon} /> Operational Performance
          </h3>
          <div className={styles.operationsGrid}>
            {[
              { icon: <CheckCircle />, value: `${data.operations?.successRate || 0}%`, label: 'Pickup Success Rate', highlight: true },
              { icon: <Users />, value: `${data.operations?.repeatGivers || 0}%`, label: 'Repeat Givers', sublabel: 'Loyalty rate' },
              { icon: <Home />, value: data.operations?.activeGivers || 0, label: 'Active Givers', sublabel: 'This month' }
            ].map((stat, idx) => (
              <div key={idx} className={`${styles.operationCard} ${stat.highlight ? styles.highlighted : ''}`}>
                <div className={styles.operationIcon}>{stat.icon}</div>
                <p className={styles.operationValue}>{stat.value}</p>
                <p className={styles.operationLabel}>{stat.label}</p>
                {stat.sublabel && <p className={styles.operationSublabel}>{stat.sublabel}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Material Breakdown */}
        {data.materialBreakdown && data.materialBreakdown.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Recycle size={20} className={styles.sectionIcon} /> Material Breakdown
            </h3>
            <div className={styles.materialBreakdown}>
              {data.materialBreakdown.map((material, idx) => (
                <div key={idx} className={styles.materialRow}>
                  <div className={styles.materialInfo}>
                    <span className={styles.materialName}>{material.type}</span>
                    <span className={styles.materialAmount}>{material.amount} kg ({material.percentage}%)</span>
                  </div>
                  <div className={styles.materialBar}>
                    <div 
                      className={styles.materialFill} 
                      style={{ width: `${material.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Insights */}
        <div className={styles.insightsSection}>
          <h3 className={styles.insightsTitle}>
            <Award size={20} /> Your EcoTayo Advantage
            <span className={styles.exclusiveBadge}>EXCLUSIVE INSIGHTS</span>
          </h3>
          <p className={styles.insightsSubtitle}>Insights only available through EcoTayo</p>

          <div className={styles.insightsGrid}>
            {/* Area Ranking */}
            <div className={styles.insightCard}>
              <h4><BarChart3 size={18} /> Area Ranking</h4>
              <div className={styles.insightMain}>
                <span className={styles.rankValue}>#{data.platformInsights?.rankInArea || 'N/A'}</span>
                <span className={styles.rankContext}>of {data.platformInsights?.totalOrgsInArea || 0} collectors</span>
              </div>
              <p className={styles.insightDetail}>
                Top {100 - (data.platformInsights?.percentileMaterials || 0)}% in material collection volume
              </p>
              <div className={styles.insightTip}>
                Tip: Increase pickup frequency to climb rankings
              </div>
            </div>

            {/* Peak Collection Times */}
            <div className={styles.insightCard}>
              <h4><Clock size={18} /> Peak Collection Insights</h4>
              <div className={styles.peakInfo}>
                <div>
                  <p className={styles.peakLabel}>Best Day</p>
                  <p className={styles.peakValue}>{data.platformInsights?.peakCollectionDay || 'N/A'}</p>
                </div>
                <div>
                  <p className={styles.peakLabel}>Best Time</p>
                  <p className={styles.peakValue}>{data.platformInsights?.peakCollectionTime || 'N/A'}</p>
                </div>
              </div>
              <div className={styles.insightTipSuccess}>
                Schedule pickups during peak times for better coordination
              </div>
            </div>

            {/* Coverage & Growth */}
            <div className={styles.insightCard}>
              <h4><MapPin size={18} /> Coverage & Growth</h4>
              <div className={styles.coverageGrid}>
                <div>
                  <p className={styles.coverageLabel}>Active Areas</p>
                  <p className={styles.coverageValuePrimary}>{data.platformInsights?.barrangaysCovered || data.impact?.barrangaysCovered || 0}</p>
                </div>
                <div>
                  <p className={styles.coverageLabel}>Untapped</p>
                  <p className={styles.coverageValueSecondary}>{data.platformInsights?.untappedBarangays || 0} brgy</p>
                </div>
              </div>
              <p className={styles.topArea}>Top area: <strong>{data.platformInsights?.topBarangay || 'N/A'}</strong></p>
              <div className={styles.insightTipWarning}>
                Expand to {data.platformInsights?.untappedBarangays || 0} nearby barangays have givers waiting!
              </div>
            </div>
          </div>
        </div>

        {/* Impact Report */}
        <div className={styles.impactReportSection}>
          <h3 className={styles.impactReportTitle}>
            <Recycle size={20} /> Impact Report
            <span className={styles.shareableBadge}>SHAREABLE</span>
          </h3>
          <p className={styles.impactReportSubtitle}>Use these metrics for grant applications, reports & marketing</p>

          <div className={styles.impactReportGrid}>
            {[
              { value: `${(data.impact?.co2Saved || 0).toLocaleString()} kg`, label: 'CO₂ Prevented', icon: <Leaf size={24} /> },
              { value: data.impact?.treesEquivalent || 0, label: 'Trees Saved', icon: <Trees size={24} /> },
              { value: `${data.impact?.landfillDiverted || 0} tons`, label: 'Landfill Diverted', icon: <Recycle size={24} /> },
              { value: data.impact?.householdsServed || 0, label: 'Households Served', icon: <Home size={24} /> },
              { value: data.impact?.barrangaysCovered || 0, label: 'Barangays Covered', icon: <MapPin size={24} /> }
            ].map((metric, idx) => (
              <div key={idx} className={styles.impactMetricCard}>
                <div className={styles.impactMetricIcon}>{metric.icon}</div>
                <p className={styles.impactMetricValue}>{metric.value}</p>
                <p className={styles.impactMetricLabel}>{metric.label}</p>
              </div>
            ))}
          </div>

          <div className={styles.downloadSection}>
            <button 
              className={styles.downloadButton}
              onClick={handleDownloadReport}
              disabled={downloadingReport}
            >
              <Download size={18} />
              {downloadingReport ? 'Generating...' : 'Download Impact Report (PDF)'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading organization data...</p>
      </div>
    );
  }

  // Error state
  if (error && !organization) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={fetchOrganizationData} className={styles.retryButton}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Hidden file input for profile picture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif"
        onChange={handleProfilePictureChange}
        style={{ display: 'none' }}
      />

      {/* Organization Header */}
      <div className={styles.headerCard}>
        <div className={styles.headerContent}>
          <div className={styles.avatarSection}>
            <div className={styles.orgAvatar}>
              {organization?.profilePictureUrl ? (
                <img 
                  src={organization.profilePictureUrl} 
                  alt={organization.name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <Building2 size={48} />
              )}
            </div>
            <button 
              className={styles.cameraButton}
              onClick={handleProfilePictureClick}
              disabled={uploadingPicture}
              title="Change profile picture"
            >
              {uploadingPicture ? (
                <div className={styles.miniSpinner} />
              ) : (
                <Camera size={16} />
              )}
            </button>
          </div>
          
          <div className={styles.orgInfo}>
            <h1 className={styles.orgName}>{organization?.name}</h1>
            <p className={styles.orgDescription}>{organization?.description  || 'Welcome to our organization. Edit this description to tell others about your mission and goals.'}</p>
            <div className={styles.contactInfo}>
              <span><Mail size={14} /> {organization?.contactEmail}</span>
              {organization?.contactPhone && (
                <span><Phone size={14} /> {organization?.contactPhone}</span>
              )}
              {organization?.address && (
                <span><MapPin size={14} /> {organization?.address}</span>
              )}
            </div>
          </div>
          
          <button 
            className={styles.editButton}
            onClick={() => setShowEditModal(true)}
          >
            <Edit3 size={16} /> Edit Details
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabsCard}>
        <div className={styles.tabsNav}>
          {[
            { key: 'overview', icon: <Building2 size={18} />, label: 'Overview' },
            { key: 'members', icon: <Users size={18} />, label: 'Members' },
            { key: 'initiatives', icon: <Heart size={18} />, label: 'Initiatives' },
            { key: 'analytics', icon: <TrendingUp size={18} />, label: 'Analytics' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`${styles.tabButton} ${activeTab === tab.key ? styles.activeTab : ''}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className={styles.contentCard}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'members' && renderMembersTab()}
        {activeTab === 'initiatives' && renderInitiativesTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
      </div>

      {/* Edit Modal */}
      {showEditModal && ReactDOM.createPortal(
        <div className={styles.modalBackdrop} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Edit Organization</h2>
              <button onClick={() => setShowEditModal(false)} className={styles.closeButton}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Organization Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  className={styles.textarea}
                  rows={4}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Contact Email</label>
                <input
                  type="email"
                  value={editForm.contactEmail}
                  onChange={(e) => setEditForm({...editForm, contactEmail: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Contact Phone</label>
                <input
                  type="tel"
                  value={editForm.contactPhone}
                  onChange={(e) => setEditForm({...editForm, contactPhone: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.modalFooter}>
                <button type="submit" className={styles.saveButton}>Save Changes</button>
                <button type="button" onClick={() => setShowEditModal(false)} className={styles.cancelButton}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Member Modal */}
      {showMemberModal && selectedMember && ReactDOM.createPortal(
        <div className={styles.modalBackdrop} onClick={() => setShowMemberModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Member Details</h2>
              <button onClick={() => setShowMemberModal(false)} className={styles.closeButton}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.memberModalBody}>
              <div className={styles.memberModalHeader}>
                <div className={styles.memberModalAvatar}>
                  {selectedMember.profilePictureUrl ? (
                    <img src={selectedMember.profilePictureUrl} alt="" />
                  ) : (
                    `${selectedMember.firstName?.[0] || ''}${selectedMember.lastName?.[0] || ''}`
                  )}
                </div>
                <div>
                  <h3>{selectedMember.firstName} {selectedMember.lastName}</h3>
                  <span className={`${styles.roleTag} ${selectedMember.isOrgAdmin ? styles.adminRole : ''}`}>
                    {selectedMember.isOrgAdmin ? 'Organization Admin' : 'Member'}
                  </span>
                </div>
              </div>
              <div className={styles.memberModalInfo}>
                <p><strong>Email:</strong> {selectedMember.email}</p>
                {selectedMember.phone && <p><strong>Phone:</strong> {selectedMember.phone}</p>}
                {selectedMember.isCollector && <p><strong>Role:</strong> Collector</p>}
              </div>
            </div>
            <div className={styles.memberModalFooter}>
              <button 
                className={selectedMember.isOrgAdmin ? styles.demoteButton : styles.promoteButton}
                disabled={selectedMember.userID === currentUser?.userID}
              >
                {selectedMember.isOrgAdmin ? (
                  <><Shield size={16} /> Remove Admin Role</>
                ) : (
                  <><Crown size={16} /> Make Admin</>
                )}
              </button>
              <button 
                className={styles.removeButton}
                disabled={selectedMember.userID === currentUser?.userID}
              >
                Remove from Organization
              </button>
              <button 
                onClick={() => setShowMemberModal(false)} 
                className={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MyOrganization;