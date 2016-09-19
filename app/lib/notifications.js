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

    send: function(text) {
        Notifications.notify(text);
    },

    notify: function (text, room, noQueue) {
        if (typeof text == 'undefined') return;

        if (room != null) {
            if (!noQueue) {
                if (typeof this.notifyQueue[room] == 'undefined') {
                    this.notifyQueue[room] = [];
                }
                this.notifyQueue[room].push(text);
            }
        } else {
            Notifications.formatMessageAndPrint(text);
        }
        Engine.saveGame();
    },

    clear: function (lastCommand) {
        $('#gameNotifications').html('');

        if (lastCommand) {
            Notifications.notify("> " + lastCommand);
        }
    },

    scrollDown: function () {
        var objDiv = document.getElementById("gameNotifications");
        objDiv.scrollTop = objDiv.scrollHeight;
    },

    formatMessageAndPrint: function (t) {
        var textSplit = t.split('[[break]]');

        for (var i in textSplit) {
            Notifications.printMessage(textSplit[i]);
        }
    },

    printMessage: function (t) {
        var text = $('<div>').addClass('notification').css('opacity', '0').html(t).appendTo('#gameNotifications');
        text.animate({ opacity: 1 }, 500, 'linear', function () {
            // Do this every time we add a new message, this way we never have a large backlog to iterate through. Keeps things faster.
            Notifications.scrollDown();
        });
    },

    printQueue: function (room) {
        if (typeof this.notifyQueue[room] != 'undefined') {
            while (this.notifyQueue[room].length > 0) {
                Notifications.formatMessageAndPrint(this.notifyQueue[room].shift());
            }
        }
    }
};