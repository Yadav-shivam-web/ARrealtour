const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    propertyId: {
      type: String,
      default: 'prop-mumbai'
    },
    propertyTitle: {
      type: String,
      default: 'Aura Bay Luxury Compact Studio'
    },
    userName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true
    },
    userEmail: {
      type: String,
      required: [true, 'Client email is required'],
      lowercase: true,
      trim: true
    },
    userPhone: {
      type: String,
      default: 'N/A',
      trim: true
    },
    tourType: {
      type: String,
      default: 'Guided 3D Virtual Tour'
    },
    preferredDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0]
    },
    notes: {
      type: String,
      default: 'Tour inquiry submitted via AR-REALTOUR portal.'
    },
    status: {
      type: String,
      enum: ['New', 'In Review', 'Contacted', 'Scheduled', 'Closed'],
      default: 'New'
    },
    assignedAgent: {
      type: String,
      default: 'Elena Rostova'
    },
    adminNote: {
      type: String,
      default: ''
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('Inquiry', inquirySchema);
