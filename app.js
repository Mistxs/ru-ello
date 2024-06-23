// Подключение библиотек
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const ejs = require('ejs');
const path = require('path');
const socketHandler = require('./modules/socketHandler');
const routes = require('./modules/routes');


// Создание экземпляра приложения Express
const app = express();

app.use(express.static(__dirname));

const http = require('http').createServer(app);


// Парсинг тела запроса
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: '(!78675&^!%!)',
    resave: false,
    saveUninitialized: true
}));
app.use(express.json());
app.use(express.static(`${__dirname}/assets`));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Подключение сокетов
socketHandler(http);

// Подключение маршрутов
app.use('/', routes);

const port = 3700;

http.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});


