(function () {
    var Engine = window.Engine = {
        VERSION: 1.0,
        GAME_OVER: false,
        MAX_STORE: 99999999999999,
        SAVE_DISPLAY: 30 * 1000,

        options: {
            state: null,
            debug: false,
            log: false
        },

        topics: {},

        activeRoom: null,

        Perks: {
            'boxer': {
                name: 'boxer',
                desc: 'punches do more damage',
                notify: 'learned to throw punches with purpose'
            },
            'martial artist': {
                name: 'martial artist',
                desc: 'do max damage in hand to hand combat',
                notify: 'learned to fight effectively without weapons'
            },
            'slow metabolism': {
                name: 'slow metabolism',
                desc: 'go twice as far without eating',
                notify: 'learned how to ignore the hunger'
            },
            'evasive': {
                name: 'evasive',
                desc: 'dodge attacks more effectively',
                notify: "learned to be where they're not"
            },
            'hawkeye': {
                name: 'hawkeye',
                desc: 'you notice even the littlest of things',
                notify: 'learned to look more closely'
            },
            'stealthy': {
                name: 'stealthy',
                desc: 'better avoid conflict',
                notify: 'learned how to not be seen'
            },
            'gastronome': {
                name: 'gatrononome',
                desc: 'restores more health when eating',
                notify: 'learned to make the most of food'
            }
        },

        init: function (options) {
            this.options = $.extend(
                this.options,
                options
            );
            this._debug = this.options.debug;
            this._log = this.options.log;

            // Check for HTML5 support
            if (!Engine.browserValid()) {
                // @TODO Notify user current browser may not be able to play game.
            }

            // Check for mobile
            if (Engine.isMobile()) {
                // @TODO Notify user game doesn't support mobile play.
            }

            if (this.options.state != null) {
                window.State = this.options.state;
            } else {
                Engine.loadGame();
            }

            var menu = $('<div>').addClass('gameMenu').appendTo('#gameFooter');

            $('<span>')
                .addClass('menuBtn')
                .text('restart.')
                .click(Engine.confirmDelete)
                .appendTo(menu);
            $('<span>')
                .addClass('menuBtn')
                .text('save.')
                .click(Engine.exportImport)
                .appendTo(menu);
            
            $('#commandTxt').on('keypress', Engine.keyPress);

            // subscribe to stateUpdates
            $.Dispatch('stateUpdate').subscribe(Engine.handleStateUpdates);

            $SM.init();               // State Manager
            //Command.init();           // Command Handler
            Notifications.init();     // Notifications Handler
            //Events.init();            // Events Handler
            //Rooms.init();             // Rooms Handler
            //Items.init();             // Items Handler
            //Player.init();            // Player Handler
            //Story.init();             // Story Handler
        },

        browserValid: function () {
            return (location.search.indexOf('ignorebrowser=true') >= 0 || (typeof Storage != 'undefined' && !oldIE));
        },

        isMobile: function () {
            return (location.search.indexOf('ignorebrowser=true') < 0 && /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent));
        },

        saveGame: function () {
            if (typeof Storage != 'undefined' && localStorage) {
                if (Engine._saveTimer != null) {
                    clearTimeout(Engine._saveTimer);
                }
                if (typeof Engine._lastNotify == 'undefined' || Date.now() - Engine._lastNotify > Engine.SAVE_DISPLAY) {
                    $('#saveNotify').css('opacity', 1).animate({ opacity: 0 }, 1000, 'linear');
                    Engine._lastNotify = Date.now();
                }
                localStorage.gameState = JSON.stringify(State);
            }
        },

        loadGame: function () {
            try {
                var savedState = JSON.parse(localStorage.gameState);
                if (savedState) {
                    State = savedState;
                    $SM.updateOldState();
                    Engine.log("loaded save!");
                }
            } catch (e) {
                State = {};
                $SM.set('version', Engine.VERSION);
                Engine.event('progress', 'new game');
            }
        },

        exportImport: function() {
            //Events.startEvent({
            //    title: _('Export / Import'),
            //    scenes: {
            //        start: {
            //            text: [
			//				_('export or import save data, for backing up'),
			//				_('or migrating computers')
            //            ],
            //            buttons: {
            //                'export': {
            //                    text: _('export'),
            //                    nextScene: {1: 'inputExport'}
            //                },
            //                'import': {
            //                    text: _('import'),
            //                    nextScene: {1: 'confirm'}
            //                },
            //                'cancel': {
            //                    text: _('cancel'),
            //                    nextScene: 'end'
            //                }
            //            }
            //        },
            //        'inputExport': {
            //            text: [_('save this.')],
            //            textarea: Engine.export64(),
            //            onLoad: function() { Engine.event('progress', 'export'); },
            //            readonly: true,
            //            buttons: {
            //                'done': {
            //                    text: _('got it'),
            //                    nextScene: 'end',
            //                    onChoose: Engine.disableSelection
            //                }
            //            }
            //        },
            //        'confirm': {
            //            text: [
			//				_('are you sure?'),
			//				_('if the code is invalid, all data will be lost.'),
			//				_('this is irreversible.')
            //            ],
            //            buttons: {
            //                'yes': {
            //                    text: _('yes'),
            //                    nextScene: {1: 'inputImport'},
            //                    onChoose: Engine.enableSelection
            //                },
            //                'no': {
            //                    text: _('no'),
            //                    nextScene: {1: 'start'}
            //                }
            //            }
            //        },
            //        'inputImport': {
            //            text: [_('put the save code here.')],
            //            textarea: '',
            //            buttons: {
            //                'okay': {
            //                    text: _('import'),
            //                    nextScene: 'end',
            //                    onChoose: Engine.import64
            //                },
            //                'cancel': {
            //                    text: _('cancel'),
            //                    nextScene: 'end'
            //                }
            //            }
            //        }
            //    }
            //});
        },

        generateExport64: function(){
            var string64 = Base64.encode(localStorage.gameState);
            string64 = string64.replace(/\s/g, '');
            string64 = string64.replace(/\./g, '');
            string64 = string64.replace(/\n/g, '');

            return string64;
        },

        export64: function() {
            Engine.saveGame();
            Engine.enableSelection();
            return Engine.generateExport64();
        },

        import64: function(string64) {
            Engine.event('progress', 'import');
            Engine.disableSelection();
            string64 = string64.replace(/\s/g, '');
            string64 = string64.replace(/\./g, '');
            string64 = string64.replace(/\n/g, '');
            var decodedSave = Base64.decode(string64);
            localStorage.gameState = decodedSave;
            location.reload();
        },

        event: function (cat, act) {
            if (typeof ga === 'function') {
                ga('send', 'event', cat, act);
            }
        },

        confirmDelete: function () {
            //Events.startEvent({
            //    title: _('Restart?'),
            //    scenes: {
            //        start: {
            //            text: [_('restart the game?')],
            //            buttons: {
            //                'yes': {
            //                    text: _('yes'),
            //                    nextScene: 'end',
            //                    onChoose: Engine.deleteSave
            //                },
            //                'no': {
            //                    text: _('no'),
            //                    nextScene: 'end'
            //                }
            //            }
            //        }
            //    }
            //});
        },

        deleteSave: function (noReload) {
            if (typeof Storage != 'undefined' && localStorage) {
                var prestige = Prestige.get();
                window.State = {};
                localStorage.clear();
                Prestige.set(prestige);
            }
            if (!noReload) {
                location.reload();
            }
        },

        // Gets a guid
        getGuid: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        
        log: function (msg) {
            if (this._log) {
                console.log(msg);
            }
        },

        keyLock: false,

        keyPress: function (event) {
            if (event.which === 13)
            {
                event.preventDefault(); // Prevent Enter from submitting form.
                if (!Engine.keyLock) {
                    Notifications.notify("> " + $('#commandTxt').val());
                    //Command.trigger($('#commandTxt').val());
                }

                $('#commandTxt').val('');
            }
        },

        disableSelection: function () {
            document.onselectstart = eventNullifier; // this is for IE
            document.onmousedown = eventNullifier; // this is for the rest
        },

        enableSelection: function () {
            document.onselectstart = eventPassthrough;
            document.onmousedown = eventPassthrough;
        },

        autoSelect: function (selector) {
            $(selector).focus().select();
        },

        handleStateUpdates: function (e) {

        },

        setInterval: function (callback, interval, skipDouble) {
            if (Engine.options.doubleTime && !skipDouble) {
                Engine.log('Double time, cutting interval in half');
                interval /= 2;
            }

            return setInterval(callback, interval);

        },

        setTimeout: function (callback, timeout, skipDouble) {

            if (Engine.options.doubleTime && !skipDouble) {
                Engine.log('Double time, cutting timeout in half');
                timeout /= 2;
            }

            return setTimeout(callback, timeout);

        }
    };

    function eventNullifier(e) {
        return $(e.target).hasClass('menuBtn');
    }

    function eventPassthrough(e) {
        return true;
    }
})();

function scrollByX(elem, x) {
    var elTop = parseInt(elem.css('top'), 10);
    elem.css('top', (elTop + x) + "px");
}

//create jQuery Callbacks() to handle object events
$.Dispatch = function (id) {
    var callbacks, topic = id && Engine.topics[id];
    if (!topic) {
        callbacks = jQuery.Callbacks();
        topic = {
            publish: callbacks.fire,
            subscribe: callbacks.add,
            unsubscribe: callbacks.remove
        };
        if (id) {
            Engine.topics[id] = topic;
        }
    }
    return topic;
};

$(document).ready(function () {
    $('#startGameBtn').click(function () {
        Engine.init();

        $('#devGameModal').modal('show');
    });
});
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
/*
 * Module for handling States
 *
 * All states should be get and set through the StateManager($SM).
*/
var StateManager = {

    MAX_STORE: 99999999999999,

    options: {},

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        // state categories
        var cats = [
            'features',     // big features
            'stores',       // item stores
            'inventory',    // player inventory
            'player',       // player stats
            'timers',       // timer states
            'game',         // mostly settings
            'playStats',    // anything play related: time, loads
            'previous',     // prestige, score...
            'calldown',     // values for calldown elements
            'story'         // story progress and status
        ];

        for (var which in cats) {
            if (!$SM.get(cats[which])) $SM.set(cats[which], {});
        }

        // Subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe($SM.handleStateUpdates);
    },

    //create all parents and then set state
    createState: function (stateName, value) {
        var words = stateName.split(/[.\[\]'"]+/);
        //for some reason there are sometimes empty strings
        for (var i = 0; i < words.length; i++) {
            if (words[i] === '') {
                words.splice(i, 1);
                i--;
            }
        }
        var obj = State;
        var w = null;
        for (var i = 0, len = words.length - 1; i < len; i++) {
            w = words[i];
            if (obj[w] === undefined) obj[w] = {};
            obj = obj[w];
        }
        obj[words[i]] = value;
        return obj;
    },

    //set single state
    //if noEvent is true, the update event won't trigger, useful for setting multiple states first
    set: function (stateName, value, noEvent) {
        var fullPath = $SM.buildPath(stateName);

        //make sure the value isn't over the engine maximum
        if (typeof value == 'number' && value > $SM.MAX_STORE) value = $SM.MAX_STORE;

        try {
            eval('(' + fullPath + ') = value');
        } catch (e) {
            //parent doesn't exist, so make parent
            $SM.createState(stateName, value);
        }

        //stores values can not be negative
        if (stateName.indexOf('stores') === 0 && $SM.get(stateName, true) < 0) {
            eval('(' + fullPath + ') = 0');
            Engine.log('WARNING: state:' + stateName + ' can not be a negative value. Set to 0 instead.');
        }

        if (!noEvent) {
            Engine.saveGame();
            $SM.fireUpdate(stateName);
        }
    },

    //sets a list of states
    setM: function (parentName, list, noEvent) {
        $SM.buildPath(parentName);

        //make sure the state exists to avoid errors,
        if ($SM.get(parentName) === undefined) $SM.set(parentName, {}, true);

        for (var k in list) {
            $SM.set(parentName + '["' + k + '"]', list[k], true);
        }

        if (!noEvent) {
            Engine.saveGame();
            $SM.fireUpdate(parentName);
        }
    },

    //shortcut for altering number values, return 1 if state wasn't a number
    add: function (stateName, value, noEvent) {
        var err = 0;
        //0 if undefined, null (but not {}) should allow adding to new objects
        //could also add in a true = 1 thing, to have something go from existing (true)
        //to be a count, but that might be unwanted behavior (add with loose eval probably will happen anyways)
        var old = $SM.get(stateName, true);

        //check for NaN (old != old) and non number values
        if (old != old) {
            Engine.log('WARNING: ' + stateName + ' was corrupted (NaN). Resetting to 0.');
            old = 0;
            $SM.set(stateName, old + value, noEvent);
        } else if (typeof old != 'number' || typeof value != 'number') {
            Engine.log('WARNING: Can not do math with state:' + stateName + ' or value:' + value + ' because at least one is not a number.');
            err = 1;
        } else {
            $SM.set(stateName, old + value, noEvent); //setState handles event and save
        }

        return err;
    },

    //alters multiple number values, return number of fails
    addM: function (parentName, list, noEvent) {
        var err = 0;

        //make sure the parent exists to avoid errors
        if ($SM.get(parentName) === undefined) $SM.set(parentName, {}, true);

        for (var k in list) {
            if ($SM.add(parentName + '["' + k + '"]', list[k], true)) err++;
        }

        if (!noEvent) {
            Engine.saveGame();
            $SM.fireUpdate(parentName);
        }
        return err;
    },

    //return state, undefined or 0
    get: function (stateName, requestZero) {
        var whichState = null;
        var fullPath = $SM.buildPath(stateName);

        //catch errors if parent of state doesn't exist
        try {
            eval('whichState = (' + fullPath + ')');
        } catch (e) {
            whichState = undefined;
        }

        //prevents repeated if undefined, null, false or {}, then x = 0 situations
        if ((!whichState || whichState == {}) && requestZero) return 0;
        else return whichState;
    },

    //mainly for local copy use, add(M) can fail so we can't shortcut them
    //since set does not fail, we know state exists and can simply return the object
    setget: function (stateName, value, noEvent) {
        $SM.set(stateName, value, noEvent);
        return eval('(' + $SM.buildPath(stateName) + ')');
    },

    remove: function (stateName, noEvent) {
        var whichState = $SM.buildPath(stateName);
        try {
            eval('(delete ' + whichState + ')');
        } catch (e) {
            //it didn't exist in the first place
            Engine.log('WARNING: Tried to remove non-existant state \'' + stateName + '\'.');
        }
        if (!noEvent) {
            Engine.saveGame();
            $SM.fireUpdate(stateName);
        }
    },

    removeBranch: function (stateName, noEvent) {
        for (var i in $SM.get(stateName)) {
            if (typeof $SM.get(stateName)[i] == 'object') {
                $SM.removeBranch(stateName + '["' + i + '"]');
            }
        }
        if ($.isEmptyObject($SM.get(stateName))) {
            $SM.remove(stateName);
        }
        if (!noEvent) {
            Engine.saveGame();
            $SM.fireUpdate(stateName);
        }
    },

    //creates full reference from input
    //hopefully this won't ever need to be more complicated
    buildPath: function (input) {
        var dot = (input.charAt(0) == '[') ? '' : '.'; //if it starts with [foo] no dot to join
        return 'State' + dot + input;
    },

    fireUpdate: function (stateName, save) {
        var category = $SM.getCategory(stateName);
        if (stateName == undefined) stateName = category = 'all'; //best if this doesn't happen as it will trigger more stuff
        $.Dispatch('stateUpdate').publish({ 'category': category, 'stateName': stateName });
        if (save) Engine.saveGame();
    },

    getCategory: function (stateName) {
        var firstOB = stateName.indexOf('[');
        var firstDot = stateName.indexOf('.');
        var cutoff = null;
        if (firstOB == -1 || firstDot == -1) {
            cutoff = firstOB > firstDot ? firstOB : firstDot;
        } else {
            cutoff = firstOB < firstDot ? firstOB : firstDot;
        }
        if (cutoff == -1) {
            return stateName;
        } else {
            return stateName.substr(0, cutoff);
        }
    },

    //Use this function to make old save games compatible with new version
    updateOldState: function () {
        var version = $SM.get('version');
        if (typeof version != 'number') version = 1.0;
        
        // Current no version changes.
    },


    /******************************************************************
	 * Start of specific state functions
	 ******************************************************************/

    //PERKS
    addPerk: function (name) {
        $SM.set('player.perks["' + name + '"]', true);
        Notifications.notify(null, Engine.Perks[name].notify);
    },

    hasPerk: function (name) {
        return $SM.get('player.perks["' + name + '"]');
    },

    handleStateUpdates: function (e) {

    }
};

//alias
var $SM = StateManager;