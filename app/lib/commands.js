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
        var curRoom = Story.activeRoom;
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
            } else {
                Commands.CHEAT_MODE = true;
                Engine.options.debug = true;
                Engine.options.log = true;

                Notifications.notify("Debug Mode Active");
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

            default:
                Commands.triggerInvalidCommand();
        }

    },

    triggerCheatCommands: function (command) {
        switch (command) {
            case "heal":
                Player.setHp(Player.getMaxHealth());
                return true;
            case "trigger fight":
                Event.triggerFight();
                return true;
            case "trigger event":
                Event.triggerEvent();
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