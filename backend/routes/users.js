const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/users
 * @desc    Get all users list (Requires Admin JWT)
 * @access  Private/Admin
 */
router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching users list.'
    });
  }
});

/**
 * @route   POST /api/users
 * @desc    Create a user account by Admin (Can assign role)
 * @access  Private/Admin
 */
router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, roleLabel, phone, avatar } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const defaultRoleLabels = {
      admin: 'Platform Super Admin',
      user: 'VIP Buyer / Investor'
    };

    const assignedRole = role === 'admin' ? 'admin' : 'user';

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: password || 'arrealtour123',
      role: assignedRole,
      roleLabel: roleLabel || defaultRoleLabels[assignedRole],
      phone: phone || '+1 (555) 000-1234',
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      status: 'Active'
    });

    await newUser.save();

    const userObj = newUser.toJSON();

    return res.status(201).json({
      success: true,
      message: `User account created for ${newUser.name}.`,
      data: userObj
    });
  } catch (error) {
    console.error('Error creating user by admin:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating user.'
    });
  }
});

/**
 * @route   PUT /api/users/:id/status
 * @desc    Toggle or update user status (Requires Admin JWT)
 * @access  Private/Admin
 */
router.put('/:id/status', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Toggle if status not provided in body
    if (status) {
      user.status = status;
    } else {
      user.status = user.status === 'Active' ? 'Suspended' : 'Active';
    }

    await user.save();

    return res.json({
      success: true,
      message: `User status changed to ${user.status}.`,
      data: user
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating user status.'
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user account (Requires Admin JWT)
 * @access  Private/Admin
 */
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    // Protect against self-deletion
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own logged-in admin account.'
      });
    }

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: `User ${deleted.name} deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while deleting user.'
    });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update current logged-in user profile
 * @access  Private
 */
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (avatar) user.avatar = avatar;

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      data: user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating profile.'
    });
  }
});

module.exports = router;
