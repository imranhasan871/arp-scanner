// server.js

const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/scan', async (req, res) => {
	try {
		const devices = await performArpScan();
		res.json(devices);
	} catch (error) {
		console.error('Error performing ARP scan:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.get('/traceroute/:destination', async (req, res) => {
	const { destination } = req.params;
	try {
		const tracerouteData = await performTraceroute(destination);
		res.json(tracerouteData);
	} catch (error) {
		console.error(`Error performing traceroute for ${destination}:`, error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

function performArpScan() {
	return new Promise((resolve, reject) => {
		const command = 'arp -a';
		exec(command, (err, stdout) => {
			if (err) {
				reject(err);
			} else {
				const devices = parseArpOutput(stdout);
				resolve(devices);
			}
		});
	});
}

function parseArpOutput(output) {
	const lines = output.split('\n');
	const devicesByInterface = {};

	let currentInterface = null;

	for (const line of lines) {
		const interfaceMatch = line.match(/Interface: (.+)/);
		if (interfaceMatch) {
			currentInterface = interfaceMatch[1].trim();
			devicesByInterface[currentInterface] =
				devicesByInterface[currentInterface] || [];
		} else {
			const deviceMatch = line.match(
				/(?:\d{1,3}\.){3}\d{1,3}\s+([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/,
			);
			if (deviceMatch && currentInterface) {
				const [_, mac] = deviceMatch[0].split(/\s+/);
				const ipMatch = line.match(/(?:\d{1,3}\.){3}\d{1,3}/);
				const ip = ipMatch ? ipMatch[0] : '';

				// Filter out multicast and broadcast addresses
				if (!isMulticastOrBroadcast(ip)) {
					devicesByInterface[currentInterface].push({ ip, mac });
				}
			}
		}
	}

	return devicesByInterface;
}

function isMulticastOrBroadcast(ip) {
	// Define the multicast and broadcast IP address ranges
	const multicastRanges = [
		'224.0.0.0/4',
		'224.0.0.0/8',
		'224.0.0.0/12',
		'224.0.0.0/24',
		'224.0.0.0/28',
		'224.0.0.0/32',
	];

	const broadcastAddresses = ['255.255.255.255'];

	// Check if the IP address falls within the multicast or broadcast ranges
	return (
		multicastRanges.some((range) => ipInRange(ip, range)) ||
		broadcastAddresses.includes(ip)
	);
}

function ipInRange(ip, range) {
	const [subnet, mask] = range.split('/');
	const ipParts = ip.split('.').map(Number);
	const subnetParts = subnet.split('.').map(Number);
	const maskBinary = '1'.repeat(Number(mask)) + '0'.repeat(32 - Number(mask));
	const subnetBinary = subnetParts
		.map((part) => part.toString(2).padStart(8, '0'))
		.join('');
	const ipBinary = ipParts
		.map((part) => part.toString(2).padStart(8, '0'))
		.join('');

	return (
		(parseInt(ipBinary, 2) & parseInt(maskBinary, 2)) ===
		(parseInt(subnetBinary, 2) & parseInt(maskBinary, 2))
	);
}

function performTraceroute(destination) {
	return new Promise((resolve, reject) => {
		const command = `tracert ${destination}`;
		exec(command, (err, stdout) => {
			if (err) {
				reject(err);
			} else {
				const tracerouteData = parseTracerouteOutput(stdout);
				resolve(tracerouteData);
			}
		});
	});
}

function parseTracerouteOutput(output) {
	const lines = output.split('\n');
	const hopData = [];

	for (const line of lines) {
		const match = line.match(/\d+\s+(.+)/);
		if (match) {
			hopData.push(match[1].trim());
		}
	}

	return hopData;
}

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
