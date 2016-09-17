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

                if ($SM.get('character.perks["' + p + '"]') && r.length === 0) {
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
        if (Player.inventory.length > 0) {
            for (var i in Player.inventory) {
                $('<span>').addClass('inventoryItem').text(Player.inventory[i].name + ' [' + Player.inventory[i].qty + ']').appendTo(invPanel);
            }
        } else {
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
        $SM.set('inventory', Player.inventory);
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
    }
};