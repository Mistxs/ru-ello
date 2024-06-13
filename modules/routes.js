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



// Основной роут приложения
router.get('/user', (req, res) => {
    const username = req.session.username; // Получаем имя пользователя из сеанса
    const userid = req.session.userId;
    if (userid) {
        res.render('user', { userid: userid, username: username, pageTitle: "Ru-ello"});
    } else {
        res.redirect('/login'); // Если пользователь не авторизован, перенаправляем на страницу авторизации
    }
});

// Получение списка досок пользователя
router.get('/boards', (req, res) => {
    const userId = req.session.userId;
    const query = `SELECT * FROM boards WHERE user_id = ? AND deleted = 0`;
    connection.query(query, [userId], (err, results) => {
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
        SELECT t.id, t.title, t.column_id, t.weight, b.id as badge_id, b.name, b.type
        FROM tasks t
        LEFT JOIN task_badges_link tbl ON t.id = tbl.taskid
        LEFT JOIN badges b ON tbl.badge_id = b.id
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
    const taskQuery = `SELECT t.title, t.description, t.createdate, t.deadline, c.title AS column_title
                       FROM tasks t
                       JOIN columns c ON t.column_id = c.id
                       WHERE t.id = ?`;

    // Запрос для бейджей
    const badgeQuery = `SELECT b.id, b.name, b.type
                        FROM task_badges_link tbl
                        JOIN badges b ON tbl.badge_id = b.id
                        WHERE tbl.taskid = ?`;

    // Запрос для комментов
    const commentQuery = `SELECT c.id, c.text, c.createdate
                          FROM comments c
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
                        id: comment.id
                    }));

                    // Формирование результата в нужном формате
                    const formattedTask = {
                        taskid: taskId,
                        title: task.title,
                        description: task.description,
                        cdate: task.createdate,
                        deadline: task.deadline,
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

router.post('/task-info/:taskId/save', (req, res) => {
    const taskId = req.params.taskId;
    const deadline = req.body.deadline;
    const comments = req.body.comments;
    const description = req.body.description;

    connection.query('UPDATE ruello.tasks SET deadline = ?, description = ? WHERE id = ?', [deadline, description, taskId], (error, result) => {
        if (error) {
            throw error;
        }

        // Получение текущих комментариев для задачи
        connection.query('SELECT id FROM ruello.comments WHERE task_id = ? AND deleted = 0', [taskId], (error, rows) => {
            if (error) {
                throw error;
            }

            const currentCommentIds = rows.map(row => row.id);

            // Обработка пришедших от клиента комментариев
            comments.forEach(comment => {
                if (comment.id === null) {
                    // Это новый комментарий, добавляем его в базу данных
                    connection.query('INSERT INTO ruello.comments (text, createdate, task_id) VALUES (?, ?, ?)',
                        [comment.text, comment.datetime, taskId],
                        (error, result) => {
                            if (error) {
                                throw error;
                            }
                        });
                } else {
                    // Помечаем старые комментарии как удаленные, если они не были обновлены
                    if (!currentCommentIds.includes(comment.id)) {
                        connection.query('UPDATE ruello.comments SET deleted = 1 WHERE task_id = ? AND id not in (?)',
                            [taskId, comment.id],
                            (error, result) => {
                                if (error) {
                                    throw error;
                                }
                            });
                    }
                }
            });

            // Отправляем успешный ответ клиенту
            res.status(200).json({ message: 'Задача успешно сохранена' });
        });
    });
});


// Роут для выхода
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/login'); // Перенаправление на страницу авторизации
    });
});


module.exports = router;
