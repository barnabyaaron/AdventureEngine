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