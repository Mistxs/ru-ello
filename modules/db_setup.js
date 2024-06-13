const mysql = require('mysql');
const dbConfig = require('./db_config');

// Функция для создания схемы и таблиц
function setupDatabase(callback) {
    const setupConnection = mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password
    });

    setupConnection.connect((err) => {
        if (err) {
            console.error('Error connecting to setup database:', err);
            return;
        }

        // Создаем базу данных, если её нет
        setupConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`, (err) => {
            if (err) {
                console.error('Error creating database:', err);
            } else {
                console.log('Database created successfully or already exists.');
                // Подключаемся к основной базе данных после создания
                const connection = mysql.createConnection(dbConfig);
                connection.connect((err) => {
                    if (err) {
                        console.error('Error connecting to main database:', err);
                    } else {
                        console.log('Connected to main database as id ' + connection.threadId);
                        // Создаем таблицы после успешного подключения
                        createTables(connection, callback);
                    }
                });
                // Закрываем временное соединение после создания базы данных
                setupConnection.end();
            }
        });
    });
}

// Функция для создания таблиц
function createTables(connection, callback) {
    const tables = [
        `CREATE TABLE IF NOT EXISTS badges (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NULL,
            deleted TINYINT NULL,
            type VARCHAR(255) NULL
        )`,
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            login VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS boards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NULL,
            user_id INT NULL,
            deleted TINYINT DEFAULT 0 NULL,
            CONSTRAINT boards_users_id_fk
                FOREIGN KEY (user_id) REFERENCES users (id)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS columns (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NULL,
            board_id INT NULL,
            deleted TINYINT DEFAULT 0 NULL,
            weight INT NULL,
            CONSTRAINT board_id_fk
                FOREIGN KEY (board_id) REFERENCES boards (id)
                ON UPDATE CASCADE
                ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NULL,
            description TEXT NULL,
            board_id INT NULL,
            column_id INT NULL,
            deleted TINYINT DEFAULT 0 NULL,
            weight INT NULL,
            createdate DATETIME DEFAULT CURRENT_TIMESTAMP NULL,
            deadline DATETIME DEFAULT CURRENT_TIMESTAMP NULL,
            CONSTRAINT tasks_boards_id_fk
                FOREIGN KEY (board_id) REFERENCES boards (id)
                ON UPDATE CASCADE
                ON DELETE CASCADE,
            CONSTRAINT tasks_columns_id_fk
                FOREIGN KEY (column_id) REFERENCES columns (id)
                ON UPDATE CASCADE
                ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            text TEXT NULL,
            createdate DATETIME DEFAULT CURRENT_TIMESTAMP NULL,
            task_id INT NULL,
            deleted TINYINT DEFAULT 0 NULL,
            user_id INT NULL,
            CONSTRAINT comments_task_id_fk
                FOREIGN KEY (task_id) REFERENCES tasks (id)
                ON UPDATE CASCADE
                ON DELETE CASCADE,
            CONSTRAINT comments_user_id_fk
                FOREIGN KEY (user_id) REFERENCES users (id)
                ON UPDATE CASCADE
                ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS task_badges_link (
            id INT AUTO_INCREMENT PRIMARY KEY,
            taskid INT NULL,
            badge_id INT NULL,
            CONSTRAINT task_badges_link_badge_id_fk
                FOREIGN KEY (badge_id) REFERENCES badges (id)
                ON UPDATE CASCADE
                ON DELETE CASCADE,
            CONSTRAINT task_badges_link_task_id_fk
                FOREIGN KEY (taskid) REFERENCES tasks (id)
                ON UPDATE CASCADE
                ON DELETE CASCADE
        )`
    ];

    function executeQuery(index) {
        if (index >= tables.length) {
            console.log('All tables created successfully.');
            if (callback) callback();
            return;
        }

        connection.query(tables[index], (err) => {
            if (err) {
                console.error(`Error creating table: ${err}`);
            } else {
                console.log(`Table created successfully: ${tables[index]}`);
            }
            executeQuery(index + 1);
        });
    }

    executeQuery(0);
}

module.exports = {
    setupDatabase
};
