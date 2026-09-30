const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      index: true,
      sparse: true
    },
    title: {
      type: String,
      required: [true, 'Please provide property title'],
      trim: true
    },
    category: {
      type: String,
      default: 'villas',
      trim: true
    },
    homeType: {
      type: String,
      default: 'Luxury Home',
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Please provide property price'],
      min: 0
    },
    priceFormatted: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Please provide property location'],
      trim: true
    },
    city: {
      type: String,
      default: '',
      trim: true
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    beds: {
      type: Number,
      default: 1,
      min: 0
    },
    baths: {
      type: Number,
      default: 1,
      min: 0
    },
    sqft: {
      type: Number,
      default: 500,
      min: 0
    },
    garages: {
      type: Number,
      default: 1,
      min: 0
    },
    yearBuilt: {
      type: Number,
      default: 2025
    },
    badge: {
      type: String,
      default: '3D Listing'
    },
    arReady: {
      type: Boolean,
      default: true
    },
    modelId: {
      type: String,
      default: 'model-mumbai'
    },
    modelUrl: {
      type: String,
      default: '/models/mumbai_bay_studio.glb'
    },
    status: {
      type: String,
      enum: ['Active', 'Pending', 'Sold', 'Draft'],
      default: 'Active'
    },
    viewsCount: {
      type: Number,
      default: 0
    },
    arToursCount: {
      type: Number,
      default: 0
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80'
    },
    gallery: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      default: ''
    },
    amenities: {
      type: [String],
      default: []
    },
    agent: {
      name: { type: String, default: 'Elena Rostova' },
      title: { type: String, default: 'Luxury Real Estate Specialist' },
      phone: { type: String, default: '+1 (310) 555-0194' },
      email: { type: String, default: 'elena@arrealtour.com' },
      avatar: { type: String, default: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80' }
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || (ret._id ? ret._id.toString() : ret.id);
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || (ret._id ? ret._id.toString() : ret.id);
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Auto-format price if not provided
propertySchema.pre('save', function (next) {
  if (this.price && !this.priceFormatted) {
    if (this.price >= 10000000) {
      this.priceFormatted = `₹${(this.price / 10000000).toFixed(2)} Cr`;
    } else if (this.price >= 100000) {
      this.priceFormatted = `₹${(this.price / 100000).toFixed(0)} Lakh`;
    } else {
      this.priceFormatted = `$${this.price.toLocaleString()}`;
    }
  }
  next();
});

module.exports = mongoose.model('Property', propertySchema);
