Story.LostIsland = {

    STORY_NAME: 'The Lost Island',
    DEFAULT_ROOM: null,

    Perks: {
        'boxer': {
            name: 'boxer',
            desc: 'punches do more damage',
            notify: 'learned to throw punches with purpose'
        },
        'martial artist': {
            name: 'martial artist',
            desc: 'do max damage in hand to hand combat',
            notify: 'learned to fight effectively without weapons'
        },
        'evasive': {
            name: 'evasive',
            desc: 'dodge attacks more effectively',
            notify: "learned to be where they're not"
        },
        'hawkeye': {
            name: 'hawkeye',
            desc: 'you notice even the littlest of things',
            notify: 'learned to look more closely'
        },
        'stealthy': {
            name: 'stealthy',
            desc: 'better avoid conflict',
            notify: 'learned how to not be seen'
        }
    },

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