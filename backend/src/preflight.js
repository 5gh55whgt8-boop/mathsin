import dns from 'dns/promises';
import { env } from './config/env.js';

console.log('MathLens AI — preflight');
console.log(`Node ${process.version}`);
console.log(`Mongo URI: ${env.mongoUri ? 'configured' : 'MISSING'}`);
console.log(`OpenAI key: ${env.openaiKey ? 'configured' : 'MISSING'}`);
console.log(`OpenAI OCR model: ${env.openaiModel}`);
console.log(`Gemini key: ${env.geminiKey ? 'configured' : 'MISSING'}`);
console.log(`Gemini fallback model: ${env.geminiModel}`);
try {
  const host = new URL(env.mongoUri.replace('mongodb+srv://','http://')).hostname;
  const records = await dns.resolveSrv(`_mongodb._tcp.${host}`);
  console.log(`Mongo SRV: ${records.length} records`);
} catch (e) {
  console.log(`Mongo SRV check skipped/failed: ${e.message}`);
}
