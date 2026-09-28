const MAX_GAME_LENGTH = 60;

// A campaign's game is one of the client's preset keys ('pathfinder',
// 'dnd5e', 'call_of_cthulhu', 'other') or a custom name typed in for
// "Other" - so any short non-empty string is accepted. Returns null when
// the value isn't usable.
export function parseGame(value) {
    if (typeof value !== "string") {
        return null;
    }

    const game = value.trim();

    return game ? game.slice(0, MAX_GAME_LENGTH) : null;
}
