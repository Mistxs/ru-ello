// Подключение библиотек
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const ejs = require('ejs');
const path = require('path');




// Создание экземпляра приложения Express
const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);



// Парсинг тела запроса
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: '(!78675&^!%!)',
    resave: false,
    saveUninitialized: true
}));
app.use(express.json());

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
    if (err) {
        console.error('Error connecting to database: ' + err.stack);
        return;
    }
    console.log('Connected to database as id ' + connection.threadId);
});


io.on('connection', (socket) => {
    console.log('Подключился пользователь'  );

    socket.on('add-task', (data) => {
        // Обрабатывать данные о новой задаче, отправленные от клиента
        console.log('Новая задача:', data);

        // Здесь вы можете добавить код для сохранения этой задачи в базу данных MySQL
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
        // Обрабатывать данные о новой задаче, отправленные от клиента
        console.log('Удалена задача:', data);
        const taskId = parseInt(data.task);
        connection.query('UPDATE ruello.tasks t SET t.deleted = 1 WHERE t.id = ?', [taskId], (error, result) => {
            if (error) {
                throw error;
            }
            console.log('Задача успешно удалена');
        });
    });

    socket.on('add-column', (data) => {
        // Обрабатывать данные о новой задаче, отправленные от клиента
        console.log('Новая очередь:', data);

        // Здесь вы можете добавить код для сохранения этой задачи в базу данных MySQL
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
        // Обрабатывать данные о новой задаче, отправленные от клиента
        console.log('Удален столбец:', data);
        // Здесь вы можете добавить код для сохранения этой задачи в базу данных MySQL
        const cid = parseInt(data.cid);
        connection.query('UPDATE ruello.columns t SET t.deleted = 1 WHERE t.id = ?', [cid], (error, result) => {
            if (error) {
                throw error;
            }
            console.log('Успешно удалены столбцы в БД');
        });
        connection.query('UPDATE ruello.tasks t SET t.deleted = 1 WHERE t.column_id = ?', [cid], (error, result) => {
            if (error) {
                throw error;
            }
            console.log('Успешно удалены таски в удаленном столбце в БД');
        });
    });

    socket.on('update-task', (data) => {
        // Приводим данные к типу int
        const taskId = parseInt(data.task);
        const columnId = parseInt(data.to);

        // Обрабатываем данные о новой задаче, отправленные от клиента
        console.log('Перемещена задача:', data);

        // Выполняем запрос к базе данных MySQL
        connection.query('UPDATE ruello.tasks t SET t.column_id = ? WHERE t.id = ?', [columnId, taskId], (error, result) => {
            if (error) {
                throw error;
            }
            console.log('Задача успешно перемещена');
        });
    });




    // Добавьте другие обработчики событий при необходимости

    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
    });
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
            req.session.userId = authenticatedUser.id;
            res.redirect('/user');
        } else {
            res.send('Неправильное имя пользователя или пароль');
        }
    });
});


// Роут для включения views/board.html
app.get('/user', (req, res) => {
    const username = req.session.username; // Получаем имя пользователя из сеанса
    const userid = req.session.userId;
    if (userid) {
        res.render('user', { userid: userid, username: username});
    } else {
        res.redirect('/login'); // Если пользователь не авторизован, перенаправляем на страницу авторизации
    }
});

// Получение списка досок пользователя
app.get('/boards', (req, res) => {
    const userId = req.session.userId;
    const query = `SELECT * FROM boards WHERE user_id = ? AND deleted = 0`;
    connection.query(query, [userId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.post('/boards/create', (req, res) => {
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
app.get('/columns/:boardId', (req, res) => {
    const boardId = req.params.boardId;
    const query = `SELECT * FROM columns WHERE board_id = ? and deleted = 0`;
    connection.query(query, [boardId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Получение задач для выбранной доски
app.get('/tasks/:boardId', (req, res) => {
    const boardId = req.params.boardId;
    const query = `SELECT * FROM tasks WHERE board_id = ? and deleted = 0`;
    connection.query(query, [boardId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});



// Роут для выхода
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/login'); // Перенаправление на страницу авторизации
    });
});




// Запуск сервера
const port = 3600;

http.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});
