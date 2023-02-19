const { sign, verify } = require("jsonwebtoken");

const createToken = (creds) => {
  const accessToken = sign(
    {
      token_type: "Bearer",
      sub: creds.subject,
      scope: "create",
    },
    creds.secret,
    { expiresIn: 3600 }
  );

  return accessToken;
};

const createRefreshToken = (creds) => {
  const accessToken = sign(
    {
      token_type: "Refresh",
      sub: creds.subject,
      scope: "create",
    },
    creds.secret,
    { expiresIn: 3600 * 24 }
  );

  return accessToken;
};

const validateToken = (token, secret, res) => {
  try {
    const decoded = verify(token, secret);
    if (decoded.exp < Date.now() / 1000) {
      return res.status(401).send("Token has expired");
    }
    res.send("Token is valid and not expired");
  } catch (err) {
    console.log(err);
    res.status(500).send("Token is not valid");
  }
};

module.exports = { createToken, createRefreshToken, validateToken };
