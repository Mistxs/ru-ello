// Подключение библиотек
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

// Создание экземпляра приложения Express
const app = express();

// Парсинг тела запроса
app.use(bodyParser.urlencoded({ extended: true }));

// Подключение к MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Ose7vgt5!',
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
            res.redirect('/user');
        } else {
            res.send('Неправильное имя пользователя или пароль');
        }
    });
});


// Страница авторизованного пользователя
app.get('/user', (req, res) => {
    res.send('<h1>Добро пожаловать, Авторизованный Пользователь</h1>');
});


// Запуск сервера
const PORT = 3600;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
