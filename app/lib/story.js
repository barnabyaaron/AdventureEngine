var Story = {

    START_ROOM: 'test',

    activeRoom: null,

    init: function (options) {
        this.options = $.extend(
            this.options,
            options
        );

        // Set Room
        var room = $SM.get('story.room');
        if (room == undefined) room = Story.setDefaultRoom();
        Story.setRoom(room);

        // Create Story Header
        var storyPanel = $('<div>').attr('id', 'gameStoryHeaderPanel').appendTo('#gameHeader');
        $('<span>').addClass('gameStoryHeaderLocation').text('Location: ' + Story.activeRoom).appendTo(storyPanel);


        //subscribe to stateUpdates
        $.Dispatch('stateUpdate').subscribe(Story.handleStateUpdates);
    },

    setRoom : function(room) {
        if (room === undefined) return;

        Story.activeRoom = room;
    },

    setDefaultRoom: function () {
        $SM.set('story.room', Story.START_ROOM);
        return Story.START_ROOM;
    },

    handleStateUpdates: function (e) {
        if (e.category == 'story' && e.stateName.indexOf('story.room') === 0) {
            Story.setRoom($SM.get('story.room'));
        }
    }

};