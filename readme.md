# ru-ello

## Установка

1. Клонируйте репозиторий:
    ```bash
    git clone https://github.com/Mistxs/ru-ello.git
    ```

2. Установите зависимости:
    ```bash
    npm install
    ```
3. Пропишите доступы к базе данных mysql в файл modules/db_connect.js
    ```bash
    nano modules/db_connect.js
    ```


4. Создайте таблицы в базе данных:
    ```bash
    npm run setupdb
    ```

4. Запустите проект:
    ```bash
    npm start
    ```
