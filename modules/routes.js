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
