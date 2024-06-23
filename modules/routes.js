// routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const connection = require('./db_connect'); // Импорт модуля подключения к базе данных
const flash = require('connect-flash');
const { body, validationResult } = require('express-validator');

function validateLoginInput(username, password) {
    const errors = [];
    if (!username || !password) {
        errors.push('Все поля обязательны для заполнения');
    }
    if (username.length < 6 || username.length > 12) {
        errors.push('Логин должен быть от 6 до 12 символов');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        errors.push('Логин может содержать только латинские буквы, цифры, "_" и "-"');
    }
    if (password.length < 6) {
        errors.push('Пароль должен быть не менее 6 символов');
    }
    if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(password)) {
        errors.push('Пароль может содержать только латинские буквы и символы');
    }
    return errors;
}

router.use(flash());

router.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// Middleware для проверки авторизации
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(403).send('Доступ запрещен');
    }
}


// Роут для стартовой страницы
router.get('/', (req, res) => {
    res.redirect('/user');
});

// Роут для страницы регистрации
router.get('/register', (req, res) => {
    res.render('register', { pageTitle: 'Регистрация' });
});

router.get('/login', (req, res) => {
    res.render('login', { pageTitle: 'Вход в программу' });
});


// Роут для обработки данных формы регистрации
router.post('/register', (req, res) => {
    const { name, login, password } = req.body;
    const validationErrors = validateLoginInput(login, password);

    if (validationErrors.length > 0) {
        req.flash('error_msg', validationErrors);
        return res.redirect('/register');
    }

    connection.query('SELECT * FROM users WHERE login = ?', [login], async (error, results) => {
        if (error) {
            throw error;
        }
        if (results.length > 0) {
            req.flash('error_msg', 'Пользователь с таким именем уже существует');
            res.redirect('/register');
        } else {
            try {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                connection.query('INSERT INTO users (name, login, password) VALUES (?, ?, ?)', [name, login, hashedPassword], (error, result) => {
                    if (error) {
                        throw error;
                    }
                    req.flash('success_msg', 'Регистрация прошла успешно. Теперь вы можете войти.');
                    res.redirect('/login');
                });
            } catch (err) {
                console.error(err);
                req.flash('error_msg', 'Произошла ошибка при хэшировании пароля');
                res.redirect('/register');
            }
        }
    });
});



// Роут для страницы авторизации / регистрации
router.get('/login', (req, res) => {
    res.render('login', { pageTitle: 'Вход в программу' });
});


// Роут для обработки данных формы авторизации
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const validationErrors = validateLoginInput(username, password);

    if (validationErrors.length > 0) {
        req.flash('error_msg', validationErrors);
        return res.redirect('/login');
    }

    // Ищем пользователя в базе данных по имени пользователя
    connection.query('SELECT * FROM users WHERE login = ?', [username], async (error, results) => {
        if (error) {
            throw error;
        }
        if (results.length > 0) {
            const authenticatedUser = results[0];

            // Сравниваем введенный пароль с хэшированным паролем из базы данных
            const isMatch = await bcrypt.compare(password, authenticatedUser.password);

            if (isMatch) {
                // Пользователь существует и аутентификация прошла успешно
                req.session.username = authenticatedUser.name;
                req.session.userId = authenticatedUser.id;
                req.session.role = authenticatedUser.role;
                res.redirect('/user');
            } else {
                req.flash('error_msg', 'Неправильное имя пользователя или пароль');
                res.redirect('/login');
            }
        } else {
            req.flash('error_msg', 'Неправильное имя пользователя или пароль');
            res.redirect('/login');
        }
    });
});


router.get('/user', (req, res) => {
    const username = req.session.username;
    const userid = req.session.userId;
    const userRole = req.session.role; // Предполагаем, что роль пользователя сохраняется в сеансе
    if (userid) {
        res.render('user', {
            userid: userid,
            username: username,
            role: userRole, // Передаем роль в шаблон
            pageTitle: "Ru-ello"
        });
    } else {
        res.redirect('/login');
    }
});


// Рендер страницы восстановления удаленных
router.get('/restore', (req, res) => {
    const username = req.session.username; // Получаем имя пользователя из сеанса
    const userid = req.session.userId;
    if (userid) {
        res.render('restore', { userid: userid, username: username, pageTitle: "Восстановление удаленных"});
    } else {
        res.redirect('/login'); // Если пользователь не авторизован, перенаправляем на страницу авторизации
    }
});

// Показ удаленных сущностей
router.get('/restore/:entity', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const entity = req.params.entity;

    if (entity === 'tasks') {
        // Запрос для восстановления удаленных задач
        const query = `
            SELECT t.id as 'id', t.title AS 'Название задачи', c.title AS 'Очередь'
            FROM tasks t
            JOIN boards b ON t.board_id = b.id
            JOIN columns c ON t.column_id = c.id
            WHERE t.deleted = 1 AND b.deleted = 0 AND c.deleted = 0 AND b.user_id = ?
        `;

        connection.query(query, [userId], (err, results) => {
            if (err) {
                console.error('Ошибка выполнения запроса:', err);
                res.status(500).send('Произошла ошибка на сервере');
                return;
            }
            res.json(results); // Отправляем результаты запроса в формате JSON
        });
    }
    else if (entity === 'columns') {
        // Запрос для восстановления удаленных очередей
        const query = `
            select c.id as 'id', c.title as 'Название очереди', b.title as 'Название доски'
            from columns c
            join boards b on c.board_id = b.id
            where c.deleted = 1 and b.user_id = ? and b.deleted = 0
        `;

        connection.query(query, [userId], (err, results) => {
            if (err) {
                console.error('Ошибка выполнения запроса:', err);
                res.status(500).send('Произошла ошибка на сервере');
                return;
            }
            res.json(results); // Отправляем результаты запроса в формате JSON
        });
    }

    else if (entity === 'boards') {
        // Запрос для восстановления удаленных очередей
        const query = `
            select id, title as 'Название' from boards where deleted = 1 and user_id = ?
        `;

        connection.query(query, [userId], (err, results) => {
            if (err) {
                console.error('Ошибка выполнения запроса:', err);
                res.status(500).send('Произошла ошибка на сервере');
                return;
            }
            res.json(results); // Отправляем результаты запроса в формате JSON
        });
    }

    else if (entity === 'comments') {
        // Запрос для восстановления удаленных очередей
        const query = `
            select c.id as 'id', c.text as 'Комментарий', c.createdate as 'Дата создания', t.title as 'Название задачи'
            from comments c
            join tasks t on c.task_id = t.id
            join boards b on t.board_id = b.id
            where c.deleted = 1 and t.deleted = 0 and b.deleted = 0 and b.user_id = ?
        `;

        connection.query(query, [userId], (err, results) => {
            if (err) {
                console.error('Ошибка выполнения запроса:', err);
                res.status(500).send('Произошла ошибка на сервере');
                return;
            }
            res.json(results); // Отправляем результаты запроса в формате JSON
        });
    }

    else {
        res.status(400).send('Неправильный тип сущности'); // Ошибка 400, если тип сущности не поддерживается
    }
});

// Восстановление удаленной сущности
router.post('/restoreEntity/:entity/:id', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const entity = req.params.entity;
    const id = req.params.id;

    if (entity === 'tasks') {
        // Запрос для восстановления удаленных задач
        const query = `
            update tasks set deleted = 0 where id = ?
        `;

        connection.query(query, [id], (err, results) => {
            if (err) {
                console.error('Ошибка выполнения запроса:', err);
                res.status(500).send('Произошла ошибка на сервере');
                return;
            }
            res.status(202).json({"status": "ok"});
        });
    }
    else if (entity === 'columns') {
        // Запрос для восстановления удаленных очередей
        const query = `
            update columns set deleted = 0 where id = ?
        `;

        connection.query(query, [id], (err, results) => {
            if (err) {
                console.error('Ошибка выполнения запроса:', err);
                res.status(500).send('Произошла ошибка на сервере');
                return;
            }
            res.status(202).json({"status": "ok"});
        });
    }

    else if (entity === 'boards') {
        // Запрос для восстановления удаленных очередей
        const query = `
            update boards set deleted = 0 where id = ?
        `;

        connection.query(query, [id], (err, results) => {
            if (err) {
                console.error('Ошибка выполнения запроса:', err);
                res.status(500).send('Произошла ошибка на сервере');
                return;
            }
            res.status(202).json({"status": "ok"});
        });
    }

    else if (entity === 'comments') {
        // Запрос для восстановления удаленных очередей
        const query = `
            update comments set deleted = 0 where id = ?
        `;

        connection.query(query, [id], (err, results) => {
            if (err) {
                console.error('Ошибка выполнения запроса:', err);
                res.status(500).send('Произошла ошибка на сервере');
                return;
            }
            res.status(202).json({"status": "ok"});
        });
    }

    else {
        res.status(400).send('Неправильный тип сущности'); // Ошибка 400, если тип сущности не поддерживается
    }
});



// Получение списка досок пользователя
router.get('/boards', (req, res) => {
    const userId = req.session.userId;
    const query = `
        SELECT b.*, u.name as 'user_name'
        FROM boards b
        join users u on b.user_id = u.id
        WHERE b.user_id = ? AND b.deleted = 0 
        OR b.id IN (SELECT board_id FROM board_user_link WHERE user_id = ?)
    `;
    connection.query(query, [userId, userId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});


router.post('/boards/create', (req, res) => {
    const userId = req.session.userId;
    const title = req.body.title; // Предполагается, что вы хотели получить заголовок новой доски из запроса
    const query = 'INSERT INTO boards (title, user_id) VALUES (?, ?)';
    connection.query(query, [title, userId], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка при создании доски' });
            throw err;
        } else {
            res.status(200).json({ message: 'Доска успешно создана', id: results.insertId });
        }
    });
});


// Получение колонок для выбранной доски
router.get('/columns/:boardId', (req, res) => {
    const boardId = req.params.boardId;
    const query = `SELECT * FROM columns WHERE board_id = ? and deleted = 0 order by weight asc`;
    connection.query(query, [boardId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Получение задач для выбранной доски с информацией о бейджах и с сортировкой
router.get('/tasks/:boardId', (req, res) => {
    const boardId = req.params.boardId;
    const query = `
        SELECT t.id, t.title, t.column_id, t.weight, u.name AS assigned_user_name, b.id as badge_id, b.name, b.type
        FROM tasks t
        LEFT JOIN task_badges_link tbl ON t.id = tbl.taskid
        LEFT JOIN badges b ON tbl.badge_id = b.id
        LEFT JOIN users u ON t.assigned_user_id = u.id
        WHERE t.board_id = ? AND t.deleted = 0
        ORDER BY t.column_id, t.weight ASC
    `;
    connection.query(query, [boardId], (err, results) => {
        if (err) {
            console.error('Error fetching tasks:', err);
            res.status(500).json({ error: 'Failed to fetch tasks' });
            return;
        }

        // Группировка результатов по задачам с их бейджами
        const tasks = {};
        results.forEach(row => {
            if (!tasks[row.id]) {
                tasks[row.id] = {
                    taskid: row.id,
                    title: row.title,
                    column_id: row.column_id,
                    weight: row.weight,
                    assigned_user_name: row.assigned_user_name,
                    badges: []
                };
            }
            if (row.badge_id) { // если есть бейдж для текущей задачи
                tasks[row.id].badges.push({
                    id: row.badge_id,
                    name: row.name,
                    type: row.type
                });
            }
        });

        // Преобразование объекта задач в массив для JSON-ответа, отсортированного по column_id и weight
        const sortedTasks = Object.values(tasks).sort((a, b) => {
            if (a.column_id === b.column_id) {
                return a.weight - b.weight;
            }
            return a.column_id - b.column_id;
        });

        res.json(sortedTasks);
    });
});



// Получение доп инфо о карточке
router.get('/task-info/:taskId', (req, res) => {
    const taskId = req.params.taskId;

    // Запрос для основной информации о задаче
    const taskQuery = `SELECT t.title, t.description, t.createdate, t.deadline, c.title AS column_title, t.assigned_user_id, u.name AS assigned_user_name
                       FROM tasks t
                       JOIN columns c ON t.column_id = c.id
                       LEFT JOIN users u ON t.assigned_user_id = u.id
                       WHERE t.id = ?`;

    // Запрос для бейджей
    const badgeQuery = `SELECT b.id, b.name, b.type
                        FROM task_badges_link tbl
                        JOIN badges b ON tbl.badge_id = b.id
                        WHERE tbl.taskid = ?`;

    // Запрос для комментов
    const commentQuery = `SELECT c.id, c.text, c.createdate, c.user_id, u.name
                          FROM comments c
                          left join users u on c.user_id = u.id
                          WHERE c.task_id = ? AND c.deleted = 0`;

    // Выполнение первого запроса
    connection.query(taskQuery, [taskId], (err, taskResults) => {
        if (err) throw err;

        // Проверка на наличие результата
        if (taskResults.length > 0) {
            const task = taskResults[0];

            // Выполнение второго запроса для бейджей
            connection.query(badgeQuery, [taskId], (err, badgeResults) => {
                if (err) throw err;

                // Преобразование результатов бейджей
                const badges = badgeResults.map(badge => ({
                    id: badge.id,
                    text: badge.name,
                    type: badge.type
                }));

                // Выполнение третьего запроса для комментариев
                connection.query(commentQuery, [taskId], (err, commentResults) => {
                    if (err) throw err;

                    // Преобразование результатов комментариев
                    const comments = commentResults.map(comment => ({
                        text: comment.text,
                        createdate: comment.createdate,
                        id: comment.id,
                        username: comment.name,
                    }));

                    // Формирование результата в нужном формате
                    const formattedTask = {
                        taskid: taskId,
                        title: task.title,
                        description: task.description,
                        cdate: task.createdate,
                        deadline: task.deadline,
                        assigned_user_id: task.assigned_user_id,
                        assigned_user_name: task.assigned_user_name,
                        column: task.column_title,
                        badges: badges,
                        comments: comments
                    };

                    res.json(formattedTask);
                });
            });
        } else {
            res.status(404).json({ message: 'Task not found' });
        }
    });
});


// сохранение карточки
router.post('/task-info/:taskId/save', (req, res) => {
    const taskId = req.params.taskId;
    const deadline = req.body.deadline;
    const comments = req.body.comments;
    const description = req.body.description;
    const userId = req.session.userId;

    connection.query('UPDATE tasks SET deadline = ?, description = ? WHERE id = ?', [deadline, description, taskId], (error, result) => {
        if (error) {
            throw error;
        }

        // Получение текущих комментариев для задачи
        connection.query('SELECT id FROM comments WHERE task_id = ? AND deleted = 0', [taskId], (error, rows) => {
            if (error) {
                throw error;
            }

            const currentCommentIds = rows.map(row => row.id);
            let commentsfront = []
            // Обработка пришедших от клиента комментариев
            if (comments.length === 0) {
                // Если список комментариев пуст, удаляем все комментарии для данной задачи
                connection.query('UPDATE comments SET deleted = 1 WHERE task_id = ?',
                    [taskId],
                    (error, result) => {
                        if (error) {
                            throw error;
                        }
                    });
            } else {
                comments.forEach(comment => {
                    if (comment.id === null) {
                        // Это новый комментарий, добавляем его в базу данных
                        connection.query('INSERT INTO comments (text, createdate, task_id, user_id) VALUES (?, ?, ?, ?)',
                            [comment.text, comment.datetime, taskId, userId],
                            (error, result) => {
                                if (error) {
                                    throw error;
                                }
                            });
                    } else {
                        commentsfront.push(parseInt(comment.id));
                        }
                });

                const commentsToDelete = currentCommentIds.filter(commentId => !commentsfront.includes(commentId));

                // Выполнить запрос на обновление
                if (commentsToDelete.length > 0) {
                    const placeholders = commentsToDelete.map(() => '?').join(',');
                    const updateQuery = `UPDATE comments SET deleted = 1 WHERE task_id = ? AND id IN (${placeholders})`;

                    connection.query(updateQuery, [taskId, ...commentsToDelete], (error, result) => {
                        if (error) {
                            throw error;
                        }
                        console.log(`Deleted ${result.affectedRows} comments`);
                    });
                }
            }


            // Отправляем успешный ответ клиенту
            res.status(200).json({ message: 'Задача успешно сохранена' });
        });
    });
});

router.post('/task-assign', (req, res) => {
    const { taskId, userId } = req.body;

    const assignUserQuery = `UPDATE tasks SET assigned_user_id = ? WHERE id = ?`;

    connection.query(assignUserQuery, [userId, taskId], (err, result) => {
        if (err) {
            console.error('Error assigning user:', err);
            res.status(500).send('Internal server error');
        } else {
            res.send('Task assigned successfully');
        }
    });
});

router.get('/task/users', (req, res) => {
    const usersQuery = `SELECT id, name FROM users`;

    connection.query(usersQuery, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            res.status(500).send('Internal server error');
        } else {
            res.json(results);
        }
    });
});


// Роут для выхода
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/login'); // Перенаправление на страницу авторизации
    });
});


router.post('/users', (req, res) => {
    const boardId = req.body.boardId;
    const userId = req.session.userId;
    const query = `
        SELECT u.id, u.name, u.login,
        CASE
            WHEN bul.board_id IS NOT NULL THEN 1
            ELSE 0
        END AS is_linked
        FROM users u
        LEFT JOIN board_user_link bul ON u.id = bul.user_id AND bul.board_id = ? where u.id not in (?)
    `;
    connection.query(query, [boardId, userId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});


router.post('/boards/addUser', (req, res) => {
    const userId  = req.body.userId;
    const boardId = req.body.boardId;

    const query = 'INSERT INTO board_user_link (board_id, user_id) VALUES (?, ?)';
    connection.query(query, [boardId, userId], (err, results) => {
        if (err) throw err;
        res.json({ success: true });
    });
});

router.post('/boards/removeUser', (req, res) => {
    const userId  = req.body.userId;
    const boardId = req.body.boardId;

    const query = 'DELETE FROM board_user_link WHERE board_id = ? AND user_id = ?';
    connection.query(query, [boardId, userId], (err, results) => {
        if (err) throw err;
        res.json({ success: true });
    });
});


module.exports = router;
