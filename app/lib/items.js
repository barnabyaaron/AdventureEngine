﻿var Items = {

    DEFAULT_WEAPON_DAMAGE: 1,
    DEFAULT_WEAPON_COOLDOWN: 2,

    Weapons: {
        'fists': {
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
        }
        // Examples
        //'bone spear': {
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
            name: 'Medicine',
            type: 'ammo'
        },
        'bullets': {
            name: 'Bullets',
            type: 'ammo'
        },
    },

    MiscItems: {
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

    buildItem: function (name) {
        // @TODO Work In Progress   (Need to convert current inventory state into a array)

        var craftable = Items.Craftables[name];

        if (craftable != undefined) {
            var numThings = 0;

            switch (craftable.type) {
                case 'weapons':
                case 'tool':
                case 'upgrade':
                    numThings = $SM.get('inventory["' + name + '"]', true);
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
                    $SM.add('inventory["' + name + '"]', 1);
                    break;
            }
        }
    },

    handleStateUpdates: function (e) {
        
    }

};