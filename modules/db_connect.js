const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'ruello',
    password: 'ruellopassword',
    database: 'ruello'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database: ' + err.stack);
        return;
    }
    console.log('Connected to database as id ' + connection.threadId);
});

module.exports = connection;
