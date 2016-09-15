
Events.Encounters = [
    {
        title: 'Combat - Archie',
        isAvailable: function () {
            // return turn if even can happen
            return true;
        },
        scenes: {
            'start': {
                combat: true,
                enemy: 'archie',
                enemyName: 'Archie',
                deathMessage: 'Archie is dead',
                damage: 1,
                hit: 0.5,
                attackDelay: 2,
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
    }
];