var Room = {

    ROOMS: [],

    options: {},

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );
        
        //subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe(Room.handleStateUpdates);
    },

    updateRoomsState: function() {
        $SM.setM('rooms', Room.ROOMS); // Update State
    },

    getRoom: function (id) {
        return Room.ROOMS[id];
    },

    createRoom: function(id, options) {
        var r = {};

        r.id = id;
        r.name = options.name;
        r.description = options.description;
        r.visited = false;

        r.canEnter = (options.canEnter != undefined) ? options.canEnter : true;
        r.canEnterFunc = (typeof options.canEnterFunc == 'function') ? options.canEnterFunc : function () {
            /* Default Can Enter Function */
        };
        r.lockedDesc = (options.lockedDesc != undefined) ? options.lockedDesc : "You cannot go that way.";
        
        if (typeof options.commands == 'Array') {
            r.commands = options.commands;
        } else { r.commands = []; }

        if (typeof options.loot == 'Array') {
            r.loot = options.loot;
            /*
            [
                'item id' = {
                    item: itemObj,
                    qty: 1,
                    onPickup: function()
                }
            ]
            */
        } else { r.loot = []; }

        if (typeof options.Events == 'Array') {
            r.Events = options.Events;
        } else { r.Events = []; }

        if (typeof options.onEnter == 'function') {
            r.onEnter = options.onEnter;
        }

        if (typeof options.onExit == 'function') {
            r.onExit = options.onExit;
        }

        if (typeof options.exits == 'Array') {
            r.exits = options.exits;
            /*
            [
                'north' =  {
                    room: roomObj,
                    onChange, function()
                },
                'south' =  {},
                ...
            ]
            */
        } else { r.exits = []; }

        // Core functions
        r.triggerEnter = function () {
            return Room.triggerEnter(this);
        };

        r.triggerExit = function () {
            return Room.triggerExit(this);
        };

        r.addExit = function (direction, options) {
            return Room.addExit(this, direction, options);
        };

        r.triggerLook = function () {
            return Room.triggerLook(this);
        };

        Room.ROOMS[id] = r;
        Room.updateRoomsState();

        return r;
    },

    updateRoom: function(room, options) {
        if (typeof options.loot == 'array') {
            room.loot = options.loot;
        }

        Room.ROOMS[room.id] = room;
        Room.updateRoomsState();
    },

    visitRoom: function(room) {
        room.visited = true;

        Room.ROOMS[room.id] = room;
        Room.updateRoomsState();
    },

    addExit: function (room, direction, options) {
        room.exits[direction] = options;

        Room.ROOMS[room.id] = room;
        Room.updateRoomsState();
    },

    triggerEnter: function(room) {
        Notifications.notify("<strong>" + room.name + "</strong>");

        if (!room.visited) {
            Room.visitRoom(room);

            Room.triggerLook(room);
        }

        if (room.onEnter) {
            room.onEnter();
        }
    },

    triggerExit: function(room) {
        if (room.onExit) {
            room.onExit();
        }
    },

    triggerLook: function(room) {
        Notifications.notify(room.description);
    },

    removeLootFromRoom: function (room, loot) {
        var i;
        for (i in room.loot) {
            if (room.loot[i].id == loot.id) {
                room.loot.splice(i, 1);
            }
        }

        Room.ROOMS[room.id] = room;
        Room.updateRoomsState();
    },

    handleStateUpdates: function (e) {
        
    }
};