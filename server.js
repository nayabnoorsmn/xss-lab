const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory storage (resets on restart)
let comments = [];

// Get all comments - returns them as JSON; client will render with innerHTML (VULNERABLE)
app.get('/api/comments', (req, res) => {
  res.json(comments);
});

// Post a comment - stores raw input with NO sanitization (INTENTIONAL VULNERABILITY)
app.post('/api/comments', (req, res) => {
  const { name, message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  const comment = {
    id: Date.now(),
    name: name || 'Anonymous',
    message: message,          // <-- stored raw
    createdAt: new Date().toISOString()
  };
  comments.push(comment);
  res.json(comment);
});

// Convenience endpoint for lab reset
app.post('/api/reset', (req, res) => {
  comments = [];
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  XSS Lab running at http://localhost:${PORT}`);
  console.log(`  WARNING: Intentionally vulnerable. Local use only.\n`);
});