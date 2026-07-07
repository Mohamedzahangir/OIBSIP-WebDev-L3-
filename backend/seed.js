const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Inventory = require('./models/Inventory');
const Pizza = require('./models/Pizza');

dotenv.config();

const bases = [
  { name: 'Thin Crust', type: 'base', stock: 100, price: 50, threshold: 20 },
  { name: 'Thick Crust', type: 'base', stock: 100, price: 60, threshold: 20 },
  { name: 'Cheese Burst', type: 'base', stock: 100, price: 90, threshold: 20 },
  { name: 'Gluten-Free', type: 'base', stock: 100, price: 80, threshold: 20 },
  { name: 'Flatbread', type: 'base', stock: 100, price: 40, threshold: 20 }
];

const sauces = [
  { name: 'Marinara', type: 'sauce', stock: 100, price: 20, threshold: 20 },
  { name: 'Spicy Tomato', type: 'sauce', stock: 100, price: 25, threshold: 20 },
  { name: 'Garlic Parmesan', type: 'sauce', stock: 100, price: 35, threshold: 20 },
  { name: 'Barbecue', type: 'sauce', stock: 100, price: 30, threshold: 20 },
  { name: 'Pesto', type: 'sauce', stock: 100, price: 40, threshold: 20 }
];

const cheeses = [
  { name: 'Mozzarella', type: 'cheese', stock: 100, price: 40, threshold: 20 },
  { name: 'Cheddar', type: 'cheese', stock: 100, price: 50, threshold: 20 },
  { name: 'Parmesan', type: 'cheese', stock: 100, price: 60, threshold: 20 },
  { name: 'Feta', type: 'cheese', stock: 100, price: 55, threshold: 20 },
  { name: 'Vegan Cheese', type: 'cheese', stock: 100, price: 70, threshold: 20 }
];

const vegetables = [
  { name: 'Tomatoes', type: 'vegetable', stock: 100, price: 15, threshold: 20 },
  { name: 'Onions', type: 'vegetable', stock: 100, price: 10, threshold: 20 },
  { name: 'Mushrooms', type: 'vegetable', stock: 100, price: 25, threshold: 20 },
  { name: 'Bell Peppers', type: 'vegetable', stock: 100, price: 20, threshold: 20 },
  { name: 'Olives', type: 'vegetable', stock: 100, price: 30, threshold: 20 },
  { name: 'Jalapenos', type: 'vegetable', stock: 100, price: 20, threshold: 20 }
];

const preMadePizzas = [
  {
    name: 'Margherita Pizza',
    description: 'Classic tomato sauce, mozzarella cheese, and tomatoes on a crispy thin crust.',
    basePrice: 200,
    image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=600&q=80',
    recipe: {
      base: 'Thin Crust',
      sauce: 'Marinara',
      cheese: 'Mozzarella',
      vegetables: ['Tomatoes']
    }
  },
  {
    name: 'Veggie Supreme',
    description: 'Rich barbecue sauce, cheddar cheese, and a mix of onions, bell peppers, olives, and jalapenos on a thick crust.',
    basePrice: 280,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    recipe: {
      base: 'Thick Crust',
      sauce: 'Barbecue',
      cheese: 'Cheddar',
      vegetables: ['Onions', 'Bell Peppers', 'Olives', 'Jalapenos']
    }
  },
  {
    name: 'Pesto Mushroom Pizza',
    description: 'Aromatic pesto sauce, creamy parmesan, sliced mushrooms, onions, and diced tomatoes on a gluten-free crust.',
    basePrice: 320,
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=600&q=80',
    recipe: {
      base: 'Gluten-Free',
      sauce: 'Pesto',
      cheese: 'Parmesan',
      vegetables: ['Mushrooms', 'Onions', 'Tomatoes']
    }
  }
];

async function seedDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pizza-app';
    console.log(`Connecting to database for seeding at: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Database connected successfully.');

    // 1. Clear existing database
    console.log('Clearing existing database collections...');
    await Inventory.deleteMany({});
    await Pizza.deleteMany({});

    // 2. Seed Inventory
    console.log('Seeding inventory items...');
    await Inventory.insertMany([...bases, ...sauces, ...cheeses, ...vegetables]);
    console.log('Inventory items successfully seeded.');

    // 3. Seed pre-made pizzas
    console.log('Seeding pre-made pizzas...');
    await Pizza.insertMany(preMadePizzas);
    console.log('Pre-made pizzas successfully seeded.');

    // 4. Seed Default Admin User if not already present
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pizza.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      console.log(`Seeding default admin user: ${adminEmail}`);
      const adminUser = new User({
        name: 'Master Chef Admin',
        email: adminEmail,
        password: 'AdminPassword123', // Will be hashed by pre-save schema middleware
        role: 'admin',
        isVerified: true
      });
      await adminUser.save();
      console.log('Default admin seeded successfully. Password is: AdminPassword123');
    } else {
      console.log('Admin account already exists.');
    }

    console.log('Database seeding process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDB();
