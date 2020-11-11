const express = require('express');
const app = express();
const PORT = 8080; // default port 8080

app.set('view engine', 'ejs');

const urlDatabase = {
  'b2xVn2': 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com'
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

app.get('/', (req, res) => {                  // '/'
  res.send('Hello!');
  console.log(req.cookies)
});

app.get('/urls', (req, res) => {              // '/urls'
  const templateVars = {
    urls: urlDatabase,
    username: req.cookies["username"]
  };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {          // '/urls/new'
const templateVars = {
  username: req.cookies["username"]
};
res.render('urls_new', templateVars);
});

app.get('/urls/:shortURL', (req, res) => {    // '/urls/:shortURL'
const templateVars = { 
  shortURL: req.params.shortURL,
  longURL:  urlDatabase[req.params.shortURL],
  username: req.cookies["username"]
};
res.render('urls_show', templateVars);
});

app.get('/urls.json', (req, res) => {         // Return URL DB as JSON
  res.json(urlDatabase);
});

app.get("/u/:shortURL", (req, res) => {       // Redirection using short URL
  const longURL = urlDatabase[req.params.shortURL];
  if (longURL in urlDatabase) {
    res.redirect(longURL);
  }
  res.statusCode = 404;
  res.end("Requested Tiny URL Not Found");
});

app.get('/register', (req, res) => {          // '/register'
const templateVars = {
  username: req.cookies["username"]
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
  res.cookie('username', req.body.username);
  res.redirect('/urls');
});

app.post('/logout', (req, res) => {                 // User Logout
  res.clearCookie('username');
  res.redirect('/urls');
});


// ---------------------- LISTENER ---------------------- //

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});