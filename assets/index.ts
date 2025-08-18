/**
 * Assets Index
 * Central place to import and export all app assets
 */

// Export individual assets
export const bell = require('./bell.png');
export const calendar = require('./calendar.png');
export const call = require('./call.png');
export const checkMark = require('./check-mark.png');
export const clipboard = require('./clipboard.png');
export const filter = require('./filter.png');
export const globe = require('./globe.png');
export const group = require('./group.png');
export const home = require('./home.png');
export const location = require('./location.png');
export const magnifyingGlass = require('./magnifying-glass.png');
export const money = require('./money.png');
export const padlock = require('./padlock.png');
export const phoneCall = require('./phone-call.png');
export const plus = require('./plus.png');
export const refresh = require('./undo.png');
export const remove = require('./remove.png');
export const settings = require('./settings.png');
export const sync = require('./sync.png');
export const user = require('./user.png');
export const share = require('./share.png');

// Export grouped assets for better organization
export const Assets = {
  icons: {
    bell: require('./bell.png'),
    calendar: require('./calendar.png'),
    call: require('./call.png'),
    checkMark: require('./check-mark.png'),
    clipboard: require('./clipboard.png'),
    filter: require('./filter.png'),
    globe: require('./globe.png'),
    group: require('./group.png'),
    home: require('./home.png'),
    location: require('./location.png'),
    magnifyingGlass: require('./magnifying-glass.png'),
    money: require('./money.png'),
    padlock: require('./padlock.png'),
    phoneCall: require('./phone-call.png'),
    plus: require('./plus.png'),
    refresh: require('./undo.png'),
    remove: require('./remove.png'),
    settings: require('./settings.png'),
    sync: require('./sync.png'),
    user: require('./user.png'),
    share: require('./share.png'),
  },
} as const;

export default Assets;