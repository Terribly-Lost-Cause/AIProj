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

    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)
        Bin.findAll().then(bin => { //find all recyclables bins available
            const oldbinlist = bin;
            let updatedstatus = null

            for (var i = 0; i < oldbinlist.length; i++) {
                let binid = oldbinlist[i].bin_id
                let status = oldbinlist[i].status
                let curPlastic = oldbinlist[i].current_plastic
                let curMetal = oldbinlist[i].current_metal
                let threshold = oldbinlist[i].threshold

                let plastic_level = curPlastic / threshold * 100
                let metal_level = curMetal / threshold * 100

                if (status != 0) {

                    let level_update = null;
                    if (plastic_level > metal_level) {
                        level_update = plastic_level
                    } else {
                        level_update = metal_level
                    }


                    if (level_update < 50) {
                        updatedstatus = 1
                    } else if ((level_update >= 50 && level_update < 75)) {
                        updatedstatus = 2
                    } else if ((level_update >= 75)) {
                        updatedstatus = 3
                    }
                    Bin.update({
                        status: updatedstatus
                    }, {
                        where: {
                            bin_id: binid
                        }
                    })
                }


            }
        })

        Bin.findAll({}).then(newbin => { //find all recyclables bins available
            const binlist = newbin;

            for (var i = 0; i < binlist.length; i++) {
                if (binlist[i].status == 0) {
                    binlist[i].status = "Inactive"
                    binlist[i].camera_ipaddress = "/img/video-error.png"
                } else if (binlist[i].status == 1) {
                    binlist[i].status = "Active"
                } else if (binlist[i].status == 2) {
                    binlist[i].status = "Danger"
                } else if (binlist[i].status == 3) {
                    binlist[i].status = "Alert"
                }
            }



            if (checkValidatorUser == "cleaner") {
                res.render('dashboard/dashboard', { //render page
                    binlist: binlist
                })
            } else if (checkValidatorUser == "supervisor") {
                res.render('dashboard/dashboard', { //render page
                    binlist: binlist,
                    type: "supervisor"
                })
            }
        })
    }
});


module.exports = router