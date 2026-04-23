require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/appdirect';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = require('./src/models/User');
    const Attribute = require('./src/models/Attribute');
    const ContentConfig = require('./src/models/ContentConfig');

    // Seed admin user
    const adminExists = await User.findOne({ email: 'admin@appdirect.com' });
    if (!adminExists) {
      await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@appdirect.com',
        password: 'admin123',
        role: 'admin',
      });
      console.log('✅ Admin user created (admin@appdirect.com / admin123)');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Seed default attributes
    const defaultAttributes = [
      { name: 'Category', description: 'Product category', displayOnHomepage: true, showForFiltering: true, requiredInProductEditor: true, options: ['CRM', 'Marketing', 'Analytics', 'Security', 'Productivity', 'Communication', 'Finance', 'HR'] },
      { name: 'Geography', description: 'Supported regions', displayOnHomepage: false, showForFiltering: true, requiredInProductEditor: false, options: ['USA', 'India', 'UK', 'Germany', 'Japan', 'Australia', 'Canada', 'Global'] },
      { name: 'Pricing Model', description: 'How the product is priced', displayOnHomepage: false, showForFiltering: true, requiredInProductEditor: false, options: ['Free', 'Freemium', 'Subscription', 'One-time', 'Usage-based'] },
      { name: 'Platform', description: 'Supported platforms', displayOnHomepage: false, showForFiltering: true, requiredInProductEditor: false, options: ['Web', 'iOS', 'Android', 'Windows', 'macOS', 'Linux'] },
    ];

    for (const attr of defaultAttributes) {
      const exists = await Attribute.findOne({ name: attr.name });
      if (!exists) {
        await Attribute.create(attr);
        console.log(`✅ Attribute "${attr.name}" created`);
      }
    }

    // Seed default contact form config
    const contactConfig = await ContentConfig.findOne({ type: 'contact_form' });
    if (!contactConfig) {
      await ContentConfig.create({
        type: 'contact_form',
        contactFields: [
          { fieldName: 'firstName', label: 'First Name', type: 'text', required: true, isDefault: true, order: 0 },
          { fieldName: 'lastName', label: 'Last Name', type: 'text', required: true, isDefault: true, order: 1 },
          { fieldName: 'email', label: 'Email', type: 'email', required: true, isDefault: true, order: 2 },
          { fieldName: 'phone', label: 'Phone', type: 'tel', required: false, isDefault: true, order: 3 },
          { fieldName: 'companyName', label: 'Company Name', type: 'text', required: false, isDefault: true, order: 4 },
          { fieldName: 'companySize', label: 'Company Size', type: 'select', required: false, isDefault: true, order: 5, options: ['1-10', '11-50', '51-200', '201-500', '500+'] },
          { fieldName: 'street', label: 'Street', type: 'text', required: false, isDefault: true, order: 6 },
          { fieldName: 'suite', label: 'Suite', type: 'text', required: false, isDefault: true, order: 7 },
          { fieldName: 'city', label: 'City', type: 'text', required: false, isDefault: true, order: 8 },
          { fieldName: 'state', label: 'State', type: 'text', required: false, isDefault: true, order: 9 },
          { fieldName: 'zipCode', label: 'Zip Code', type: 'text', required: false, isDefault: true, order: 10 },
          { fieldName: 'country', label: 'Country', type: 'text', required: false, isDefault: true, order: 11 },
          { fieldName: 'notes', label: 'Notes', type: 'textarea', required: false, isDefault: true, order: 12 },
        ],
      });
      console.log('✅ Contact form config created');
    }

    // Seed homepage config
    const homepageConfig = await ContentConfig.findOne({ type: 'homepage' });
    if (!homepageConfig) {
      await ContentConfig.create({
        type: 'homepage',
        heroImage: '',
        slidingImages: [],
        homepageCategories: [],
      });
      console.log('✅ Homepage config created');
    }

    console.log('\n🎉 Seed completed!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
