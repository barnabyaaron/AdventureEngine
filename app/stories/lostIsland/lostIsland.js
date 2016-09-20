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
                            hit: 0.5,
                            attackDelay: 3,
                            health: 5,
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
            description: 'You enter a huge forest with trees so high you can hardly see the sky, It casts a large shadow making it almost dark inside the forest.[[break]]You see paths in every direction, to the <b>south</b> you see the beach, <b>west</b> you hear the sound of running water, both <b>east</b> and <b>north</b> you can only see forest.',
            commands: [],
            Events: [
                {
                    title: 'Mysterious Smoke',
                    isAvailable: function () {
                        return !$SM.get('timers.smokeEvent', true);
                    },
                    scenes: {
                        'start': {
                            text: [
                                'A black mysterious smoke surrounds you and you start to feel tired.'
                            ],
                            notification: 'A black mysterious smoke surrounds you and you start to feel tired.',
                            buttons: {
                                'leave': {
                                    text: 'wake up',
                                    cooldown: 4,
                                    onChoose: function () {
                                        Notifications.clear(Commands.LAST_COMMAND); // Clear Notifications
                                        Notifications.notify('As you wake up things seem different, like your in a different part of the forest.');

                                        // get random forest room
                                        var roomNum = Math.floor(Math.random() * (4 - 2 + 1) + 2);
                                        Story.setRoom('forest-' + roomNum);
                                    },
                                    nextScene: 'end'
                                    
                                }
                            }
                        }
                    }
                },
                {
                    title: 'Wild Beast',
                    isAvailable: function () {
                        return true;
                    },
                    scenes: {
                        'start': {
                            text: [
                                'As you look around the forest you see a large animal in the distance'
                            ],
                            notification: 'You see a large animal in the distance',
                            buttons: {
                                'investigate': {
                                    text: 'Investigate',
                                    nextScene: { 0.6: 'fight', 0.9: 'friendly', 1: 'runs' }
                                },
                                'ignore': {
                                    text: 'Ignore',
                                    nextScene: { 0.3: 'fight', 1: 'end' }
                                }
                            }
                        },
                        'fight': {
                            combat: true,
                            enemy: 'large bear',
                            enemyName: 'Large Bear',
                            damage: 2,
                            hit: 0.5,
                            attackDelay: 4,
                            health: 8,
                            notification: 'A large bear runs at you',
                            deathMessage: 'You killed the bear',
                            loot: {
                                'meat': {
                                    min: 2,
                                    max: 6,
                                    chance: 1
                                }
                            },
                            buttons: {
                                'leave': {
                                    text: 'leave',
                                    cooldown: Events._LEAVE_COOLDOWN,
                                    nextScene: 'end'
                                }
                            }
                        },
                        'friendly': {
                            text: [
                                "As you get closer the the animal you notice it's attualy a large chicken",
                                "It doesn't seem aggressive so you reach out to touch and before you can it scurries away",
                                "As it does you notice some large eggs on the floor"
                            ],
                            loot: {
                                'egg': {
                                    min: 1,
                                    max: 5,
                                    change: 1
                                }
                            },
                            buttons: {
                                'leave': {
                                    text: 'Take and Leave',
                                    cooldown: Events._LEAVE_COOLDOWN,
                                    nextScene: 'end'
                                }
                            }
                        },
                        'runs': {
                            text: [
                                'As you approch the animal it spots you and runs away out of sight'
                            ],
                            buttons: {
                                'leave': {
                                    text: 'leave',
                                    nextScene: 'end'
                                }
                            }
                        }
                    }
                }
            ],
            onEnter: function () {
                // Check if have compass
                if (!Player.inventory['compass']) {
                    // because the player dosn't have a compass give a 50% change to move to a random forest room.
                    if (Math.random() <= 0.5) { // 50% Chance
                        Notifications.clear(Commands.LAST_COMMAND); // Clear Notifications
                        Notifications.notify('You wonder around the forest not really knowing where to go, you start to lose your way and get lost.');

                        // get random forest room
                        var roomNum = Math.floor(Math.random() * (4 - 2 + 1) + 2);
                        Story.setRoom('forest-' + roomNum);
                    }
                }

                // 40% Chance to trigger room events
                if (Math.random() <= 0.4) { // 40% Chance
                    Events.triggerRoomEvent(Room.getRoom('forest-1').Events);
                }
            }
        });

        Room.createRoom('forest-2', {
            name: 'Forest',
            description: 'Forest 2'
        });

        Room.createRoom('forest-3', {
            name: 'Forest',
            description: 'Forest 3'
        });

        Room.createRoom('forest-4', {
            name: 'Forest',
            description: 'Forest 4'
        });

        Room.updateRoomsState();
    },

    createItems: function () {
        Items.addItem('food', 'egg', {
            name: 'egg',
            type: 'food',
            desc: 'A larger than normal egg',
            heal: 2
        });
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

        Room.addExit(Room.getRoom('forest-1'), 'north', {
            room: Room.getRoom('forest-2')
        });

        Room.addExit(Room.getRoom('forest-2'), 'south', {
            room: Room.getRoom('forest-1')
        });

        Room.addExit(Room.getRoom('forest-2'), 'east', {
            room: Room.getRoom('forest-3')
        });

        Room.addExit(Room.getRoom('forest-3'), 'west', {
            room: Room.getRoom('forest-2')
        });

        Room.addExit(Room.getRoom('forest-3'), 'north', {
            room: Room.getRoom('forest-4')
        });

        Room.addExit(Room.getRoom('forest-4'), 'south', {
            room: Room.getRoom('forest-3')
        });
    }

};