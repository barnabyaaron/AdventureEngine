/*
 * Module that registers the notifications and message to the player
*/
var Notifications = {

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        // Create the notifications box
        elem = $('<div>').attr({
            id: 'gameNotifications',
            className: 'notifications'
        });

        // Create the transparency gradient
        $('<div>').attr('id', 'notifyGradient').appendTo(elem);

        elem.appendTo('#gameMain');
    },

    options: {},

    elem: null,

    notifyQueue: {},

    notify: function (text, room, noQueue) {
        if (typeof text == 'undefined') return;
        if (text.slice(-1) != ".") text += ".";
        if (room != null && Engine.activeRoom != room) {
            if (!noQueue) {
                if (typeof this.notifyQueue[room] == 'undefined') {
                    this.notifyQueue[room] = [];
                }
                this.notifyQueue[room].push(text);
            }
        } else {
            Notifications.printMessage(text);
        }
        Engine.saveGame();
    },

    clearHidden: function () {
        // To fix some memory usage issues, we clear notifications that have been hidden.
        // We use position().top here, because we know that the parent will be the same, so the position will be the same.
        var bottom = $('#notifyGradient').position().top + $('#notifyGradient').outerHeight(true);

        $('.notification').each(function () {
            if ($(this).position().top > bottom) {
                $(this).remove();
            }
        });
    },

    printMessage: function (t) {
        var text = $('<div>').addClass('notification').css('opacity', '0').html(t).prependTo('div#gameNotifications');
        text.animate({ opacity: 1 }, 500, 'linear', function () {
            // Do this every time we add a new message, this way we never have a large backlog to iterate through. Keeps things faster.
            Notifications.clearHidden();
        });
    },

    printQueue: function (room) {
        if (typeof this.notifyQueue[room] != 'undefined') {
            while (this.notifyQueue[room].length > 0) {
                Notifications.printMessage(this.notifyQueue[room].shift());
            }
        }
    }
};