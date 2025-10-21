// routes/materialRoutes.js
const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const { verifyToken } = require('../middleware/auth');

// Public route - get all materials
router.get('/', async (req, res) => {
  try {
    const materials = await Material.getAllMaterials();
    
    // Sort by category and type
    materials.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.type.localeCompare(b.type);
    });
    
    res.json({
      success: true,
      materials
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch materials'
    });
  }
});

// Get single material by ID
router.get('/:materialID', async (req, res) => {
  try {
    const material = await Material.findById(req.params.materialID);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }
    
    res.json({
      success: true,
      material
    });
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch material'
    });
  }
});

// Admin only - create new material
router.post('/', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const material = await Material.create(req.body);
    
    res.status(201).json({
      success: true,
      material,
      message: 'Material created successfully'
    });
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin only - update material
router.put('/:materialID', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const material = await Material.findById(req.params.materialID);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }
    
    await material.update(req.body);
    
    res.json({
      success: true,
      material,
      message: 'Material updated successfully'
    });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;