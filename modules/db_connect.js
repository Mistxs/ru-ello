const mysql = require('mysql');
const dbConfig = require('./db_config');
const dbSetup = require('./db_setup'); // модуль для настройки базы данных

let connection;

function connectToDatabase() {
    connection = mysql.createConnection(dbConfig);

    connection.connect((err) => {
        if (err) {
            if (err.code === 'ER_BAD_DB_ERROR') {
                console.error('Database does not exist, attempting to create...');
                dbSetup.setupDatabase(checkAndUseTables);
            } else {
                console.error('Error connecting to database:', err);
            }
            return;
        }
        console.log('Connected to database as id ' + connection.threadId);
        checkAndUseTables();
    });

    connection.on('error', (err) => {
        console.error('Database error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
            reconnectDatabase();
        } else {
            throw err; // если другая ошибка, выбрасываем исключение
        }
    });
}

function reconnectDatabase() {
    console.log('Attempting to reconnect to the database...');
    connection = mysql.createConnection(dbConfig);
    connectToDatabase();
}

function checkAndUseTables() {
    // Проверяем, что все необходимые таблицы существуют
    const requiredTables = ['badges', 'users', 'boards', 'columns', 'tasks', 'comments', 'task_badges_link'];

    connection.query('SHOW TABLES', (err, results) => {
        if (err) {
            console.error('Error checking tables:', err);
            reconnectDatabase();
            return;
        }

        const existingTables = results.map(result => result[`Tables_in_${dbConfig.database}`]);

        const missingTables = requiredTables.filter(table => !existingTables.includes(table));

        if (missingTables.length > 0) {
            console.log('Some tables are missing:', missingTables);
            console.log('Attempting to create missing tables...');
            dbSetup.setupDatabase(() => {
                // После создания таблиц повторно подключаемся к базе данных
                reconnectDatabase();
            });
        } else {
            console.log('All required tables exist. Starting application...');
            // Здесь можно запускать основной код вашего приложения
            // Например, запуск сервера или других модулей
        }
    });
}

connectToDatabase(); // начинаем процесс подключения

module.exports = connection;
