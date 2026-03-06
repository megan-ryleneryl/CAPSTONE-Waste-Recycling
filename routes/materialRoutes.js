// routes/materialRoutes.js
const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const { verifyToken } = require('../middleware/auth');

// Public route - get all materials (includes pricing info)
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

    // Attach computed pricing info to each material
    const materialsWithPricing = materials.map(m => ({
      ...m.toFirestore(),
      pricing: m.getPricingInfo()
    }));
    
    res.json({
      success: true,
      materials: materialsWithPricing
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch materials'
    });
  }
});

// Public route - get pricing summary for all materials
// Used by the Material Prices info page
router.get('/pricing/summary', async (req, res) => {
  try {
    const materials = await Material.getAllMaterials();

    // Group by category
    const categories = {};
    materials.forEach(m => {
      if (!categories[m.category]) {
        categories[m.category] = [];
      }
      categories[m.category].push({
        materialID: m.materialID,
        type: m.type,
        displayName: m.displayName || m.type,
        averagePricePerKg: m.averagePricePerKg,
        standardMarketPrice: m.standardMarketPrice || 0,
        maxPricePerKg: m.maxPricePerKg,
        displayPrice: parseFloat(m.getDisplayPrice(180).toFixed(2)),
        marketAverage: m.getMarketAverage(180) !== null ? parseFloat(m.getMarketAverage(180).toFixed(2)) : null,
        trend: m.getPriceTrend(),
        changePercent: parseFloat(m.getPriceChangePercentage(180).toFixed(2))
      });
    });

    // Sort materials within each category by displayName
    Object.keys(categories).forEach(cat => {
      categories[cat].sort((a, b) => a.displayName.localeCompare(b.displayName));
    });

    res.json({
      success: true,
      categories,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pricing summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing summary'
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
      material: {
        ...material.toFirestore(),
        pricing: material.getPricingInfo()
      }
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

// Admin only - update material price with cap enforcement
router.put('/:materialID/price', verifyToken, async (req, res) => {
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

    const { price } = req.body;
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }

    await material.updatePrice(price);

    res.json({
      success: true,
      material: {
        ...material.toFirestore(),
        pricing: material.getPricingInfo()
      },
      message: 'Price updated successfully'
    });
  } catch (error) {
    console.error('Error updating material price:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;