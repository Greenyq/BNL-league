import { setup, assign } from 'xstate';

export const gameMachine = setup({
    types: {
        context: {},
        events: {}
    },
    guards: {
        won: ({ event }) => event.result === 'win',
        unlocksFork: ({ context, event }) => event.result === 'win' && context.streak + 1 >= 2,
        choseMystery: ({ event }) => event.path === 'mystery',
        isDragon: ({ context }) => context.encounter === 'dragon',
        serverUnlocksFork: ({ event }) => event.result === 'win' && event.streak >= 2,
        serverWon: ({ event }) => event.result === 'win'
    },
    actions: {
        gainWin: assign(({ context }) => ({ wins: Math.min(3, context.wins + 1), streak: context.streak + 1 })),
        lose: assign(({ context }) => ({ streak: 0, losses: context.losses + 1 })),
        syncServer: assign(({ context, event }) => ({
            wins: event.wins ?? context.wins,
            losses: event.losses ?? context.losses,
            streak: event.streak ?? context.streak,
            status: event.status ?? context.status,
            arenaShield: event.arenaShield ?? context.arenaShield
        })),
        rememberPath: assign(({ event }) => ({ selectedPath: event.path })),
        reveal: assign(({ event }) => ({ encounter: event.encounter })),
        earnShield: assign({ arenaShield: true }),
        resetEncounter: assign({ selectedPath: null, encounter: null })
    }
}).createMachine({
    id: 'bnl-campaign',
    initial: 'ready',
    context: ({ input }) => ({
        wins: input?.wins || 0,
        losses: input?.losses || 0,
        streak: input?.streak || 0,
        status: input?.status || 'upper',
        arenaShield: Boolean(input?.arenaShield),
        selectedPath: null,
        encounter: null
    }),
    states: {
        ready: {
            on: {
                RESULT: [
                    { guard: 'unlocksFork', target: 'choosingPath', actions: 'gainWin' },
                    { guard: 'won', target: 'moving', actions: 'gainWin' },
                    { target: 'defeat', actions: 'lose' }
                ],
                SERVER_RESULT: [
                    { guard: 'serverUnlocksFork', target: 'choosingPath', actions: 'syncServer' },
                    { guard: 'serverWon', target: 'moving', actions: 'syncServer' },
                    { target: 'defeat', actions: 'syncServer' }
                ],
                RESTORE_ENCOUNTER: { target: 'encounter', actions: 'reveal' },
                SYNC: { actions: 'syncServer' }
            }
        },
        choosingPath: {
            on: {
                CHOOSE_PATH: [
                    { guard: 'choseMystery', target: 'movingToMystery', actions: 'rememberPath' },
                    { target: 'moving', actions: 'rememberPath' }
                ]
            }
        },
        moving: { on: { MOTION_DONE: 'ready' } },
        defeat: { on: { MOTION_DONE: 'ready', SYNC: { actions: 'syncServer' } } },
        movingToMystery: { on: { MOTION_DONE: 'revealing' } },
        revealing: { on: { REVEAL: { target: 'encounter', actions: 'reveal' } } },
        encounter: {
            always: [
                { guard: 'isDragon', target: 'dragon' },
                { target: 'dungeon' }
            ]
        },
        dragon: { on: { ENCOUNTER_WON: { target: 'reward', actions: 'earnShield' }, CLOSE: { target: 'ready', actions: 'resetEncounter' } } },
        dungeon: { on: { ENCOUNTER_WON: { target: 'reward', actions: 'earnShield' }, CLOSE: { target: 'ready', actions: 'resetEncounter' } } },
        reward: { on: { CLOSE: { target: 'ready', actions: 'resetEncounter' } } }
    }
});
