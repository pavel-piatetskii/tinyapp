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


// ---------------------- ROUTE HANDLERS ---------------------- //

// --------- GET Handlers

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res) => {  // '/'
  res.send('Hello!');
});

app.get('/urls', (req, res) => { // '/urls'
  const templateVars = {urls: urlDatabase};
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {  // '/urls/new'
res.render('urls_new');
});

app.get("/u/:shortURL", (req, res) => {
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
    longURL:  urlDatabase[req.params.shortURL]
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


// The handler for removal of a short URL -----
app.post('/urls/:shortURL/delete', (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls');
})

// ------ Listener
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});