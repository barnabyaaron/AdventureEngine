/*
 * Module that handles the events system 
 */
var Events = {

    _EVENT_TIME_RANGE: [3, 6], // in minutes

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        // Build the Event Pool
        Events.EventPool = [].concat(
            Events.Global,
            Events.Room
        );

        Events.eventStack = [];

        Events.scheduleNextEvent();

        // subscribe to statusUpdates
        $.Dispatch('stateUpdate').subscribe(Events.handleStateUpdates);

        // check for stored delayed events
        Events.initDelay();
    },

    options: {},

    delayState: 'wait',

    // Makes an event happen!
    triggerEvent: function () {
        if (Events.activeEvent() == null) {
            var possibleEvents = [];
            for (var i in Events.EventPool) {
                var event = Events.EventPool[i];
                if (event.isAvailable()) {
                    possibleEvents.push(event);
                }
            }

            if (possibleEvents.length === 0) {
                Events.scheduleNextEvent(0.5);
                return;
            } else {
                var r = Math.floor(Math.random() * (possibleEvents.length));
                Events.startEvent(possibleEvents[r]);
            }
        }

        Events.scheduleNextEvent();
    },

    triggerFight: function () {
        var possibleFights = [];
        for (var i in Events.Encounters) {
            var fight = Events.Encounters[i];
            if (fight.isAvailable()) {
                possibleFights.push(fight);
            }
        }

        var r = Math.floor(Math.random() * (possibleFights.length));
        Events.startEvent(possibleFights[r]);
    },

    activeEvent: function () {
        if (Events.eventStack && Events.eventStack.length > 0) {
            return Events.eventStack[0];
        }
        return null;
    },

    eventPanel: function () {
        return Events.activeEvent().eventPanel;
    },

    startEvent: function (event, options) {
        if (event) {
            Engine.event('game event', 'event');
            Engine.keyLock = true;
            Engine.tabNavigation = false;
            Button.saveCooldown = false;
            Events.eventStack.unshift(event);
            event.eventPanel = $('<div>').attr('id', 'event').addClass('eventPanel').css('opacity', '0');
            if (options != null && options.width != null) {
                Events.eventPanel().css('width', options.width);
            }
            $('<div>').addClass('eventTitle').text(Events.activeEvent().title).appendTo(Events.eventPanel());
            $('<div>').attr('id', 'description').appendTo(Events.eventPanel());
            $('<div>').attr('id', 'buttons').appendTo(Events.eventPanel());
            Events.loadScene('start');
            $('div#gameWrapper').append(Events.eventPanel());
            Events.eventPanel().animate({ opacity: 1 }, Events._PANEL_FADE, 'linear');
            var currentSceneInformation = Events.activeEvent().scenes[Events.activeScene];
            if (currentSceneInformation.blink) {
                Events.blinkTitle();
            }
        }
    },

    scheduleNextEvent: function (scale) {
        var nextEvent = Math.floor(Math.random() * (Events._EVENT_TIME_RANGE[1] - Events._EVENT_TIME_RANGE[0])) + Events._EVENT_TIME_RANGE[0];
        if (scale > 0) { nextEvent *= scale; }
        Engine.log('next event scheduled in ' + nextEvent + ' minutes');
        Events._eventTimeout = Engine.setTimeout(Events.triggerEvent, nextEvent * 60 * 1000);
    },

    endEvent: function () {
        Events.eventPanel().animate({ opacity: 0 }, Events._PANEL_FADE, 'linear', function () {
            Events.eventPanel().remove();
            Events.activeEvent().eventPanel = null;
            Events.eventStack.shift();
            Engine.log(Events.eventStack.length + ' events remaining');
            Engine.keyLock = false;
            Engine.tabNavigation = true;
            Button.saveCooldown = true;
            if (Events.BLINK_INTERVAL) {
                Events.stopTitleBlink();
            }
            // Force refocus on the body. I hate you, IE.
            $('body').focus();
        });
    },

    handleStateUpdates: function (e) {
        if ((e.category == 'stores') && Events.activeEvent() != null) {
            Events.updateButtons();
        }
    },

    initDelay: function () {
        if ($SM.get(Events.delayState)) {
            Events.recallDelay(Events.delayState, Events);
        }
    },

    recallDelay: function (stateName, target) {
        var state = $SM.get(stateName);
        for (var i in state) {
            if (typeof (state[i]) == 'object') {
                Events.recallDelay(stateName + '["' + i + '"]', target[i]);
            } else {
                if (typeof target[i] == 'function') {
                    target[i]();
                } else {
                    $SM.remove(stateName)
                }
            }
        }
        if ($.isEmptyObject(state)) {
            $SM.remove(stateName);
        }
    },

    saveDelay: function (action, stateName, delay) {
        var state = Events.delayState + '.' + stateName;
        if (delay) {
            $SM.set(state, delay);
        } else {
            var delay = $SM.get(state, true)
        }
        var time = Engine.setInterval(function () {
            // update state every half second
            $SM.set(state, ($SM.get(state) - 0.5), true);
        }, 500);
        Engine.setTimeout(function () {
            // outcome realizes. erase countdown
            window.clearInterval(time);
            $SM.remove(state);
            $SM.removeBranch(Events.delayState);
            action();
        }, delay * 1000);
    }

    
};