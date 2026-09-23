import mongoose from 'mongoose';
import dns from 'node:dns';
import { execFileSync } from 'node:child_process';

function powershellJson(command) {
  const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15000,
  }).trim();
  return output ? JSON.parse(output) : [];
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function windowsSrvFallback(uri) {
  const match = uri.match(/^mongodb\+srv:\/\/([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/i);
  if (!match || process.platform !== 'win32') return null;
  const [, credentials, hostname, database = '/', query = ''] = match;
  if (!/^[a-z0-9.-]+$/i.test(hostname)) return null;
  const srvName = `_mongodb._tcp.${hostname}`;
  const records = asArray(powershellJson(`Resolve-DnsName -Type SRV '${srvName}' -ErrorAction Stop | Select-Object NameTarget,Port | ConvertTo-Json -Compress`));
  if (!records.length) return null;
  const hosts = records.map(record => `${String(record.NameTarget).replace(/\.$/, '')}:${record.Port}`).join(',');
  const options = new URLSearchParams(query.replace(/^\?/, ''));
  options.set('tls', 'true');
  try {
    const txt = asArray(powershellJson(`Resolve-DnsName -Type TXT '${hostname}' -ErrorAction Stop | Select-Object -ExpandProperty Strings | ConvertTo-Json -Compress`)).join('');
    for (const [key, value] of new URLSearchParams(txt)) if (!options.has(key)) options.set(key, value);
  } catch { /* Atlas TXT options are helpful but not required. */ }
  return `mongodb://${credentials}@${hosts}${database}?${options}`;
}

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  try {
    const dnsServers = process.env.DNS_SERVERS?.split(',').map(server => server.trim()).filter(Boolean);
    if (dnsServers?.length) dns.setServers(dnsServers);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('MongoDB connected');
  } catch (error) {
    const isSrvDnsFailure = uri?.startsWith('mongodb+srv://') && ['ETIMEOUT', 'ECONNREFUSED', 'ESERVFAIL'].includes(error.code);
    if (isSrvDnsFailure && process.platform === 'win32') {
      try {
        const fallbackUri = windowsSrvFallback(uri);
        if (fallbackUri) {
          console.warn('Node SRV lookup failed; retrying through the Windows DNS resolver.');
          await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 15000 });
          console.log('MongoDB connected');
          return;
        }
      } catch (fallbackError) {
        console.error('MongoDB Windows DNS fallback failed:', fallbackError.message);
      }
    }
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}
