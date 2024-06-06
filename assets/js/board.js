
function clearBoard(){
    const board = document.querySelector('.board');
    const boardtitle = document.querySelector('.board-title');
    boardtitle.innerHTML = "";
    board.innerHTML = ``;
}

function initializeboard(){
    clearBoard();
    const board = document.querySelector('.board');
    board.innerHTML = `
        <div class="add-column-form">
            <input type="text" class="column-name" placeholder="New column name">
                <button class="add-column">Add Column</button>
        </div>`;
}

function addboard(){
    const addboard = document.querySelector('.add-board');
    const boardNameInput = addboard.querySelector('input');
    fetch('/boards/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: boardNameInput.value })
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Ошибка при создании доски');
            }
        })
        .then(data => {
            const board_id = data.id;
            const boardTitle = document.querySelector('.board-title');
            initializeboard();
            displayBoards();
            boardTitle.textContent = boardNameInput.value;
            fetchColumnsAndTasks(board_id);
            boardNameInput.value = "";
        })
        .catch(error => {
            console.error('Произошла ошибка:', error);
        });



}

function displayBoards() {
    fetch('/boards')
        .then(response => response.json())
        .then(boards => {
            let boardlists = document.querySelector('.boardList');
            boardlists.innerHTML = "";
            // Отображение полученного списка досок
            boards.forEach(board => {
                const boardButton = document.createElement('button');
                const boardTitle = document.querySelector('.board-title');
                boardButton.textContent = board.title;

                boardButton.addEventListener('click', () => {
                    initializeboard();
                    boardTitle.textContent = board.title;
                    fetchColumnsAndTasks(board.id);
                });
                boardlists.appendChild(boardButton);
            });
        });
}

// Функция для получения колонок и задач по boardId с бэка
function fetchColumnsAndTasks(boardId) {
    // Получение колонок
    fetch(`/columns/${boardId}`)
        .then(response => response.json())
        .then(columns => {
            displayColumns(columns, boardId);
            // Получение задач
            fetch(`/tasks/${boardId}`)
                .then(response => response.json())
                .then(tasks => {
                    displayTasks(tasks);
                });
        });
}

function displayColumns(columns, boardId) {
    const board = document.querySelector('.board');
    const boardTitle = document.querySelector('.board-title');
    const deletebutton = document.createElement('button');
    deletebutton.classList.add('delete-board');
    deletebutton.textContent = 'Удалить доску';
    boardTitle.appendChild(deletebutton);

    board.setAttribute("boardId", boardId);
    const addColumnForm = board.querySelector('.add-column-form');

    columns.forEach(column => {
        const colWrapper = document.createElement('div');
        colWrapper.classList.add('col-wrapper');

        const moveblock = document.createElement('span');
        moveblock.classList.add('handle');
        moveblock.textContent = '+';
        colWrapper.appendChild(moveblock);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-column');
        deleteButton.textContent = 'Delete Column';
        colWrapper.appendChild(deleteButton);

        const h2 = document.createElement('h2');
        h2.textContent = column.title;
        colWrapper.appendChild(h2);

        const form = document.createElement('form');
        form.classList.add('add-task-form');
        const input = document.createElement('input');
        input.setAttribute('type', 'text');
        input.setAttribute('placeholder', 'New task');
        const submitButton = document.createElement('button');
        submitButton.setAttribute('type', 'submit');
        submitButton.textContent = 'Add';
        form.appendChild(input);
        form.appendChild(submitButton);
        colWrapper.appendChild(form);

        const columnDiv = document.createElement('div');
        columnDiv.classList.add('column');
        columnDiv.id = column.title;
        columnDiv.setAttribute("cid",column.id);
        colWrapper.appendChild(columnDiv);

        board.insertBefore(colWrapper, addColumnForm);
        drake.containers.push(colWrapper.querySelector('.column'));

    });
}

function displayTasks(tasks) {
    tasks.forEach(task => {
        const column = document.querySelector(`[cid="${task.column_id}"]`);
        if (column) {
            const taskDiv = document.createElement('div');
            taskDiv.classList.add('task');
            taskDiv.setAttribute("task_id", task.id);
            taskDiv.textContent = task.title;
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-task');
            deleteButton.textContent = 'Delete';
            taskDiv.appendChild(deleteButton);
            column.appendChild(taskDiv);
        } else {
            console.error(`Column with id ${task.column_id} not found.`);
        }
    });
}