const sessionDatabase = require("../models/session.js");

value = null
module.exports = async function(session, cookie) {
    if (session == undefined || cookie == undefined) {
        // If either session isnt valid then load the loading screen
        value = "false"
    } else {
        // If they are valid then try and get the session row
        await sessionDatabase.findOne({ where: { session_id: cookie } })
            .then(session => {
                if (session) {
                    // If session expiry date has passed current date means session expires. Reutrn false
                    if (session.expires > Date.now()) {
                        value = "false"
                    } else {
                        // OTherwise return a true to say user can log in automatically.
                        value = "true"
                    }
                } else {
                    value = "false"
                }

            })
    }
    return value
}