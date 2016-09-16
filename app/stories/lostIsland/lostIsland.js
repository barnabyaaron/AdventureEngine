Story.LostIsland = {

    STORY_NAME: 'The Lost Island',
    DEFAULT_ROOM: null,

    init: function () {
        Story.LostIsland.createRooms();

        Story.LostIsland.startStory();
    },

    startStory: function () {
        Story.setRoom(Story.LostIsland.DEFAULT_ROOM);
    },

    createRooms: function () {
        // Beach
        var beach = Room.createRoom('beach', {
            name: 'Beach',
            description: 'A Beach with white sand all around and ocean as far as you can see.'
        });
        Story.LostIsland.DEFAULT_ROOM = beach; // Set Default Room

        var forest = Room.createRoom('forest', {
            name: 'Forest',
            description: 'A Forest'
        });

        Room.addExit(beach, 'north', {
            room: forest
        });
    }

};