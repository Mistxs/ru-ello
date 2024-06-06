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

document.addEventListener('DOMContentLoaded', () => {
    displayBoards();
});
