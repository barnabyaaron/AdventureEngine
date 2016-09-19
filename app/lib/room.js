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

    reloadRooms: function () {
        var roomsaves = $SM.get('rooms');
        if (roomsaves) {
            for (var r in roomsaves) {
                var save = roomsaves[r];
                var room = Room.ROOMS[r];

                room.visited = save.visited;
                room.canEnter = save.canEnter;
                room.loot = save.loot;

                Room.ROOMS[r] = room; // Update Room
            }
        }
    },

    updateRoomsState: function () {
        var roomSaves = [];

        for (var r in Room.ROOMS) {
            var room = Room.ROOMS[r];

            roomSaves[r] = {
                visited: room.visited,
                canEnter: room.canEnter,
                loot: room.loot
            };
        }

        $SM.setM('rooms', roomSaves); // Update State
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
        
        if (typeof options.commands == 'object') {
            r.commands = options.commands;
        } else { r.commands = []; }

        if (typeof options.loot == 'object') {
            r.loot = options.loot;
            /*
            {
                'itemID': qty
            }
            */
        } else { r.loot = {}; }

        if (typeof options.Events == 'object') {
            r.Events = options.Events;
        } else { r.Events = []; }

        if (typeof options.onEnter == 'function') {
            r.onEnter = options.onEnter;
        }

        if (typeof options.onExit == 'function') {
            r.onExit = options.onExit;
        }

        if (typeof options.exits == 'object') {
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

        return r;
    },

    updateRoom: function (room, options) {
        var roomSave = $SM.get('rooms["' + room.id + '"]');

        if (options.loot) {
            room.loot = options.loot;
            roomSave.loot = room.loot;
        }

        if (options.canEnter) {
            room.canEnter = options.canEnter;
            roomSave.canEnter = room.canEnter;
        }
        
        $SM.set('rooms["' + room.id + '"]', roomSave);
    },

    visitRoom: function(room) {
        room.visited = true;

        var roomSave = $SM.get('rooms["' + room.id + '"]');
        roomSave.visited = true;

        $SM.set('rooms["' + room.id + '"]', roomSave);
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
        } else {
            Room.triggerLootInfo(room);
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
        Room.triggerLootInfo(room);
    },

    triggerLootInfo: function(room) {
        var loot = room.loot;

        for (var lootID in loot) {
            var item = Items.getUnknownItem(lootID);

            if (item && item.roomDesc)
                Notifications.notify(item.roomDesc);
        }
    },

    removeLootFromRoom: function (room, loot) {
        delete room.loot[loot.id];

        Room.ROOMS[room.id] = room;
        Room.updateRoomsState();
    },

    handleStateUpdates: function (e) {
        if (e.category == 'rooms') {
            Room.reloadRooms();
        }
    }
};