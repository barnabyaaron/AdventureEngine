var Story = {

    DEFAULT_STORY: 'LostIsland',

    options: {
        inCommandEvent: false,
        commandEventCallback: null,  /* function */
        canMove: true
    },

    activeStory: null,

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

        // Load Story
        Story.activeStory.init();

        // Create Room Panel
        var roomPanel = $('<div>').attr('id', 'gameRoomPanel').appendTo('#gameMain');
        Story.updateRoomPanel();

        //subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe(Story.handleStateUpdates);
    },

    updateRoomPanel: function () {
        $('#gameRoomPanel').html(''); // Clear

        // Header
        $('<div>').addClass('gamePanelHeader').text(Story.activeStory.STORY_NAME).appendTo('#gameRoomPanel');
        $('<div>').addClass('gamePanelHeader').css({ 'font-size': '14px' }).text(Story.activeRoom.name).appendTo('#gameRoomPanel');

        // Exits
        var northExit = Story.activeRoom.exits['north'];
        if (northExit == undefined) northExit = 'None';
        else if (northExit.visited != undefined && northExit.visited) northExit = northExit.name;
        else northExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>North</b> - ' + northExit).appendTo('#gameRoomPanel');

        var eastExit = Story.activeRoom.exits['east'];
        if (eastExit == undefined) eastExit = 'None';
        else if (eastExit.visited != undefined && eastExit.visited) eastExit = eastExit.name;
        else eastExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>East</b> - ' + eastExit).appendTo('#gameRoomPanel');

        var southExit = Story.activeRoom.exits['south'];
        if (southExit == undefined) southExit = 'None';
        else if (southExit.visited != undefined && southExit.visited) southExit = southExit.name;
        else southExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>South</b> - ' + southExit).appendTo('#gameRoomPanel');

        var westExit = Story.activeRoom.exits['west'];
        if (westExit == undefined) westExit = 'None';
        else if (westExit.visited != undefined && westExit.visited) westExit = westExit.name;
        else westExit = 'Unknown';
        $('<div>').addClass('roomExitItem').html('<b>West</b> - ' + westExit).appendTo('#gameRoomPanel');
    },

    go: function(direction) {

    },

    look: function() {

    },


    setRoom: function(room) {
        if (room === undefined) return;

        Story.activeRoom = room;
        $SM.set('story.room', Story.activeRoom);
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