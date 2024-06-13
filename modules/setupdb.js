const connection = require('./db_connect');

// Соединение с базой данных
connection.connect(err => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.stack);
        return;
    }
    console.log('Подключено к базе данных.');
    setupDatabase();
});

// Функция для проверки и создания таблиц
function setupDatabase() {
    const tables = [
        {
            name: 'users',
            query: `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          login VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL
        )
      `,
        },
        {
            name: 'boards',
            query: `
        CREATE TABLE IF NOT EXISTS boards (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NULL,
          user_id INT NULL,
          deleted TINYINT DEFAULT 0 NULL,
          CONSTRAINT boards_users_id_fk
            FOREIGN KEY (user_id) REFERENCES users (id)
            ON UPDATE CASCADE ON DELETE SET NULL
        )
      `,
        },
        {
            name: 'columns',
            query: `
        CREATE TABLE IF NOT EXISTS columns (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NULL,
          board_id INT NULL,
          deleted TINYINT DEFAULT 0 NULL,
          weight INT NULL,
          CONSTRAINT board_id
            FOREIGN KEY (board_id) REFERENCES boards (id)
            ON UPDATE CASCADE ON DELETE CASCADE
        )
      `,
        },
        {
            name: 'tasks',
            query: `
        CREATE TABLE IF NOT EXISTS tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NULL,
          description TEXT NULL,
          board_id INT NULL,
          column_id INT NULL,
          deleted TINYINT DEFAULT 0 NULL,
          weight INT NULL,
          CONSTRAINT tasks_boards_id_fk
            FOREIGN KEY (board_id) REFERENCES boards (id)
            ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT tasks_columns_id_fk
            FOREIGN KEY (column_id) REFERENCES columns (id)
            ON UPDATE CASCADE ON DELETE CASCADE
        )
      `,
        },
    ];

    tables.forEach(table => {
        connection.query(table.query, (err, results) => {
            if (err) {
                console.error(`Ошибка при создании таблицы ${table.name}:`, err.stack);
            } else {
                console.log(`Таблица ${table.name} проверена/создана.`);
            }
        });
    });

    // Закрыть соединение после создания таблиц
    connection.end(err => {
        if (err) {
            console.error('Ошибка при закрытии соединения:', err.stack);
        } else {
            console.log('Соединение с базой данных закрыто.');
        }
    });
}
