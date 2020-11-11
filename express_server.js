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

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

const morgan = require('morgan');
app.use(morgan('dev'));

// ---------------------- ROUTE HANDLERS ---------------------- //

// --------- GET Handlers


const cookie = require('cookie-parser');
app.use(cookie())

app.get('/', (req, res) => {  // '/'
  res.send('Hello!');
  console.log(req.cookies)
});

app.get('/urls', (req, res) => { // '/urls'
  const templateVars = {
    urls: urlDatabase,
    username: req.cookies["username"]
  };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {  // '/urls/new'
const templateVars = {username: req.cookies["username"]}
res.render('urls_new', templateVars);
});

app.get("/u/:shortURL", (req, res) => { // Redirection using short URL
  const longURL = urlDatabase[req.params.shortURL];
  if (longURL in urlDatabase) {
    res.redirect(longURL);
  }
  res.statusCode = 404;
  res.end("Requested Tiny URL Not Found");
});

app.get('/urls/:shortURL', (req, res) => { // '/urls/:shortURL'
  const templateVars = { 
    shortURL: req.params.shortURL,
    longURL:  urlDatabase[req.params.shortURL],
    username: req.cookies["username"]
  };
  res.render('urls_show', templateVars);
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});


// -------- POST handlers 

// The handler for new URL submition -----
app.post('/urls', (req, res) => {

  // generate new 6-char alphanumerical string. If exists - generate again
  const shortURL = generateRandomString(6);
  while (shortURL in urlDatabase) {
    shortURL = generateRandomString(6);
  }

  // Save generated URL to DB and redirect to the ShortURL page
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`)
});

// The handler for update of a short URL -----
app.post('/urls/:shortURL', (req, res) => {
  urlDatabase[req.params.shortURL] = req.body.longURL;
  res.redirect('/urls');
});

// The handler for removal of a short URL -----
app.post('/urls/:shortURL/delete', (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls');
});

// The handler for User Login -----
app.post('/login', (req, res) => {
  res.cookie('username', req.body.username);
  res.redirect('/urls');
});

// The handler for User Logout -----
app.post('/logout', (req, res) => {
  res.clearCookie('username');
  res.redirect('/urls');
});

// ------ Listener
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});