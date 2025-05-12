const axios = require('axios');
const fs = require('fs');
const inputFile = 'proxies.csv'; // Ganti dengan file input yang sesuai
const activeFile = 'active.txt';
const deadFile = 'dead.txt';

// Fungsi untuk memeriksa status proxy
async function checkProxy(proxy, port) {
  try {
    const response = await axios.get(`https://api2.stupidworld.web.id/check?ip=${proxy}:${port}`);
    const data = response.data;

    if (data.proxyip) {
      return { status: 'active', data };
    } else {
      return { status: 'dead', data };
    }
  } catch (error) {
    console.error(`Error checking proxy ${proxy}:${port} - ${error.message}`);
    return { status: 'dead', data: null };
  }
}

// Membaca file input dan memproses setiap baris
fs.readFile(inputFile, 'utf8', async (err, data) => {
  if (err) {
    console.error('Error reading input file:', err);
    return;
  }

  const proxies = data.split('\n').map(line => line.split(','));
  const activeProxies = [];
  const deadProxies = [];

  for (const [proxy, port, countryCode, isp] of proxies) {
    const result = await checkProxy(proxy.trim(), port.trim());
    const outputLine = `${proxy.trim()},${port.trim()},${countryCode.trim()},${isp.trim()}`;

    if (result.status === 'active') {
      activeProxies.push(outputLine);
    } else {
      deadProxies.push(outputLine);
    }
  }

  // Menyimpan hasil ke dalam file
  fs.writeFileSync(activeFile, activeProxies.join('\n'), 'utf8');
  fs.writeFileSync(deadFile, deadProxies.join('\n'), 'utf8');

  console.log(`Active proxies saved to ${activeFile}`);
  console.log(`Dead proxies saved to ${deadFile}`);
});
