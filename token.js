const { sign, verify } = require("jsonwebtoken");

const createToken = (user) => {
  const accessToken = sign(
    { username: user.name, email: user.email, role: user.role },
    "jwthardcodedsecretlol"
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
