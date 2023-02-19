const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const {
  generateClientId,
  generateClientSecret,
  generateAuthCode,
  checkAndReturnScopes,
} = require("./credgen");
const { executeQuery } = require("./db");
const { createToken, createRefreshToken, validateToken } = require("./token");

const app = express();
const port = 3000;
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
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

    const query = `INSERT INTO client (username, password, client_id, client_secret) VALUES ('${username}', '${password}','${clientId}', '${clientSecret}');`;
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
    const hiddenProps = {
      client_id,
      redirect_uri,
      scope,
      response_type,
      response_mode,
      state,
      nonce,
    };
    //console.log(JSON.stringify(hiddenProps));
    res.render("login", hiddenProps);
  }
});

app.post("/login", (req, res) => {
  const username = req.body.hasOwnProperty("username")
    ? req.body.username
    : null;
  const password = req.body.hasOwnProperty("password")
    ? req.body.password
    : null;
  if (!username || !password) {
    res.status(400).send("invalid_request");
  } else {
    const hiddenProps = {
      client_id: req.body.client_id,
      redirect_uri: req.body.redirect_uri,
      scope: req.body.scope,
      response_type: req.body.response_type,
      response_mode: req.body.response_mode,
      state: req.body.state,
      nonce: req.body.nonce,
    };
    //console.log(JSON.stringify(hiddenProps));
    const query = `SELECT * FROM user WHERE username='${username}' AND password='${password}' AND client_id='${hiddenProps.client_id}';`;
    executeQuery(query)
      .then((result) => {
        if (result.length === 0) {
          res.status(400).send("invalid_user_credentials");
        } else {
          //console.log(`query result: ${JSON.stringify(result)}`);
          const code = generateAuthCode();
          const iquery = `UPDATE user SET code='${code}' WHERE username='${username}';`;
          const iquery2 = `UPDATE user SET scope_req='${hiddenProps.scope}' WHERE username='${username}';`;
          Promise.all([
            executeQuery(iquery).then(() => console.log("Code saved.")),
            executeQuery(iquery2).then(() =>
              console.log("Requested scope saved.")
            ),
          ]).catch((err) => {
            console.log(err);
            res.status(500).send("Database failure, try get another one.");
          });
          res.redirect(
            `${hiddenProps.redirect_uri}?code=${code}&scope=${hiddenProps.scope}&state=${hiddenProps.state}`
          );
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
  } else {
    switch (grant_type) {
      case "client_credentials":
        handleClientCredentialsGrant(req, res);
        break;
      case "password":
        handlePasswordGrant(req, res);
        break;
      case "authorization_code":
        handleAuthorizationCodeGrant(req, res);
        break;
      case "refresh_token":
        handleRefreshTokenGrant(req, res);
        break;
      default:
        res.status(400).send("invalid_grant");
        break;
    }
  }
});

function handleClientCredentialsGrant(req, res) {
  const { client_id, client_secret } = req.body;
  const query = `SELECT * FROM client WHERE client_id='${client_id}' AND client_secret='${client_secret}';`;
  executeQuery(query)
    .then((result) => {
      if (result.length === 0) {
        res.status(400).send("invalid_client");
      } else {
        console.log(`query result: ${JSON.stringify(result)}`);
        const creds = {
          subject: client_id,
          secret: client_secret,
          scope: "admin",
        };
        const accessToken = createToken(creds);
        const response = {
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: 3600,
          scope: creds.scope,
        };
        const iquery = `INSERT INTO token (token, revoked, sub, type) VALUES ('${accessToken}', 0, '${creds.subject}', 'Bearer');`;
        executeQuery(iquery)
          .then(() => {
            console.log("Token saved.");
          })
          .catch((err) => {
            console.log(err);
            res.status(500).send("Token failure, try get another one.");
          });
        res.status(200).json(response);
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error fetching user data");
    });
}

function handlePasswordGrant(req, res) {
  if (
    !req.body.hasOwnProperty("username") ||
    !req.body.hasOwnProperty("password")
  ) {
    res.status(400).send("invalid_request");
    return;
  }

  const { client_id, client_secret, username, password } = req.body;
  let query = `SELECT * FROM client WHERE client_id='${client_id}' AND client_secret='${client_secret}';`;
  executeQuery(query)
    .then((result) => {
      if (result.length === 0) {
        res.status(400).send("invalid_client");
      } else {
        query = `SELECT * FROM user WHERE username='${username}' AND password='${password}' AND client_id='${client_id}';`;
        executeQuery(query)
          .then((result) => {
            if (result.length === 0) {
              res.status(400).send("invalid_user_credentials");
            } else {
              console.log(`query result: ${JSON.stringify(result)}`);
              const creds = {
                subject: `${username}@${client_id}`,
                secret: client_secret,
                scope: result[0].scope,
              };
              const accessToken = createToken(creds);
              const response = {
                access_token: accessToken,
                token_type: "Bearer",
                expires_in: 3600,
                scope: creds.scope,
              };
              const iquery = `INSERT INTO token (token, revoked, sub, type) VALUES ('${accessToken}', 0, '${creds.subject}', 'Bearer');`;
              executeQuery(iquery)
                .then(() => {
                  console.log("Token saved.");
                })
                .catch((err) => {
                  console.log(err);
                  res.status(500).send("Token failure, try get another one.");
                });
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
}

function handleAuthorizationCodeGrant(req, res) {
  if (
    !req.body.hasOwnProperty("code") ||
    !req.body.hasOwnProperty("redirect_uri")
  ) {
    res.status(400).send("invalid_request");
    return;
  }

  const { client_id, client_secret, code, redirect_uri } = req.body;
  let query = `SELECT * FROM client WHERE client_id='${client_id}' AND client_secret='${client_secret}';`;
  executeQuery(query)
    .then((result) => {
      if (result.length === 0) {
        res.status(400).send("invalid_client");
      } else {
        query = `SELECT * FROM user WHERE code='${code}' AND client_id='${client_id}';`;
        executeQuery(query)
          .then((result) => {
            if (result.length === 0) {
              res.status(400).send("unauthorized_client");
            } else {
              console.log(`query result: ${JSON.stringify(result)}`);
              console.log(`result[0].scope: ${result[0].scope}`);
              console.log(`result[0].scope_req: ${result[0].scope_req}`);
              const creds = {
                subject: `${result[0].username}@${client_id}`,
                secret: client_secret,
                scope: checkAndReturnScopes(
                  result[0].scope,
                  result[0].scope_req
                ),
              };
              const accessToken = createToken(creds);
              const refreshToken = createRefreshToken(creds);
              const response = {
                access_token: accessToken,
                token_type: "Bearer",
                expires_in: 3600,
                scope: creds.scope,
                refresh_token: refreshToken,
              };
              const uquery = `UPDATE user SET code=null WHERE username='${result[0].username}';`;
              executeQuery(uquery)
                .then(() => {
                  console.log("Code erased.");
                })
                .catch((err) => {
                  console.log(err);
                });
              const iquery = `INSERT INTO token (token, revoked, sub, type) VALUES ('${accessToken}', 0, '${creds.subject}', 'Bearer'), ('${refreshToken}', 0, '${creds.subject}', 'Refresh');`;
              executeQuery(iquery)
                .then(() => {
                  console.log("Access & refresh token saved.");
                })
                .catch((err) => {
                  console.log(err);
                  res.status(500).send("Token failure, try get another one.");
                });
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
}

function handleRefreshTokenGrant(req, res) {
  if (!req.body.hasOwnProperty("refresh_token")) {
    res.status(400).send("invalid_request");
    return;
  }

  const { client_id, client_secret, refresh_token } = req.body;
  let query = `SELECT * FROM client WHERE client_id='${client_id}' AND client_secret='${client_secret}';`;
  executeQuery(query)
    .then((result) => {
      if (result.length === 0) {
        res.status(400).send("invalid_client");
      } else {
        query = `SELECT * FROM token WHERE token='${refresh_token}'`;
        executeQuery(query)
          .then((result) => {
            if (result.length === 0) {
              res.status(400).send("invalid_token");
            } else {
              console.log(`query result: ${JSON.stringify(result)}`);
              const creds = {
                subject: result[0].sub,
                secret: client_secret,
                scope: result[0].scope,
              };
              const accessToken = createToken(creds);
              const response = {
                access_token: accessToken,
                token_type: "Bearer",
                expires_in: 3600,
                scope: creds.scope,
              };
              const uquery = `UPDATE token SET revoke=1 WHERE sub='${creds.subject}';`;
              const iquery = `INSERT INTO token (token, revoked, sub, type) VALUES ('${accessToken}', 0, '${creds.subject}', 'Bearer');`;

              executeQuery(uquery)
                .then(() => {
                  console.log("User tokens revoked.");
                  return executeQuery(iquery);
                })
                .then(() => {
                  console.log("New token issued.");
                })
                .catch((err) => {
                  console.log(err);
                  res.status(500).send("Token failure, try get another one.");
                });
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
}

app.get("/check_token", (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send("No token provided");
  }
  const query = `SELECT * FROM token WHERE token='${token}';`;
  executeQuery(query)
    .then((result) => {
      if (result.length === 0) {
        res.status(400).send("invalid_token");
      } else {
        if (result[0].revoked) {
          res.status(400).send("token_revoked");
        } else {
          console.log(`query result: ${JSON.stringify(result)}`);
          const client_id = result[0].sub.split("@")[1];
          console.log(`split cid: ${client_id}`);
          const query2 = `SELECT * FROM client WHERE client_id='${client_id}';`;
          return executeQuery(query2);
        }
      }
    })
    .then((result) => {
      console.log(JSON.stringify(result));
      const client_secret = result[0].client_secret;
      console.log(`client secret: ${client_secret}`);
      return validateToken(token, client_secret, res);
    })
    .then(() => {
      console.log(`validateToken()`);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Token failure, try get another one.");
    });
});

app.get("/revoke_token", (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send("No token provided");
  }
  const query = `SELECT * FROM token WHERE token='${token}';`;
  executeQuery(query)
    .then((result) => {
      if (result.length === 0) {
        res.status(400).send("invalid_token");
      } else {
        const query2 = `UPDATE token SET revoked=1 WHERE token='${token}';`;
        return executeQuery(query2);
      }
    })
    .then(() => {
      res.status(200).send("Token revoked.");
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Token revoke failure");
    });
});

app.listen(port, () => {
  console.log(`oAuth2 Server is running on port ${port}`);
});
