const userDatabase = require("../models/User.js");

value = null
module.exports = async function(session) {
    await userDatabase.findOne({ where: { userId: session } })
    .then(user => {
        if (user.type == "supervisor"){
            value = "supervisor"
        }
        else{
            value = "cleaner"
        }
    })   
    return value 
}