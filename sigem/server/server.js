const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Setup storage directory
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename: timestamp-originalName
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

const upload = multer({ storage: storage });

// Upload Endpoint
app.post('/api/upload', upload.single('documento'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  // Return the path relative to the server so frontend can store it
  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    filepath: `/uploads/${req.file.filename}`,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// Delete Endpoint
app.delete('/api/files/:filename', (req, res) => {
  const filename = req.params.filename;
  // Basic security check to prevent directory traversal
  if (filename.includes('..') || filename.includes('/')) {
     return res.status(400).json({ error: 'Invalid filename.' });
  }

  const filePath = path.join(UPLOADS_DIR, filename);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      res.json({ message: 'File deleted successfully' });
    } catch (err) {
      console.error("Error deleting file:", err);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  } else {
    // If the file is already gone, we can just say success so the DB can clean up
    res.json({ message: 'File not found, skipping.' });
  }
});

app.listen(port, () => {
  console.log(`SIGEM Backend Server listening at http://localhost:${port}`);
});
