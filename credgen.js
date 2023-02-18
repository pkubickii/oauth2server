const crypto = require("crypto");

const generateClientId = () => {
  return crypto.randomBytes(16).toString("hex");
};

const generateClientSecret = () => {
  return crypto.randomBytes(32).toString("hex");
};
module.exports = { generateClientId, generateClientSecret };
