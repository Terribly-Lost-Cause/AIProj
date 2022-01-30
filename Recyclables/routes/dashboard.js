const express = require('express');
const router = express.Router();
const moment = require('moment');
const User = require('../models/User');
const uuid = require('uuidv4');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const Session = require('../models/session');
const Bin = require('../models/bin');

router.get('/main', async function(req, res) {
    const title = 'Overall Dashboard';

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)

    if (checkValidatorSession == "false"){
        res.redirect('/user/login')
    }
    else if (checkValidatorSession == "true"){

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)
        Bin.findAll({}).then(bin => { //find all recyclables bins available
            const oldbinlist = bin;
            
            for (var i = 0; i < oldbinlist.length; i++) {
                let status = oldbinlist[i].status
                let curPlastic = oldbinlist[i].current_plastic
                let curMetal = oldbinlist[i].current_metal
                let threshold = oldbinlist[i].threshold
                let updatedstatus = null

                let plastic_level = curPlastic / threshold * 100
                let metal_level = curMetal / threshold * 100
                if(status != 0){
                    if(plastic_level < 50 && metal_level<50){
                    updatedstatus = 1
                }
                }
                
                console.log(">>>>>>>>>>>>>>>>>>>>",oldbinlist[i].current_plastic)
                console.log(">>>>>>>>>>>>>>>>>>>>",oldbinlist[i].current_metal)
            }
        })
        Bin.findAll({}).then(bin => { //find all recyclables bins available
            const binlist = bin;

            for (var i = 0; i < binlist.length; i++) {
                if (binlist[i].status == 0) {
                    binlist[i].status = "Inactive"
                    binlist[i].camera_ipaddress = "/img/video-error.png"
                } else if (binlist[i].status == 1) {
                    binlist[i].status = "Active"
                } else if (binlist[i].status == 2) {
                    binlist[i].status = "Warning"
                } else if (binlist[i].status == 3) {
                    binlist[i].status = "Alert"
                }
            }

            

            if (checkValidatorUser == "cleaner"){
                res.render('user/dashboard', { //render page
                    binlist: binlist
                })
            }
            else if (checkValidatorUser == "supervisor"){
                res.render('user/dashboard', { //render page
                    binlist: binlist,
                    type: "supervisor"
                })
            }
            
        })
    }
});


module.exports = router