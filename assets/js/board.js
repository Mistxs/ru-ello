
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
        <div class="col-wrapper-fixed">
            <div class="add-column-form">
                <input type="text" id="columnInput" class="column-name form-control" placeholder="Добавить новую очередь" >
                    <button class="add-column btn btn-success">Добавить очередь</button>
            </div>
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

            setTimeout(() => {
                const newBoardItem = document.querySelector(`.boardList li[data-board-id="${board_id}"]`);
                if (newBoardItem) {
                    newBoardItem.classList.add('active'); // Затем добавляем активный класс новому элементу списка
                }
            }, 50);

        })
        .catch(error => {
            console.error('Произошла ошибка:', error);
        });



}

function displayBoards() {
    fetch('/boards')
        .then(response => response.json())
        .then(boards => {
            let boardlists = document.querySelector('.list-group');
            boardlists.innerHTML = "";
            const boardListContainer = document.querySelector('.boardList ul');

            boards.forEach(board => {
                const listItemHTML = `
                    <li class="list-group-item board-item" data-board-id="${board.id}">
                        ${board.title}
                        <span class="delete-board" data-toggle="tooltip" data-placement="right" title="Удалить доску"><i class="bx bx-trash"></i></span>
                    </li>
                `;
                boardListContainer.innerHTML += listItemHTML;
            });

            document.querySelectorAll('.board-item').forEach(listItem => {
                // Слушатель для удаления доски
                listItem.querySelector('.delete-board').addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (confirm('Вы действительно хотите удалить доску?')) {
                        clearBoard();
                        socket.emit('deleted-board', {boardid: listItem.dataset.boardId});
                        displayBoards()
                    };
                });

                // Слушатель для выбора доски
                listItem.addEventListener('click', () => {
                    // Удаляем класс active у всех элементов списка
                    document.querySelectorAll('.board-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    // Добавляем класс active к текущему элементу списка
                    listItem.classList.add('active');


                    // Выполняем другие необходимые действи
                    initializeboard();
                    fetchColumnsAndTasks(listItem.dataset.boardId);

                    // Изменяем заголовок доски
                    const boardTitle = document.querySelector('.board-title');
                    boardTitle.innerHTML = listItem.textContent.trim();
                    console.log(boardTitle);
                });

                // Слушатель для показа иконки при наведении
                listItem.addEventListener('mouseenter', () => {
                    listItem.querySelector('.delete-board').style.visibility = 'visible';
                });
                listItem.addEventListener('mouseleave', () => {
                    listItem.querySelector('.delete-board').style.visibility = 'hidden';
                });
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
    const addColumnForm = board.querySelector('.col-wrapper-fixed');

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