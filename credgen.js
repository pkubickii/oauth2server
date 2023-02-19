const crypto = require("crypto");

const generateClientId = () => {
  return crypto.randomBytes(16).toString("hex");
};

const generateClientSecret = () => {
  return crypto.randomBytes(32).toString("hex");
};

const generateAuthCode = () => {
  return crypto.randomBytes(8).toString("hex");
};

const checkAndReturnScopes = (scope1, scope2) => {
  const array1 = scope1.split(" ");
  const array2 = scope2.split(" ");
  const common = array1.filter((word) => array2.includes(word));
  const result = common.join(" ");

  return result;
};

module.exports = {
  generateClientId,
  generateClientSecret,
  generateAuthCode,
  checkAndReturnScopes,
};
