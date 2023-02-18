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

const validateToken = (req, res, next) => {
  const accessToken = req.cookies["flypal-token"];

  if (!accessToken)
    return res.status(200).json({ error: "User not Authenticated!" });

  try {
    const validToken = verify(accessToken, "jwthardcodedsecretlol");
    if (validToken) {
      req.token = validToken;
      next();
    }
  } catch (err) {
    return res.status(400).json({ error: err });
  }
};

module.exports = { createToken, validateToken };
