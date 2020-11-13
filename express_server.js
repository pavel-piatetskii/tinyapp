const express = require('express');
const bcrypt = require('bcrypt');
var methodOverride = require('method-override');
const app = express();
const { users, urlDatabase } = require('./helpers-and-DBs')

const PORT = 8080; // default port 8080

app.set('view engine', 'ejs');

// ----------------------- MIDDLEWARE ADDITIION ---------------------- //

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

// Morgan to monitor HTTP exchange
const morgan = require('morgan');
app.use(morgan('dev'));

// Secure cookie-session with encryption
const cookieSession = require('cookie-session')
app.use(cookieSession({
  name: 'session',
  keys: ['very-strong-and-unbreakable-secret-key-which-will-awe-all-hackers-around-the-world'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

// override with POST having ?_method=DELETE
app.use(methodOverride('_method'))

// -------- Custom Middleware

// Next two extract user_id, but redirect to different pages
const isLoggedMW = function(req, res, next) {
  req.id = users.isUser(req.session.user_id);
  return (req.id) ? next() : res.redirect('/login');
};

const isAuthorizedMW = function(req, res, next) {
  req.id = users.isUser(req.session.user_id);
  return (req.id) ? next() : res.redirect('/not-authorized');
};

// Check if the user owns given short URL
const isOwnerOfShortMW = function(req, res, next) {
  if (urlDatabase[req.params.shortURL].userID !== req.id) {
    return res.redirect('/not-authorized');
  }
  return next();
};

// -------------------------- ROUTE HANDLERS -------------------------- //

// --------- GET Handlers

app.get('/', isLoggedMW, (req, res) => {                    // '/'
  console.log()
  res.redirect('/urls');
});

app.get('/urls', isAuthorizedMW, (req, res) => {            // '/urls'
  const templateVars = {
      urls: urlDatabase.urlsForUser(req.id),
      user: users[req.id],
    };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', isLoggedMW, (req, res) => {        // '/urls/new'
  const templateVars = {
    user: users[req.id]
  };
  res.render('urls_new', templateVars);
});

app.get('/urls/:shortURL', isAuthorizedMW, (req, res) => {  // '/urls/:shortURL'
  const { shortURL } = req.params;
  const url = urlDatabase[shortURL];
  if (!url || url.userID !== req.id) {
    return res.redirect('/not-authorized');
  }

  const templateVars = { 
    shortURL,
    longURL:  url.longURL,
    counter:  url.counter,
    unique:   url.unique,
    user: users[req.id]
  };
  res.render('urls_show', templateVars);
});

app.get('/not-authorized', (req, res) => {                  // Show if user tries to acces page that shows user-specific data 
  const id = req.session.user_id;
  const templateVars = { 
    user: users[id]
  };
  res.render('not-authorized', templateVars)
});

app.get('/urls.json', (req, res) => {                       // Return URL DB as JSON
  res.json(urlDatabase);
});

app.get('/users.json', (req, res) => {                      // Return users DB as JSON
  res.json(users);
});

app.get("/u/:shortURL", (req, res) => {                     // Redirection using short URL
  const ip = req.connection.remoteAddress.split(':').pop();
  const shortURL = req.params.shortURL
  if (shortURL in urlDatabase) {
    const { longURL } = urlDatabase[shortURL];
    console.log(shortURL, ip)
    urlDatabase.countVisitors(shortURL, ip)
    return res.redirect(longURL);
  }
  res.statusCode = 404;
  res.end("Requested Tiny URL Not Found");
});

app.get('/login', (req, res) => {                           // '/login'
  const templateVars = {
    user: users[req.session.user_id]
  };
  if (templateVars.user) return res.redirect('/urls')
  res.render('login', templateVars);
});

app.get('/register', (req, res) => {                        // '/register'
  const templateVars = {
    user: users[req.session.user_id]
};
if (templateVars.user) return res.redirect('/urls')
res.render('register', templateVars);
});

// -------- POST handlers 

app.post('/urls', isAuthorizedMW, (req, res) => {                     // new URL submition
  const longURL = req.body.longURL;  
  const shortURL = urlDatabase.addURL(longURL, req.id);
  if (shortURL) return res.redirect(`/urls/${shortURL}`);

  return res.status(400).send(`Tiny URL for this address exists: ${urlDatabase.findLongURL(longURL)}`);
});

app.put('/urls/:shortURL', isAuthorizedMW,                  // change a long URL for short URL
isOwnerOfShortMW, (req, res) => {
  const shortURL = req.params.shortURL;
  const newLongURL = req.body.longURL;
  // if (urlDatabase[shortURL].userID !== req.id) {
  //   return res.redirect('/not-authorized');
  // }
  urlDatabase.changeURL(shortURL, newLongURL, req.id);
  res.redirect('/urls');
});

app.delete('/urls/:shortURL/delete', isAuthorizedMW,        // delete a short URL
isOwnerOfShortMW,(req, res) => {  
  const shortURL = req.params.shortURL;
  urlDatabase.deleteURL(shortURL, req.id);
  res.redirect('/urls');
});

app.post('/login', (req, res) => {                    // User Login
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

  if (bcrypt.compareSync(password, users[id].password)) {
    req.session.user_id = id;
    return res.redirect('/urls');
  }
  return res.status(403).send('E-mail and password do not match');

});

app.post('/logout', (req, res) => {                   // User Logout
  req.session = null;
  res.redirect('/login');
});

app.post('/register', (req, res) => {                 // User Registration
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
  req.session.user_id = id;
  res.redirect('/urls');
});

// ---------------------- LISTENER ---------------------- //

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});