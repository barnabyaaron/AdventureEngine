﻿var Player = {

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

                    if (Story.activeStory)
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
                if (qty > 1) {
                    $('<div>').addClass('inventoryItem').text(item.name + ' ' + flag + '[' + qty + ']').appendTo(invPanel);
                } else {
                    $('<div>').addClass('inventoryItem').text(item.name + ' ' + flag).appendTo(invPanel);
                }

                itemCount++;
            }
        }

        if (itemCount == 0) {
            $('<div>').addClass('inventoryItem').text('Empty').appendTo(invPanel);
        }
        
    },

    updatePlayerStats: function () {
        // Update Health
        var healthPanel = $('#gamePlayerStatsHealthCounter').html("HP: " + Player.health + "/" + Player.getMaxHealth() + " <br />");
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
        return Player.MEDS_HEAL;
    },

    useItem: function (item) {
        if (item) {
            if (typeof item == 'string') {
                item = Items.getUnknownItem(item);
            }

            if (typeof item == 'object') {
                if (Player.inventory[item.id]) {
                    if (item.use != undefined) {
                        var have = Player.inventory[item.id];

                        var used = item.use(); // Run use function

                        if (used) {
                            // Remove Item
                            $SM.set('inventory["' + item.id + '"]', (have - 1));
                        }
                    } else {
                        Notifications.notify("You cannot use that");
                    }
                } else {
                    Notifications.notify("You don't have that item");
                }
            }
        }
    },

    lookAtItem: function (item) {
        if (item) {
            if (typeof item == 'string') {
                item = Items.getUnknownItem(item);
            }

            if (typeof item == 'object') {
                if (Player.inventory[item.id]) {
                    if (item.desc != undefined) {
                        Notifications.notify(item.desc);
                    } else {
                        Notifications.notify("There is nothing to say about that");
                    }
                } else {
                    Notifications.notify("You don't have that item to look at");
                }
            }
        }
    },

    eatFood: function (item) {
        if (item) {
            if (typeof item == 'string') {
                item = Items.getUnknownItem(item);
            }

            if (typeof item == 'object' && item.type == 'food') {
                if (Player.inventory[item.id]) {
                    var have = Player.inventory[item.id];
                    var heal = (item.heal != undefined) ? item.heal : 1;
                    var healthRequired = Player.getMaxHealth() - Player.health;

                    // Check if need to heal
                    if (healthRequired == 0) {
                        // Cannot heal
                        Notifications.notify("You don't need to heal at full health");
                        return;
                    } else if (heal > (healthRequired)) {
                        heal = healthRequired;
                    }

                    $SM.set('inventory["' + item.id + '"]', (have - 1));

                    // Heal
                    Player.setHp((Player.health + heal));

                    Notifications.notify("You eat " + item.name + " (heal " + heal + " hearts)");
                } else {
                    Notifications.notify("You have no " + item.name + " to eat");
                }
            } else {
                Notifications.notify("You cannot eat that");
            }
        }
    },

    pickupItem: function (item, qty, room, noNotify) {
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

        if (!noNotify)
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