const Datastore = require('nedb');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data');


const fs = require('fs');
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

const db = {
  users: new Datastore({ filename: path.join(dbPath, 'users.db'), autoload: true }),
  projects: new Datastore({ filename: path.join(dbPath, 'projects.db'), autoload: true }),
  tasks: new Datastore({ filename: path.join(dbPath, 'tasks.db'), autoload: true }),
  members: new Datastore({ filename: path.join(dbPath, 'members.db'), autoload: true }),
};


const find = (col, query) => new Promise((res, rej) =>
  db[col].find(query, (e, d) => e ? rej(e) : res(d)));

const findOne = (col, query) => new Promise((res, rej) =>
  db[col].findOne(query, (e, d) => e ? rej(e) : res(d)));

const insert = (col, doc) => new Promise((res, rej) =>
  db[col].insert(doc, (e, d) => e ? rej(e) : res(d)));

const update = (col, query, upd, opts = {}) => new Promise((res, rej) =>
  db[col].update(query, upd, opts, (e, n) => e ? rej(e) : res(n)));

const remove = (col, query, opts = {}) => new Promise((res, rej) =>
  db[col].remove(query, opts, (e, n) => e ? rej(e) : res(n)));


db.users.ensureIndex({ fieldName: 'email', unique: true });
db.members.ensureIndex({ fieldName: 'projectId' });
db.tasks.ensureIndex({ fieldName: 'projectId' });

module.exports = { db, find, findOne, insert, update, remove };
