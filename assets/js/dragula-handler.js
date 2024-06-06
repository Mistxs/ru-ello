


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

