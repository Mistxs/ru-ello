document.addEventListener('DOMContentLoaded', function() {
    const entityListItems = document.querySelectorAll('.list-group-item');
    let activeentity = '';
    entityListItems.forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.list-group-item').forEach(item => {
                item.classList.remove('active');
            });
            item.classList.add('active');
            const entityName = this.getAttribute('data-entity');
            activeentity = entityName;
            fetch(`/restore/${entityName}`)
                .then(response => response.json())
                .then(data => {
                    renderEntityTable(data);
                })
                .catch(error => {
                    console.error('Ошибка при получении данных:', error);
                    alert('Произошла ошибка при загрузке данных');
                });
        });
    });

    function renderEntityTable(data) {
        const entityTable = document.querySelector('.entity-table');
        entityTable.innerHTML = ''; // Очищаем предыдущее содержимое таблицы

        if (data.length === 0) {
            entityTable.innerHTML = '<p>Нет удаленных объектов</p>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('table', 'table-striped', 'table-dark', 'table-bordered');

        // Создаем заголовок таблицы (шапку)
        const headers = Object.keys(data[0]);
        headers.push(''); // Добавляем пустой заголовок для кнопки "восстановить"
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const header = document.createElement('th');
            header.textContent = headerText;
            headerRow.appendChild(header);
        });
        table.appendChild(headerRow);

        // Добавляем строки с данными
        data.forEach(item => {
            const row = document.createElement('tr');
            row.setAttribute('id', item.id); // Устанавливаем атрибут id для строки, равный ID сущности

            headers.forEach(header => {
                const cell = document.createElement('td');
                if (header === '') {
                    // Создаем кнопку "восстановить"
                    const restoreButton = document.createElement('button');
                    restoreButton.textContent = 'Восстановить';
                    restoreButton.classList.add('btn', 'btn-primary', 'btn-sm');
                    restoreButton.addEventListener('click', function() {
                        restoreEntity(item.id);
                    });
                    cell.appendChild(restoreButton);
                } else {
                    cell.textContent = item[header];
                }
                row.appendChild(cell);
            });
            table.appendChild(row);
        });

        entityTable.appendChild(table);
    }

// Функция для отправки запроса на восстановление сущности по ID
    function restoreEntity(entityId) {
        console.log(entityId);
        fetch(`/restoreEntity/${activeentity}/${entityId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: entityId })
        })
            .then(response => {
                if (response.status === 202) {
                    // Успешный ответ с кодом 202 (Accepted)
                    alert('Данные успешно восстановлены');

                    // Удаляем строку из таблицы, если она есть
                    let tableRow = document.querySelector(`tr[id="${entityId}"]`);
                    if (tableRow) {
                        tableRow.remove();
                    }
                } else {
                    // Обработка других статусов ответа, если необходимо
                    return response.json();
                }
            })
            .catch(error => {
                console.error('Произошла ошибка при восстановлении данных:', error);
                alert('Произошла ошибка при восстановлении данных');
            });
    }


});
