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
        },
        'knife': {
            id: 'knife',
            name: 'Knife',
            verb: 'stab',
            type: 'melee',
            damage: 3,
            cooldown: 3
        },
        'hand gun': {
            id: 'hand gun',
            name: 'Hand Gun',
            verb: 'shoot',
            damage: 6,
            cooldown: 5,
            cost: { 'bullets': 1 }
        }
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
            maximum: 10,
            maxMsg: "You don't need any more",
            buildMsg: 'a torch to keep the dark away',
            cost: function () {
                return {
                    'wood': 1,
                    'cloth': 1
                };
            }
        }
    },

    Ammo: {
        'medicine': {
            id: 'medicine',
            name: 'Medicine',
            type: 'ammo',
            use: function () {
                var hp = Player.health;
                hp += Player.medsHeal();
                hp = hp > Player.getMaxHealth() ? Player.getMaxHealth() : hp;
                Player.setHp(hp);
                return true;
            }
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
            desc: 'A golden compass that points to north',
            roomDesc: 'You notice a golden <b>compass</b> lying on the floor.'
        }
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

            if (name in items) {
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
            } else if (type == "food") {
                item.heal = (options.heal != undefined) ? options.heal : 1;
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