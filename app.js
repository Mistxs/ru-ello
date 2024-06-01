// Подключение библиотек
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const ejs = require('ejs');
const path = require('path');


// Создание экземпляра приложения Express
const app = express();

// Парсинг тела запроса
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: '(!78675&^!%!)',
    resave: false,
    saveUninitialized: true
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Подключение к MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'ruello',
    password: 'ruellopassword',
    database: 'ruello'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Подключено к MySQL');
});

// Роут для стартовой страницы
app.get('/', (req, res) => {
    res.send('<h1>Добро пожаловать!</h1><a href="/login">Авторизация / Регистрация</a>');
});

// Роут для страницы регистрации
app.get('/register', (req, res) => {
    res.send('<h1>Регистрация</h1>' +
        '<form action="/register" method="post">' +
        ' <input type="text" name="username" placeholder="Имя пользователя" required><br>' +
        ' <input type="password" name="password" placeholder="Пароль" required><br>' +
        ' <input type="submit" value="Зарегистрироваться">' +
        '</form>');
});



// Роут для обработки данных формы регистрации
app.post('/register', (req, res) => {
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
app.get('/login', (req, res) => {
    res.send('<h1>Авторизация / Регистрация</h1>' +
        '<form action="/login" method="post">' +
        ' <input type="text" name="username" placeholder="Имя пользователя" required><br>' +
        ' <input type="password" name="password" placeholder="Пароль" required><br>' +
        ' <input type="submit" value="Войти">' +
        '</form>');
});


// Роут для обработки данных формы авторизации
app.post('/login', (req, res) => {
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
            res.redirect('/user');
        } else {
            res.send('Неправильное имя пользователя или пароль');
        }
    });
});


// Роут для включения views/board.html
app.get('/user', (req, res) => {
    const username = req.session.username; // Получаем имя пользователя из сеанса
    res.render('user', { username: username }); // Создание и отображение шаблона user.ejs, где board.html уже подключен
});



// Роут для выхода
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/login'); // Перенаправление на страницу авторизации
    });
});




// Запуск сервера
const PORT = 3600;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
