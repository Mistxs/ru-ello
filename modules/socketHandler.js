const socketIO = require('socket.io');
const connection = require('./db_connect');
const result = require("mysql/lib/protocol/packets/OkPacket"); // Импорт модуля подключения к базе данных


function handleSockets(http) {
    const io = socketIO(http);

    io.on('connection', (socket) => {


        socket.on('add-task', (data) => {
            console.log('Новая задача:', data);

            // Парсинг данных из полученного объекта data
            const taskTitle = data.name;
            const boardId = parseInt(data.boardId);
            const columnId = parseInt(data.column);

            // Выполняем запрос к базе данных MySQL
            connection.query('INSERT INTO tasks (title, board_id, column_id) VALUES (?, ?, ?)', [taskTitle, boardId, columnId], (error, result) => {
                if (error) {
                    throw error;
                }
                console.log('ID вставленной строки: ', result.insertId);
                socket.emit('add-task', {"taskId": result.insertId});
            });

        });


        socket.on('deleted-task', (data) => {
            console.log('Удалена задача:', data);
            const taskId = parseInt(data.task);
            connection.query('UPDATE tasks t SET t.deleted = 1 WHERE t.id = ?', [taskId], (error, result) => {
                if (error) {
                    throw error;
                }
                console.log('Задача успешно удалена');
            });
        });

        socket.on('rename-task', (data) => {
            const taskId = parseInt(data.task);
            const name = data.name;
            connection.query('UPDATE tasks t SET t.title = ? WHERE t.id = ?', [name, taskId], (error, result) => {
                if (error) {
                    throw error;
                }
                console.log('Задача успешно удалена');
            });
        });

        socket.on('move-column', (data) => {
            const columnId = parseInt(data.columnId);
            const boardId = parseInt(data.boardId);
            connection.query('UPDATE columns t SET t.board_id = ? WHERE t.id = ?', [boardId, columnId], (error, result) => {
                if (error) {
                    throw error;
                }
                connection.query('UPDATE tasks t SET t.board_id = ? WHERE t.column_id = ?', [boardId, columnId], (error, result) => {
                    if (error) {
                        throw error;
                    } });
                console.log('Очередь успешно перемещена');
            });
        });

        socket.on('update-current-task', (data) => {
            const taskId = parseInt(data.taskId);

            const taskQuery = `SELECT t.title
                       FROM tasks t
                       WHERE t.id = ?`;

            const badgeQuery = `SELECT b.id, b.name, b.type
                        FROM task_badges_link tbl
                        JOIN badges b ON tbl.badge_id = b.id
                        WHERE tbl.taskid = ?`;

            connection.query(taskQuery, [taskId], (err, taskResults) => {
                if (err) throw err;

                // Проверка на наличие результата
                if (taskResults.length > 0) {
                    const tasktitle = taskResults[0];

                    // Выполнение второго запроса для бейджей
                    connection.query(badgeQuery, [taskId], (err, badgeResults) => {
                        if (err) throw err;

                        // Преобразование результатов бейджей
                        const badges = badgeResults.map(badge => ({
                            id: badge.id,
                            text: badge.name,
                            type: badge.type
                        }));

                            // Формирование результата в нужном формате
                            const formattedTask = {
                                taskid: taskId,
                                title: tasktitle,
                                badges: badges
                            };

                            socket.emit('update-current-task', {"data": formattedTask});
                        });

                }
            });
        });

        socket.on('remove-label', (data) => {
            const taskId = parseInt(data.task_id);
            const badge_id = parseInt(data.badge_id);
            connection.query('DELETE FROM task_badges_link where taskid = ? and badge_id = ?', [taskId, badge_id], (error, result) => {
                if (error) {
                    throw error;
                }
                console.log('Задача успешно удалена');
            });
        });

        socket.on('add-label', (data) => {
            const taskId = parseInt(data.task_id);
            const name = data.labeltext;
            const type = data.type;

            // Первый запрос: вставка в таблицу badges
            connection.query('INSERT INTO badges (name, type) VALUES (?, ?)', [name, type], (error, result) => {
                if (error) {
                    throw error;
                }

                console.log('Запись успешно добавлена в таблицу badges');

                // После успешной вставки в таблицу badges выполняем второй запрос
                // Второй запрос: вставка в таблицу task_badges_link
                const badgeId = result.insertId; // получаем ID вставленной записи в таблице badges

                connection.query('INSERT INTO task_badges_link (taskid, badge_id) VALUES (?, ?)', [taskId, badgeId], (error, result) => {
                    if (error) {
                        throw error;
                    }

                    console.log('Запись успешно добавлена в таблицу task_badges_link');
                });
            });
        });


        socket.on('add-column', (data) => {
            console.log('Новая очередь:', data);
            const columnTitle = data.name;
            const boardId = parseInt(data.boardId);

            // Выполняем запрос к базе данных MySQL
            connection.query('INSERT INTO columns (title, board_id) VALUES (?, ?)', [columnTitle, boardId], (error, result) => {
                if (error) {
                    throw error;
                }
                console.log('ID вставленной строки: ', result.insertId);
                socket.emit('add-column', {"columnId": result.insertId});
            });

        });


        socket.on('deleted-column', (data) => {
            console.log('Удален столбец:', data);
            const cid = parseInt(data.cid);
            connection.query('UPDATE columns t SET t.deleted = 1 WHERE t.id = ?', [cid], (error, result) => {
                if (error) {
                    throw error;
                }
                console.log('Успешно удалены столбцы в БД');
            });
            connection.query('UPDATE tasks t SET t.deleted = 1 WHERE t.column_id = ?', [cid], (error, result) => {
                if (error) {
                    throw error;
                }
                console.log('Успешно удалены таски в удаленном столбце в БД');
            });
        });

        socket.on('deleted-board', (data) => {
            console.log('Удалена доска:', data);
            const bid = parseInt(data.boardid);
            connection.query('UPDATE boards t SET t.deleted = 1 WHERE t.id = ?', [bid], (error, result) => {
                if (error) {
                    throw error;
                }
                console.log('Успешно удалена доска в БД');
            });
            connection.query('UPDATE columns t SET t.deleted = 1 WHERE t.board_id = ?', [bid], (error, result) => {
                if (error) {
                    throw error;
                }
                console.log('Успешно удалены очереди в БД');
            });
            connection.query('UPDATE tasks t SET t.deleted = 1 WHERE t.board_id = ?', [bid], (error, result) => {
                if (error) {
                    throw error;
                }
                console.log('Успешно удалены таски в удаленных столбцах в БД');
            });
        });

        socket.on('update-task', (data) => {
            // Приводим данные к типу int
            const taskId = parseInt(data.task);
            const columnId = parseInt(data.to);

            console.log('Перемещена задача:', data);

            // Выполняем запрос к базе данных MySQL
            connection.query('UPDATE tasks t SET t.column_id = ? WHERE t.id = ?', [columnId, taskId], (error, result) => {
                if (error) {
                    throw error;
                }
                console.log('Задача успешно перемещена');
            });
        });

        socket.on('update-order', (data) => {
            console.log('Новая сортировка событий:', data);

            data.forEach((item) => {
                const query = `UPDATE columns SET weight = ${item.weight} WHERE id = ${item.id}`;
                connection.query(query, (err, result) => {
                    if (err) throw err;
                    console.log(`Updated weight for id ${item.id} to ${item.weight}`);
                });
            });
        });

        socket.on('update-order-task', (data) => {
            console.log('Новая сортировка задач:', data);

            data.forEach((item) => {
                const query = `UPDATE tasks SET weight = ${item.weight} WHERE id = ${item.id}`;
                connection.query(query, (err, result) => {
                    if (err) throw err;
                    console.log(`Updated weight for id ${item.id} to ${item.weight}`);
                });
            });
        });

        socket.on('disconnect', () => {
            console.log('Пользователь отключился');
        });
    });
}

module.exports = handleSockets;
