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
        Story.LostIsland.createItems();
        Story.LostIsland.createEvents();
        Story.LostIsland.createExits();

        Story.LostIsland.setDefaultRoom();

        Story.LostIsland.loadStory();
    },

    loadStory: function () {
        var room = $SM.get('story.room');
        if (room == undefined) room = Story.LostIsland.DEFAULT_ROOM;

        Story.setRoom(room);
    },

    setDefaultRoom: function () {
        Story.LostIsland.DEFAULT_ROOM = Room.getRoom('beach'); // Set Default Room
    },

    createRooms: function () {
        // Beach
        Room.createRoom('beach', {
            name: 'Beach',
            description: 'You wake up Lying face first on a sandy beach, while you spit out all the sand in your mouth you look around.[[break]]To your <b>south</b> all you can see is ocean as far as the eye can see, however to the <b>north</b> you can see a huge forest.',
            loot: {
                compass: 1  
            },
            commands: [
                [
                    ['look south', 'look at ocean'],
                    function () {
                        Notifications.notify("You look at the ocean, it seems to go as far as you can see.");
                    }
                ],
                [
                    ['eat sand'],
                    function () {
                        Notifications.notify("Why?");
                    }
                ],
                [
                    ['take compass', 'pickup compass', 'pick up compass'],
                    function () {
                        Player.pickupItem('compass', 1, 'beach', true);

                        $SM.set('game.compass', true);
                        Notifications.notify("You pickup the compass from the floor, this should help you find your way around.");
                    }
                ]
            ],
            Events: [
                {
                    title: 'Combat - Large Crab',
                    isAvailable: function () {
                        return (Story.playerMoves > 1);
                    },
                    scenes: {
                        'start': {
                            combat: true,
                            enemy: 'large crab',
                            enemyName: 'Large Crab',
                            deathMessage: 'You killed the large crab',
                            damage: 2,
                            hit: 0.4,
                            attackDelay: 3,
                            health: 3,
                            loot: {
                                'meat': {
                                    min: 2,
                                    max: 6,
                                    chance: 1
                                }
                            },
                            notification: 'A Crab the size of a person scurries across the beach towards you.'
                        }
                    }
                }
            ],
            onEnter: function () {
                if (Math.random() <= 0.2) { // 20% Chance
                    Events.triggerRoomEvent(Room.getRoom('beach').Events);
                }
            }
        });

        Room.createRoom('forest-1', {
            name: 'Forest',
            description: 'A Forest'
        });

        Room.updateRoomsState();
    },

    createItems: function () {
        // @TODO
    },

    createEvents: function () {
        // @TODO
    },

    createExits: function () {
        Room.addExit(Room.getRoom('beach'), 'north', {
            room: Room.getRoom('forest-1')
        });

        Room.addExit(Room.getRoom('forest-1'), 'south', {
            room: Room.getRoom('beach')
        });
    }

};