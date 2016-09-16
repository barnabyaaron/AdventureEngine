var Room = {

    ROOMS: [],

    options: {},

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        // Load Rooms
        Room.ROOMS = $SM.get('rooms');
        if (Room.ROOMS == undefined) Room.ROOMS = [];

        //subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe(Room.handleStateUpdates);
    },

    updateRoomsState: function() {
        $SM.set('rooms', Room.ROOMS); // Update State
    },

    createRoom: function(id, options) {
        var item = {};

        item.id = id;
        item.name = options.name;
        item.description = options.description;
        item.visited = false;

        if (typeof options.commands == 'Array') {
            item.commands = options.commands;
        }

        if (typeof options.loot == 'Array') {
            item.loot = options.loot;
            /*
            [
                'item id' = {
                    item: itemObj,
                    qty: 1,
                    onPickup: function()
                }
            ]
            */
        } else { item.loot = []; }

        if (typeof options.Events == 'Array') {
            item.Events = options.Events;
        } else { item.Events = []; }

        if (typeof options.onEnter == 'function') {
            item.onEnter = options.onEnter;
        }

        if (typeof options.onExit == 'function') {
            item.onExit = options.onExit;
        }

        if (typeof options.exits == 'Array') {
            item.exits = options.exits;
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
        } else { item.exits = []; }

        Room.ROOMS[id] = item;
        Room.updateRoomsState();

        return item;
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

    removeLootFromRoom: function (room, loot) {
        var i;
        for (i in room.loot) {
            if (room.loot[i].toString() == x.toString()) {
                room.loot.splice(i, 1);
            }
        }

        Room.ROOMS[room.id] = room;
        Room.updateRoomsState();
    },

    handleStateUpdates: function (e) {
        
    }
};