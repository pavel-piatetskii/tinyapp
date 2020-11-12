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
  }
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
  }

};

function generateRandomString(size) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let output = '';
  for (let i = 0; i < size; i++) {
    output += charset[Math.round(Math.random() * charset.length)];
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
  const templateVars = {
    urls: urlDatabase,
    user: users[req.cookies['user_id']]
  };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {                // '/urls/new'
  const id = req.cookies['user_id'];

  // Redirect user to login page if not authorised
  if (!(id in users)) return res.redirect('/login')

  const templateVars = {
    user: users[id]
};
res.render('urls_new', templateVars);
});

app.get('/urls/:shortURL', (req, res) => {          // '/urls/:shortURL'
const { shortURL } = req.params;
const templateVars = { 
  shortURL,
  longURL:  urlDatabase[shortURL].longURL,
  user: users[req.cookies['user_id']]
};
res.render('urls_show', templateVars);
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

  // generate new 6-char alphanumerical string. If exists - generate again
  const shortURL = generateRandomString(6);
  while (shortURL in urlDatabase) {
    shortURL = generateRandomString(6);
  }

  // Save generated URL to DB and redirect to the ShortURL page
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`)
});

app.post('/urls/:shortURL', (req, res) => {         // change a long URL for short URL
  urlDatabase[req.params.shortURL] = req.body.longURL;
  res.redirect('/urls');
});

app.post('/urls/:shortURL/delete', (req, res) => {  // delete a short URL
  delete urlDatabase[req.params.shortURL];
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
  res.redirect('/urls');
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