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

            Engine.disableSelection();

            if (this.options.state != null) {
                window.State = this.options.state;
            } else {
                Engine.loadGame();
            }

            // Registers keypress handlers
            $('#gameInputTxt').off('keydown').keydown(Engine.keyDown);

            // subscribe to stateUpdates
            $.Dispatch('stateUpdate').subscribe(Engine.handleStateUpdates);

            //$SM.init();               // State Manager
            //Notifications.init();     // Notifications Handler
            //Events.init();            // Events Handler
            //Room.init();              // Rooms Handler?

            //Engine.travelTo(Room); // @TODO pass starting / state room ?
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

        event: function (cat, act) {
            if (typeof ga === 'function') {
                ga('send', 'event', cat, act);
            }
        },

        confirmDelete: function () {
            Events.startEvent({
                title: _('Restart?'),
                scenes: {
                    start: {
                        text: [_('restart the game?')],
                        buttons: {
                            'yes': {
                                text: _('yes'),
                                nextScene: 'end',
                                onChoose: Engine.deleteSave
                            },
                            'no': {
                                text: _('no'),
                                nextScene: 'end'
                            }
                        }
                    }
                }
            });
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

        activeModule: null,

        // @TODO travelTo

        log: function (msg) {
            if (this._log) {
                console.log(msg);
            }
        },

        keyDown: function (e) {
            // @TODO update to detect only Enter Key.

            e = e || window.event;
            if (!Engine.keyPressed && !Engine.keyLock) {
                Engine.pressed = true;
                if (Engine.activeModule.keyDown) {
                    Engine.activeModule.keyDown(e);
                }
            }
            return jQuery.inArray(e.keycode, [37, 38, 39, 40]) < 0;
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

$(function () {
    Engine.init();
});