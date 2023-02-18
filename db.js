const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "127.0.0.1",
  user: "oa2",
  password: "oa2password",
  database: "authdb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function executeQuery(query) {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.query(query);
    connection.release();
    return rows;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

module.exports = { executeQuery };
