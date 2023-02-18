const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "127.0.0.1",
  user: "oa2",
  password: "oa2password",
  database: "authdb",
});

async function executeQuery(query) {
  try {
    const [rows, fields] = await connection.promise().query(query);
    return rows;
  } catch (err) {
    console.log(err);
    throw err;
  } finally {
    connection.end();
  }
}

module.exports = { executeQuery };
