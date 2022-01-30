const sessionDatabase = require("../models/session.js");

value = null
module.exports = async function(session, cookie) {
    if (session == undefined || cookie == undefined) {
        // Ff not load the loading screen
        value = "false"
    } else {
        await sessionDatabase.findOne({ where: { session_id: cookie } })
        .then(session => {
            if (session.expires > Date.now()) {
                value = "false"
            } else {
                value = "true"
            }
        })
    }
    return value
}