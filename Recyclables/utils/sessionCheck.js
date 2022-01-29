const sessionDatabase = require("../models/session.js");
module.exports = async function() {
    if (req.session.userId == undefined || req.cookies.new_cookie == undefined) {
        // Ff not load the loading screen
        return false
    } else {
        sessionDatabase.findOne({ where: { session_id: req.cookies.new_cookie } })
            .then(session => {
                if (session.expires > Date.now()) {
                    return false
                } else {
                    return true
                }
            })
    }
}