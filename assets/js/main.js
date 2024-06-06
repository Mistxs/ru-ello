const board = document.querySelector('.board-wrapper');
const socket = io('http://localhost:3600');

board.addEventListener('submit', (event) => {
    if (event.target.classList.contains('add-task-form')) {
        event.preventDefault();
        const input = event.target.querySelector('input');
        const newTask = document.createElement('div');
        newTask.classList.add('task');
        newTask.textContent = input.value;
        newTask.setAttribute("task_id","new");


        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-task');
        deleteButton.textContent = 'Delete';

        newTask.appendChild(deleteButton);

        const list = event.target.nextElementSibling;
        const firstTask = list.firstChild;
        list.insertBefore(newTask, firstTask);


        socket.emit('add-task', {name: input.value, boardId: board.querySelector('.board').getAttribute("boardId"), column: event.target.nextElementSibling.getAttribute("cid")});
        socket.on('add-task', (data) => {
            const insertedTask = document.querySelector('[task_id="new"]');
            insertedTask.setAttribute('task_id', data.taskId);
        });

        input.value = '';
    }
});

board.addEventListener('click', (event) => {
    if (event.target.classList.contains('task')) {
        const column = event.target.closest('.column');
        alert(`Task: ${event.target.textContent}, Column: ${column.id}`);
    }

    if (event.target.classList.contains('delete-task')) {
        if (confirm('Вы действительно хотите удалить задачу?')) {
            event.target.parentNode.remove();
            socket.emit('deleted-task', {task: event.target.parentNode.getAttribute("task_id")});
        }
    }

    if (event.target.classList.contains('delete-board')) {
        if (confirm('Вы действительно хотите удалить доску?')) {
            boardid = document.getElementById('board');
            clearBoard();
            socket.emit('deleted-board', {boardid: boardid.getAttribute("boardid")});
            displayBoards();
        }
    }


    if (event.target.classList.contains('delete-column')) {
        if (confirm('Вы действительно хотите удалить очередь?')) {
            event.target.closest('.col-wrapper').remove();
            socket.emit('deleted-column', {cid: event.target.closest('.col-wrapper').querySelector('.column').getAttribute('cid')});
        }
    }

    if (event.target.classList.contains('add-column')) {
        addColumn();
    }
});

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

function addColumn(){
    const board = document.querySelector('.board');
    const columnNameInput = board.querySelector('.column-name');
    const addColumnForm = board.querySelector('.add-column-form');
    const newColumn = document.createElement('div');
    newColumn.classList.add('col-wrapper');

    newColumn.innerHTML = `
            <span class="handle">+</span>
            <button class="delete-column">Delete Column</button>
            <h2>${columnNameInput.value}</h2>

            <form class="add-task-form">
                <input type="text" placeholder="New task">
                <button type="submit">Add</button>
            </form>
            <div class="column" cid="new" id="${columnNameInput.value.toLowerCase().replace(/\s/g, '-')}">
            </div>
            `;
    board.insertBefore(newColumn, addColumnForm);
    socket.emit('add-column', {name: columnNameInput.value, boardId: board.getAttribute("boardId")});
    socket.on('add-column', (data) => {
        const insertedColumn = document.querySelector('[cid="new"]');
        insertedColumn.setAttribute('cid', data.columnId);
    });
    drake.containers.push(newColumn.querySelector('.column'));
    columnNameInput.value = '';
}



dragula([document.getElementById('board')], {
    moves: function (el, container, handle) {
        return handle.classList.contains('handle');
    }
}).on('drop', function(el, target, source, sibling){
    var allCards = document.querySelectorAll('.col-wrapper');
    var order = Array.from(allCards).map(card => card.querySelector('.column').getAttribute('cid'));
    order.pop();
    var weights = order.map((id, index) => {
        return { id: id, weight: index + 1 };
    });
    socket.emit('update-order', weights);
});



let drake = dragula([], {
    moves: function (el, container, handle) {
        return handle.classList.contains('task');
    }
});

drake.on('drop', function (el, target, source) {
    const task = el.getAttribute("task_id");
    const from = source.getAttribute("cid");
    const to = target.getAttribute("cid");


    const tasks = target.querySelectorAll('.task');
    const weights = Array.from(tasks).map((task, index) => {
        const taskId = task.getAttribute('task_id');
        return { id: taskId, weight: index + 1 };
    });

    socket.emit('update-task', {task, from, to});
    socket.emit('update-order-task', weights);


});


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


document.addEventListener('DOMContentLoaded', () => {
    displayBoards();
});



// Функция для получения колонок и задач по boardId
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

