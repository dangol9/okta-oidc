const express = require('express');
const session = require('express-session');
const { ExpressOIDC } = require('@okta/oidc-middleware');
const app = express();
const okta = require('@okta/okta-sdk-nodejs');
const { initUserApi, updateUserAttr } = require('./functions/func');
require('dotenv').config();

const client = new okta.Client({
  orgUrl: process.env.org_url,
  token: process.env.token
});

// configure express-session middleware
app.use(session({
  secret: process.env.secret,
  resave: true,
  saveUninitialized: false,
  cookie: { maxAge: 43200000 } //check later
})); 

app.use(express.urlencoded({extended: true}));
app.use(express.json());

// configure Okta OIDC middleware
const oidc = new ExpressOIDC({
  issuer: process.env.issuer,
  client_id: process.env.client_id,
  client_secret: process.env.client_secret,
  appBaseUrl: process.env.app_base_url,
  redirect_uri: process.env.redirect_uri,
  scope: 'openid profile email groups department division',
  routes: {
    loginCallback: {
      afterCallback: '/dashboard'
    }
  }
});

app.use(oidc.router);

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    if (req.userContext) {
      res.send(`
        Hello ${req.userContext.userinfo.name}! </br>
        <a href="/dashboard">To dashboard</a>
        <form method="POST" action="/logout">
          <button type="submit">Logout</button>
        </form>
      `);
    } else {
      res.send('Please <a href="/login">login</a>');
    }
  });

app.get('/user-data-edit', oidc.ensureAuthenticated(), async (req, res) => {
    try {
        let user = await initUserApi(req, client);
        let name = user.profile.firstName + " " + user.profile.lastName;
        res.render('data-edit', { 
            user: name, userId: user.id, 
            department: user.profile.department, 
            division: user.profile.division 
        });
    } catch (error) {
        console.log(error);
    }
});

app.get('/dashboard', oidc.ensureAuthenticated(), (req, res) => {
    try {
        res.send(
        `
        <pre> ${JSON.stringify(req.userContext.userinfo, null, '\t')} </pre><br/>
        <a href="/user-data-edit">Edit attributes</a></br>
        <a href="/">Go back</a>
        `
        );
        console.log(req.userContext);
    } catch (error) {
        console.log(error);
    }
});

app.post('/submit-data', oidc.ensureAuthenticated(), async (req, res) => {
    try {
        const nonEmptyBody = Object.entries(req.body)
        .filter(([key, value]) => value !== '')
        .map(([key, value]) => `${key}: ${value}`)
        .join('</br>');
        res.send(`
        <p>Data sent: </p>
        <pre> ${JSON.stringify(nonEmptyBody, null, '\t')} </pre><br/>
        <a href="/user-data-edit">Go back</a>
        `
        );
        let user = await initUserApi(req, client);
        await updateUserAttr(req, client, user);
    } catch (error) {
        console.log(error);
    }
});

oidc.on('ready', () => {
    app.listen(3000, () => console.log('app started'));
});
  oidc.on('error', err => {
    console.log(err);
});
