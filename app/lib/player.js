var Player = {

    BASE_HEALTH: 10,
    BASE_HIT_CHANCE: 0.8,
    DEFAULT_BAG_SPACE: 10,
    MEDS_HEAL: 20,

    name: 'Player',
    options: {},

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        // Load Health
        var pHP = $SM.get('player.health');
        if (pHP == undefined) pHP = Player.getMaxHealth();
        Player.setHp(pHP);

        // Load Inventory
        Player.inventory = $SM.get('inventory');

        // @TODO Create player panel
        var playerPanel = $('<div>').attr('id', 'gamePlayerHeaderPanel').appendTo('#gameHeader');
        $('<span>').addClass('gamePlayerHeaderTitle').text('Player').appendTo(playerPanel);

        // @TODO Create player stats panel
        var playerStats = $('<div>').attr('id', 'gamePlayerHeaderStats').appendTo(playerPanel);
        $('<div>').attr('id', 'gamePlayerHeaderHealthCounter').html("HP: " + Player.health + "/" + Player.getMaxHealth()).appendTo(playerStats);
        $('<div>').attr('id', 'gamePlayerHeaderInventorySpace').html("Inventory Space: " + Player.getFreeSpace() + "/" + Player.getCapacity()).appendTo(playerStats);

        // @TODO Create the inventory panel
        var inventoryPanel = $('<div>').attr('id', 'gamePlayerHeaderInventory').appendTo(playerPanel);
        
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
    updatePlayerStats: function () {
        // Update Health
        $('#gamePlayerHeaderHealthCounter').html("HP: " + Player.health + "/" + Player.getMaxHealth());

        // Update Inventory Space
        $('#gamePlayerHeaderInventorySpace').html("Inventory Space: " + Player.getFreeSpace() + "/" + Player.getCapacity()).appendTo(playerStats);
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
            Player.updatePerks();
        };
        if (e.category == 'player' && (e.stateName.indexOf('player.health') === 0 || e.stateName.indexOf('inventory') === 0)) {
            Player.updatePlayerStats();
        }
    }
};