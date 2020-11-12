const express = require('express');
const app = express();
const PORT = 8080; // default port 8080

app.set('view engine', 'ejs');

// ---------------- Database-objects and helper functions ------------ //

const urlDatabase = {
  'b2xVn2': { longURL: 'http://www.lighthouselabs.ca', userID: 'test' },
  '9sm5xK': { longURL: 'http://www.google.com', userID: 'test' },

  addURL(longURL, userID) {
    const shortURL = generateRandomString(6);
    while (shortURL in this) shortURL = generateRandomString(6);

    this[shortURL] = { longURL, userID };
    return shortURL;
  },

  urlsForUser(id) {
    const output = {};
    for (const url in this) {
      if (this[url].userID === id) output[url] = this[url].longURL;
    }
    return output;
  },

  changeURL(shortURL, newLongURL, id) {
    if (this[shortURL].userID === id) {
      this[shortURL].longURL = newLongURL;
    }
  },

  deleteURL(shortURL, id) {
    if (this[shortURL].userID === id) {
      delete this[shortURL];
    }
  },
};

const users = {

  'test': {id: 'test', email: 'a@b.c', password: '123'},

  addUser(input) {
    const id = generateRandomString(6);
    while (id in this) id = generateRandomString(6);

    const { email, password } = input;
    this[id] = { id, email, password };
    return id;
  },

  findEmail(email) {
    for (const user in this) {
      if (users[user].email === email) return users[user].id;
    }
    return false;
  },

  isLogIn(id) {                           // Check if a user has logged in
    return (id in this) ? true : false;
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

// ----------------------- MIDDLEWARE ADDITIION ---------------------- //

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

const morgan = require('morgan');
app.use(morgan('dev'));

const cookie = require('cookie-parser');
app.use(cookie());

// -------------------------- ROUTE HANDLERS -------------------------- //

// --------- GET Handlers

app.get('/', (req, res) => {                        // '/'
  res.send('Hello!');
  console.log(req.cookies)
});

app.get('/urls', (req, res) => {                    // '/urls'
  const id = req.cookies['user_id'];
  if (!users.isLogIn(id)) return res.redirect('/not-logged-in');

  const templateVars = {
      urls: urlDatabase.urlsForUser(id),
      user: users[id]
    };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {                // '/urls/new'
  const id = req.cookies['user_id'];
  if (!users.isLogIn(id)) return res.redirect('/not-logged-in');

  const templateVars = {
    user: users[id]
  };
  res.render('urls_new', templateVars);
});

app.get('/urls/:shortURL', (req, res) => {          // '/urls/:shortURL'
 
  const id = req.cookies['user_id'];
  const { shortURL } = req.params;
  
  if (!users.isLogIn(id) || urlDatabase[shortURL].userID !== id) {
    return res.redirect('/not-logged-in');
  }

  const templateVars = { 
    shortURL,
    longURL:  urlDatabase[shortURL].longURL,
    user: users[id]
  };
  res.render('urls_show', templateVars);
});

app.get('/not-logged-in', (req, res) => {
  const id = req.cookies['user_id'];
  const templateVars = { 
    user: users[id]
  };
  res.render('not-logged-in', templateVars)
});

app.get('/urls.json', (req, res) => {               // Return URL DB as JSON
  res.json(urlDatabase);
});

app.get('/users.json', (req, res) => {              // Return users DB as JSON
  res.json(users);
});

app.get("/u/:shortURL", (req, res) => {             // Redirection using short URL
  if (req.params.shortURL in urlDatabase) {
    const { longURL } = urlDatabase[req.params.shortURL];
    res.redirect(longURL);
  }
  res.statusCode = 404;
  res.end("Requested Tiny URL Not Found");
});

app.get('/login', (req, res) => {                   // '/login'
const templateVars = {
  user: users[req.cookies['user_id']]
};
res.render('login', templateVars);
});

app.get('/register', (req, res) => {                // '/register'
  const templateVars = {
    user: users[req.cookies['user_id']]
};
res.render('register', templateVars);
});

// -------- POST handlers 

app.post('/urls', (req, res) => {                   // new URL submition

  const longURL = req.body.longURL;
  const id = req.cookies['user_id'];
  
  const shortURL = urlDatabase.addURL(longURL, id);
  res.redirect(`/urls/${shortURL}`)
});

app.post('/urls/:shortURL', (req, res) => {         // change a long URL for short URL
  const id = req.cookies['user_id'];
  const shortURL = req.params.shortURL;
  const newLongURL = req.body.longURL;
  urlDatabase.changeURL(shortURL, newLongURL, id);
  res.redirect('/urls');
});

app.post('/urls/:shortURL/delete', (req, res) => {  // delete a short URL
  const shortURL = req.params.shortURL;
  const id = req.cookies['user_id'];
  urlDatabase.deleteURL(shortURL, id);
  res.redirect('/urls');
});

app.post('/login', (req, res) => {                  // User Login
  const { email, password } = req.body;
  
  // Return 'Bad request' if email/password fields are empty
  if (!email || !password) {
    return res.status(400).send('E-mail and password fields cannot be empty');
  }
  
  const id = users.findEmail(email);

  // Forbid access if not registred or wrong password (same message for security reasons)
  if (!id) {
    return res.status(403).send('E-mail and password do not match');
  }
  console.log(users[id].password !== password);
  if (users[id].password !== password) {
    return res.status(403).send('E-mail and password do not match');
  }

  res.cookie('user_id', id);
  res.redirect('/urls');
});

app.post('/logout', (req, res) => {                 // User Logout
  res.clearCookie('user_id');
  res.redirect('/login');
});

app.post('/register', (req, res) => {               // User Registration
  const { email, password } = req.body;

  // Check if registration fields are empty or email is registred
  if (!email || !password) {
    return res.status(400).send('E-mail and password fields cannot be empty');
  }
  if (users.findEmail(email)) {
    return res.status(400).send('User with this e-mail is already registred');
  }

  // Create new user in DB, assign a cookie and forward to URLs page
  const id = users.addUser({ email, password });
  res.cookie('user_id', id);
  res.redirect('/urls');
});

// ---------------------- LISTENER ---------------------- //

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});