// routes.js
const express = require('express');
const router = express.Router();
const connection = require('./db_connect'); // Импорт модуля подключения к базе данных



// Роут для стартовой страницы
router.get('/', (req, res) => {
    res.send('<h1>Добро пожаловать!</h1><a href="/login">Авторизация / Регистрация</a>');
});

// Роут для страницы регистрации
router.get('/register', (req, res) => {
    res.send('<h1>Регистрация</h1>' +
        '<form action="/register" method="post">' +
        ' <input type="text" name="username" placeholder="Имя пользователя" required><br>' +
        ' <input type="password" name="password" placeholder="Пароль" required><br>' +
        ' <input type="submit" value="Зарегистрироваться">' +
        '</form>');
});


// Роут для обработки данных формы регистрации
router.post('/register', (req, res) => {
    const { username, password } = req.body;
    // Проверяем, не существует ли уже пользователя с таким именем
    connection.query('SELECT * FROM users WHERE username = ?', [username], (error, results) => {
        if (error) {
            throw error;
        }
        if (results.length > 0) {
            res.send('Пользователь с таким именем уже существует');
        } else {
            // Добавляем нового пользователя в базу данных
            connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (error, result) => {
                if (error) {
                    throw error;
                }
                res.send('Регистрация прошла успешно. <a href="/login">Войти</a>');
            });
        }
    });
});



// Роут для страницы авторизации / регистрации
router.get('/login', (req, res) => {
    res.render('login', { pageTitle: 'Авторизация / Регистрация' });
});


// Роут для обработки данных формы авторизации
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Ищем пользователя в базе данных
    connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (error, results) => {
        if (error) {
            throw error;
        }
        if (results.length > 0) {
            // Пользователь существует и аутентификация прошла успешно
            const authenticatedUser = results[0];
            req.session.username = authenticatedUser.username;
            req.session.userId = authenticatedUser.id;
            res.redirect('/user');
        } else {
            res.send('Неправильное имя пользователя или пароль');
        }
    });
});


// Основной роут приложения
router.get('/user', (req, res) => {
    const username = req.session.username; // Получаем имя пользователя из сеанса
    const userid = req.session.userId;
    if (userid) {
        res.render('user', { userid: userid, username: username, pageTitle: "ru-ello"});
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

// Получение задач для выбранной доски
router.get('/tasks/:boardId', (req, res) => {
    const boardId = req.params.boardId;
    const query = `SELECT * FROM tasks WHERE board_id = ? and deleted = 0 order by column_id, weight asc `;
    connection.query(query, [boardId], (err, results) => {
        if (err) throw err;
        res.json(results);
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
