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