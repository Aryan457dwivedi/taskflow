const jwt = require('jsonwebtoken');
const { findOne } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_2024_change_in_prod';

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findOne('users', { _id: decoded.id });
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Check if user is admin of a project
const projectAdmin = async (req, res, next) => {
  const { find } = require('./database');
  const projectId = req.params.projectId || req.body.projectId;
  const members = await find('members', { projectId, userId: req.user._id });
  if (!members.length || members[0].role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.membership = members[0];
  next();
};

const generateToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

module.exports = { auth, projectAdmin, generateToken, JWT_SECRET };
