
Events.Encounters = [
    {
        title: 'Combat - Archie',
        isAvailable: function () {
            return true;
        },
        scenes: {
            'start': {
                combat: true,
                enemy: 'archie',
                enemyName: 'Archie',
                deathMessage: 'Archie is dead',
                damage: 1,
                hit: 0.3,
                attackDelay: 3,
                health: 3,
                loot: {
                    'tv remote': {
                        itemObj: Items.MiscItems['tv remote'],
                        min: 1,
                        max: 1,
                        chance: 1
                    }
                },
                notification: 'A wild Archie runs at you with arms help high'
            }
        }
    },
    {
        title: 'Combat - Archie with a Gun',
        isAvailable: function () {
            return true;
        },
        scenes: {
            'start': {
                combat: true,
                enemy: 'archie',
                enemyName: 'Archie',
                deathMessage: 'Archie is dead',
                damage: 3,
                hit: 0.2,
                attackDelay: 4,
                health: 3,
                ranged: true,
                loot: {
                    'tv remote': {
                        itemObj: Items.MiscItems['tv remote'],
                        min: 1,
                        max: 1,
                        chance: 1
                    }
                },
                notification: 'A wild Archie waving a gun around'
            }
        }
    }
];