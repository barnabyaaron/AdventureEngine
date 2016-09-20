(function () {
    var Engine = window.Engine = {

        VERSION: 1.0,
        GAME_STARTED: false,
        GAME_OVER: false,
        SAVE_DISPLAY: 30 * 1000,

        options: {
            state: null,
            debug: false,
            log: false
        },

        ui: {
            roomPanel: false,
            playerPanel: true
        },

        topics: {},        

        init: function (options) {
            Engine.GAME_STARTED = $SM.get('game.started', true);
            if (Engine.GAME_STARTED) return;

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

            $SM.init();                 // State Manager
            Notifications.init();       // Notifications Handler
            Items.init();               // Items Handler
            Room.init();                // Rooms Hander
            Player.init();              // Player Handler
            Events.init();              // Events Handler
            Story.init();               // Story Handler
            
            Engine.GAME_STARTED = true;
            $SM.set('game.started', Engine.GAME_STARTED);

            Engine.updateUI();
            Engine.autoFocus();
        },

        browserValid: function () {
            return (location.search.indexOf('ignorebrowser=true') >= 0 || (typeof Storage != 'undefined' && !oldIE));
        },

        isMobile: function () {
            return (location.search.indexOf('ignorebrowser=true') < 0 && /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent));
        },

        updateUI: function () {
            var hasCompas = $SM.get('game.compass');
            if (hasCompas == undefined) hasCompas = false;

            Engine.ui.roomPanel = hasCompas;

            Player.checkUISettings();
            Story.checkUISettings();
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
            Events.startEvent({
                title: 'Export / Import',
                scenes: {
                    start: {
                        text: [
							'export or import save data, for backing up',
							'or migrating computers'
                        ],
                        buttons: {
                            'export': {
                                text: 'export',
                                nextScene: {1: 'inputExport'}
                            },
                            'import': {
                                text: 'import',
                                nextScene: {1: 'confirm'}
                            },
                            'cancel': {
                                text: 'cancel',
                                nextScene: 'end'
                            }
                        }
                    },
                    'inputExport': {
                        text: ['save this.'],
                        textarea: Engine.export64(),
                        onLoad: function() { Engine.event('progress', 'export'); },
                        readonly: true,
                        buttons: {
                            'done': {
                                text: 'got it',
                                nextScene: 'end',
                                onChoose: Engine.disableSelection
                            }
                        }
                    },
                    'confirm': {
                        text: [
							'are you sure?',
							'if the code is invalid, all data will be lost.',
							'this is irreversible.'
                        ],
                        buttons: {
                            'yes': {
                                text: 'yes',
                                nextScene: {1: 'inputImport'},
                                onChoose: Engine.enableSelection
                            },
                            'no': {
                                text: 'no',
                                nextScene: {1: 'start'}
                            }
                        }
                    },
                    'inputImport': {
                        text: ['put the save code here.'],
                        textarea: '',
                        buttons: {
                            'okay': {
                                text: 'import',
                                nextScene: 'end',
                                onChoose: Engine.import64
                            },
                            'cancel': {
                                text: 'cancel',
                                nextScene: 'end'
                            }
                        }
                    }
                }
            });
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
            Events.startEvent({
                title: 'Restart?',
                scenes: {
                    start: {
                        text: ['restart the game?'],
                        buttons: {
                            'yes': {
                                text: 'yes',
                                nextScene: 'end',
                                onChoose: Engine.deleteSave
                            },
                            'no': {
                                text: 'no',
                                nextScene: 'end'
                            }
                        }
                    }
                }
            });
        },

        deleteSave: function (noReload) {
            Engine.GAME_OVER = false;

            if (typeof Storage != 'undefined' && localStorage) {
                window.State = {};
                localStorage.clear();
            }

            if (!noReload) {
                location.reload();
            }
        },

        endGame: function() {
            Engine.deleteSave(true);
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
                if (!Engine.keyLock && !Engine.GAME_OVER) {
                    var cmd = $('#commandTxt').val().toLowerCase();
                    Commands.trigger(cmd);
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

        autoFocus: function (element) {
            if (element == undefined)
                return $('#commandTxt').focus();

            $(element).focus();
        },

        handleStateUpdates: function (e) {
            if (e.category == 'game' && e.stateName.indexOf('game.compass') === 0) {
                Engine.updateUI();
            };
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
        $('#devGameModal').modal('show');
        Engine.init();
    });
});