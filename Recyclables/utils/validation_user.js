const userDatabase = require("../models/User.js");

value = null
module.exports = async function(session) {
    // This is to get the user type from the session id
    await userDatabase.findOne({ where: { userId: session } })
    .then(user => {
        // Return either supervisor or cleaner for user type
        if (user.type == "supervisor"){
            value = "supervisor"
        }
        else{
            value = "cleaner"
        }
    })   
    return value 
}