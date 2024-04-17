const mysql = require("mysql2")

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'weRTiop2010!',
    database: 'framecloud'
}).promise()

// const result = await pool.query("SELECT * FROM User WHERE(username = 'miAmigo' OR email = 'miAmigo') AND password = 'wertiop2010'")
// console.log(result)


module.exports = pool