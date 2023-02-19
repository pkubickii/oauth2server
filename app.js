const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { generateClientId, generateClientSecret } = require("./credgen");
const { executeQuery } = require("./db");
const { createToken } = require("./token");

const app = express();
const port = 3000;
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("views", "./views");
app.set("view engine", "pug");

app.get("/", (req, res) => {
  res.send("Welcome to oAuth2 authorization server");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!req.body || username.length === 0 || password.length === 0) {
    res.status(400).send(`Invalid input!`);
  } else {
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();
    const results = executeQuery("SELECT * FROM client;");
    console.log("POST: /register");
    console.log(`username: ${username}`);
    console.log(`password: ${password}`);
    console.log(`Client ID: ${clientId}`);
    console.log(`Client Secret: ${clientSecret}`);

    const query = `INSERT INTO client (username, password, client_id, client_secret) VALUES ('${username}', '${password}','${clientId}', '${clientSecret}')`;
    executeQuery(query);

    res
      .status(200)
      .send(`client id: ${clientId} <br> client secret: ${clientSecret}`);
  }
});

app.get("/login", (req, res) => {
  const client_id = req.query.hasOwnProperty("client_id")
    ? req.query.client_id
    : null;
  const redirect_uri = req.query.hasOwnProperty("redirect_uri")
    ? req.query.redirect_uri
    : null;
  const scope = req.query.hasOwnProperty("scope") ? req.query.scope : null;
  const response_type = req.query.hasOwnProperty("response_type")
    ? req.query.response_type
    : null;
  const response_mode = req.query.hasOwnProperty("response_mode")
    ? req.query.response_mode
    : null;
  const state = req.query.hasOwnProperty("state") ? req.query.state : null;
  const nonce = req.query.hasOwnProperty("nonce") ? req.query.nonce : null;
  if (
    !(
      client_id &&
      redirect_uri &&
      scope &&
      response_type &&
      response_mode &&
      state
    )
  ) {
    res.status(400).send("invalid_request");
  } else {
    //res.render("login");
    res.json({
      client_id,
      redirect_uri,
      scope,
      response_type,
      response_mode,
      state,
      nonce,
    });
  }
});

app.post("/login", (req, res) => {
  if (
    !req.body.hasOwnProperty("username") ||
    !req.body.hasOwnProperty("password")
  ) {
    res.status(400).send("invalid_request");
  } else {
    const query = `SELECT code FROM user WHERE username = '${username}'`;
    executeQuery(query)
      .then((result) => {
        if (result.length === 0) {
          res.status(404).send("User not found");
        } else {
          const code = result[0].code;
          console.log(`query result: ${JSON.stringify(result)}`);
          res.redirect(`${redirect_uri}${code}`);
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Error fetching user data");
      });
  }
});

app.post("/access_token", (req, res) => {
  const grant_type = req.body.hasOwnProperty("grant_type")
    ? req.body.grant_type
    : null;
  if (
    !req.body ||
    !grant_type ||
    !req.body.hasOwnProperty("client_id") ||
    !req.body.hasOwnProperty("client_secret")
  ) {
    res.status(400).send("invalid_request");
  } else if (grant_type == "client_credentials") {
    const { client_id, client_secret } = req.body;
    const query = `SELECT * FROM client WHERE client_id='${client_id}' AND client_secret='${client_secret}'`;
    executeQuery(query)
      .then((result) => {
        if (result.length === 0) {
          res.status(400).send("invalid_client");
        } else {
          console.log(`query result: ${JSON.stringify(result)}`);
          const creds = {
            subject: client_id,
            secret: client_secret,
          };
          const accessToken = createToken(creds);
          const response = {
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: 3600,
            scope: "create",
          };
          res.status(200).json(response);
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Error fetching user data");
      });
  } else if (grant_type == "password") {
    if (
      !req.body.hasOwnProperty("username") ||
      !req.body.hasOwnProperty("password")
    ) {
      res.status(400).send("invalid_request");
    }
    const { client_id, client_secret, username, password } = req.body;
    let query = `SELECT * FROM client WHERE client_id='${client_id}' AND client_secret='${client_secret}'`;
    executeQuery(query)
      .then((result) => {
        if (result.length === 0) {
          res.status(400).send("invalid_client");
        } else {
          query = `SELECT * FROM user WHERE username='${username}' AND password='${password}' AND client_id='${client_id}'`;
          executeQuery(query)
            .then((result) => {
              if (result.length === 0) {
                res.status(400).send("invalid_user_credentials");
              } else {
                console.log(`query result: ${JSON.stringify(result)}`);
                const creds = {
                  subject: username,
                  secret: client_secret,
                };
                const accessToken = createToken(creds);
                const response = {
                  access_token: accessToken,
                  token_type: "Bearer",
                  expires_in: 3600,
                  scope: "create",
                };
                res.status(200).json(response);
              }
            })
            .catch((err) => {
              console.log(err);
              res.status(500).send("Error fetching user data");
            });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Error fetching user data");
      });
  } else {
    res.status(400).send("invalid_grant");
  }
});

app.listen(port, () => {
  console.log(`oAuth2 Server is running on port ${port}`);
});
