const express = require('express');
const cors = require('cors');
const config = require('./config');
const migrate = require('./db/migrate');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/program', require('./routes/programs'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/sets', require('./routes/sets'));

// Error handler (must be last)
app.use(errorHandler);

// Start server
async function start() {
  try {
    await migrate();
    app.listen(config.port, () => {
      console.log(`IronLog API listening on port ${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
