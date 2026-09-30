const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Property = require('../models/Property');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/properties
 * @desc    Get all properties with optional query filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category, location, minBeds, maxPrice, homeType, status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (homeType && homeType !== 'all') {
      filter.homeType = homeType;
    }
    if (minBeds) {
      filter.beds = { $gte: Number(minBeds) };
    }
    if (maxPrice) {
      filter.price = { ...(filter.price || {}), $lte: Number(maxPrice) };
    }
    if (location) {
      filter.$or = [
        { location: { $regex: location, $options: 'i' } },
        { title: { $regex: location, $options: 'i' } },
        { city: { $regex: location, $options: 'i' } },
        { address: { $regex: location, $options: 'i' } }
      ];
    }

    const properties = await Property.find(filter).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: properties.length,
      data: properties
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching properties list.'
    });
  }
});

/**
 * @route   GET /api/properties/:id
 * @desc    Get single property by ObjectId, customId, or modelId
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let property = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      property = await Property.findById(id);
    }

    if (!property) {
      property = await Property.findOne({
        $or: [
          { customId: id },
          { modelId: id }
        ]
      });
    }

    if (!property) {
      return res.status(404).json({
        success: false,
        message: `Property not found with ID '${id}'`
      });
    }

    // Increment views count asynchronously
    Property.findByIdAndUpdate(property._id, { $inc: { viewsCount: 1 } }).exec();

    return res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Error fetching property by id:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching property details.'
    });
  }
});

/**
 * @route   POST /api/properties
 * @desc    Create new property listing (Requires Admin JWT)
 * @access  Private/Admin
 */
router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      category,
      homeType,
      price,
      location,
      address,
      beds,
      baths,
      sqft,
      garages,
      yearBuilt,
      badge,
      arReady,
      modelId,
      modelUrl,
      status,
      image,
      gallery,
      description,
      amenities,
      agent
    } = req.body;

    if (!title || !price || !location) {
      return res.status(400).json({
        success: false,
        message: 'Title, price, and location are required fields.'
      });
    }

    // Format price if not supplied
    let formattedPrice = req.body.priceFormatted;
    if (!formattedPrice && price) {
      if (price >= 10000000) {
        formattedPrice = `₹${(price / 10000000).toFixed(2)} Cr`;
      } else if (price >= 100000) {
        formattedPrice = `₹${(price / 100000).toFixed(0)} Lakh`;
      } else {
        formattedPrice = `$${Number(price).toLocaleString()}`;
      }
    }

    const customId = 'prop-' + Date.now().toString(36);

    const newProperty = new Property({
      customId,
      title: title.trim(),
      category: category || 'villas',
      homeType: homeType || 'Small Home',
      price: Number(price),
      priceFormatted: formattedPrice,
      location: location.trim(),
      address: address || location.trim(),
      beds: Number(beds) || 1,
      baths: Number(baths) || 1,
      sqft: Number(sqft) || 500,
      garages: Number(garages) || 1,
      yearBuilt: Number(yearBuilt) || 2025,
      badge: badge || 'New 3D Listing',
      arReady: arReady !== undefined ? arReady : true,
      modelId: modelId || 'model-mumbai',
      modelUrl: modelUrl || `/models/${modelId || 'mumbai_bay_studio'}.glb`,
      status: status || 'Active',
      image: image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80',
      gallery: Array.isArray(gallery) && gallery.length > 0 ? gallery : [image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80'],
      description: description || 'High-end 3D architectural estate with interactive virtual walkthrough and WebXR AR visualization.',
      amenities: Array.isArray(amenities) && amenities.length > 0 ? amenities : ['3D Walkthrough', 'Smart Automation', 'Balcony'],
      agent: agent || {
        name: req.user.name || 'Elena Rostova',
        title: 'Senior Luxury Specialist',
        phone: req.user.phone || '+1 (310) 555-0194',
        email: req.user.email || 'elena@arrealtour.com',
        avatar: req.user.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80'
      }
    });

    await newProperty.save();

    return res.status(201).json({
      success: true,
      message: `Property "${newProperty.title}" created successfully!`,
      data: newProperty
    });
  } catch (error) {
    console.error('Error creating property:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating property.'
    });
  }
});

/**
 * @route   PUT /api/properties/:id
 * @desc    Update property (Requires Admin JWT)
 * @access  Private/Admin
 */
router.put('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let property = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      property = await Property.findById(id);
    }
    if (!property) {
      property = await Property.findOne({ customId: id });
    }

    if (!property) {
      return res.status(404).json({
        success: false,
        message: `Property with ID '${id}' not found.`
      });
    }

    // Recalculate price formatting if price changed
    if (req.body.price && (!req.body.priceFormatted || req.body.price !== property.price)) {
      const p = Number(req.body.price);
      if (p >= 10000000) {
        req.body.priceFormatted = `₹${(p / 10000000).toFixed(2)} Cr`;
      } else if (p >= 100000) {
        req.body.priceFormatted = `₹${(p / 100000).toFixed(0)} Lakh`;
      } else {
        req.body.priceFormatted = `$${p.toLocaleString()}`;
      }
    }

    Object.assign(property, req.body);
    await property.save();

    return res.json({
      success: true,
      message: `Property "${property.title}" updated successfully!`,
      data: property
    });
  } catch (error) {
    console.error('Error updating property:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating property.'
    });
  }
});

/**
 * @route   DELETE /api/properties/:id
 * @desc    Delete property (Requires Admin JWT)
 * @access  Private/Admin
 */
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let property = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      property = await Property.findByIdAndDelete(id);
    }
    if (!property) {
      property = await Property.findOneAndDelete({ customId: id });
    }

    if (!property) {
      return res.status(404).json({
        success: false,
        message: `Property with ID '${id}' not found.`
      });
    }

    return res.json({
      success: true,
      message: `Property "${property.title}" deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting property:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while deleting property.'
    });
  }
});

module.exports = router;
