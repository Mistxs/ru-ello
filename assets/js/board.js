
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
        colWrapper.innerHTML = `
            <div class="row justify-content-between">
                <span class="handle col"><i class="bx bxs-grid"></i></span>
                <div class="dropdown col text-right">
                    <a class="menu-toggle" href="#" role="button" data-toggle="dropdown" aria-expanded="false">
                        <i class="bx bx-menu"></i>
                    </a>
                    <div class="dropdown-menu" x-placement="bottom-start" style="position: absolute; transform: translate3d(15px, 38px, 0px); top: 0px; left: 0px; will-change: transform;">
                        <a class="dropdown-item delete-column" href="#">Удалить очередь</a>
                        <a class="dropdown-item add-task" href="#">Создать задачу</a>
                        <a class="dropdown-item move-col" href="#">Перенести на доску</a>
                    </div>
                </div>
            </div>  
            <h2>${column.title}</h2>
            
            <div class="column" id="${column.title}" cid="${column.id}"></div>

        `;

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
            taskDiv.innerHTML = `
                    <span class="badge badge-primary"></span>
                    <div class="task-title" data-toggle="modal" data-target="#staticBackdrop">${task.title}</div>
                    <button class="btn delete-task"><i class="bx bx-trash"></i></button>
                   
            `;
            column.appendChild(taskDiv);
        } else {
            console.error(`Column with id ${task.column_id} not found.`);
        }
    });
}