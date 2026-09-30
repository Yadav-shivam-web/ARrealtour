const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Inquiry = require('../models/Inquiry');
const { authenticateUser, requireAdmin, optionalAuth } = require('../middleware/auth');

/**
 * @route   GET /api/inquiries
 * @desc    Get inquiries list (Admin gets all, User gets own)
 * @access  Private / Public with email query
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { email, status } = req.query;
    let filter = {};

    if (req.user) {
      if (req.user.role === 'admin') {
        // Admin gets all inquiries (can filter by status or email)
        if (status) filter.status = status;
        if (email) filter.userEmail = email.toLowerCase().trim();
      } else {
        // Normal user only gets their own inquiries
        filter.$or = [
          { userId: req.user._id },
          { userEmail: req.user.email.toLowerCase() }
        ];
      }
    } else if (email) {
      // Unauthenticated query by client email
      filter.userEmail = email.toLowerCase().trim();
    } else {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    const inquiries = await Inquiry.find(filter).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: inquiries.length,
      data: inquiries
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching inquiries.'
    });
  }
});

/**
 * @route   POST /api/inquiries
 * @desc    Submit a new tour booking / inquiry
 * @access  Public / User
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      propertyId,
      propertyTitle,
      userName,
      userEmail,
      userPhone,
      tourType,
      preferredDate,
      notes,
      assignedAgent
    } = req.body;

    const name = userName || (req.user ? req.user.name : null);
    const email = userEmail || (req.user ? req.user.email : null);

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required to submit an inquiry.'
      });
    }

    const newInquiry = new Inquiry({
      propertyId: propertyId || 'prop-mumbai',
      propertyTitle: propertyTitle || 'Aura Bay Luxury Compact Studio',
      userName: name.trim(),
      userEmail: email.toLowerCase().trim(),
      userPhone: userPhone || (req.user ? req.user.phone : 'N/A'),
      tourType: tourType || 'Guided 3D Virtual Tour',
      preferredDate: preferredDate || new Date().toISOString().split('T')[0],
      notes: notes || 'Client submitted tour request via AR-REALTOUR.',
      assignedAgent: assignedAgent || 'Elena Rostova',
      status: 'New',
      userId: req.user ? req.user._id : null
    });

    await newInquiry.save();

    return res.status(201).json({
      success: true,
      message: 'Your VIP Tour inquiry has been booked successfully!',
      data: newInquiry
    });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating inquiry.'
    });
  }
});

/**
 * @route   PUT /api/inquiries/:id
 * @desc    Update inquiry status or admin notes (Requires Admin JWT)
 * @access  Private/Admin
 */
router.put('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote, assignedAgent } = req.body;

    let inquiry = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      inquiry = await Inquiry.findById(id);
    }

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found.'
      });
    }

    if (status) inquiry.status = status;
    if (adminNote !== undefined) inquiry.adminNote = adminNote;
    if (assignedAgent) inquiry.assignedAgent = assignedAgent;

    await inquiry.save();

    return res.json({
      success: true,
      message: `Inquiry status updated to "${inquiry.status}".`,
      data: inquiry
    });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating inquiry.'
    });
  }
});

/**
 * @route   DELETE /api/inquiries/:id
 * @desc    Delete inquiry record (Requires Admin JWT)
 * @access  Private/Admin
 */
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    let inquiry = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      inquiry = await Inquiry.findByIdAndDelete(id);
    }

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Inquiry record deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while deleting inquiry.'
    });
  }
});

module.exports = router;
