const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { findOne, insert } = require('./database');
const { generateToken } = require('./middleware');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await findOne('users', { email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const user = await insert('users', {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hash,
      createdAt: new Date().toISOString(),
    });

    const { password: _, ...safeUser } = user;
    res.status(201).json({ user: safeUser, token: generateToken(user) });
  } catch (e) {
    if (e.errorType === 'uniqueViolated')
      return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await findOne('users', { email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token: generateToken(user) });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', require('./middleware').auth, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

module.exports = router;
