var Commands = {

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
        // run command
        
        switch (command) {
            case 'fight':
                Events.triggerFight();
                break;
            case 'heal':
                Player.setHp(Player.getMaxHealth());
                break;
        }

    },

    handleStateUpdates: function (e) {
        // Nothing yet
    },

};