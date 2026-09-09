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
        isDragon: ({ context }) => context.encounter === 'dragon'
    },
    actions: {
        gainWin: assign(({ context }) => ({ wins: Math.min(3, context.wins + 1), streak: context.streak + 1 })),
        lose: assign({ streak: 0 }),
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
        streak: input?.streak || 0,
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
                    { target: 'ready', actions: 'lose' }
                ]
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
