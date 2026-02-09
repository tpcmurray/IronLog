const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  databaseUrl: process.env.DATABASE_URL || 'postgres://ironlog:ironlog@localhost:5432/ironlog',
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = config;
