// app.js
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let tasks = [
    { id: 1, title: 'To Do', cards: [] },
    { id: 2, title: 'In Progress', cards: [] },
    { id: 3, title: 'Done', cards: [] }
];

app.get('/tasks', (req, res) => {
    res.json(tasks);
});

app.post('/tasks/:id/cards', (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    const task = tasks.find(task => task.id === parseInt(id));
    if (task) {
        task.cards.push({ title });
        res.json(task);
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

app.put('/tasks/:taskId/cards/:cardId', (req, res) => {
    const { taskId, cardId } = req.params;
    const { newTaskId } = req.body;
    const sourceTask = tasks.find(task => task.id === parseInt(taskId));
    const targetTask = tasks.find(task => task.id === parseInt(newTaskId));
    if (sourceTask && targetTask) {
        const cardIndex = sourceTask.cards.findIndex(card => card.id === parseInt(cardId));
        if (cardIndex !== -1) {
            const [card] = sourceTask.cards.splice(cardIndex, 1);
            targetTask.cards.push(card);
            res.json({ sourceTask, targetTask });
        } else {
            res.status(404).json({ message: 'Card not found in source task' });
        }
    } else {
        res.status(404).json({ message: 'Source or target task not found' });
    }
});

const PORT = 3900;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
