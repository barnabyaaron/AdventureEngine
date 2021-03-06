﻿var Story = {

    DEFAULT_STORY: 'LostIsland',

    options: {
        inCommandEvent: false,
        commandEventCallback: null,  /* function */
        canMove: true
    },

    activeStory: null,

    playerMoves: 0,

    previousRoom: null,
    activeRoom: null,

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        // Build the Story Pool
        Story.StoryPool = [];
        Story.StoryPool['LostIsland'] = Story.LostIsland;
            
        // Set Story
        var story = $SM.get('story.activeStory');
        if (story == undefined) story = Story.setDefaultStory();
        Story.setStory(story);

        // Update Player Moves
        var moves = $SM.get('story.moves');
        if (moves == undefined) moves = 0;
        Story.playerMoves = moves;

        // Load Story
        Story.activeStory.init();

        // Create Room Panel
        var roomPanel = $('<div>').attr('id', 'gameRoomPanel').appendTo('#gameMain');
        Story.updateRoomPanel();

        Story.checkUISettings();

        //subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe(Story.handleStateUpdates);
    },

    checkUISettings: function () {
        if (!Engine.ui.roomPanel) {
            $('#gameRoomPanel').css({ 'display': 'none' });
        } else {
            $('#gameRoomPanel').css({ 'display': 'block' });
        }
    },

    updateRoomPanel: function () {
        $('#gameRoomPanel').html(''); // Clear

        var activeRoom = Room.getRoom(Story.activeRoom);

        // Header
        $('<div>').addClass('gamePanelHeader').text(Story.activeStory.STORY_NAME).appendTo('#gameRoomPanel');
        $('<div>').addClass('gamePanelHeader').css({ 'font-size': '14px', 'margin-bottom' : '10px' }).text(activeRoom.name).appendTo('#gameRoomPanel');

        // Exits
        var northExit = activeRoom.exits['north'];
        if (northExit == undefined) northExit = 'None';
        else if (northExit.room.visited != undefined && northExit.room.visited) northExit = northExit.room.name;
        else northExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>North</b> - ' + northExit).appendTo('#gameRoomPanel');

        var eastExit = activeRoom.exits['east'];
        if (eastExit == undefined) eastExit = 'None';
        else if (eastExit.room.visited != undefined && eastExit.room.visited) eastExit = eastExit.room.name;
        else eastExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>East</b> - ' + eastExit).appendTo('#gameRoomPanel');

        var southExit = activeRoom.exits['south'];
        if (southExit == undefined) southExit = 'None';
        else if (southExit.room.visited != undefined && southExit.room.visited) southExit = southExit.room.name;
        else southExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>South</b> - ' + southExit).appendTo('#gameRoomPanel');

        var westExit = activeRoom.exits['west'];
        if (westExit == undefined) westExit = 'None';
        else if (westExit.room.visited != undefined && westExit.room.visited) westExit = westExit.room.name;
        else westExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>West</b> - ' + westExit).appendTo('#gameRoomPanel');
    },

    go: function (direction) {
        var activeRoom = Room.getRoom(Story.activeRoom);
        
        if (direction == "back") {
            if (Story.previousRoom == null) {
                Notifications.notify("There is nowhere to go back too.");
                return;
            }

            var previousRoom = Room.getRoom(Story.previousRoom);

            previousRoom.canEnterFunc(); // Trigger Func
            if (previousRoom.canEnter) {
                var curRoom = activeRoom;

                curRoom.triggerExit();

                Notifications.clear(Commands.LAST_COMMAND); // Clear Notifications

                Story.setRoom(previousRoom);

                Story.previousRoom = curRoom;
            } else {
                Notifications.notify(previousRoom.lockedDesc);
            }
        }

        if (activeRoom.exits[direction] === undefined) {
            Notifications.notify("There is no exit '" + direction + "'.");
        } else {
            var exitRoom = activeRoom.exits[direction].room;

            exitRoom.canEnterFunc(); // Trigger Func
            if (exitRoom.canEnter) {
                var curRoom = activeRoom;

                if (activeRoom.exits[direction].onChange != undefined && typeof activeRoom.exits[direction].onChange == 'function') {
                    var result = activeRoom.exits[direction].onChange();
                    if (!result) {
                        return;
                    }
                }

                curRoom.triggerExit();
                Notifications.clear(Commands.LAST_COMMAND); // Clear Notifications
                Story.setRoom(exitRoom);

                Story.previousRoom = curRoom;
            } else {
                Notifications.notify(exitRoom.lockedDesc);
            }
        }
    },

    look: function() {
        Room.getRoom(Story.activeRoom).triggerLook();
    },


    setRoom: function(room) {
        if (room === undefined) return;

        if (typeof room != 'object') {
            room = Room.getRoom(room);
        }

        Story.activeRoom = room.id;
        $SM.set('story.room', Story.activeRoom);
        $SM.set('story.moves', Story.playerMoves++);

        // Trigger Room Enter
        room.triggerEnter();
        Story.updateRoomPanel();
    },

    setStory: function (story) {
        if (story === undefined) return;
        Story.activeStory = Story.StoryPool[story];
    },

    setDefaultStory: function () {
        $SM.set('story.activeStory', Story.DEFAULT_STORY);
        return Story.DEFAULT_STORY;
    },

    addStoryEvent: function (event) {
        // Add event to story events
        Events.Story.push(event);
        Events.updateEventPool();
    },

    addEncounterEvent: function (encounter) {
        // Add Encounter
        Events.Encounters.push(encounter);
    },

    handleStateUpdates: function (e) {
        
    }

};