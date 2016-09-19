var Button = {
    Button: function (options) {
        if (typeof options.cooldown == 'number') {
            this.data_cooldown = options.cooldown;
        }
        this.data_remaining = 0;
        if (typeof options.click == 'function') {
            this.data_handler = options.click;
        }

        var el = $('<div>')
            .attr('id', typeof (options.id) != 'undefined' ? options.id : "BTN_" + Engine.getGuid())
            .addClass('button')
            .text(typeof (options.text) != 'undefind' ? options.text : "button")
            .click(function () {
                if (!$(this).hasClass('disabled')) {
                    Button.cooldown($(this));
                    $(this).data("handler")($(this));
                }
            })
            .data("handler", typeof options.click == 'function' ? options.click : function () { Engine.log("click"); })
            .data("remaining", 0)
            .data("cooldown", typeof options.cooldown == 'number' ? options.cooldown : 0);

        el.append($("<div>").addClass('cooldown'));

        // waiting for expiry of residual cooldown detected in state
        Button.cooldown(el, 'state');

        if (options.cost) {
            var ttPos = options.ttPos ? options.ttPos : "buttom right";
            var costTooltip = $('<div>').addClass('tooltip' + ttPos);

            for (var k in options.cost) {
                $("<div>").addClass('row_key').text(k).appendTo(costTooltip);
                $("<div>").addClass('row_val').text(options.cost[k]).appendTo(costTooltip);
            }

            if (costTooltip.children().length > 0) {
                costTooltip.appendTo(el);
            }
        }

        if (options.width) {
            el.css('width', options.width);
        }

        return el;
    },

    saveCooldown: true,

    setDisabled: function (btn, disabled) {
        if (btn) {
            if (!disabled && !btn.data('onCooldown')) {
                btn.removeClass('disabled');
            } else if (disabled) {
                btn.addClass('disabled');
            }
            btn.data('disabled', disabled);
        }
    },

    isDisabled: function (btn) {
        if (btn) {
            return btn.data('disabled') === true;
        }
        return false;
    },

    cooldown: function (btn, option) {
        var cd = btn.data("cooldown");
        var id = 'cooldown.' + btn.attr('id');
        if (cd > 0) {
            // param "start" takes value from cooldown time if not specified
            var start, left;
            switch (option) {
                // a switch will allow for several uses of cooldown function
                case 'state':
                    if (!$SM.get(id)) {
                        return;
                    }
                    start = Math.min($SM.get(id), cd);
                    left = (start / cd).toFixed(4);
                    break;
                default:
                    start = cd;
                    left = 1;
            }
            Button.clearCooldown(btn);
            if (Button.saveCooldown) {
                $SM.set(id, start);
                // residual value is measured in seconds
                // saves program performance
                btn.data('countdown', Engine.setInterval(function () {
                    $SM.set(id, $SM.get(id, true) - 0.5, true);
                }, 500));
            }
            var time = start;
            if (Engine.options.doubleTime) {
                time /= 2;
            }
            $('div.cooldown', btn).width(left * 100 + "%").animate({ width: '0%' }, time * 1000, 'linear', function () {
                Button.clearCooldown(btn, true);
            });
            btn.addClass('disabled');
            btn.data('onCooldown', true);
        }
    },

    clearCooldown: function (btn, ended) {
        var ended = ended || false;
        if (!ended) {
            $('div.cooldown', btn).stop(true, true);
        }
        btn.data('onCooldown', false);
        if (btn.data('countdown')) {
            window.clearInterval(btn.data('countdown'));
            $SM.remove('cooldown.' + btn.attr('id'));
            btn.removeData('countdown');
        }
        if (!btn.data('disabled')) {
            btn.removeClass('disabled');
        }
    }
};
var Commands = {

    CHEAT_MODE: false,
    CHEAT_MODE_COMMAND: 'toggle debug',

    options: {},

    init: function(options) {
        this.options = $.extend(
            this.options,
            options
        );

        // subscribe to statusUpdates
        $.Dispatch('stateUpdate').subscribe(Events.handleStateUpdates);
    },

    trigger: function (command) {
        // Command Event Prevent normal actives
        if (Story.options.inCommandEvent) {
            return Story.options.commandEventCallback(command);
        }

        // Check Current Room Commands
        var curRoom = Room.getRoom(Story.activeRoom);
        if ((curRoom != undefined && curRoom != null) && curRoom.commands != undefined && curRoom.commands.length > 0) {
            for (var c in curRoom.command) {
                var validCommands = curRoom.command[c][0];
                var cmdCallback = curRoom.command[c][1];

                for (var cmd in validCommands) {
                    if (command == validCommands[cmd]) {
                        return cmdCallback();
                    }
                }
            }
        }

        // Check for CHEAT MODE COMMAND
        if (command == Commands.CHEAT_MODE_COMMAND) {
            if (Commands.CHEAT_MODE) {
                Commands.CHEAT_MODE = false;
                Engine.options.debug = false;
                Engine.options.log = false;

                Notifications.notify("Debug Mode Deactive");
                return;
            } else {
                Commands.CHEAT_MODE = true;
                Engine.options.debug = true;
                Engine.options.log = true;

                Notifications.notify("Debug Mode Active");
                return;
            }
        }

        if (Commands.CHEAT_MODE) {
            // Check if cheat command
            if (Commands.triggerCheatCommands(command)) { return; }
        }
        
        cmdSplit = command.split(" ");
        
        switch (cmdSplit[0]) {
            case "go":
            case "walk":
                return Commands.triggerGo(cmdSplit);

            case "north":
            case "n":
                return Commands.triggerGo("north");

            case "south":
            case "s":
                return Commands.triggerGo("south");

            case "east":
            case "e":
                return Commands.triggerGo("east");

            case "west":
            case "w":
                return Commands.triggerGo("west");

            case "look":
                return Commands.triggerLook();

            case "use":
                return command.triggerUse(command);

            case "eat":
                return command.triggerEat(command);

            default:
                return Commands.triggerInvalidCommand();
        }

    },

    triggerCheatCommands: function (command) {
        switch (command) {
            case "heal":
                Player.setHp(Player.getMaxHealth());
                return true;
            case "trigger fight":
                Events.triggerFight();
                return true;
            case "trigger event":
                Events.triggerEvent();
                return true;
            case "give item":
                Notifications.notify("What Item do you want ?");

                Story.options.inCommandEvent = true;
                Story.options.commandEventCallback = function (data) {

                    Story.options.inCommandEvent = false;
                };
                return true;
        }


        return false;
    },

    triggerInvalidCommand: function () {
        Notifications.notify("Invalid Command.");
    },

    triggerUse: function(command) {
        var itemName = command.replace("use ", "");

        var item = Items.getUnknownItem(itemName);
        if (item != null) {
            // @TODO Use item
        }
    },

    triggerEat: function (command) {
        var itemName = command.replace("eat ", "");

        var item = Items.getUnknownItem(itemName);
        if (item != null) {
            Player.eatFood(item);
        }
    },

    triggerGo: function(value) {
        if (Array.isArray(value)) {
            if (value.length == 1) {
                Notifications.notify("Go Where?");
                return;
            } else {
                Commands.triggerGo(value[1]);
            }
        } else {
            Story.go(value);
        }
    },

    triggerLook: function() {
        Story.look();
    },

    handleStateUpdates: function (e) { }

};
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
            Events.init();              // Events Handler
            Story.init();               // Story Handler
            Player.init();              // Player Handler
            
            Engine.GAME_STARTED = true;
            $SM.set('game.started', Engine.GAME_STARTED);

            Engine.updateUI();
        },

        browserValid: function () {
            return (location.search.indexOf('ignorebrowser=true') >= 0 || (typeof Storage != 'undefined' && !oldIE));
        },

        isMobile: function () {
            return (location.search.indexOf('ignorebrowser=true') < 0 && /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent));
        },

        updateUI: function () {
            var hasCompas = ($SM.get('game.compass', true) === 'true');
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

                    if (cmd != Commands.CHEAT_MODE_COMMAND)
                        Notifications.notify("> " + cmd);

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
        Engine.init();

        $('#devGameModal').modal('show');
    });
});
/*
 * Module that handles the events system 
 */
var Events = {

    _EVENT_TIME_RANGE: [3, 6], // in minutes
    _PANEL_FADE: 200,
    _FLIGHT_SPEED: 100,
    _MEDS_COOLDOWN: 7,
    _LEAVE_COOLDOWN: 1,
    STUN_DURATION: 4000,

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        // Build the Event Pool
        Events.EventPool = [].concat(
            Events.Global,
            Events.Story
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
    activeScene: null,

    updateEventPool: function () {
        Events.EventPool = [].concat(
            Events.Global,
            Events.Story
        );
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

    // Load an event scene
    loadScene: function (name) {
        Engine.log('loading scene: ' + name);
        Events.activeScene = name;
        var scene = Events.activeEvent().scenes[name];

        // onLoad
        if (scene.onLoad) {
            scene.onLoad();
        }

        // Notify the scene change
        if (scene.notification) {
            Notifications.notify(null, scene.notification);
        }

        // Scene reward
        if (scene.reward) {
            $SM.addM('inventory', scene.reward);
        }

        $('#eventDescription', Events.eventPanel()).empty();
        $('#eventButtons', Events.eventPanel()).empty();
        if (scene.combat) {
            Events.startCombat(scene);
        } else {
            Events.startStory(scene);
        }
    },

    // Story Event
    startStory: function (scene) {
        // Write the text
        var desc = $('#eventDescription', Events.eventPanel());
        var leaveBtn = false;
        for (var i in scene.text) {
            $('<div>').text(scene.text[i]).appendTo(desc);
        }

        if (scene.textarea != null) {
            var ta = $('<textarea>').val(scene.textarea).appendTo(desc);
            if (scene.readonly) {
                ta.attr('readonly', true);
            }
            Engine.autoSelect('#eventDescription textarea');
        }

        // Draw any loot
        if (scene.loot) {
            Events.drawLoot(scene.loot);
        }

        // Draw the buttons
        leaveBtn = Events.drawButtons(scene);
    },

    // Combat Event
    startCombat: function (scene) {
        Engine.event('game event', 'combat');
        Events.won = false;
        var desc = $('#eventDescription', Events.eventPanel());

        $('<div>').text(scene.notification).appendTo(desc);

        // Draw the combat panel
        Events.createCombatPanel(desc, scene);

        // Draw the action buttons
        var btns = $('#eventButtons', Events.eventPanel());

        var numWeapons = 0;
        for (var k in Items.Weapons) {
            var weapon = Items.Weapons[k];
            if (Player.inventory[k]) {
                if (typeof weapon.damage != 'number' || weapon.damage === 0) {
                    // Weapons that deal no damage don't count
                    numWeapons--;
                } else if (weapon.cost) {
                    for (var c in weapon.cost) {
                        var num = weapon.cost[c];
                        if (typeof Player.inventory[c] != 'number' || Player.inventory[c] < num) {
                            // Can't use this weapon, so don't count it
                            numWeapons--;
                        }
                    }
                }
                numWeapons++;
                Events.createAttackButton(k).appendTo(btns);
            }
        }
        if (numWeapons === 0) {
            // No weapons? You can punch stuff!
            Events.createAttackButton('fists').prependTo(btns);
        }

        if ((Player.inventory['medicine'] || 0) !== 0) {
            Events.createUseMedsButton().appendTo(btns);
        }

        // Set up the enemy attack timer
        Events._enemyAttackTimer = Engine.setTimeout(Events.enemyAttack, scene.attackDelay * 1000);
    },

    createUseMedsButton: function (cooldown) {
        if (cooldown == null) {
            cooldown = Events._MEDS_COOLDOWN;
        }

        var btn = new Button.Button({
            id: 'meds',
            text: 'use meds',
            cooldown: cooldown,
            click: Events.useMeds,
            cost: { 'medicine': 1 }
        });

        if ((Player.inventory['medicine'] || 0) === 0) {
            Button.setDisabled(btn, true);
        }

        return btn;
    },

    createAttackButton: function (weaponName) {
        var weapon = Items.Weapons[weaponName];
        var cd = weapon.cooldown;
        if (weapon.type == 'unarmed') {
            if ($SM.hasPerk('martial artist')) {
                cd /= 2;
            }
        }
        var btn = new Button.Button({
            id: 'attack_' + weaponName.replace(' ', '-'),
            text: weapon.verb,
            cooldown: cd,
            click: Events.useWeapon,
            cost: weapon.cost
        });
        if (typeof weapon.damage == 'number' && weapon.damage > 0) {
            btn.addClass('weaponButton');
        }

        for (var k in weapon.cost) {
            if (typeof Player.inventory[k] != 'number' || Player.inventory[k] < weapon.cost[k]) {
                Button.setDisabled(btn, true);
                break;
            }
        }

        return btn;
    },

    drawFloatText: function (text, parent) {
        $('<div>').text(text).addClass('damageText').appendTo(parent).animate({
            'bottom': '100px',
            'opacity': '0'
        },
		300,
		'linear',
		function () {
		    $(this).remove();
		});
    },

    useMeds: function () {
        if (Player.inventory['medicine']) {
            Player.inventory['medicine']--;
            Player.updateInventory();

            if (Player.inventory['medicine'] === 0) {
                Button.setDisabled($('#meds'), true);
            }

            var hp = Player.health;
            hp += Player.medsHeal();
            hp = hp > Player.getMaxHealth() ? Player.getMaxHealth() : hp;
            Player.setHp(hp);

            if (Events.activeEvent()) {
                var w = $('#gamePlayerStats');
                w.data('hp', hp);
                Events.updateFighterDiv(w);
                Events.drawFloatText('+' + Player.medsHeal(), '#gamePlayer');
                var takeETbutton = Events.setTakeAll();
                Events.canLeave(takeETbutton);
            }
        }
    },

    useWeapon: function (btn) {
        if (Events.activeEvent()) {
            var weaponName = btn.attr('id').substring(7).replace('-', ' ');
            var weapon = Items.Weapons[weaponName];
            if (weapon.type == 'unarmed') {
                if (!$SM.get('player.punches')) $SM.set('player.punches', 0);

                $SM.add('player.punches', 1);
                if ($SM.get('player.punches') == 50 && !$SM.hasPerk('boxer')) {
                    $SM.addPerk('boxer');
                } else if ($SM.get('player.punches') == 150 && !$SM.hasPerk('martial artist')) {
                    $SM.addPerk('martial artist');
                }
            }
            if (weapon.cost) {
                var mod = {};
                var out = false;
                for (var k in weapon.cost) {
                    if (typeof Player.inventory[k] != 'number' || Player.inventory[k] < weapon.cost[k]) {
                        return;
                    }
                    mod[k] = -weapon.cost[k];
                    if (Player.inventory[k] - weapon.cost[k] < weapon.cost[k]) {
                        out = true;
                    }
                }
                for (var k in mod) {
                    Player.inventory[k] += mod[k];
                }
                if (out) {
                    Button.setDisabled(btn, true);
                    var validWeapons = false;
                    $('.weaponButton').each(function () {
                        if (!Button.isDisabled($(this)) && $(this).attr('id') != 'attack_fists') {
                            validWeapons = true;
                            return false;
                        }
                    });
                    if (!validWeapons) {
                        // enable or create the punch button
                        var fists = $('#attack_fists');
                        if (fists.length === 0) {
                            Events.createAttackButton('fists').prependTo('#buttons', Events.eventPanel());
                        } else {
                            Button.setDisabled(fists, false);
                        }
                    }
                }
                Player.updateInventory();
            }
            var dmg = -1;
            if (Math.random() <= Player.getHitChance()) {
                dmg = weapon.damage;
                if (typeof dmg == 'number') {
                    if (weapon.type == 'unarmed' && $SM.hasPerk('boxer')) {
                        dmg *= 2;
                    }
                    if (weapon.type == 'unarmed' && $SM.hasPerk('martial artist')) {
                        dmg *= 3;
                    }
                }
            }

            var attackFn = weapon.type == 'ranged' ? Events.animateRanged : Events.animateMelee;
            attackFn($('#gamePlayer'), dmg, function () {
                if ($('#gameEnemyStats').data('hp') <= 0 && !Events.won) {
                    // Success!
                    Events.winFight();
                }
            });
        }
    },

    animateMelee: function (fighter, dmg, callback) {
        var start, end, enemyStats, enemy;
        if (fighter.attr('id') == 'gamePlayer') {
            start = { 'left': '50%' };
            end = { 'left': '25%' };
            enemyStats = $('#gameEnemyStats');
            enemy = $('#gameEnemy');
        } else {
            start = { 'right': '50%' };
            end = { 'right': '25%' };
            enemyStats = $('#gamePlayerStats');
            enemy = $('#gamePlayer');
        }

        fighter.stop(true, true).animate(start, Events._FIGHT_SPEED, function () {
            var enemyHp = enemyStats.data('hp');
            var msg = "";
            if (typeof dmg == 'number') {
                if (dmg < 0) {
                    msg = 'miss';
                    dmg = 0;
                } else {
                    msg = '-' + dmg;
                    enemyHp = ((enemyHp - dmg) < 0) ? 0 : (enemyHp - dmg);
                    enemyStats.data('hp', enemyHp);
                    if (fighter.attr('id') == 'gameEnemy') {
                        Player.setHp(enemyHp);
                    }
                    Events.updateFighterDiv(enemyStats);
                }
            } else {
                if (dmg == 'stun') {
                    msg = 'stunned';
                    enemyStats.data('stunned', true);
                    Engine.setTimeout(function () {
                        enemyStats.data('stunned', false);
                    }, Events.STUN_DURATION);
                }
            }

            Events.drawFloatText(msg, enemy);

            $(this).animate(end, Events._FIGHT_SPEED, callback);
        });
    },

    animateRanged: function (fighter, dmg, callback) {
        var start, end, enemyStats, enemy;
        if (fighter.attr('id') == 'gamePlayer') {
            start = { 'left': '25%' };
            end = { 'left': '50%' };
            enemyStats = $('#gameEnemyStats');
            enemy = $('#gameEnemy');
        } else {
            start = { 'right': '25%' };
            end = { 'right': '50%' };
            enemyStats = $('#gamePlayerStats');
            enemy = $('#gamePlayer');
        }

        $('<div>').css(start).addClass('bullet').text('o').appendTo('#fightersPanel')
				.animate(end, Events._FIGHT_SPEED, 'linear', function () {
				    var enemyHp = enemyStats.data('hp');
				    var msg = "";
				    if (typeof dmg == 'number') {
				        if (dmg < 0) {
				            msg = 'miss';
				            dmg = 0;
				        } else {
				            msg = '-' + dmg;
				            enemyHp = ((enemyHp - dmg) < 0) ? 0 : (enemyHp - dmg);
				            enemyStats.data('hp', enemyHp);
				            if (fighter.attr('id') == 'gameEnemy') {
				                Player.setHp(enemyHp);
				            }
				            Events.updateFighterDiv(enemyStats);
				        }
				    } else {
				        if (dmg == 'stun') {
				            msg = 'stunned';
				            enemyStats.data('stunned', true);
				            Engine.setTimeout(function () {
				                enemyStats.data('stunned', false);
				            }, Events.STUN_DURATION);
				        }
				    }

				    Events.drawFloatText(msg, enemy);

				    $(this).remove();

				    if (typeof callback == 'function') {
				        callback();
				    }
				});
    },

    enemyAttack: function () {
        if (Events.activeEvent() == null) return;

        var scene = Events.activeEvent().scenes[Events.activeScene];

        if (!$('#gameEnemyStats').data('stunned')) {
            var toHit = scene.hit;
            toHit *= $SM.hasPerk('evasive') ? 0.8 : 1;
            var dmg = -1;
            if (Math.random() <= toHit) {
                dmg = scene.damage;
            }

            var attackFn = scene.ranged ? Events.animateRanged : Events.animateMelee;

            attackFn($('#gameEnemy'), dmg, function () {
                if ($('#gamePlayerStats').data('hp') <= 0) {
                    // Failure!
                    clearTimeout(Events._enemyAttackTimer);
                    Events.endEvent();
                    Player.die();
                }
            });
        }

        Events._enemyAttackTimer = Engine.setTimeout(Events.enemyAttack, scene.attackDelay * 1000);
    },

    winFight: function () {
        Events.won = true;
        clearTimeout(Events._enemyAttackTimer);
        $('#gameEnemy').animate({ opacity: 0 }, 300, 'linear', function () {
            Engine.setTimeout(function () {
                try {
                    var scene = Events.activeEvent().scenes[Events.activeScene];
                    var leaveBtn = false;
                    var desc = $('#eventDescription', Events.eventPanel());
                    var btns = $('#eventButtons', Events.eventPanel());
                    desc.empty();
                    btns.empty();
                    $('<div>').text(scene.deathMessage).appendTo(desc);

                    Events.drawLoot(scene.loot);

                    if (scene.buttons) {
                        // Draw the buttons
                        leaveBtn = Events.drawButtons(scene);
                    } else {
                        leaveBtn = new Button.Button({
                            id: 'leaveBtn',
                            cooldown: Events._LEAVE_COOLDOWN,
                            click: function () {
                                if (scene.nextScene && scene.nextScene != 'end') {
                                    Events.loadScene(scene.nextScene);
                                } else {
                                    Events.endEvent();
                                }
                            },
                            text: 'leave'
                        });
                        Button.cooldown(leaveBtn.appendTo(btns));

                        if ((Player.inventory['medicine'] || 0) !== 0) {
                            Events.createUseMedsButton(0).appendTo(btns);
                        }
                    }
                } catch (e) {
                    // It is possible to die and win if the timing is perfect. Just let it fail.
                }
            }, 1000, true);
        });
    },

    drawLoot: function (lootList) {
        var desc = $('#eventDescription', Events.eventPanel());
        var lootPanel = $('<div>').attr('id', 'eventLootDrops').text('Loot:').appendTo(desc);


        for (var id in lootList) {
            var loot = lootList[id];

            if (Math.random() < loot.chance) {
                var qty = Math.floor(Math.random() * (loot.max - loot.min)) + loot.min;
                var lootRow = Events.drawLootRow(id, qty);
                lootRow.appendTo(lootPanel);

                // Take Loot
                Events.takeLoot(id, qty);
            }
        }
    },

    drawLootRow: function (item, qty) {
        var obj = Items.getUnknownItem(item);

        var lootRow = $('<div>').addClass('eventLootRow').data('item', obj.name);
        $('<span>').text(obj.name + ' [' + qty + ']').appendTo(lootRow);

        return lootRow;
    },

    takeLoot: function (lootID, qty) {
        $SM.add('inventory["' + lootID + '"]', qty);
    },

    createCombatPanel: function (desc, scene) {
        var combatPanel = $('<div>').attr('id', 'combatPanel').appendTo(desc);

        // Player Stats Panel
        Events.createFighterStatsDiv('Player', Player.health, Player.getMaxHealth()).attr('id', 'gamePlayerStats').appendTo(combatPanel);

        // Fighters Panel
        var fPanel = $('<div>').attr('id', 'fightersPanel').appendTo(combatPanel);

        // Draw the player
        Events.createFighterDiv('Player').attr('id', 'gamePlayer').appendTo(fPanel);

        // Draw the enemy
        Events.createFighterDiv(scene.enemyName).attr('id', 'gameEnemy').appendTo(fPanel);

        // Enemy Stats Panel
        Events.createFighterStatsDiv(scene.enemyName, scene.health, scene.health).attr('id', 'gameEnemyStats').appendTo(combatPanel);
    },

    createFighterDiv: function (name) {
        var fighter = $('<div>').addClass('fighter').html("<i class='fa fa-male fa-3x'></i><br />" + name);
        return fighter;
    },

    createFighterStatsDiv: function (name, hp, maxhp) {
        var fStatsPanel = $('<div>').addClass('fighterStats').data('hp', hp).data('maxHp', maxhp).data('refname', name);

        $('<span>').addClass('fighterStatsName').text(name).appendTo(fStatsPanel);
        var hpPanel = $('<div>').addClass('hp').text(hp + '/' + maxhp).appendTo(fStatsPanel);
        $('<div>').addClass('clear').appendTo(hpPanel);
        Player.createHPHearts(hp, hpPanel);

        return fStatsPanel;
    },

    updateFighterDiv: function (fighter) {
        var hpPanel = $('.hp', fighter).text(fighter.data('hp') + '/' + fighter.data('maxHp'));
        $('<div>').addClass('clear').appendTo(hpPanel);
        Player.createHPHearts(fighter.data('hp'), hpPanel);
    },

    drawButtons: function (scene) {
        var btns = $('#eventButtons', Events.eventPanel());
        var btnsList = [];
        for (var id in scene.buttons) {
            var info = scene.buttons[id];
            var b = new Button.Button({
                id: id,
                text: info.text,
                cost: info.cost,
                click: Events.buttonClick,
                cooldown: info.cooldown
            }).appendTo(btns);
            if (typeof info.available == 'function' && !info.available()) {
                Button.setDisabled(b, true);
            }
            if (typeof info.cooldown == 'number') {
                Button.cooldown(b);
            }
            btnsList.push(b);
        }

        Events.updateButtons();
        return (btnsList.length == 1) ? btnsList[0] : false;
    },

    updateButtons: function () {
        var btns = Events.activeEvent().scenes[Events.activeScene].buttons;
        for (var bId in btns) {
            var b = btns[bId];
            var btnEl = $('#' + bId, Events.eventPanel());
            if (typeof b.available == 'function' && !b.available()) {
                Button.setDisabled(btnEl, true);
            } else if (b.cost) {
                var disabled = false;
                for (var store in b.cost) {
                    var num = Player.inventory[store];
                    if (typeof num != 'number') num = 0;
                    if (num < b.cost[store]) {
                        // Too expensive
                        disabled = true;
                        break;
                    }
                }
                Button.setDisabled(btnEl, disabled);
            }
        }
    },

    buttonClick: function (btn) {
        var info = Events.activeEvent().scenes[Events.activeScene].buttons[btn.attr('id')];
        // Cost
        var costMod = {};
        if (info.cost) {
            for (var store in info.cost) {
                var num = Player.inventory[store];
                if (typeof num != 'number') num = 0;
                if (num < info.cost[store]) {
                    // Too expensive
                    return;
                }
                costMod[store] = -info.cost[store];
            }

            $SM.addM('inventory', costMod);
        }

        if (typeof info.onChoose == 'function') {
            var textarea = Events.eventPanel().find('textarea');
            info.onChoose(textarea.length > 0 ? textarea.val() : null);
        }

        // Reward
        if (info.reward) {
            $SM.addM('inventory', info.reward);
        }

        Events.updateButtons();

        // Notification
        if (info.notification) {
            Notifications.notify(null, info.notification);
        }

        // Next Scene
        if (info.nextScene) {
            if (info.nextScene == 'end') {
                Events.endEvent();
            } else {
                var r = Math.random();
                var lowestMatch = null;
                for (var i in info.nextScene) {
                    if (r < i && (lowestMatch == null || i < lowestMatch)) {
                        lowestMatch = i;
                    }
                }
                if (lowestMatch != null) {
                    Events.loadScene(info.nextScene[lowestMatch]);
                    return;
                }
                Engine.log('ERROR: no suitable scene found');
                Events.endEvent();
            }
        }
    },

    // Makes an event happen!
    triggerEvent: function () {
        if (Events.activeEvent() == null) {
            var possibleEvents = [];
            for (var i in Events.EventPool) {
                var event = Events.EventPool[i];

                if (event != undefined && event.isAvailable()) {
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

    triggerRoomEvent: function(events) {
        if (Events.activeEvent() == null) {
            var possibleEvents = [];
            for (var e in events) {
                if (e.isAvailable()) {
                    possibleEvents.push(e);
                }
            }

            if (possibleEvents.length === 0) {
                return;
            } else {
                var r = Math.floor(Math.random() * (possibleEvents.length));
                Events.startEvent(possibleEvents[r]);
            }
        }
    },
    
    startEvent: function (event, options) {
        if (event) {
            Engine.event('game event', 'event');
            Engine.keyLock = true;
            Button.saveCooldown = false;
            Events.eventStack.unshift(event);
            event.eventPanel = $('<div>').attr('id', 'event').addClass('eventPanel').css('opacity', '0');
            if (options != null && options.width != null) {
                Events.eventPanel().css('width', options.width);
            }
            $('<div>').addClass('eventTitle').text(Events.activeEvent().title).appendTo(Events.eventPanel());
            $('<div>').attr('id', 'eventDescription').appendTo(Events.eventPanel());
            $('<div>').attr('id', 'eventButtons').appendTo(Events.eventPanel());
            Events.loadScene('start');
            $('div#gameWrapper').append(Events.eventPanel());
            Events.eventPanel().animate({ opacity: 1 }, Events._PANEL_FADE, 'linear');
            var currentSceneInformation = Events.activeEvent().scenes[Events.activeScene];   
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
            Button.saveCooldown = true;

            // Force refocus on the body. I hate you, IE.
            $('body').focus();
        });
    },

    handleStateUpdates: function (e) {
        if ((e.category == 'inventory') && Events.activeEvent() != null) {
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
var Items = {

    DEFAULT_WEAPON_DAMAGE: 1,
    DEFAULT_WEAPON_COOLDOWN: 2,

    Weapons: {
        'fists': {
            id: 'fists',
            name: 'Fists',
            verb: 'punch',
            type: 'unarmed',
            damage: 1,
            cooldown: 2
        }
        // Examples
        //'bone spear': {
        //    verb: 'stab',
        //    type: 'melee',
        //    damage: 2,
        //    cooldown: 2
        //},
        //'iron sword': {
        //    verb: 'swing',
        //    type: 'melee',
        //    damage: 4,
        //    cooldown: 2
        //},
        //'rifle': {
        //    verb: 'shoot',
        //    type: 'ranged',
        //    damage: 5,
        //    cooldown: 1,
        //    cost: { 'bullets': 1 }
        //},
    },

    Food: {
        'meat': {
            id: 'meat',
            name: 'Meat',
            type: 'food',
            heal: 2
        },
    },

    Craftables: {
        'torch': {
            it: 'torch',
            name: 'Torch',
            type: 'tool',
            buildMsg: 'a torch to keep the dark away',
            cost: function () {
                return {
                    'wood': 1,
                    'cloth': 1
                };
            }
        }
        // Examples
        //'bone spear': {
        //    id: 'bone spear',
        //    name: 'bone spear',
        //    type: 'weapon',
        //    maximum: 10,
        //    availableMsg: 'builder says she can make traps to catch any creatures might still be alive out there',
        //    buildMsg: "this spear's not elegant, but it's pretty good at stabbing",
        //    maxMsg: "more traps won't help now",
        //    cost: function () {
        //        return {
        //            'wood': 2,
        //            'bone': 1
        //        };
        //    }
        //}
    },

    Ammo: {
        'medicine': {
            id: 'medicine',
            name: 'Medicine',
            type: 'ammo'
        },
        'bullets': {
            id: 'bullets',
            name: 'Bullets',
            type: 'ammo'
        },
    },

    MiscItems: {
        'compass': {
            id: 'compass',
            name: 'Compass',
            type: 'misc',
            desc: 'A golden compass',
            roomDesc: 'You notice a golden <b>compass</b> lying on the floor.'
        }
        // Example
        //'tv remote': {
        //    name: 'TV Remote',
        //    type: 'misc',
        //    desc: 'A Universial TV Remote',
        //    roomDesc: 'A TV Remote lies on the table in the centre of the room.'
        //}
    },

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        Items.ItemPool = [];
        Items.ItemPool['weapon'] = Items.Weapons;
        Items.ItemPool['craftable'] = Items.Craftables;
        Items.ItemPool['food'] = Items.Food;
        Items.ItemPool['ammo'] = Items.Ammo;
        Items.ItemPool['misc'] = Items.MiscItems;

        //subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe(Items.handleStateUpdates);
    },

    options: {},

    getItem: function (type, name) {
        var items = Items.ItemPool[type];
        return items[name];
    },

    getUnknownItem: function (name) {
        for (var type in Items.ItemPool) {
            var items = Items.ItemPool[type];

            if ($.inArray(name, items) > -1) {
                // Item Found
                return items[name];
            }
        }

        // Item not found
        return null;
    },

    addItem: function (type, name, options) {
        var item = {};

        if (name) {
            item.name = options.name;
            item.type = (options.type != undefined) ? options.type : type;

            item.desc = options.desc;
            item.roomDesc = options.roomDesc;

            if (type == "weapon") {
                item.verb = (options.verb != undefined) ? options.verb : 'Use ' + item.name;
                item.damage = (typeof options.damage == 'number' && options.damage > 0) ? options.damage : DEFAULT_WEAPON_DAMAGE;
                item.cooldown = (typeof options.cooldown == 'number' && options.cooldown > 0) ? options.cooldown : DEFAULT_WEAPON_COOLDOWN;

                if (typeof options.cost == 'object') {
                    item.cost = options.cost;
                }
            } else if (type == "craftable") {
                item.maximum = (options.maximum != undefined) ? options.maximum : 1;
                item.availableMsg = options.availableMsg;
                item.buildMsg = options.buildMsg;
                item.maxMsg = (options.maxMsg != undefined) ? options.maxMsg : "You cannot have any more of these.";
            }

            // Create Items
            Items.ItemPool[type][name] = item;
        }
    },

    buildItem: function (id) {
        var craftable = Items.Craftables[id];

        if (craftable != undefined) {
            var numThings = 0;

            switch (craftable.type) {
                case 'weapons':
                case 'tool':
                case 'upgrade':
                    numThings = $SM.get('inventory["' + id + '"]', true);
                    break;
            }

            if (numThings < 0) numThings = 0;
            if (craftable.maximum <= numThings) {
                return;
            }

            var InvMod = {};
            var cost = craftable.cost();

            for (var k in cost) {
                var have = $SM.get('inventory["' + k + '"]', true);
                if (have < cost[k]) {
                    Notifications.nofity("not enough " + k);
                    return false;
                } else {
                    InvMod[k] = have - cost[k];
                }
            }
            $SM.setM('inventory', InvMod);

            Notifications.notify(craftable.buildMsg);

            switch (craftable.type) {
                case 'weapons':
                case 'tool':
                case 'upgrade':
                    $SM.add('inventory["' + id + '"]', 1);
                    break;
            }
        }
    },

    handleStateUpdates: function (e) {
        
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

        if (room != null) {
            if (!noQueue) {
                if (typeof this.notifyQueue[room] == 'undefined') {
                    this.notifyQueue[room] = [];
                }
                this.notifyQueue[room].push(text);
            }
        } else {
            var textSplit = text.split('[[break]]');
            
            for (var i in textSplit) {
                Notifications.printMessage(textSplit[i]);
            }
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

    scrollDown: function () {
        var objDiv = document.getElementById("gameNotifications");
        objDiv.scrollTop = objDiv.scrollHeight;
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
                Notifications.printMessage(this.notifyQueue[room].shift());
            }
        }
    }
};
var Player = {

    BASE_HEALTH: 10,
    BASE_HIT_CHANCE: 0.8,
    MEDS_HEAL: 20,

    name: 'Player',
    options: {},

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        // Inventory
        Player.inventory = $SM.get('inventory');
        if (Player.inventory == undefined) Player.inventory = {};

        var playerPanel = $('<div>').attr('id', 'gamePlayerStatsPanel').appendTo('#gameMain');
        Player.updatePlayerPanel();
        
        //subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe(Player.handleStateUpdates);
    },

    checkUISettings: function () {
        if (!Engine.ui.roomPanel) {
            $('#gamePlayerStatsPanel').css({ 'top': '0px' });
        } else {
            $('#gamePlayerStatsPanel').css({ 'top': 'calc(20% + 25px)' });
        }
    },

    updatePlayerPanel: function () {
        $('#gamePlayerStatsPanel').html(''); // Clear

        // Header
        $('<div>').addClass('gamePanelHeader').text('Player').appendTo('#gamePlayerStatsPanel');

        // Health
        var pHP = $SM.get('player.health');
        if (pHP == undefined) pHP = Player.getMaxHealth();
        Player.setHp(pHP);

        var healthPanel = $('<div>').attr('id', 'gamePlayerStatsHealthCounter').html("HP: " + Player.health + "/" + Player.getMaxHealth() + " <br />").appendTo('#gamePlayerStatsPanel');
        Player.createHPHearts(Player.health, healthPanel);

        $('<div>').addClass('gamePlayerStatsSpacer').text('').appendTo('#gamePlayerStatsPanel'); // Spacer

        // Perks
        var perksPanel = $('<div>').attr('id', 'gamePlayerStatsPerks').appendTo('#gamePlayerStatsPanel');

        // Header
        $('<div>').addClass('gamePanelHeader').text('Perks').appendTo(perksPanel);

        if ($SM.get('player.perks')) {
            for (var p in $SM.get('player.perks')) {
                var id = 'game_player_perk_' + p.replace(' ', '-');
                var r = $('#' + id);

                if ($SM.get('player.perks["' + p + '"]') && r.length === 0) {
                    r = $('<div>').attr('id', id).addClass('perkRow').appendTo(perksPanel);
                    $('<div>').addClass('row_key').text(p).appendTo(r);
                    $('<div>').addClass('tooltip bottom right').text(Story.activeStory.Perks[p].desc).appendTo(r);
                }
            }
        } else {
            $('<span>').addClass('gamePlayerPerkItem').text('None').appendTo(perksPanel);
        }

        $('<div>').addClass('gamePlayerStatsSpacer').text('').appendTo('#gamePlayerStatsPanel'); // Spacer

        // Inventory
        var invPanel = $('<div>').attr('id', 'gamePlayerStatsInventory').appendTo('#gamePlayerStatsPanel');

        // Header
        $('<div>').addClass('gamePanelHeader').text('Inventory').appendTo(invPanel);

        // Inventory Items
        var itemCount = 0;
        for (var itemID in Player.inventory) {
            var item = Items.getUnknownItem(itemID);

            var flag = "";
            switch (item.type) {
                case "weapon":
                    // @TODO Check if equip
                    if ($SM.get('equipment["' + itemID + '"]')) {
                        flag = "(E) ";
                    }
                    break;
                case "upgrade":
                    flag = "(U) ";
                    break;
            }

            var qty = $SM.get('inventory["' + itemID + '"]');
            if (typeof qty != 'number' || isNaN(qty)) {
                qty = 0;
                $SM.set('inventory["' + itemID + '"]', 0);
            }

            if (qty > 0) {
                $('<span>').addClass('inventoryItem').text(item.name + ' ' + flag + '[' + qty + ']').appendTo(invPanel);
                itemCount++;
            }
        }

        if (itemCount == 0) {
            $('<span>').addClass('inventoryItem').text('Empty').appendTo(invPanel);
        }
        
    },

    updatePlayerStats: function () {
        // Update Health
        var healthPanel = $('#gamePlayerStatsHealthCounter').text("HP: ");
        Player.createHPHearts(Player.health, healthPanel);
    },

    createHPHearts: function (health, panel) {
        if (health == 0) {
            $('<i>').text('dead').appendTo(panel);
            return;
        }

        for (var i = 0; i < health; i++) {
            $('<i>').addClass('health').addClass('fa').addClass('fa-heart').appendTo(panel);
        }
    },

    updateInventory: function() {
        $SM.setM('inventory', Player.inventory);
        Player.updatePlayerPanel();
    },

    reloadInventory: function () {
        Player.inventory = $SM.get('inventory');
        Player.updatePlayerPanel();
    },

    setHp: function (hp) {
        if (typeof hp == 'number' && !isNaN(hp)) {
            Player.health = hp;
            if (Player.health > Player.getMaxHealth()) {
                Player.health = Player.getMaxHealth();
            }

            $SM.set('player.health', Player.health);
        }
    },

    medsHeal: function () {
        return World.MEDS_HEAL;
    },

    eatFood: function (item) {
        if (item) {
            if (typeof item == 'string') {
                item = Items.getUnknownItem(item);
            }

            if (typeof item == 'object' && item.type == 'food') {
                if (Player.inventory[item.id]) {
                    var have = Player.inventory[item.id];

                    $SM.set('inventory["' + item.id + '"]', (have - 1));

                    // Heal
                    var heal = (item.heal != undefined) ? item.heal : 1;
                    Player.setHp((Player.health + heal));

                    Notifications.notify("You eat " + item.name);
                } else {
                    Notifications.notify("You have no " + item.name + " to eat");
                }
            } else {
                Notifications.notify("You cannot eat that");
            }
        }
    },

    pickupItem: function (item, qty, room) {
        if (typeof item != 'object') {
            item = Items.getUnknownItem(item);
        }

        if (!qty) { qty = 1; }

        if (room) {
            // Remove Item from room
            if (typeof room != 'object') {
                room = Room.getRoom(room);
            }

            Room.removeLootFromRoom(room, item);
        }
        
        // Give Item to player
        $SM.add('inventory["' + item.id + '"]', qty);

        Notifications.notify("You pickup " + qty + " " + item.name);
        Player.updateInventory();
    },

    die: function () {
        if (!Player.dead) {
            Player.dead = true;
            Engine.log('player death');
            Engine.event('game event', 'death');
            Engine.keyLock = true;

            // Dead!
            Notifications.notify('You Died!');

            Engine.GAME_OVER = true;
            Engine.setTimeout(function () {
                Engine.endGame();
            }, 2000, true);
        }
    },

    getMaxHealth: function () {
        return Player.BASE_HEALTH;
    },

    getHitChance: function () {
        if ($SM.hasPerk('hawkeye')) {
            return Player.BASE_HIT_CHANCE + 0.1;
        }
        return Player.BASE_HIT_CHANCE;
    },

    handleStateUpdates: function (e) {
        if (e.category == 'player' && e.stateName.indexOf('player.perks') === 0) {
            Player.updatePlayerStats();
        };
        if (e.category == 'player' && e.stateName.indexOf('player.health') === 0) {
            Player.updatePlayerStats();
        }
        if (e.category == 'inventory') {
            Player.reloadInventory();
        }
    }
};
var Room = {

    ROOMS: [],

    options: {},

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );
        
        //subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe(Room.handleStateUpdates);
    },

    reloadRooms: function () {
        var roomsaves = $SM.get('rooms');
        if (roomsaves) {
            for (var r in roomsaves) {
                var save = roomsaves[r];
                var room = Room.ROOMS[r];

                room.visited = save.visited;
                room.canEnter = save.canEnter;
                room.loot = save.loot;

                Room.ROOMS[r] = room; // Update Room
            }
        }
    },

    updateRoomsState: function () {
        var roomSaves = [];

        for (var r in Room.ROOMS) {
            var room = Room.ROOMS[r];

            roomSaves[r] = {
                visited: room.visited,
                canEnter: room.canEnter,
                loot: room.loot
            };
        }

        $SM.setM('rooms', roomSaves); // Update State
    },

    getRoom: function (id) {
        return Room.ROOMS[id];
    },

    createRoom: function(id, options) {
        var r = {};

        r.id = id;
        r.name = options.name;
        r.description = options.description;
        r.visited = false;

        r.canEnter = (options.canEnter != undefined) ? options.canEnter : true;
        r.canEnterFunc = (typeof options.canEnterFunc == 'function') ? options.canEnterFunc : function () {
            /* Default Can Enter Function */
        };
        r.lockedDesc = (options.lockedDesc != undefined) ? options.lockedDesc : "You cannot go that way.";
        
        if (typeof options.commands == 'object') {
            r.commands = options.commands;
        } else { r.commands = []; }

        if (typeof options.loot == 'object') {
            r.loot = options.loot;
            /*
            {
                'itemID': qty
            }
            */
        } else { r.loot = {}; }

        if (typeof options.Events == 'object') {
            r.Events = options.Events;
        } else { r.Events = []; }

        if (typeof options.onEnter == 'function') {
            r.onEnter = options.onEnter;
        }

        if (typeof options.onExit == 'function') {
            r.onExit = options.onExit;
        }

        if (typeof options.exits == 'object') {
            r.exits = options.exits;
            /*
            [
                'north' =  {
                    room: roomObj,
                    onChange, function()
                },
                'south' =  {},
                ...
            ]
            */
        } else { r.exits = []; }

        // Core functions
        r.triggerEnter = function () {
            return Room.triggerEnter(this);
        };

        r.triggerExit = function () {
            return Room.triggerExit(this);
        };

        r.addExit = function (direction, options) {
            return Room.addExit(this, direction, options);
        };

        r.triggerLook = function () {
            return Room.triggerLook(this);
        };

        Room.ROOMS[id] = r;

        return r;
    },

    updateRoom: function (room, options) {
        var roomSave = $SM.get('rooms["' + room.id + '"]');

        if (options.loot) {
            room.loot = options.loot;
            roomSave.loot = room.loot;
        }

        if (options.canEnter) {
            room.canEnter = options.canEnter;
            roomSave.canEnter = room.canEnter;
        }
        
        $SM.set('rooms["' + room.id + '"]', roomSave);
    },

    visitRoom: function(room) {
        room.visited = true;

        var roomSave = $SM.get('rooms["' + room.id + '"]');
        roomSave.visited = true;

        $SM.set('rooms["' + room.id + '"]', roomSave);
    },

    addExit: function (room, direction, options) {
        room.exits[direction] = options;

        Room.ROOMS[room.id] = room;
        Room.updateRoomsState();
    },

    triggerEnter: function(room) {
        Notifications.notify("<strong>" + room.name + "</strong>");

        if (!room.visited) {
            Room.visitRoom(room);

            Room.triggerLook(room);
        }

        if (room.onEnter) {
            room.onEnter();
        }
    },

    triggerExit: function(room) {
        if (room.onExit) {
            room.onExit();
        }
    },

    triggerLook: function(room) {
        Notifications.notify(room.description);
    },

    removeLootFromRoom: function (room, loot) {
        var i;
        for (i in room.loot) {
            if (room.loot[i].id == loot.id) {
                room.loot.splice(i, 1);
            }
        }

        Room.ROOMS[room.id] = room;
        Room.updateRoomsState();
    },

    handleStateUpdates: function (e) {
        if (e.category == 'rooms') {
            Room.reloadRooms();
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
            'inventory',  
            'player',
            'equipment',
            'timers',     
            'game',       
            'playStats',  
            'calldown',  
            'story',     
            'rooms'
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
        if (stateName.indexOf('inventory') === 0 && $SM.get(stateName, true) < 0) {
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
            if (typeof old.qty == 'number') {
                if (typeof value == 'number') {
                    $SM.set(stateName, old.qty + value, noEvent);
                } else if (typeof value.qty == 'number') {
                    $SM.set(stateName, old.qty + value.qty, noEvent);
                } else {
                    Engine.log('WARNING: Can not do math with state:' + stateName + ' or value:' + value + ' because at least one is not a number.');
                    err = 1;
                }
            } else {
                Engine.log('WARNING: Can not do math with state:' + stateName + ' or value:' + value + ' because at least one is not a number.');
                err = 1;
            }
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
        if (Story.activeStory != undefined && Story.activeStory != null) {
            if (Story.activeStory.Perks[name] != undefined) {
                $SM.set('player.perks["' + name + '"]', true);
                Notifications.notify(null, Story.activeStory.Perks[name].notify);
            }
        }
    },

    hasPerk: function (name) {
        return $SM.get('player.perks["' + name + '"]');
    },

    handleStateUpdates: function (e) {

    }
};

//alias
var $SM = StateManager;
var Story = {

    DEFAULT_STORY: 'LostIsland',

    options: {
        inCommandEvent: false,
        commandEventCallback: null,  /* function */
        canMove: true
    },

    activeStory: null,

    playerMoves: 0,

    previousRoom: null,
    activeRoom: null,

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        // Build the Story Pool
        Story.StoryPool = [];
        Story.StoryPool['LostIsland'] = Story.LostIsland;
            
        // Set Story
        var story = $SM.get('story.activeStory');
        if (story == undefined) story = Story.setDefaultStory();
        Story.setStory(story);

        // Update Player Moves
        var moves = $SM.get('story.moves');
        if (moves == undefined) moves = 0;
        Story.playerMoves = moves;

        // Load Story
        Story.activeStory.init();

        // Create Room Panel
        var roomPanel = $('<div>').attr('id', 'gameRoomPanel').appendTo('#gameMain');
        Story.updateRoomPanel();

        Story.checkUISettings();

        //subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe(Story.handleStateUpdates);
    },

    checkUISettings: function () {
        if (!Engine.ui.roomPanel) {
            $('#gameRoomPanel').css({ 'display': 'none' });
        } else {
            $('#gameRoomPanel').css({ 'display': 'block' });
        }
    },

    updateRoomPanel: function () {
        $('#gameRoomPanel').html(''); // Clear

        var activeRoom = Room.getRoom(Story.activeRoom);

        // Header
        $('<div>').addClass('gamePanelHeader').text(Story.activeStory.STORY_NAME).appendTo('#gameRoomPanel');
        $('<div>').addClass('gamePanelHeader').css({ 'font-size': '14px', 'margin-bottom' : '10px' }).text(activeRoom.name).appendTo('#gameRoomPanel');

        // Exits
        var northExit = activeRoom.exits['north'];
        if (northExit == undefined) northExit = 'None';
        else if (northExit.visited != undefined && northExit.visited) northExit = northExit.name;
        else northExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>North</b> - ' + northExit).appendTo('#gameRoomPanel');

        var eastExit = activeRoom.exits['east'];
        if (eastExit == undefined) eastExit = 'None';
        else if (eastExit.visited != undefined && eastExit.visited) eastExit = eastExit.name;
        else eastExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>East</b> - ' + eastExit).appendTo('#gameRoomPanel');

        var southExit = activeRoom.exits['south'];
        if (southExit == undefined) southExit = 'None';
        else if (southExit.visited != undefined && southExit.visited) southExit = southExit.name;
        else southExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>South</b> - ' + southExit).appendTo('#gameRoomPanel');

        var westExit = activeRoom.exits['west'];
        if (westExit == undefined) westExit = 'None';
        else if (westExit.visited != undefined && westExit.visited) westExit = westExit.name;
        else westExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>West</b> - ' + westExit).appendTo('#gameRoomPanel');
    },

    go: function (direction) {
        var activeRoom = Room.getRoom(Story.activeRoom);
        
        if (direction == "back") {
            if (Story.previousRoom == null) {
                Notifications.notify("There is no room to go back too.");
                return;
            }

            var previousRoom = Room.getRoom(Story.previousRoom);

            previousRoom.canEnterFunc(); // Trigger Func
            if (previousRoom.canEnter) {
                var curRoom = activeRoom;

                curRoom.triggerExit();
                Story.setRoom(previousRoom);

                Story.previousRoom = curRoom;
            } else {
                Notifications.notify(previousRoom.lockedDesc);
            }
        }

        if (activeRoom.exits[direction] === undefined) {
            Notifications.notify("There is no exit '" + direction + "'.");
        } else {
            activeRoom.exits[direction].canEnterFunc(); // Trigger Func
            if (activeRoom.exits[direction].canEnter) {
                var curRoom = activeRoom;

                curRoom.triggerExit();
                Story.setRoom(activeRoom.exits[direction]);

                Story.previousRoom = curRoom;
            } else {
                Notifications.notify(activeRoom.exits[direction].lockedDesc);
            }
        }
    },

    look: function() {
        Room.getRoom(Story.activeRoom).triggerLook();
    },


    setRoom: function(room) {
        if (room === undefined) return;

        if (typeof room != 'object') {
            room = Room.getRoom(room);
        }

        Story.activeRoom = room.id;
        $SM.set('story.room', Story.activeRoom);
        $SM.set('story.moves', Story.playerMoves++);

        // Trigger Room Enter
        room.triggerEnter();
        Story.updateRoomPanel();
    },

    setStory: function (story) {
        if (story === undefined) return;
        Story.activeStory = Story.StoryPool[story];
    },

    setDefaultStory: function () {
        $SM.set('story.activeStory', Story.DEFAULT_STORY);
        return Story.DEFAULT_STORY;
    },

    addStoryEvent: function (event) {
        // Add event to story events
        Events.Story.push(event);
        Events.updateEventPool();
    },

    addEncounterEvent: function (encounter) {
        // Add Encounter
        Events.Encounters.push(encounter);
    },

    handleStateUpdates: function (e) {
        
    }

};

Events.Encounters = [
    // EXAMPLES
    {
        title: 'Combat - Archie',
        isAvailable: function () {
            return true;
        },
        scenes: {
            'start': {
                combat: true,
                enemy: 'archie',
                enemyName: 'Archie',
                deathMessage: 'Archie is dead',
                damage: 1,
                hit: 0.3,
                attackDelay: 3,
                health: 3,
                loot: {
                    'meat': {
                        itemObj: Items.Food['meat'],
                        min: 1,
                        max: 3,
                        chance: 1
                    }
                },
                notification: 'A wild Archie runs at you with arms help high'
            }
        }
    },
    {
        title: 'Combat - Archie with a Gun',
        isAvailable: function () {
            return true;
        },
        scenes: {
            'start': {
                combat: true,
                enemy: 'archie',
                enemyName: 'Archie',
                deathMessage: 'Archie is dead',
                damage: 3,
                hit: 0.2,
                attackDelay: 4,
                health: 3,
                ranged: true,
                loot: {
                    'meat': {
                        itemObj: Items.Food['meat'],
                        min: 1,
                        max: 3,
                        chance: 1
                    }
                },
                notification: 'A wild Archie waving a gun around'
            }
        }
    }
];
Events.Global = [];
Events.Story = [];
Story.LostIsland = {

    STORY_NAME: 'The Lost Island',
    DEFAULT_ROOM: null,

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
        }
    },

    init: function () {
        Story.LostIsland.createRooms();
        Story.LostIsland.createItems();
        Story.LostIsland.createEvents();
        Story.LostIsland.createExits();

        Story.LostIsland.setDefaultRoom();

        Story.LostIsland.loadStory();
    },

    loadStory: function () {
        var room = $SM.get('story.room');
        if (room == undefined) room = Story.LostIsland.DEFAULT_ROOM;

        Story.setRoom(room);
    },

    setDefaultRoom: function () {
        Story.LostIsland.DEFAULT_ROOM = Room.getRoom('beach'); // Set Default Room
    },

    createRooms: function () {
        // Beach
        Room.createRoom('beach', {
            name: 'Beach',
            description: 'You wake up Lying face first on a sandy beach, while you spit out all the sand in your mouth you look around.[[break]]To your <b>south</b> all you can see is ocean as far as the eye can see, however to the <b>north</b> you can see a huge forest.',
            loot: {
                compass: 1  
            },
            commands: [
                [
                    ['look south', 'look at ocean'],
                    function () {
                        Notifications.notify("You look at the ocean, it seems to go as far as you can see.");
                    }
                ],
                [
                    ['eat sand'],
                    function () {
                        Notifications.notify("Why?");
                    }
                ],
                [
                    ['take compass', 'pickup compass', 'pick up compass'],
                    function () {
                        Player.pickupItem('compass', 'beach');
                        $SM.set('game.compass', 1);
                        Notifications.notify("You pickup the compass from the floor, this should help you find your way around.");
                    }
                ]
            ],
            Events: [
                {
                    title: 'Combat - Large Crab',
                    isAvailable: function () {
                        return Story.playerMoves >= 1
                    },
                    scenes: {
                        'start': {
                            combat: true,
                            enemy: 'large crab',
                            enemyName: 'Large Crab',
                            deathMessage: 'You killed the large crab',
                            damage: 2,
                            hit: 0.4,
                            attackDelay: 3,
                            health: 3,
                            loot: {
                                'meat': {
                                    itemObj: Items.getItem('food', 'meat'),
                                    min: 1,
                                    max: 3,
                                    chance: 1
                                }
                            },
                            notification: 'A Crab the size of a person scurries across the beach towards you.'
                        }
                    }
                }
            ],
            onEnter: function () {
                if (Math.random() <= 0.2) { // 20% Chance
                    Events.triggerRoomEvent(Room.getRoom('beach').Events);
                }
            }
        });

        Room.createRoom('forest-1', {
            name: 'Forest',
            description: 'A Forest'
        });

        Room.updateRoomsState();
    },

    createItems: function () {
        // @TODO
    },

    createEvents: function () {
        // @TODO
    },

    createExits: function () {
        Room.addExit(Room.getRoom('beach'), 'north', {
            room: Room.getRoom('forest-1')
        });

        Room.addExit(Room.getRoom('forest-1'), 'south', {
            room: Room.getRoom('beach')
        });
    }

};