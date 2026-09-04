import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  if (!env.mongoUri) throw new Error('MONGODB_URI/MONGO_URI missing');
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    maxPoolSize: env.poolMax,
    serverSelectionTimeoutMS: 15000
  });
  console.log(`[db] connected: ${mongoose.connection.name}`);
}
