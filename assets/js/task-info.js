
let currentBadges = [];


// Функция для преобразования даты
function formatDate(isoString) {
    let date = new Date(isoString);

    let day = String(date.getDate()).padStart(2, '0');
    let month = String(date.getMonth() + 1).padStart(2, '0'); // Январь это 0!
    let year = date.getFullYear();

    let hours = String(date.getHours()).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');
    let seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

// Функция для форматирования даты и времени в формат, подходящий для input type="datetime-local"
function formatDateTimeForInput(dateTime) {
    // Пример dateTime: "2024-06-13T16:08:00.000Z"
    var date = new Date(dateTime);
    var year = date.getFullYear();
    var month = ('0' + (date.getMonth() + 1)).slice(-2); // добавляем 1, так как месяцы в Date начинаются с 0
    var day = ('0' + date.getDate()).slice(-2);
    var hours = ('0' + date.getHours()).slice(-2);
    var minutes = ('0' + date.getMinutes()).slice(-2);
    return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
}

function taskInfo(taskId) {
    const modalbody = document.querySelector('.modal-body');
    const tasktitle = document.getElementById('task-title');
    const coltitle = document.querySelector('.coltitle');
    const cdate = document.getElementById('created-time');
    const description = document.getElementById('task-description');
    const comments = document.querySelector('.comment-list');
    const deadlinetime = document.getElementById('task-deadline');
    const taskUserButton = document.getElementById('task-user');
    const taskUserDropdown = document.getElementById('user-dropdown');

    fetch(`/task-info/${taskId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // Получаем данные и выводим их в модальном окне
            tasktitle.innerHTML = data.title;
            tasktitle.setAttribute("task_id", data.taskid);
            coltitle.innerHTML = data.column;
            cdate.innerHTML = formatDate(data.cdate);
            description.value = data.description;
            currentBadges = data.badges;
            deadlinetime.value = formatDateTimeForInput(data.deadline);
            renderBadges(currentBadges);
            displayRemainingTime(deadlinetime.value);
            renderComments(data.comments);

            // Заполнить выпадающий список пользователей
            fetch('/task/users')
                .then(response => response.json())

                .then(users => {
                    console.log(taskUserDropdown);
                    taskUserDropdown.innerHTML = '';
                    users.forEach(user => {
                        const dropdownItem = document.createElement('a');
                        dropdownItem.className = 'dropdown-item';
                        dropdownItem.href = '#';
                        dropdownItem.textContent = user.name;
                        dropdownItem.setAttribute('data-user-id', user.id);
                        dropdownItem.onclick = (event) => {
                            event.preventDefault();
                            taskUserButton.textContent = user.name;
                            assignUserToTask(user.id, user.name);
                        };
                        taskUserDropdown.appendChild(dropdownItem);
                    });

                    const currentUser = users.find(user => user.id === data.assigned_user_id);
                    taskUserButton.textContent = currentUser ? currentUser.name : 'Выберите исполнителя';
                });
        })
        .catch(error => {
            console.error('Ошибка при загрузке данных:', error);
        });
}


function assignUserToTask(userId, userName) {
    const taskId = document.getElementById('task-title').getAttribute('task_id');
    fetch('/task-assign', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId: taskId, userId: userId, userName: userName })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.text();
        })
        .then(data => {
            console.log('Task assigned successfully:', data);
            document.getElementById('task-user').textContent = userName;
        })
        .catch(error => {
            console.error('Ошибка при назначении задачи:', error);
        });
}




// рендер лейблов
const taskLabelsContainer = document.getElementById('task-labels');

// Function to render badges
function renderBadges(badges) {
    taskLabelsContainer.innerHTML = '';

    badges.forEach(badge => {
        const badgeElement = document.createElement('span');
        badgeElement.className = `badge bg-${badge.type} m-1`;
        badgeElement.setAttribute("badge_id", badge.id);
        badgeElement.style.cursor = 'pointer';
        badgeElement.innerText = badge.text;
        badgeElement.addEventListener('click', (e) => {
            e.stopPropagation();
            showBadgeDropdown(badgeElement, badge);
        });
        taskLabelsContainer.appendChild(badgeElement);
    });

    // Append the add label button and dropdown
    const addLabelContainer = document.createElement('div');
    addLabelContainer.className = 'dropdown';

    const addLabelBtn = document.createElement('button');
    addLabelBtn.type = 'button';
    addLabelBtn.id = 'add-label-btn';
    addLabelBtn.className = 'btn btn-light dropdown-toggle';
    addLabelBtn.style.cursor = 'pointer';
    addLabelBtn.innerText = '+';
    addLabelBtn.setAttribute('data-bs-toggle', 'dropdown');
    addLabelBtn.setAttribute('aria-expanded', 'false');

    const addLabelDropdown = document.createElement('div');
    addLabelDropdown.className = 'dropdown-menu p-3';
    addLabelDropdown.id = 'add-label-dropdown';
    addLabelDropdown.innerHTML = `
            <input type="text" id="new-label-text" class="form-control mb-2" placeholder="Метка">
            <select id="new-label-type" class="form-control mb-2">
                <option value="success">Зеленая</option>
                <option value="danger">Красная</option>
                <option value="warning">Желтая</option>
                <option value="primary">Синяя</option>
                <option value="secondary">Серая</option>
                <option value="light">Светлая</option>
                <option value="info">Бирюзовая</option>
                <option value="dark">Черная</option>
            </select>
            <button type="button" id="add-new-label" class="btn btn-primary">Добавить</button>
        `;

    addLabelContainer.appendChild(addLabelBtn);
    addLabelContainer.appendChild(addLabelDropdown);
    taskLabelsContainer.appendChild(addLabelContainer);

    document.getElementById('add-new-label').addEventListener('click', addNewLabel);

    // Prevent dropdown from closing on interaction inside it
    addLabelDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!addLabelDropdown.contains(e.target) && e.target !== addLabelBtn) {
            addLabelDropdown.classList.remove('show');
        }
    });

    addLabelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addLabelDropdown.classList.toggle('show');
    });
}

// Function to show badge dropdown
function showBadgeDropdown(badgeElement, badge) {
    let dropdown = document.getElementById('badge-dropdown');
    if (dropdown) {
        dropdown.remove();
    }

    dropdown = document.createElement('div');
    dropdown.id = 'badge-dropdown';
    dropdown.className = 'dropdown-menu show p-2';
    dropdown.style.position = 'absolute';
    dropdown.style.zIndex = '1050';
    dropdown.style.left = `${badgeElement.offsetLeft}px`;
    dropdown.style.top = `${badgeElement.offsetTop + badgeElement.offsetHeight}px`;
    dropdown.innerHTML = `<button type="button" class="btn btn-sm btn-danger">Удалить</button>`;

    badgeElement.parentElement.appendChild(dropdown);

    dropdown.querySelector('button').addEventListener('click', () => {
        deleteLabel(badge);
        dropdown.remove();
    });

    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    }); 

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== badgeElement) {
            dropdown.remove();
        }
    }, { once: true });
}

function addNewLabel() {
    const newText = document.getElementById('new-label-text').value;
    const newType = document.getElementById('new-label-type').value;
    const labels = document.getElementById('task-labels');
    const modalbody = labels.closest('.modal-content'); // или используйте соответствующий селектор для поиска родительского элемента
    const taskTitleElement = modalbody.querySelector('.modal-task-title'); // Используем querySelector для поиска внутри modalbody
    const taskid = taskTitleElement.getAttribute('task_id');

    if (newText.trim() === '') {
        alert('Label text cannot be empty');
        return;
    }

    const newBadge = { text: newText, type: newType };
    currentBadges.push(newBadge);  // Update global variable
    renderBadges(currentBadges);
    
    socket.emit('add-label', {task_id: taskid, labeltext: newText, type: newType});
}

function deleteLabel(badge) {
    const labels = document.getElementById('task-labels');
    const modalbody = labels.closest('.modal-content'); // или используйте соответствующий селектор для поиска родительского элемента
    const taskTitleElement = modalbody.querySelector('.modal-task-title'); // Используем querySelector для поиска внутри modalbody
    const taskid = taskTitleElement.getAttribute('task_id');
    
    currentBadges = currentBadges.filter(b => b.text !== badge.text);  // Update global variable
    renderBadges(currentBadges);

    socket.emit('remove-label', {task_id: taskid, badge_id: badge.id});
}

function renderComments(comments) {
    const commentsContainer = document.getElementById('comment-list');
    commentsContainer.innerHTML = ''; // Очищаем содержимое контейнера комментариев

    comments.forEach(comment => {
        const commentdate = formatDate(comment.createdate); // Форматируем дату

        // Создаем HTML-код для комментария
        const commentHTML = `
            <div class="comment-item" comment_id="${comment.id}">
                <div class="comment-content">${comment.text}</div>
                <div class="comment-details">
                    <span>${commentdate}</span> -  <span class="comment-user">${comment.username}</span> - <span class="comment-delete" onclick="deleteComment(this)">Удалить</span>
                </div>
            </div>
        `;

        // Добавляем HTML-код комментария в контейнер
        commentsContainer.innerHTML += commentHTML;
    });

}


// иконка редактирования заголовка
document.getElementById('edit-icon').addEventListener('click', toggleEditMode);
document.getElementById('edit-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        toggleEditMode();
    }
});
// редактирование названия
function toggleEditMode() {
    let titleElement = document.getElementById('task-title');
    let inputElement = document.getElementById('edit-input');
    if (inputElement.style.display === 'none') {
        inputElement.style.display = 'block';
        titleElement.style.display = 'none';
        inputElement.value = titleElement.textContent;
        inputElement.focus();
        
    } else {
        inputElement.style.display = 'none';
        titleElement.style.display = 'block';
        titleElement.textContent = inputElement.value;
        socket.emit('rename-task', {task: titleElement.getAttribute("task_id"), name: inputElement.value});
        rendertask(titleElement.getAttribute("task_id"));
    }
}

// обработчик на кнопку сохранить
function saveTask(){
    const saveButton = document.getElementById('save-task');
    const modalbody = saveButton.closest('.modal-content'); 
    const taskTitleElement = modalbody.querySelector('.modal-task-title');
    const taskid = taskTitleElement.getAttribute('task_id');
    
    const taskDeadlineInput = document.getElementById('task-deadline');
    const description = document.getElementById('task-description');
    const commentsContainer = document.getElementById('comment-list');
    const taskDeadline = taskDeadlineInput.value;

    const comments = [];

    const commentItems = commentsContainer.querySelectorAll('.comment-item');

    commentItems.forEach(commentItem => {
        const commentText = commentItem.querySelector('.comment-content').textContent.trim();
        const commentDetails = commentItem.querySelector('.comment-details').textContent.trim();
        const commentDatetime = commentDetails.split(' - ')[0]; // Получаем дату и время
        const commentID = commentItem.getAttribute('comment_id');

        // Функция для конвертации даты и времени в нужный формат
        function formatDateForServer(inputDate) {
            const parts = inputDate.split(/[.,: ]+/); // Разбиваем строку по разделителям
            const day = parts[0];
            const month = parts[1];
            const year = parts[2];
            const hours = parts[3];
            const minutes = parts[4];
            const seconds = parts[5];

            // Формируем строку в формате 'YYYY-MM-DD HH:mm:ss'
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }

        // Преобразуем формат даты и времени
        const formattedDatetime = formatDateForServer(commentDatetime);

        // Формируем объект комментария
        const comment = {
            id: commentID,
            text: commentText,
            datetime: formattedDatetime
        };

        comments.push(comment);
    });

    // Отправка запроса на сервер с использованием Fetch API
    fetch(`/task-info/${taskid}/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(
            { 
                "deadline": taskDeadline,
                "description": description.value,
                "comments": comments
            })
    })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Ошибка при сохранении дедлайна');
            }
            else {
                rendertask(taskid);
            }
            return response.json();
        })
        .catch(function(error) {
            console.error('Ошибка:', error);
        });
    
}

// Функция для вычисления и отображения оставшегося времени
function displayRemainingTime(deadline) {
        const currentTime = new Date();
        const deadlineTime = new Date(deadline);
        const difference = deadlineTime - currentTime;
        const elapsedTimeElement = document.getElementById('elapsed-time');

        if (difference <= 0) {
            // Если время уже прошло, установим красный цвет бейджа
            elapsedTimeElement.innerHTML = '<span class="badge badge-danger">Время истекло</span>';
        } else {
            // Рассчитываем оставшееся время
            let seconds = Math.floor((difference / 1000) % 60);
            let minutes = Math.floor((difference / 1000 / 60) % 60);
            let hours = Math.floor((difference / 1000 / 60 / 60) % 24);
            let days = Math.floor(difference / 1000 / 60 / 60 / 24);

            let remainingTimeText = '';

            if (days > 0) {
                remainingTimeText += days + " дней ";
            }
            if (hours > 0) {
                remainingTimeText += hours + " часов ";
            }
            if (minutes > 0) {
                remainingTimeText += minutes + " минут ";
            }
            if (seconds > 0) {
                remainingTimeText += seconds + " секунд";
            }

            // Выводим оставшееся время
            elapsedTimeElement.innerHTML = '<span class="badge badge-success">' + remainingTimeText + '</span>';
        }
    }

// Функция для добавления комментария
function addComment() {
    var comment = document.getElementById('task-comment').value.trim(); // Получаем значение комментария
    if (comment === '') {
        return;
    }

    let username = document.querySelector('.userinfo').getAttribute('username'); // Получаем имя пользователя (предположим, что оно доступно через объект comments)

    let currentDate = new Date(); // Получаем текущую дату и время
    let formattedDate = currentDate.toLocaleString(); // Форматируем дату и время

    let commentItemHTML = `
        <div class="comment-item">
            <div class="comment-content">${comment}</div>
            <div class="comment-details">
                <span>${formattedDate}</span> - 
                <span class="comment-user">${username}</span> - 
                <span class="comment-delete" onclick="deleteComment(this)">Удалить</span>
            </div>
        </div>`;

    document.getElementById('comment-list').innerHTML += commentItemHTML; // Добавляем комментарий в блок comment-list
    document.getElementById('task-comment').value = ''; // Очищаем поле ввода после добавления комментария
}


// Функция для удаления комментария
function deleteComment(commentElement) {
    if (confirm('Вы уверены, что хотите удалить этот комментарий?')) {
        commentElement.parentNode.parentNode.remove(); // Удаляем родительский элемент, содержащий комментарий
    }
}

// Обновление карточки задачи после сохранения
function rendertask(taskId) {
    socket.emit('update-current-task', {taskId: taskId});
    socket.on('update-current-task', (data) => {

        // Найти соответствующую карточку задачи по taskId
        let taskCard = document.querySelector(`.task[task_id="${data.data.taskid}"]`);

        // 1. Обновление заголовка задачи
        let taskTitle = taskCard.querySelector('.task-title');
        taskTitle.textContent = data.data.title;

        // 2. Отображение бейджей задачи
        let badgeList = taskCard.querySelector('.badge-lists'); // предполагается, что у вас есть элемент .badge-lists для отображения бейджей
        badgeList.innerHTML = ''; // очищаем список бейджей перед добавлением новых

        data.data.badges.forEach(badge => {
            let badgeElement = document.createElement('span');
            badgeElement.classList.add('badge', `badge-${badge.type}`, 'm-1');
            badgeElement.textContent = badge.text;
            badgeList.appendChild(badgeElement);
        });

        // 3. Обновление исполнителя
        let taskuser = taskCard.querySelector('.task-user');
        taskuser.innerHTML = `${data.data.assigned_user_name ? createAvatar(data.data.assigned_user_name) + `<span>${data.data.assigned_user_name}</span>` : ''}`
    });
}
