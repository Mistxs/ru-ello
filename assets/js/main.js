const board = document.querySelector('.board-wrapper');
const socket = io('http://localhost:3600');

board.addEventListener('click', (event) => {
    
    if (event.target.classList.contains('delete-task')) {
        if (confirm('Вы действительно хотите удалить задачу?')) {
            event.target.parentNode.remove();
            socket.emit('deleted-task', {task: event.target.parentNode.getAttribute("task_id")});
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

    if (event.target.classList.contains('add-task')) {
        addtask(event.target.closest('.col-wrapper').querySelector('.column'));
    }
});

function addtask(target) {
    let column_id = target.getAttribute('cid');

    let newTask = document.createElement('div');
    newTask.className = 'task';
    newTask.setAttribute('task_id', 'new');

    // Добавление разметки для карточки задачи
    newTask.innerHTML = `
        <span class="badge"></span>
        <textarea class="task-title" rows="1"></textarea>
        <button class="btn delete-task"><i class="bx bx-trash"></i></button>
    `;

    // Добавить созданную карточку в блок .column
    if (target.firstChild) {
        target.insertBefore(newTask, target.firstChild);
    } else {
        target.appendChild(newTask);
    }

    // Передать фокус на блок task-title для редактирования
    let taskTitleTextarea = newTask.querySelector('.task-title');
    taskTitleTextarea.focus();
    

    // Автоматически подгонять высоту textarea под контент
    taskTitleTextarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });

    // Обработчик клавиш "Enter" и потери фокуса для сохранения задачи
    taskTitleTextarea.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Предотвратить переход на новую строку
            this.blur(); // Снять фокус с textarea, чтобы сохранить изменения
        }
    });

    taskTitleTextarea.addEventListener('blur', function() {
        var editedTaskTitle = this.value.trim();
        // Опционально: если задача не заполнена, удалить ее
        if (!editedTaskTitle) {
            newTask.remove();
        } else {
            // Если нужно, преобразовать textarea обратно в div с текстом
            let taskTitleDiv = document.createElement('div');
            taskTitleDiv.className = 'task-title';
            taskTitleDiv.textContent = editedTaskTitle;
            newTask.replaceChild(taskTitleDiv, this);

            let boardId = board.querySelector('.board').getAttribute("boardId");
            let columnId = target.getAttribute('cid');

            socket.emit('add-task', {name: editedTaskTitle, boardId: boardId, column: columnId});
        }
    });

    socket.on('add-task', (data) => {
        let insertedTask = target.querySelector('[task_id="new"]');
        if (insertedTask) {
            insertedTask.setAttribute('task_id', data.taskId);
        } 
    });
}

function addColumn(){
    const board = document.querySelector('.board');
    const columnNameInput = board.querySelector('.column-name');
    const addColumnForm = board.querySelector('.col-wrapper-fixed');
    const newColumn = document.createElement('div');
    newColumn.classList.add('col-wrapper');

    newColumn.innerHTML = `
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
            <h2>${columnNameInput.value}</h2>
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
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })
});

document.querySelector('.boardname').addEventListener('keydown', function(event) {
    if (event.keyCode === 13) { // Код клавиши Enter равен 13
        addboard(); // Вызываем функцию добавления доски
    }
});

document.addEventListener("DOMContentLoaded", function() {
    document.addEventListener('keydown', function(event) {
        if (event.target.classList.contains('column-name') && event.keyCode === 13) {
            addColumn();
        }
    });
});

document.querySelector('.logout').addEventListener('click', function (event) {
    event.preventDefault();
    document.getElementById('logoutForm').submit();
});