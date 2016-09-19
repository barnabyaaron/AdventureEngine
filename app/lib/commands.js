var Commands = {

    CHEAT_MODE: false,
    CHEAT_MODE_COMMAND: 'toggle debug',

    CLEAR_NEXT: false,
    LAST_COMMAND: '',

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
        // IF CLEAR SET - Clear Notifications
        if (Notifications.CLEAR_NEXT) {
            Notifications.clear();
        }
        
        // Store Last Command
        Notifications.LAST_COMMAND = command;

        // Print Command
        Notifications.notify("> " + command);
            
        // Command Event Prevent normal actives
        if (Story.options.inCommandEvent) {
            return Story.options.commandEventCallback(command);
        }

        // Check Current Room Commands
        var curRoom = Room.getRoom(Story.activeRoom);
        if ((curRoom) && curRoom.commands && curRoom.commands.length > 0) {
            for (var c in curRoom.commands) {
                var validCommands = curRoom.commands[c][0];
                var cmdCallback = curRoom.commands[c][1];

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
                return;
            } else {
                Commands.CHEAT_MODE = true;
                Engine.options.debug = true;
                Engine.options.log = true;

                Notifications.notify("Debug Mode Active");
                return;
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

            case "use":
                return command.triggerUse(command);

            case "eat":
                return command.triggerEat(command);

            default:
                return Commands.triggerInvalidCommand();
        }

    },

    triggerCheatCommands: function (command) {
        switch (command) {
            case "heal":
                Player.setHp(Player.getMaxHealth());
                return true;
            case "trigger fight":
                Events.triggerFight();
                return true;
            case "trigger event":
                Events.triggerEvent();
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

    triggerUse: function(command) {
        var itemName = command.replace("use ", "");

        var item = Items.getUnknownItem(itemName);
        if (item != null) {
            // @TODO Use item
        }
    },

    triggerEat: function (command) {
        var itemName = command.replace("eat ", "");

        var item = Items.getUnknownItem(itemName);
        if (item != null) {
            Player.eatFood(item);
        }
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