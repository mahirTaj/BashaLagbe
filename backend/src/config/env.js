import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/flat_rent_marketplace',
  jwtSecret: process.env.JWT_SECRET || 'change_this_super_secret',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  seedAdminEmail: process.env.SEED_SUPER_ADMIN_EMAIL || 'fardin@admin.com',
  seedAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD || 'Admin@12345',
};