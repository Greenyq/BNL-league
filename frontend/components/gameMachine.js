import { setup, assign } from 'xstate';

export const gameMachine = setup({
    types: {
        context: {},
        events: {}
    },
    guards: {
        won: ({ event }) => event.result === 'win',
        unlocksFork: ({ context, event }) => event.result === 'win' && !context.mysteryUsed,
        choseMystery: ({ event }) => event.path === 'mystery',
        choseRevealedMystery: ({ event }) => event.path === 'mystery' && event.revealNow === true,
        isDragon: ({ context }) => context.encounter === 'dragon',
        serverUnlocksFork: ({ context, event }) => event.result === 'win' && !(event.mysteryUsed ?? context.mysteryUsed),
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
            arenaShield: event.arenaShield ?? context.arenaShield,
            mysteryUsed: event.mysteryUsed ?? context.mysteryUsed
        })),
        rememberPath: assign(({ context, event }) => ({ selectedPath: event.path, mysteryUsed: context.mysteryUsed || event.path === 'mystery' })),
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
        mysteryUsed: Boolean(input?.mysteryUsed),
        selectedPath: null,
        encounter: null
    }),
    // Server state is authoritative. These restore events work from every
    // client state, including a cancelled encounter that was waiting on admin.
    on: {
        RESTORE_PATH: { target: '.choosingPath', actions: 'syncServer' },
        RESTORE_WAIT: { target: '.waitingForAdmin', actions: 'syncServer' },
        RESTORE_ENCOUNTER: { target: '.encounter', actions: ['syncServer', 'reveal'] },
        RESTORE_READY: { target: '.ready', actions: 'syncServer' }
    },
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
                SYNC: { actions: 'syncServer' }
            }
        },
        choosingPath: {
            on: {
                CHOOSE_PATH: [
                    { guard: 'choseRevealedMystery', target: 'movingToMystery', actions: 'rememberPath' },
                    { guard: 'choseMystery', target: 'waitingForAdmin', actions: 'rememberPath' },
                    { target: 'moving', actions: 'rememberPath' }
                ]
            }
        },
        waitingForAdmin: {
            on: {
                SYNC: { actions: 'syncServer' }
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
