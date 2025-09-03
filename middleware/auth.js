const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.userType !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const requireVerified = (req, res, next) => {
  if (req.user.status !== 'Verified') {
    return res.status(403).json({ message: 'Account verification required' });
  }
  next();
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireVerified
};