const express = require('express');
const router = express.Router();
const moment = require('moment');
const User = require('../models/User');
const uuid = require('uuidv4');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const Session = require('../models/session');
const Bin = require('../models/bin');
const crowdRecord = require("../models/crowdRecord");

router.get('/main', async function(req, res) {
    const title = 'Overall Dashboard';
    var https = require('https');

    // Perform same validation check for session and user again
    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)

    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)
        Bin.findAll().then(bin => { //find all recyclables bins available
            const oldbinlist = bin;
            let updatedstatus = null

            for (var i = 0; i < oldbinlist.length; i++) {
                https.get(oldbinlist[i].camera_ipaddress, function(res) {
                    console.log("statusCode: ", res.statusCode); // <======= Here's the status code 
                    console.log("headers: ", res.headers);
                    res.on('data', function(d) { process.stdout.write(d); });
                }).on('error', function(e) { console.error(e); });

                // Retrieve all the bin information here
                let binid = oldbinlist[i].bin_id
                let status = oldbinlist[i].status
                let curPlastic = oldbinlist[i].current_plastic
                let curMetal = oldbinlist[i].current_metal
                let threshold = oldbinlist[i].threshold

                // Calculate the plastic and metal level based on percentage
                let plastic_level = curPlastic / threshold * 100
                let metal_level = curMetal / threshold * 100

                // When inactive we dont update it
                // We only update the bins that are active or alert or danger
                if (status != 0) {

                    // Since the idea is to display status based on  level
                    // We will take the level of the bin that is of higher value
                    let level_update = null;
                    if (plastic_level > metal_level) {
                        level_update = plastic_level
                    } else {
                        level_update = metal_level
                    }

                    // Based on the higher level bin, update the new status into database
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

        // After finish all the updates, now get all the bins available
        Bin.findAll({}).then(newbin => { //find all recyclables bins available
            const binlist = newbin;

            var inactivelist = [];
            var activelist = [];
            var dangerlist = [];
            var alertlist = [];

            // Sort them into the various status array
            // If inactive remove the live feed video, replace with no video png
            for (var i = 0; i < binlist.length; i++) {
                if (binlist[i].status == 0) {
                    binlist[i].status = "Inactive"
                    binlist[i].camera_ipaddress = "/img/video-error.png"
                    inactivelist.push(binlist[i])
                } else if (binlist[i].status == 1) {
                    binlist[i].status = "Active"
                    activelist.push(binlist[i])
                } else if (binlist[i].status == 2) {
                    binlist[i].status = "Danger"
                    dangerlist.push(binlist[i])
                } else if (binlist[i].status == 3) {
                    binlist[i].status = "Alert"
                    alertlist.push(binlist[i])
                }
            }

            // This is to sort the array by descending order using the plastic and metal levels
            inactivelist.sort((a, b) => ((b.current_plastic / b.threshold * 100) + (b.current_metal / b.threshold * 100)) - ((a.current_plastic / a.threshold * 100) + (a.current_metal / a.threshold * 100)))
            activelist.sort((a, b) => ((b.current_plastic / b.threshold * 100) + (b.current_metal / b.threshold * 100)) - ((a.current_plastic / a.threshold * 100) + (a.current_metal / a.threshold * 100)))
            dangerlist.sort((a, b) => ((b.current_plastic / b.threshold * 100) + (b.current_metal / b.threshold * 100)) - ((a.current_plastic / a.threshold * 100) + (a.current_metal / a.threshold * 100)))
            alertlist.sort((a, b) => ((b.current_plastic / b.threshold * 100) + (b.current_metal / b.threshold * 100)) - ((a.current_plastic / a.threshold * 100) + (a.current_metal / a.threshold * 100)))

            if (checkValidatorUser == "cleaner") {
                res.render('dashboard/dashboard', { //render page
                    inactivelist: inactivelist,
                    activelist: activelist,
                    dangerlist: dangerlist,
                    alertlist: alertlist
                })
            } else if (checkValidatorUser == "supervisor") {
                res.render('dashboard/dashboard', { //render page
                    inactivelist: inactivelist,
                    activelist: activelist,
                    dangerlist: dangerlist,
                    alertlist: alertlist,
                    type: "supervisor"
                })
            }
        })
    }
});


router.get("/location", async(req, res) => {

    let checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)

    if (checkValidatorSession == "false") return res.redirect("/user/login")
    else if (checkValidatorSession != "true") return res.redirect("/user/login?how=did_you_get_here");

    let newbin = await Bin.findAll({})
        //find all recyclables bins available
    let binlist = newbin;

    for (var i = 0; i < binlist.length; i++) {

        switch (binlist[i].status) {
            case 0:
                binlist[i].status = "Inactive"
                binlist[i].camera_ipaddress = "/img/video-error.png"
                break;
            case 1:
                binlist[i].status = "Active"
                break;
            case 2:
                binlist[i].status = "Warning"
                break;
            case 3:
                binlist[i].status = "Alert"
                break;
        }
    }


    let checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

    if (checkValidatorUser == "cleaner") {
        res.render('user/locationView', { //render page
            binlist: JSON.stringify(binlist)
        })
    } else if (checkValidatorUser == "supervisor") {
        res.render('user/locationView', { //render page
            binlist: JSON.stringify(binlist),
            type: "supervisor"
        })
    }
})
router.get("/viewChart", async(req, res) => {

    let checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)

    if (checkValidatorSession == "false") return res.redirect("/user/login")
    else if (checkValidatorSession != "true") return res.redirect("/user/login?how=did_you_get_here");

    console.log("reee");
    let crowdData = await crowdRecord.findAll();
    console.log("rarwa");
    let binList = await Bin.findAll();


    let checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

    if (checkValidatorUser == "cleaner") {
        res.render('user/chart', { //render page
            binlist: JSON.stringify(binList),
            crowdData: JSON.stringify(crowdData)
        })
    } else if (checkValidatorUser == "supervisor") {
        res.render('user/chart', { //render page
            binlist: JSON.stringify(binList),
            crowdData: JSON.stringify(crowdData),
            type: "supervisor"
        })
    }
})


// This route is to update the bins is realtime
router.get('/getbin/:id', async function(req, res) {

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)

    // Perform same validation check for session and user again
    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)
        await Bin.findOne({ where: { bin_id: req.params.id } }) //find all recyclables bins available
            .then(bin => {
                if (bin) { // if bin exist get all the current bin information

                    let status = bin.status
                    let curPlastic = bin.current_plastic
                    let curMetal = bin.current_metal
                    let threshold = bin.threshold
                    let description = bin.location_description
                    let level = bin.floor_level
                    let ipcamera = bin.camera_ipaddress

                    // Calculate the plastic and metal level based on %
                    let newplastic_level = curPlastic / threshold * 100
                    let newmetal_level = curMetal / threshold * 100

                    // If inactive we dont update
                    // Only update when the staus is active, alert or danger
                    if (status != 0) {

                        // Get the value for the level that is higher
                        let level_update = null;
                        if (newplastic_level > newmetal_level) {
                            level_update = newplastic_level
                        } else {
                            level_update = newmetal_level
                        }

                        // Update the new status into db
                        let newupdatedstatus = 0
                        if (level_update < 50) {
                            newupdatedstatus = 1
                        } else if ((level_update >= 50 && level_update < 75)) {
                            newupdatedstatus = 2

                        } else if ((level_update >= 75)) {
                            newupdatedstatus = 3

                        }

                        // If there is no change in status, nothing to do
                        let tochange = false
                        if (status == newupdatedstatus) {
                            tochange = true

                        } else {
                            // If the change in status in positive aka active -> alert/danger
                            if (newupdatedstatus - status > 0) {

                                // Initialise the sms provider which is twilo
                                const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                                if (newupdatedstatus == 2) {
                                    var urgency = "The bin is about to be overfilled with recyclables."
                                }
                                if (newupdatedstatus == 3) {
                                    var urgency = "The bin has overfilled with recyclables and requires immediate attention!"
                                }
                                client.validationRequests
                                    .create({ friendlyName: 'Smart Bin', phoneNumber: '+14158675310' })
                                    .then(validation_request => console.log(validation_request.friendlyName))
                                    .catch(err => console.log(err));

                                // Create the sms to be send with all the required information of the bin
                                // Here the to part, we set a default number to show it works and to save on free trial credits
                                client.messages
                                    .create({
                                        body: 'Please clear the trash at ' + description + ' level ' + level + '. ' + urgency,
                                        from: '+17373734753',
                                        to: '+6598209042'
                                    })
                                    .then(message => console.log(message.sid));
                            }

                        }
                        Bin.update({
                                status: newupdatedstatus
                            }, {
                                where: {
                                    bin_id: req.params.id
                                }
                            })
                            .then(bin1 => {
                                if (newupdatedstatus == 0) {
                                    newupdatedstatus = "Inactive"
                                } else if (newupdatedstatus == 1) {
                                    newupdatedstatus = "Active"
                                } else if (newupdatedstatus == 2) {
                                    newupdatedstatus = "Danger"
                                } else if (newupdatedstatus == 3) {
                                    newupdatedstatus = "Alert"
                                }
                            })

                        // Send the necessary information back to the ajax caller from html
                        res.send({ newplastic_level: newplastic_level, newmetal_level: newmetal_level, newupdatedstatus: newupdatedstatus, tochange: tochange, status: status, description: description, level: level, ipcamera: ipcamera });

                    } else {
                        res.send({ newplastic_level: 0, newmetal_level: 0, newupdatedstatus: 0, tochange: true, status: 0, description: 0, level: 0, ipcamera: 0 });
                    }
                }
            })


    }
})

module.exports = router