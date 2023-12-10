// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
	// Determine the file path based on the request URL
	const filePath = req.url === '/' ? 'index.html' : req.url.slice(1);

	// Resolve the absolute path of the file
	const absolutePath = path.resolve(__dirname, filePath);

	// Read the file asynchronously
	fs.readFile(absolutePath, (err, data) => {
		if (err) {
			// If the file is not found, send a 404 response
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('File not found');
		} else {
			// Set the appropriate content type based on the file extension
			const contentType = getContentType(filePath);
			res.writeHead(200, { 'Content-Type': contentType });

			// Send the file content to the client
			res.end(data);
		}
	});
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});

// Function to determine the content type based on the file extension
function getContentType(filePath) {
	const extname = path.extname(filePath).toLowerCase();
	switch (extname) {
		case '.html':
			return 'text/html';
		case '.css':
			return 'text/css';
		case '.js':
			return 'application/javascript';
		default:
			return 'text/plain';
	}
}
