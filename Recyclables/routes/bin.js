const express = require('express');
const router = express.Router();
const moment = require('moment');
const User = require('../models/User');
const uuid = require('uuidv4');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const Session = require('../models/session');
const Bin = require('../models/bin');

router.get('/updatelevel/:id', async function(req, res) {

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)
    
    if (checkValidatorSession == "false"){
        res.redirect('/user/login')
    }
    else if (checkValidatorSession == "true"){

        Bin.findOne({ where: { bin_id: req.params.id } })
        .then(bin => {
            if (bin){
    
                Bin.update({
                    current_plastic: 0, // Update new status and the button value
                    current_metal: 0
                }, {
                    where: {
                        bin_id: req.params.id // FInd the user who is being changed
                    }
                })
                .then(() => { // alert success update
                    res.send(`
                        <script>alert("Bin has been successfully updated to cleared")
                        setTimeout(window.location = "/dashboard/main", 1000)</script>
                    `);
                })
            }
            else{
                res.send(`
                        <script>alert("Fatal Error Occured")
                        setTimeout(window.location = "/dashboard/main", 1000)</script>
                    `);
            }
            
        })
    }
})

module.exports = router