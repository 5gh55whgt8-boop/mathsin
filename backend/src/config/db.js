import mongoose from 'mongoose';
import { Resolver } from 'dns/promises';
import { env } from './env.js';

async function atlasUriWithPublicDns(uri) {
  if (!uri.startsWith('mongodb+srv://')) return uri;
  const parsed = new URL(uri);
  const resolver = new Resolver();
  // Some Indian ISPs/devices reject Atlas SRV queries through their default DNS.
  // Atlas hosts themselves remain reachable, so resolve SRV/TXT through Cloudflare
  // and pass the equivalent standard connection string to the Mongo driver.
  resolver.setServers(['1.1.1.1']);
  const [records, txtRecords] = await Promise.all([
    resolver.resolveSrv(`_mongodb._tcp.${parsed.hostname}`),
    resolver.resolveTxt(parsed.hostname).catch(() => [])
  ]);
  if (!records.length) throw new Error(`No MongoDB Atlas hosts found for ${parsed.hostname}`);
  const hosts = records.map(record => `${record.name.replace(/\.$/, '')}:${record.port}`).join(',');
  const txt = new URLSearchParams(txtRecords.flat().join('&'));
  for (const [key, value] of txt.entries()) if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
  parsed.searchParams.set('tls', 'true');
  return `mongodb://${parsed.username}:${parsed.password}@${hosts}${parsed.pathname}?${parsed.searchParams}`;
}

export async function connectDb() {
  if (!env.mongoUri) throw new Error('MONGODB_URI/MONGO_URI missing');
  mongoose.set('strictQuery', true);
  const uri = await atlasUriWithPublicDns(env.mongoUri);
  await mongoose.connect(uri, {
    maxPoolSize: env.poolMax,
    serverSelectionTimeoutMS: 15000
  });
  console.log(`[db] connected: ${mongoose.connection.name}`);
}
