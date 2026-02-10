const express = require('express');
const cors = require('cors');
const { errorHandler } = require('../../middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/exercises', require('../../routes/exercises'));
app.use('/api/program', require('../../routes/programs'));
app.use('/api/workouts', require('../../routes/workouts'));
app.use('/api/sets', require('../../routes/sets'));

app.use(errorHandler);

module.exports = app;
