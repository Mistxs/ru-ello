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
        CREATE TABLE IF NOT EXISTS boards
        (
            id      int auto_increment
                primary key,
            title   varchar(255)      null,
            user_id int               null,
            deleted tinyint default 0 null,
            constraint boards_users_id_fk
                foreign key (user_id) references users (id)
                    on update cascade on delete set null
        );
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
          createdate  datetime default (now()) null,
          deadline    datetime default (now()) null,
          CONSTRAINT tasks_boards_id_fk
            FOREIGN KEY (board_id) REFERENCES boards (id)
            ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT tasks_columns_id_fk
            FOREIGN KEY (column_id) REFERENCES columns (id)
            ON UPDATE CASCADE ON DELETE CASCADE
        )
      `,
        },
        {
            name: 'comments',
            query: `
        create table comments
        (
            id         int auto_increment
                primary key,
            text       text                               null,
            createdate datetime default CURRENT_TIMESTAMP null,
            task_id    int                                null,
            deleted    tinyint  default 0                 null,
            user_id    int                                null,
            constraint task
                foreign key (task_id) references tasks (id),
            constraint user
                foreign key (user_id) references users (id)
        );
      `,
        },
        {
            name: 'badges',
            query: `
        create table badges
        (
            id      int auto_increment
                primary key,
            name    varchar(255) null,
            deleted tinyint      null,
            type    varchar(255) null
        );
      `,
        },
        {
            name: 'badges-link',
            query: `
        create table task_badges_link
        (
            id       int auto_increment
                primary key,
            taskid   int null,
            badge_id int null,
            constraint badges_fk
                foreign key (badge_id) references badges (id),
            constraint task_fk
                foreign key (taskid) references tasks (id)
        );
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
