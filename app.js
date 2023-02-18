const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { generateClientId, generateClientSecret } = require("./credgen");
const { executeQuery } = require("./db");

const app = express();
const port = 3000;
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("views", "./views");
app.set("view engine", "pug");
const redirect_uri = `http://localhost:3000/?code=`;

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
  res.render("login");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!req.body || username.length === 0 || password.length === 0) {
    res.status(400).send(`Invalid input!`);
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

app.listen(port, () => {
  console.log(`oAuth2 Server is running on port ${port}`);
});
