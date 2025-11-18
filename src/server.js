require('dotenv').config();
const express = require('express');
const supabase = require('./config/supabase');
const listenersRouter = require('./routes/listeners');
const logsRouter = require('./routes/logs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Nexus API Gateway',
    version: '1.0.0',
    endpoints: {
      listeners: '/api/v1/listeners',
      logs: '/api/v1/logs',
    },
  });
});

app.use('/api/v1/listeners', listenersRouter);
app.use('/api/v1/logs', logsRouter);

// Test endpoint to insert users
app.post('/api/v1/test/users', async (req, res) => {
  try {
    const { email, name } = req.body;

    const { data, error } = await supabase
      .from('users')
      .insert([{ email, name }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Test user created',
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Nexus Config API running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
});