const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

class StorageService {
  static async saveFile(file, subfolder = '') {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const fullPath = path.join(uploadsDir, subfolder);
      
      await fs.mkdir(fullPath, { recursive: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const filename = `${file.fieldname}-${timestamp}-${randomSuffix}${extension}`;
      
      const filePath = path.join(fullPath, filename);
      
      // Save file
      await fs.writeFile(filePath, file.buffer);
      
      // Return the full URL with server domain
      const baseUrl = process.env.CLIENT_URL?.replace('3000', '3001') || 'http://localhost:3001';
      const url = `${baseUrl}/uploads/${subfolder}/${filename}`.replace(/\\/g, '/');
      
      return {
        url,
        filename,
        path: filePath,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      console.error('Error saving file:', error);
      throw new Error(`Failed to save file: ${error.message}`);
    }
  }

  static async uploadProfilePicture(file, userID) {
    try {
      // Create profile pictures directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'profile-pictures', userID);
      await fs.mkdir(uploadsDir, { recursive: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const filename = `profilePicture-${timestamp}-${randomSuffix}${extension}`;
      
      const filePath = path.join(uploadsDir, filename);
      
      // Save file
      await fs.writeFile(filePath, file.buffer);
      
      // Return the full URL with server domain
      const baseUrl = process.env.CLIENT_URL?.replace('3000', '3001') || 'http://localhost:3001';
      const url = `${baseUrl}/uploads/profile-pictures/${userID}/${filename}`.replace(/\\/g, '/');
      
      return url;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw new Error(`Failed to upload profile picture: ${error.message}`);
    }
  }
}

// Configure multer with proper file size limits and validation
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {  
  // Check file type
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error('Invalid file type. Only images, PDF, and Word documents are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 10 * 1024 * 1024 // 10MB for form fields
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.',
          error: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files uploaded.',
          error: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field.',
          error: 'UNEXPECTED_FILE'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error.',
          error: error.code
        });
    }
  } else if (error && error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  next(error);
};

module.exports = {
  StorageService,
  upload,
  handleMulterError
};