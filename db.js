const mysql = require("mysql2");

const executeQuery = (query) => {
  const connection = mysql.createConnection({
    host: "127.0.0.1",
    user: "oa2",
    password: "oa2password",
    database: "authdb",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Error connecting to MySQL database: " + err.stack);
      return;
    }
    console.log("Connected to MySQL database as id " + connection.threadId);
  });

  connection.query(query, (error, results, fields) => {
    if (error) {
      console.error("Error executing query: " + error.stack);
      return;
    }
    connection.end();
    return results;
  });
};

module.exports = { executeQuery };
