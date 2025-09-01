// storageService.js - Simple Local File Storage (No external service needed)
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class StorageService {
  constructor() {
    this.baseUploadPath = path.join(__dirname, '../uploads');
    this.ensureDirectoriesExist();
  }

  // Ensure upload directories exist
  async ensureDirectoriesExist() {
    const directories = [
      'uploads',
      'uploads/applications',
      'uploads/pickups',
      'uploads/badges',
      'uploads/profiles',
      'uploads/temp'
    ];

    for (const dir of directories) {
      const fullPath = path.join(__dirname, '../', dir);
      try {
        await fs.mkdir(fullPath, { recursive: true });
      } catch (error) {
        // Directory might already exist, that's fine
      }
    }
  }

  // Generate unique filename
  generateUniqueFilename(originalname) {
    const ext = path.extname(originalname);
    const name = path.basename(originalname, ext);
    const hash = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    
    return `${name}-${timestamp}-${hash}${ext}`;
  }

  // Save uploaded file to specific folder
  async saveFile(file, folder = 'uploads') {
    try {
      await this.ensureDirectoriesExist();
      
      const filename = this.generateUniqueFilename(file.originalname);
      const folderPath = path.join(this.baseUploadPath, folder);
      const filePath = path.join(folderPath, filename);
      
      // Ensure folder exists
      await fs.mkdir(folderPath, { recursive: true });
      
      // Move file from temp location to final location
      if (file.path) {
        // File is already saved by multer, just move it
        await fs.rename(file.path, filePath);
      } else if (file.buffer) {
        // File is in memory, write it to disk
        await fs.writeFile(filePath, file.buffer);
      } else {
        throw new Error('Invalid file object');
      }

      return {
        filename: filename,
        originalName: file.originalname,
        path: filePath,
        relativePath: path.join(folder, filename),
        url: `/uploads/${folder}/${filename}`, // URL for serving via Express
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Save file failed: ${error.message}`);
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(files, folder = 'uploads') {
    try {
      const uploadPromises = files.map(file => this.saveFile(file, folder));
      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new Error(`Multiple upload failed: ${error.message}`);
    }
  }

  // Upload application documents
  async uploadApplicationDocuments(files, applicationID) {
    const folder = `applications/${applicationID}`;
    const results = await this.uploadMultipleFiles(files, folder);
    return results.map(result => result.url); // Return array of URLs
  }

  // Upload proof of pickup
  async uploadProofOfPickup(file, pickupID) {
    const folder = `pickups/${pickupID}`;
    const result = await this.saveFile(file, folder);
    return result.url; // Return single URL
  }

  // Upload badge icons
  async uploadBadgeIcon(file, badgeID) {
    const folder = `badges`;
    const result = await this.saveFile(file, folder);
    return result.url;
  }

  // Upload profile pictures
  async uploadProfilePicture(file, userID) {
    const folder = `profiles`;
    const result = await this.saveFile(file, folder);
    return result.url;
  }

  // Delete file
  async deleteFile(relativePath) {
    try {
      const fullPath = path.join(this.baseUploadPath, relativePath);
      await fs.unlink(fullPath);
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      // File might not exist, that's okay
      return { success: true, message: 'File not found or already deleted' };
    }
  }

  // Delete multiple files
  async deleteMultipleFiles(relativePaths) {
    const results = await Promise.allSettled(
      relativePaths.map(path => this.deleteFile(path))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    return {
      success: true,
      deleted: successful,
      total: relativePaths.length
    };
  }

  // Get file information
  async getFileInfo(relativePath) {
    try {
      const fullPath = path.join(this.baseUploadPath, relativePath);
      const stats = await fs.stat(fullPath);
      
      return {
        exists: true,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        path: fullPath,
        relativePath: relativePath
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  // Clean up temporary files
  async cleanupTempFiles() {
    try {
      const tempDir = path.join(this.baseUploadPath, 'temp');
      const files = await fs.readdir(tempDir);
      
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < oneHourAgo) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      return { 
        success: true, 
        message: `Cleaned up ${deletedCount} temporary files` 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Get storage usage statistics
  async getStorageStats() {
    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        byFolder: {}
      };

      const calculateFolderStats = async (folderPath, folderName) => {
        try {
          const files = await fs.readdir(folderPath, { withFileTypes: true });
          let folderSize = 0;
          let fileCount = 0;

          for (const file of files) {
            if (file.isFile()) {
              const filePath = path.join(folderPath, file.name);
              const fileStats = await fs.stat(filePath);
              folderSize += fileStats.size;
              fileCount++;
            } else if (file.isDirectory()) {
              const subFolderStats = await calculateFolderStats(
                path.join(folderPath, file.name), 
                `${folderName}/${file.name}`
              );
              folderSize += subFolderStats.size;
              fileCount += subFolderStats.files;
            }
          }

          stats.byFolder[folderName] = {
            files: fileCount,
            size: folderSize,
            sizeFormatted: this.formatFileSize(folderSize)
          };

          return { size: folderSize, files: fileCount };
        } catch (error) {
          return { size: 0, files: 0 };
        }
      };

      const totalStats = await calculateFolderStats(this.baseUploadPath, 'uploads');
      stats.totalFiles = totalStats.files;
      stats.totalSize = totalStats.size;
      stats.totalSizeFormatted = this.formatFileSize(totalStats.size);

      return stats;
    } catch (error) {
      throw new Error(`Get storage stats failed: ${error.message}`);
    }
  }

  // Format file size in human readable format
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Validate file type
  isValidFileType(file, allowedTypes = []) {
    if (allowedTypes.length === 0) {
      // Default allowed types
      allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
    }
    
    return allowedTypes.includes(file.mimetype);
  }

  // Validate file size
  isValidFileSize(file, maxSizeMB = 10) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }
}

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../uploads/temp');
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files at once
  },
  fileFilter: (req, file, cb) => {
    const storageService = new StorageService();
    
    if (!storageService.isValidFileType(file)) {
      return cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
    
    if (!storageService.isValidFileSize(file)) {
      return cb(new Error('File too large. Maximum size is 10MB.'));
    }
    
    cb(null, true);
  }
});

// Express middleware to serve uploaded files
const serveUploads = (req, res, next) => {
  // Security: prevent path traversal attacks
  const safePath = path.normalize(req.path).replace(/^(\.\.[\/\\])+/, '');
  req.path = safePath;
  next();
};

module.exports = {
  StorageService: new StorageService(),
  upload,
  serveUploads
};