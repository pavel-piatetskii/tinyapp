const bcrypt = require('bcrypt');
// ---------------- Database-objects and helper functions ------------ //

const urlDatabase = {
  'b2xVn2': { longURL: 'http://www.lighthouselabs.ca', userID: 'test', counter: 0, unique: { 'ip': 'time'} },
  '9sm5xK': { longURL: 'http://www.google.com', userID: 'test' },

  addURL(longURL, userID, db) {
    if (!db) db = this;

    if (db.findLongURL(longURL)) return false;

    const shortURL = generateRandomString(6);
    while (shortURL in db) shortURL = generateRandomString(6);

    db[shortURL] = { longURL, userID, counter: 0, unique: [] };
    return shortURL;
  },

  urlsForUser(id, db) {
    if (!db) db = this;
    const output = {};
    for (const url in db) {
      if (db[url].userID === id) output[url] = db[url].longURL;
    }
    return output;
  },

  findLongURL(longURL, db) {
    if (!db) db = this;
    for (shortURL in db) {
      if (db[shortURL].longURL === longURL) return shortURL;
    }
    return false;
  },

  changeURL(shortURL, newLongURL, id, db) {
    if (!db) db = this;
    if (db[shortURL].userID === id) {
      db[shortURL].longURL = newLongURL;
    }
  },

  deleteURL(shortURL, id, db) {
    if (!db) db = this;
    if (db[shortURL].userID === id) {
      delete db[shortURL];
    }
  },

  
};

const users = {

  'test': {id: 'test', email: 'a@b.c', password: '123'},

  addUser(input, db) {
    if (!db) db = this;
    const id = generateRandomString(6);
    while (id in db) id = generateRandomString(6);
  
    let { email, password } = input;
    password = bcrypt.hashSync(password, 10)
    db[id] = { id, email, password };
    return id;
  },
  
  findEmail(email, db) {
    if (!db) db = this;
    for (const user in db) {
      if (db[user].email === email) return db[user].id;
    }
    return undefined;
  },
  
  isUser(id, db) {
    if (!db) db = this;
    return (id in this) ? id : false;
  }
};

function generateRandomString(size) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let output = '';
  for (let i = 0; i < size; i++) {
    output += charset[Math.floor(Math.random() * charset.length)];
  }
  return output;
};

module.exports = {
  urlDatabase,
  users,
  addUser: users.addUser,
  findEmail: users.findEmail,

}