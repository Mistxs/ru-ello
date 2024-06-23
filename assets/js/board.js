
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

let board_items = [];

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
            board_items = boards;
            let boardlists = document.querySelector('.list-group');
            boardlists.innerHTML = "";
            const boardListContainer = document.querySelector('.boardList ul');
            const currentUser = parseInt(document.querySelector('.userinfo').getAttribute("userid"));

            boards.forEach(board => {
                const boardUserId = parseInt(board.user_id); // Приводим board.user_id к числовому типу
                const sharedIcon = boardUserId !== currentUser ?
                    `<div class="sharedicon" data-toggle="tooltip" data-placement="top" data-original-title="Доской поделился пользователь ${board.user_name}">
                        <i class='bx bxs-share-alt'></i></div>` : '';

                const listItemHTML =
                    `<li class="list-group-item board-item" data-board-id="${board.id}">
                        ${board.title}
                        ${sharedIcon}
                        <span class="delete-board" data-toggle="tooltip" data-placement="right" title="Удалить доску"><i class="bx bx-trash"></i></span>
                    </li>`;

                boardListContainer.innerHTML += listItemHTML;
            });

            $(function () {
                $('[data-toggle="tooltip"]').tooltip()
            })

            // После добавления элементов в DOM инициализируем tooltip для каждой иконки "поделилась доской"
            boardListContainer.querySelectorAll('[data-toggle="tooltip"]').forEach(item => {
                new bootstrap.Tooltip(item);
            });

            document.querySelectorAll('.board-item').forEach(listItem => {
                listItem.addEventListener('click', () => {
                    document.querySelectorAll('.board-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    listItem.classList.add('active');

                    initializeboard();
                    fetchColumnsAndTasks(listItem.dataset.boardId);

                    const boardTitle = document.querySelector('.board-title');
                    boardTitle.innerHTML = listItem.textContent.trim();
                });

                listItem.addEventListener('mouseenter', () => {
                    listItem.querySelector('.delete-board').style.visibility = 'visible';

                });

                listItem.addEventListener('mouseleave', () => {
                    listItem.querySelector('.delete-board').style.visibility = 'hidden';

                });

                listItem.querySelector('.delete-board').addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (confirm('Вы действительно хотите удалить доску?')) {
                        clearBoard();
                        socket.emit('deleted-board', {boardid: listItem.dataset.boardId});
                        displayBoards();
                    }
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
                        <a class="dropdown-item move-col" href="#" data-toggle="modal" data-target="#move-column" onclick="getboard(${column.id})">Перенести на доску</a>
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
            taskDiv.setAttribute("task_id", task.taskid); // используем taskid вместо id
            taskDiv.innerHTML = `
            <div class="task-wrapper">
                <div class="badge-lists"></div>
                <div class="task-title" data-toggle="modal" data-target="#staticBackdrop" >${task.title}</div>
                <div class="task-user" style="display: flex; align-items: center;">
                   ${task.assigned_user_name ? createAvatar(task.assigned_user_name) + `<span>${task.assigned_user_name}</span>` : ''}
                </div>            
            </div>
                <button class="btn delete-task"><i class="bx bx-trash"></i></button>
            `;

            // Добавляем бейджи
            const badgeList = taskDiv.querySelector('.badge-lists');
            task.badges.forEach(badge => {
                const badgeElement = document.createElement('span');
                badgeElement.classList.add('badge', `badge-${badge.type}`, 'm-1');
                badgeElement.textContent = badge.name; // выводим имя бейджа
                badgeList.appendChild(badgeElement);
            });

            column.appendChild(taskDiv);
        } else {
            console.error(`Column with id ${task.column_id} not found.`);
        }
    });
}


function getboard(id) {
    const selector = document.getElementById('boardSelector');
    coltitle.setAttribute("col_id", id);
    let title = document.querySelector(`.column[cid="${id}"]`).getAttribute('id');
    coltitle.textContent = title;

    selector.innerHTML = '';

    board_items.forEach(board => {
        if (board.deleted === 0) {  // Only include non-deleted boards
            const option = document.createElement('option');
            option.value = board.id;
            option.textContent = board.title;
            selector.appendChild(option);
        }
    });
}

function movecol() {
    const selector = document.getElementById('boardSelector');
    const coltitle = document.getElementById('coltitle');
    const colid = coltitle.getAttribute("col_id");
        socket.emit('move-column', {columnId: colid, boardId: selector.value});
    let column = document.querySelector(`.column[cid="${colid}"]`).parentNode;
    column.remove();
}

// Пполучение инициалов пользователя
function getInitials(name) {
    if (!name) return null;
    const nameParts = name.split(' ');
    const initials = nameParts.map(part => part[0].toUpperCase()).join('');
    return initials;
}

// Создания HTML кода с аватаром и инициалами
function createAvatar(name) {
    const initials = getInitials(name);
    if (!initials) return ''; // Если name null или пустой, вернем пустую строку

    return `
        <div class="avatar">
            ${initials}
        </div>
    `;
}