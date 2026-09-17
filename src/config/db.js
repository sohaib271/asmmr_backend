import mongoose from 'mongoose';
import dns from 'node:dns';

export async function connectDatabase() {
  try {
    const dnsServers = process.env.DNS_SERVERS?.split(',').map(server => server.trim()).filter(Boolean);
    if (dnsServers?.length) dns.setServers(dnsServers);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}
