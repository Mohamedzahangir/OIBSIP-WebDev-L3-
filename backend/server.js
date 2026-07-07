const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-user-room', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined user room: ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pizza-app';
mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');

    const Inventory = require('./models/Inventory');
    const count = await Inventory.countDocuments();
    if (count === 0) {
      console.log('Database appears empty. Auto-seeding initial pizza ingredients and default configurations...');
      const { exec } = require('child_process');
      exec('node seed.js', (err, stdout, stderr) => {
        if (err) {
          console.error('Auto-seeding failed:', err);
        } else {
          console.log('Auto-seeding complete:', stdout);
        }
      });
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

const { initCron } = require('./utils/cron');
const { initEmailTransporter } = require('./utils/email');
initCron();
initEmailTransporter();

const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const orderRoutes = require('./routes/orders');
const Pizza = require('./models/Pizza');

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/pizzas', async (req, res) => {
  try {
    const pizzas = await Pizza.find({});
    res.json(pizzas);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving pre-made pizzas', error: error.message });
  }
});

const path = require('path');
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
