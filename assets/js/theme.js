// Функция для переключения темы
function setTheme(theme) {
    if (theme === 'light') {
        document.getElementById('light-theme-style').removeAttribute('disabled');
        document.getElementById('theme-toggle').checked = true;
    } else {
        document.getElementById('light-theme-style').setAttribute('disabled', 'true');
        document.getElementById('theme-toggle').checked = false;
    }
}

// Проверяем, какая тема выбрана в localStorage и устанавливаем её
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    setTheme(savedTheme);
}

// Обработчик для переключения темы
document.getElementById('theme-toggle').addEventListener('change', function() {
    const themeName = this.checked ? 'light' : 'dark';
    localStorage.setItem('theme', themeName);
    setTheme(themeName);
});