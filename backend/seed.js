const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Property = require('./models/Property');
const Inquiry = require('./models/Inquiry');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arrealtour';

const defaultProperties = [
  {
    customId: 'prop-mumbai',
    title: 'Aura Bay Luxury Compact Studio',
    category: 'villas',
    homeType: 'Small Home',
    price: 18500000,
    priceFormatted: '₹1.85 Cr',
    location: 'Bandra West, Mumbai',
    city: 'Mumbai',
    address: 'Carter Road, Bandra West, Mumbai, Maharashtra 400050',
    beds: 1,
    baths: 2,
    sqft: 850,
    garages: 1,
    yearBuilt: 2024,
    badge: 'Small Home • 3D Interior',
    arReady: true,
    modelId: 'model-mumbai',
    modelUrl: '/models/mumbai_bay_studio.glb',
    status: 'Active',
    viewsCount: 3820,
    arToursCount: 1450,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&auto=format&fit=crop&q=80'
    ],
    description: 'Designer luxury sea-view compact home in Bandra West featuring open-plan Italian modular kitchen, customized living salon with velvet sofa, glass bedroom suite partition, and panoramic Arabian Sea balcony.',
    amenities: ['Sea View Balcony', 'Smart Home Automation', 'Modular Italian Kitchen', 'Custom Sofa Suite', 'Valet Parking', '24/7 Concierge'],
    agent: {
      name: 'Aarav Mehta',
      title: 'Mumbai Luxury Director',
      phone: '+91 98200 12345',
      email: 'aarav.mehta@arrealtour.in',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    customId: 'prop-pune',
    title: 'Gulmohar Green Compact Haven',
    category: 'villas',
    homeType: 'Small Home',
    price: 7800000,
    priceFormatted: '₹78 Lakh',
    location: 'Koregaon Park, Pune',
    city: 'Pune',
    address: 'Lane 5, Koregaon Park, Pune, Maharashtra 411001',
    beds: 2,
    baths: 2,
    sqft: 1150,
    garages: 1,
    yearBuilt: 2024,
    badge: 'Small Home • 3D Interior',
    arReady: true,
    modelId: 'model-pune',
    modelUrl: '/models/pune_green_haven.glb',
    status: 'Active',
    viewsCount: 2940,
    arToursCount: 1120,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1000&auto=format&fit=crop&q=80'
    ],
    description: 'Serene contemporary 2-BHK green bungalow in Pune featuring Scandinavian teakwood furniture, open dining lounge with 4-seater wooden table, master bedroom suite, and landscaped botanical balcony.',
    amenities: ['Private Green Garden', 'Solar Powered Roof', 'Teakwood Living Suite', '4-Seater Dining Area', 'EV Charging Station', 'Gated Security'],
    agent: {
      name: 'Priya Sharma',
      title: 'Pune Estates Head',
      phone: '+91 98900 54321',
      email: 'priya.sharma@arrealtour.in',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    customId: 'prop-delhi',
    title: 'Rajvilas Grand Imperial Manor',
    category: 'villas',
    homeType: 'Large Home',
    price: 145000000,
    priceFormatted: '₹14.50 Cr',
    location: 'Vasant Vihar, New Delhi',
    city: 'Delhi',
    address: 'Block C, Vasant Vihar, New Delhi, Delhi 110057',
    beds: 5,
    baths: 6,
    sqft: 8200,
    garages: 4,
    yearBuilt: 2025,
    badge: 'Large Home • 3D Interior',
    arReady: true,
    modelId: 'model-delhi',
    modelUrl: '/models/delhi_imperial_manor.glb',
    status: 'Active',
    viewsCount: 4610,
    arToursCount: 1980,
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1000&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&auto=format&fit=crop&q=80'
    ],
    description: 'Palatial 5-BHK luxury grand manor in South Delhi with double-height central glass atrium, Swarovski crystal chandelier, 8-seater royal dining hall, dual master suites with dressing rooms, and private swimming pool.',
    amenities: ['Private Swimming Pool', 'Double-Height Atrium', 'Crystal Chandelier', '8-Seater Royal Dining', 'Private Elevator', 'Landscaped Courtyard', 'Staff Quarters'],
    agent: {
      name: 'Vikram Malhotra',
      title: 'Delhi Prime Portfolio Partner',
      phone: '+91 98111 87654',
      email: 'vikram.malhotra@arrealtour.in',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    customId: 'prop-noida',
    title: 'The Palm Royal Duplex Penthouse',
    category: 'penthouses',
    homeType: 'Large Home',
    price: 59500000,
    priceFormatted: '₹5.95 Cr',
    location: 'Sector 128, Noida',
    city: 'Noida',
    address: 'Tower A, Sector 128, Noida-Greater Noida Expressway, Noida, UP 201304',
    beds: 4,
    baths: 5,
    sqft: 5600,
    garages: 3,
    yearBuilt: 2024,
    badge: 'Large Home • 3D Interior',
    arReady: true,
    modelId: 'model-noida',
    modelUrl: '/models/noida_palm_penthouse.glb',
    status: 'Active',
    viewsCount: 3410,
    arToursCount: 1340,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80'
    ],
    description: 'Magnificent 4-BHK duplex sky penthouse overlooking the Golf Course with cantilevered glass walls, floating interior wooden staircase, high-ceiling salon lounge, and private rooftop sky deck with heated Jacuzzi.',
    amenities: ['Golf Course View', 'Private Sky Jacuzzi', 'Floating Interior Staircase', 'Double-Height Salon', 'High-Speed Private Lift', 'Clubhouse Access'],
    agent: {
      name: 'Ananya Sen',
      title: 'NCR Luxury Specialist',
      phone: '+91 98180 99887',
      email: 'ananya.sen@arrealtour.in',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80'
    }
  }
];

const defaultInquiries = [
  {
    propertyId: 'prop-mumbai',
    propertyTitle: 'Aura Bay Luxury Compact Studio',
    userName: 'Alex Rivera',
    userEmail: 'alex.rivera@globalinvest.com',
    userPhone: '+1 (415) 555-8901',
    tourType: 'Guided 3D Virtual Tour',
    preferredDate: '2026-10-15',
    notes: 'Interested in inspecting the cantilevered master suite and daylight angles for afternoon sun.',
    status: 'Scheduled',
    assignedAgent: 'Aarav Mehta'
  },
  {
    propertyId: 'prop-pune',
    propertyTitle: 'Gulmohar Green Compact Haven',
    userName: 'Jonathan Sterling',
    userEmail: 'j.sterling@sterlingarch.co',
    userPhone: '+44 20 7946 0912',
    tourType: 'WebXR / AR Walkthrough',
    preferredDate: '2026-10-18',
    notes: 'Requesting spatial AR scale test on tabletop to present to our investment board.',
    status: 'In Review',
    assignedAgent: 'Priya Sharma'
  },
  {
    propertyId: 'prop-delhi',
    propertyTitle: 'Rajvilas Grand Imperial Manor',
    userName: 'Clara Delacroix',
    userEmail: 'clara.delacroix@monacofund.mc',
    userPhone: '+377 98 98 00 00',
    tourType: 'Private In-Person Viewing',
    preferredDate: '2026-10-22',
    notes: 'Arranging chauffeur transport from airport for property inspection.',
    status: 'Contacted',
    assignedAgent: 'Vikram Malhotra'
  },
  {
    propertyId: 'prop-noida',
    propertyTitle: 'The Palm Royal Duplex Penthouse',
    userName: 'David K. Vance',
    userEmail: 'david.vance@horizoncap.com',
    userPhone: '+1 (305) 555-7721',
    tourType: 'Guided 3D Virtual Tour',
    preferredDate: '2026-10-12',
    notes: 'Need confirmation on golf course view orientation and elevator access.',
    status: 'New',
    assignedAgent: 'Ananya Sen'
  }
];

async function createUserIfMissing(userData) {
  const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
  if (existingUser) return existingUser;

  const user = new User(userData);
  await user.save();
  return user;
}

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB database: arrealtour\n');

    // 1. Create demo users only when they do not already exist.
    console.log('Seeding Users...');
    
    // Admin User
    const adminUser = await createUserIfMissing({
      name: 'System Administrator',
      email: 'admin@arrealtour.com',
      password: 'adminpassword123', // Will be hashed by pre-save hook
      role: 'admin',
      roleLabel: 'Platform Super Admin',
      phone: '+1 (800) 555-0100',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=80',
      status: 'Active',
      toursViewed: 240,
      arSessions: 110,
      inquiriesCount: 0
    });

    // Normal / VIP User
    const vipUser = await createUserIfMissing({
      name: 'Alex Rivera',
      email: 'alex.rivera@globalinvest.com',
      password: 'userpassword123', // Will be hashed by pre-save hook
      role: 'user',
      roleLabel: 'VIP Buyer / Investor',
      phone: '+1 (415) 555-8901',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      status: 'Active',
      toursViewed: 14,
      arSessions: 6,
      inquiriesCount: 2
    });

    // Additional Member User
    const memberUser = await createUserIfMissing({
      name: 'Jonathan Sterling',
      email: 'j.sterling@sterlingarch.co',
      password: 'userpassword123',
      role: 'user',
      roleLabel: 'Architectural Client',
      phone: '+44 20 7946 0912',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      status: 'Active',
      toursViewed: 8,
      arSessions: 4,
      inquiriesCount: 1
    });

    console.log(` Created 3 users:`);
    console.log(`   - Admin: ${adminUser.email} (Password: adminpassword123)`);
    console.log(`   - VIP User: ${vipUser.email} (Password: userpassword123)`);
    console.log(`   - Member: ${memberUser.email} (Password: userpassword123)\n`);

    // 2. Add missing demo properties without replacing user-managed records.
    console.log('Seeding Properties...');
    const existingPropertyIds = new Set(await Property.distinct('customId', {
      customId: { $in: defaultProperties.map(property => property.customId) }
    }));
    const propertiesToInsert = defaultProperties.filter(property => !existingPropertyIds.has(property.customId));
    const insertedProperties = propertiesToInsert.length ? await Property.insertMany(propertiesToInsert) : [];
    console.log(` Added ${insertedProperties.length} missing properties.\n`);
    insertedProperties.forEach(p => {
      console.log(`   - [${p.customId}] ${p.title} (${p.location}) - ${p.priceFormatted}`);
    });
    console.log('');

    // 3. Add missing demo inquiries without clearing submitted inquiries.
    console.log('Seeding Inquiries...');
    const inquiriesWithUser = defaultInquiries.map((inq, idx) => {
      if (inq.userEmail === vipUser.email) inq.userId = vipUser._id;
      if (inq.userEmail === memberUser.email) inq.userId = memberUser._id;
      return inq;
    });
    const inquiryKey = inquiry => `${inquiry.propertyId}|${inquiry.userEmail.toLowerCase()}|${inquiry.preferredDate}`;
    const existingInquiries = await Inquiry.find({
      $or: inquiriesWithUser.map(({ propertyId, userEmail, preferredDate }) => ({
        propertyId,
        userEmail: userEmail.toLowerCase(),
        preferredDate
      }))
    }).select('propertyId userEmail preferredDate').lean();
    const existingInquiryKeys = new Set(existingInquiries.map(inquiryKey));
    const inquiriesToInsert = inquiriesWithUser.filter(inquiry => !existingInquiryKeys.has(inquiryKey(inquiry)));
    const insertedInquiries = inquiriesToInsert.length ? await Inquiry.insertMany(inquiriesToInsert) : [];
    console.log(` Added ${insertedInquiries.length} missing inquiries.\n`);

    console.log('====================================================');
    console.log(' LOCAL MONGODB SEED COMPLETED SUCCESSFULLY!');
    console.log(' Database: arrealtour');
    console.log(' Collections: users, properties, inquiries');
    console.log('====================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
}

seedDatabase();
