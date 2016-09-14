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
            Notifications.init();     // Notifications Handler
            Events.init();            // Events Handler
            Player.init();            // Player Handler
            Items.init();             // Items Handler
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
            // @TODO End Gate
            Engine.confirmDelete();
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
    activeScene: null,

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
            $SM.addM('stores', scene.reward);
        }

        $('#description', Events.eventPanel()).empty();
        $('#buttons', Events.eventPanel()).empty();
        if (scene.combat) {
            Events.startCombat(scene);
        } else {
            Events.startStory(scene);
        }
    },

    startCombat: function (scene) {
        Engine.event('game event', 'combat');
        Events.won = false;
        var desc = $('#description', Events.eventPanel());

        $('<div>').text(scene.notification).appendTo(desc);

        // Draw the player
        Events.createFighterDiv('@', Player.health, Player.getMaxHealth()).attr('id', 'gamePlayer').appendTo(desc);

        // Draw the enemy
        Events.createFighterDiv(scene.chara, scene.health, scene.health).attr('id', 'gameEnemy').appendTo(desc);

        // Draw the action buttons
        var btns = $('#buttons', Events.eventPanel());

        var numWeapons = 0;
        for (var k in Items.Weapons) {
            var weapon = Items.Weapons[k];
            if (typeof Player.inventory[k] == 'number' && Player.inventory[k] > 0) {
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
            'bottom': '50px',
            'opacity': '0'
        },
		300,
		'linear',
		function () {
		    $(this).remove();
		});
    },

    useMeds: function () {
        if (Player.inventory['medicine'] > 0) {
            Player.inventory['medicine']--;
            Player.updateSupplies();
            if (Player.inventory['medicine'] === 0) {
                Button.setDisabled($('#meds'), true);
            }

            var hp = Player.health;
            hp += Player.medsHeal();
            hp = hp > Player.getMaxHealth() ? Player.getMaxHealth() : hp;
            Player.setHp(hp);

            if (Events.activeEvent()) {
                var w = $('#gamePlayer');
                w.data('hp', hp);
                Events.updateFighterDiv(w);
                Events.drawFloatText('+' + World.medsHeal(), '#gamePlayer .hp');
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
                if (!$SM.get('character.punches')) $SM.set('character.punches', 0);

                $SM.add('character.punches', 1);
                if ($SM.get('character.punches') == 50 && !$SM.hasPerk('boxer')) {
                    $SM.addPerk('boxer');
                } else if ($SM.get('character.punches') == 150 && !$SM.hasPerk('martial artist')) {
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
                Player.updateSupplies();
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
                if ($('#gameEnemy').data('hp') <= 0 && !Events.won) {
                    // Success!
                    Events.winFight();
                }
            });
        }
    },

    animateMelee: function (fighter, dmg, callback) {
        var start, end, enemy;
        if (fighter.attr('id') == 'gamePlayer') {
            start = { 'left': '50%' };
            end = { 'left': '25%' };
            enemy = $('#gameEnemy');
        } else {
            start = { 'right': '50%' };
            end = { 'right': '25%' };
            enemy = $('#gamePlayer');
        }

        fighter.stop(true, true).animate(start, Events._FIGHT_SPEED, function () {
            var enemyHp = enemy.data('hp');
            var msg = "";
            if (typeof dmg == 'number') {
                if (dmg < 0) {
                    msg = 'miss';
                    dmg = 0;
                } else {
                    msg = '-' + dmg;
                    enemyHp = ((enemyHp - dmg) < 0) ? 0 : (enemyHp - dmg);
                    enemy.data('hp', enemyHp);
                    if (fighter.attr('id') == 'gameEnemy') {
                        Player.setHp(enemyHp);
                    }
                    Events.updateFighterDiv(enemy);
                }
            } else {
                if (dmg == 'stun') {
                    msg = 'stunned';
                    enemy.data('stunned', true);
                    Engine.setTimeout(function () {
                        enemy.data('stunned', false);
                    }, Events.STUN_DURATION);
                }
            }

            Events.drawFloatText(msg, $('.hp', enemy));

            $(this).animate(end, Events._FIGHT_SPEED, callback);
        });
    },

    animateRanged: function (fighter, dmg, callback) {
        var start, end, enemy;
        if (fighter.attr('id') == 'gamePlayer') {
            start = { 'left': '25%' };
            end = { 'left': '50%' };
            enemy = $('#gameEnemy');
        } else {
            start = { 'right': '25%' };
            end = { 'right': '50%' };
            enemy = $('#gamePlayer');
        }

        $('<div>').css(start).addClass('bullet').text('o').appendTo('#description')
				.animate(end, Events._FIGHT_SPEED * 2, 'linear', function () {
				    var enemyHp = enemy.data('hp');
				    var msg = "";
				    if (typeof dmg == 'number') {
				        if (dmg < 0) {
				            msg = 'miss';
				            dmg = 0;
				        } else {
				            msg = '-' + dmg;
				            enemyHp = ((enemyHp - dmg) < 0) ? 0 : (enemyHp - dmg);
				            enemy.data('hp', enemyHp);
				            if (fighter.attr('id') == 'gameEnemy') {
				                Player.setHp(enemyHp);
				            }
				            Events.updateFighterDiv(enemy);
				        }
				    } else {
				        if (dmg == 'stun') {
				            msg = 'stunned';
				            enemy.data('stunned', true);
				            Engine.setTimeout(function () {
				                enemy.data('stunned', false);
				            }, Events.STUN_DURATION);
				        }
				    }

				    Events.drawFloatText(msg, $('.hp', enemy));

				    $(this).remove();
				    if (typeof callback == 'function') {
				        callback();
				    }
				});
    },

    enemyAttack: function () {
        var scene = Events.activeEvent().scenes[Events.activeScene];

        if (!$('#gameEnemy').data('stunned')) {
            var toHit = scene.hit;
            toHit *= $SM.hasPerk('evasive') ? 0.8 : 1;
            var dmg = -1;
            if (Math.random() <= toHit) {
                dmg = scene.damage;
            }

            var attackFn = scene.ranged ? Events.animateRanged : Events.animateMelee;

            attackFn($('#gameEnemy'), dmg, function () {
                if ($('#gamePlayer').data('hp') <= 0) {
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
                    var desc = $('#description', Events.eventPanel());
                    var btns = $('#buttons', Events.eventPanel());
                    desc.empty();
                    btns.empty();
                    $('<div>').text(scene.deathMessage).appendTo(desc);

                    var takeETbtn = Events.drawLoot(scene.loot);

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
                    Events.allowLeave(takeETbtn, leaveBtn);
                } catch (e) {
                    // It is possible to die and win if the timing is perfect. Just let it fail.
                }
            }, 1000, true);
        });
    },

    drawDrop: function (btn) {
        var name = btn.attr('id').substring(5).replace('-', ' ');
        var needsAppend = false;
        var weight = Items.getWeight(name);
        var freeSpace = Player.getFreeSpace();
        if (weight > freeSpace) {
            // Draw the drop menu
            Engine.log('drop menu');
            if ($('#dropMenu').length) {
                var dropMenu = $('#dropMenu');
                $('#dropMenu').empty();
            } else {
                var dropMenu = $('<div>').attr({ 'id': 'dropMenu', 'data-legend': 'drop' });
                needsAppend = true;
            }
            for (var k in Player.inventory) {
                if (name == k) continue;
                var itemWeight = Items.getWeight(k);
                if (itemWeight > 0) {
                    var numToDrop = Math.ceil((weight - freeSpace) / itemWeight);
                    if (numToDrop > Player.inventory[k]) {
                        numToDrop = Player.inventory[k];
                    }
                    if (numToDrop > 0) {
                        var dropRow = $('<div>').attr('id', 'drop_' + k.replace(' ', '-'))
							.text(_(k) + ' x' + numToDrop)
							.data('thing', k)
							.data('num', numToDrop)
							.click(Events.dropStuff)
							.mouseenter(function (e) {
							    e.stopPropagation();
							});
                        dropRow.appendTo(dropMenu);
                    }
                }
            }
            $('<div>').attr('id', 'no_drop')
				.text('nothing')
				.mouseenter(function (e) {
				    e.stopPropagation();
				})
				.click(function (e) {
				    e.stopPropagation();
				    dropMenu.remove();
				})
				.appendTo(dropMenu);
            if (needsAppend) {
                dropMenu.appendTo(btn);
            }
            btn.one("mouseleave", function () {
                $('#dropMenu').remove();
            });
        }
    },

    drawLootRow: function (name, num) {
        var id = name.replace(' ', '-');
        var lootRow = $('<div>').attr('id', 'loot_' + id).data('item', name).addClass('lootRow');
        var take = new Button.Button({
            id: 'take_' + id,
            text: _(name) + ' [' + num + ']',
            click: Events.getLoot
        }).addClass('lootTake').data('numLeft', num).appendTo(lootRow);
        take.mouseenter(function () {
            Events.drawDrop(take);
        });
        var takeall = new Button.Button({
            id: 'all_take_' + id,
            text: 'take ',
            click: Events.takeAll
        }).addClass('lootTakeAll').appendTo(lootRow);
        $('<span>').insertBefore(takeall.children('.cooldown'));
        $('<div>').addClass('clear').appendTo(lootRow);
        return lootRow;
    },

    drawLoot: function (lootList) {
        var desc = $('#description', Events.eventPanel());
        var lootButtons = $('<div>').attr({ 'id': 'lootButtons', 'data-legend': 'take:' });
        for (var k in lootList) {
            var loot = lootList[k];
            if (Math.random() < loot.chance) {
                var num = Math.floor(Math.random() * (loot.max - loot.min)) + loot.min;
                var lootRow = Events.drawLootRow(k, num);
                lootRow.appendTo(lootButtons);
            }
        }
        lootButtons.appendTo(desc);
        if (lootButtons.children().length > 0) {
            var takeETrow = $('<div>').addClass('takeETrow');
            var takeET = new Button.Button({
                id: 'loot_takeEverything',
                text: '',
                cooldown: Events._LEAVE_COOLDOWN,
                click: Events.takeEverything
            }).appendTo(takeETrow);
            $('<span>').insertBefore(takeET.children('.cooldown'));
            $('<div>').addClass('clear').appendTo(takeETrow);
            takeETrow.appendTo(lootButtons);
            Events.setTakeAll(lootButtons);
        } else {
            var noLoot = $('<div>').addClass('noLoot').text('nothing to take');
            noLoot.appendTo(lootButtons);
        }
        return takeET || false;
    },

    setTakeAll: function (lootButtons) {
        var lootButtons = lootButtons || $('#lootButtons');
        var canTakeSomething = false;
        var free = Path.getFreeSpace();
        var takeETbutton = lootButtons.find('#loot_takeEverything');
        lootButtons.children('.lootRow').each(function (i) {
            var name = $(this).data('item');
            var take = $(this).children('.lootTake').first();
            var takeAll = $(this).children('.lootTakeAll').first();
            var numLeft = take.data('numLeft');
            var num = Math.min(Math.floor(Player.getFreeSpace() / Items.getWeight(name)), numLeft);
            takeAll.data('numLeft', num);
            free -= numLeft * Items.getWeight(name);
            if (num > 0) {
                takeAll.removeClass('disabled');
                canTakeSomething = true;
            } else {
                takeAll.addClass('disabled');
            }
            if (num < numLeft) {
                takeAll.children('span').first().text(num);
            } else {
                takeAll.children('span').first().text('all');
            }
        });
        if (canTakeSomething) {
            takeETbutton.removeClass('disabled');
        } else {
            takeETbutton.addClass('disabled');
        }
        takeETbutton.data('canTakeEverything', (free >= 0) ? true : false);
        return takeETbutton;
    },

    allowLeave: function (takeETbtn, leaveBtn) {
        if (takeETbtn) {
            if (leaveBtn) {
                takeETbtn.data('leaveBtn', leaveBtn);
            }
            Events.canLeave(takeETbtn);
        }
    },

    canLeave: function (btn) {
        var basetext = 'take everything';
        var textbox = btn.children('span');
        var takeAndLeave = (btn.data('leaveBtn')) ? btn.data('canTakeEverything') : false;
        if (takeAndLeave) {
            var verb = btn.data('leaveBtn').text() || 'leave';
            textbox.text(basetext + ' and ' + verb);
            btn.data('canLeave', true);
            Button.cooldown(btn);
        } else {
            textbox.text(basetext);
            btn.data('canLeave', false)
        }
    },

    dropStuff: function (e) {
        e.stopPropagation();
        var btn = $(this);
        var target = btn.closest('.button');
        var thing = btn.data('thing');
        var id = 'take_' + thing.replace(' ', '-');
        var num = btn.data('num');
        var lootButtons = $('#lootButtons');
        Engine.log('dropping ' + num + ' ' + thing);

        var lootBtn = $('#' + id, lootButtons);
        if (lootBtn.length > 0) {
            var curNum = lootBtn.data('numLeft');
            curNum += num;
            lootBtn.text(_(thing) + ' [' + curNum + ']').data('numLeft', curNum);
        } else {
            var lootRow = Events.drawLootRow(thing, num);
            lootRow.insertBefore($('.takeETrow', lootButtons));
        }
        Player.inventory[thing] -= num;
        Events.getLoot(target);
        Player.updateSupplies();
    },

    getLoot: function (btn, skipButtonSet) {
        var name = btn.attr('id').substring(5).replace('-', ' ');
        if (btn.data('numLeft') > 0) {
            var skipButtonSet = skipButtonSet || false;
            var weight = Items.getWeight(name);
            var freeSpace = Player.getFreeSpace();
            if (weight <= freeSpace) {
                var num = btn.data('numLeft');
                num--;
                btn.data('numLeft', num);
                // #dropMenu gets removed by this.
                btn.text(name + ' [' + num + ']');
                if (num === 0) {
                    Button.setDisabled(btn);
                    btn.animate({ 'opacity': 0 }, 300, 'linear', function () {
                        $(this).parent().remove();
                        if ($('#lootButtons').children().length == 1) {
                            $('#lootButtons').remove();
                        }
                    });
                }
                var curNum = Player.inventory[name];
                curNum = typeof curNum == 'number' ? curNum : 0;
                curNum++;
                Player.inventory[name] = curNum;
                World.updateSupplies();

                if (!skipButtonSet) {
                    Events.setTakeAll();
                }
            }
            if (!skipButtonSet) {
                Events.drawDrop(btn);
            }
        }
    },

    takeAll: function (btn) {
        var target = $('#' + btn.attr('id').substring(4));
        for (var k = 0; k < btn.data('numLeft') ; k++) {
            Events.getLoot(target, true);
        }
        Events.setTakeAll();
    },

    takeEverything: function (btn) {
        $('#lootButtons').children('.lootRow').each(function (i) {
            var target = $(this).children('.lootTakeAll').first();
            if (!target.hasClass('disabled')) {
                Events.takeAll(target);
            }
        });
        if (btn.data('canLeave')) {
            btn.data('leaveBtn').click();
        }
    },

    createFighterDiv: function (chara, hp, maxhp) {
        var fighter = $('<div>').addClass('fighter').text(_(chara)).data('hp', hp).data('maxHp', maxhp).data('refname', chara);
        $('<div>').addClass('hp').text(hp + '/' + maxhp).appendTo(fighter);
        return fighter;
    },

    updateFighterDiv: function (fighter) {
        $('.hp', fighter).text(fighter.data('hp') + '/' + fighter.data('maxHp'));
    },

    startStory: function (scene) {
        // Write the text
        var desc = $('#description', Events.eventPanel());
        var leaveBtn = false;
        for (var i in scene.text) {
            $('<div>').text(scene.text[i]).appendTo(desc);
        }

        if (scene.textarea != null) {
            var ta = $('<textarea>').val(scene.textarea).appendTo(desc);
            if (scene.readonly) {
                ta.attr('readonly', true);
            }
            Engine.autoSelect('#description textarea');
        }

        // Draw any loot
        if (scene.loot) {
            var takeETbtn = Events.drawLoot(scene.loot);
        }

        // Draw the buttons
        leaveBtn = Events.drawButtons(scene);

        Events.allowLeave(takeETbtn, leaveBtn);
    },

    drawButtons: function (scene) {
        var btns = $('#buttons', Events.eventPanel());
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

            for (var k in costMod) {
                Player.inventory[k] += costMod[k];
            }
            Player.updateSupplies();
        }

        if (typeof info.onChoose == 'function') {
            var textarea = Events.eventPanel().find('textarea');
            info.onChoose(textarea.length > 0 ? textarea.val() : null);
        }

        // Reward
        if (info.reward) {
            $SM.addM('stores', info.reward);
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
var Items = {

    Weapons: {
        'fists': {
            verb: 'punch',
            type: 'unarmed',
            damage: 1,
            cooldown: 2
        },
        'bone spear': {
            verb: 'stab',
            type: 'melee',
            damage: 2,
            cooldown: 2
        },
        'iron sword': {
            verb: 'swing',
            type: 'melee',
            damage: 4,
            cooldown: 2
        },
        'rifle': {
            verb: 'shoot',
            type: 'ranged',
            damage: 5,
            cooldown: 1,
            cost: { 'bullets': 1 }
        },
    },

    Craftables: {
        'torch': {
            name: 'torch',
            type: 'tool',
            buildMsg: 'a torch to keep the dark away',
            cost: function () {
                return {
                    'wood': 1,
                    'cloth': 1
                };
            }
        },
        'bone spear': {
            name: 'bone spear',
            type: 'weapon',
            buildMsg: "this spear's not elegant, but it's pretty good at stabbing",
            cost: function () {
                return {
                    'wood': 2,
                    'bone': 1
                };
            }
        }
    },

    TradeGoods: {
        'medicine': {
            type: 'good',
            cost: function () {
                return {
                    'money': 10
                };
            }
        },
        'bullets': {
            type: 'good',
            cost: function () {
                return {
                    'money': 5
                };
            }
        },
    },

    MiscItems: {
        'laser rifle': {
            type: 'weapon',
            weight: 5
        }
    },

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        //subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe(Items.handleStateUpdates);
    },

    options: {},

    getWeight: function (name) {
        if (name.weight) {
            return name.weight;
        } else {
            return 1;
        }
    },

    createItemDiv: function (name, num) {
        var div = $('<div>').attr('id', 'supply_' + name.replace(' ', '-'))
			.addClass('supplyItem')
			.text(name + ':' + num);

        return div;
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
var Player = {

    BASE_HEALTH: 10,
    BASE_HIT_CHANGE: 0.8,
    DEFAULT_BAG_SPACE: 10,
    MEDS_HEAL: 20,

    name: 'Player',
    options: {},

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        // @TODO Create player panel

        // @TODO Create the inventory panel

        Player.inventory = $SM.get('inventory');


        //subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe(Player.handleStateUpdates);
    },

    updatePerks: function () {
        if ($SM.get('character.perks')) {
            var perks = $('#perks');
            var needsAppend = false;
            if (perks.length === 0) {
                needsAppend = true;
                perks = $('<div>').attr({ 'id': 'perks', 'data-legend': 'perks:' });
            }

            for (var k in $SM.get('character.perks')) {
                var id = 'perk_' + k.replace(' ', '-');
                var r = $('#' + id);
                if ($SM.get('character.perks["' + k + '"]') && r.length === 0) {
                    r = $('<div>').attr('id', id).addClass('perkRow').appendTo(perks);
                    $('<div>').addClass('row_key').text(_(k)).appendTo(r);
                    $('<div>').addClass('tooltip bottom right').text(Engine.Perks[k].desc).appendTo(r);
                }
            }
        }
    },

    updateInventory: function() {
        var inventory = $('div#inventory');

        if (!Player.inventory) {
            Player.inventory = {};
        }

        var space = Path.getFreeSpace();
        var total = 0;

        // @TODO Load Inventory


        // Update bagspace
        $('#bagspace').text(_('free {0}/{1}', Math.floor(Player.getCapacity() - total), Player.getCapacity()));
    },

    updateSupplies: function () {
        // @TODO Update Supplies
    },

    getFreeSpace: function () {
        var num = 0;
        if (Player.inventory) {
            for (var k in Player.inventory) {
                var n = Player.inventory[k];
                if (isNaN(n)) {
                    Player.inventory[k] = n = 0;
                }
                num += n * Items.getWeight(k);
            }
        }
        return Player.getCapacity() - num;
    },

    getCapacity: function () {
        if ($SM.get('stores.rucksack', true) > 0) {
            return Player.DEFAULT_BAG_SPACE + 10;
        }
        return Player.DEFAULT_BAG_SPACE;
    },

    setHp: function (hp) {
        if (typeof hp == 'number' && !isNaN(hp)) {
            World.health = hp;
            if (World.health > World.getMaxHealth()) {
                World.health = World.getMaxHealth();
            }
            $('#healthCounter').text(_('hp: {0}/{1}', World.health, World.getMaxHealth()));
        }
    },

    medsHeal: function () {
        return World.MEDS_HEAL;
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
        if ($SM.get('stores["s armour"]', true) > 0) {
            return Player.BASE_HEALTH + 35;
        } else if ($SM.get('stores["i armour"]', true) > 0) {
            return Player.BASE_HEALTH + 15;
        } else if ($SM.get('stores["l armour"]', true) > 0) {
            return Player.BASE_HEALTH + 5;
        }
        return Player.BASE_HEALTH;
    },

    getHitChance: function () {
        if ($SM.hasPerk('hawkeye')) {
            return Player.BASE_HIT_CHANCE + 0.1;
        }
        return Player.BASE_HIT_CHANCE;
    },

    handleStateUpdates: function (e) {
        if (e.category == 'character' && e.stateName.indexOf('character.perks') === 0) {
            Path.updatePerks();
        };
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