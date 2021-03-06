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
const net = require('net');

// Get bins routes get
router.get('/binManagement', async function(req, res) {

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)
        // Perform same validation check for session and user again
    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

        if (checkValidatorUser == "cleaner") {
            res.redirect('/dashboard/main')
        } else if (checkValidatorUser == "supervisor") {
            Bin.findAll({}).then(bin => { //find all bins
                    if (bin != undefined) { //pagination
                        var binlist = bin;

                        for (var i = 0; i < binlist.length; i++) {
                            if (binlist[i].status == 0) {
                                binlist[i].status = "Inactive"
                                    // set the action for the binManagement
                                binlist[i].remarks = 0
                            } else if (binlist[i].status == 1) {
                                binlist[i].status = "Active"
                                    // set the action for the binManagement
                                binlist[i].remarks = 1
                            } else if (binlist[i].status == 2) {
                                binlist[i].status = "Danger"
                                    // set the action for the binManagement
                                binlist[i].remarks = 1
                            } else if (binlist[i].status == 3) {
                                binlist[i].status = "Alert"
                                    // set the action for the binManagement
                                binlist[i].remarks = 1
                            }
                        }

                        res.render('bin/binManagement', { //render page
                            "bin": binlist,
                            type: "supervisor"
                        })
                    }
                }) // renders views/bin/binManagement.handlebars (webpage to key in new user info)
        }
    }
});



// Post route to create bins
router.post('/addBin', (req, res) => {
    let regError = []; // Initialise error array
    // Get all the values from the form
    // Initialise all other predefined values
    let bin_id = uuid.uuid();
    let camera_ipaddress = req.body.camera
    console.log("]]]]]]]]]]]]]]]", camera_ipaddress)
        // IP address validation
    if (net.isIPv4(camera_ipaddress) != 0) {
        camera_ipaddress = "https://" + camera_ipaddress + ":8080//video";
    } else {
        regError.push(camera_ipaddress, "is an invalid IP Address")
    }
    let location_description = req.body.location;
    let floor_level = req.body.level;
    let status = 1;
    let overall_plastic = 0;
    let overall_metal = 0;
    let current_plastic = 0;
    let current_metal = 0;
    let threshold = req.body.threshold
    let remarks = req.body.remarks
    let crowdThreshold = req.body.crowdthreshold;
    let crowdFill = 0;
    //check if the floor and location already has a smart bin there
    Bin.findOne({
            where: {

                location_description: location_description,
                floor_level: floor_level
            }
        })
        .then(bin => {
            if (bin)
            // If bin exist already then throw an error
                regError.push("A bin has already been placed there. Please use another location.")
            if (regError.length > 0) { // see if there is error, exclude first one. If have direct to bin page
                res.render('bin/addBins', {
                    layout: 'main.handlebars',
                    regError: regError,
                    type: "supervisor"
                });
            } else {
                // To insert a record into the Bin table
                Bin.create({
                        bin_id,
                        camera_ipaddress,
                        location_description,
                        floor_level,
                        status,
                        overall_plastic,
                        overall_metal,
                        current_plastic,
                        current_metal,
                        threshold,
                        remarks,
                        crowdThreshold,
                        crowdFill
                    }).then(bin => {
                        res.redirect('/bin/binManagement'); // Goes back to main bin management page
                    })
                    .catch(err => console.log(err))
            }
        })
});


//  Get route for Add bin
router.get('/addBin', async function(req, res) {
    const title = 'Add Bin';

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)
        // Perform same validation check for session and user again
    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

        if (checkValidatorUser == "cleaner") {
            res.redirect('/dashboard/main')
        } else if (checkValidatorUser == "supervisor") {
            res.render('bin/addBins', {
                    type: "supervisor",
                    title: title
                }) // renders views/user/addBins.handlebars (webpage to key in new bin info)
        }
    }
});


// Resets bin levels to 0 when cleaners clear the bin
router.get('/updatelevel/:id', async function(req, res) {
    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)
        // Perform same validation check for session and user again
    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        await Bin.findOne({ where: { bin_id: req.params.id } })
            .then(bin => {
                if (bin) {
                    Bin.update({
                        current_plastic: 0, // Update new status to clear the bins
                        current_metal: 0
                    }, {
                        where: {
                            bin_id: req.params.id // FInd the bin who is being changed
                        }
                    })
                    res.send({ stat: "Bin successfully cleared" });
                } else {
                    res.send({ stat: "Error" });
                }

            })
    }
})


// get update status
// activate or deactiviate the bins
router.get('/updatestatus/:id', async function(req, res) {

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)
        // Perform same validation check for session and user again
    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

        if (checkValidatorUser == "cleaner") {
            res.redirect('/dashboard/main')
        } else if (checkValidatorUser == "supervisor") {
            Bin.findOne({ where: { bin_id: req.params.id } })
                .then(bin => {
                    if (bin) {
                        var stat = bin.status;
                        if (stat == 0) {
                            // Get all the current bin information
                            let curPlastic = bin.current_plastic
                            let curMetal = bin.current_metal
                            let threshold = bin.threshold

                            // Calculate the metal and plastic
                            let plastic_level = curPlastic / threshold * 100
                            let metal_level = curMetal / threshold * 100

                            // Take the level whichever is higer to update status in database
                            let level_update = null;
                            if (plastic_level > metal_level) {
                                level_update = plastic_level
                            } else {
                                level_update = metal_level
                            }

                            if (level_update < 50) {
                                var newstat = 1
                            } else if ((level_update >= 50 && level_update < 75)) {
                                var newstat = 2
                            } else if ((level_update >= 75)) {
                                var newstat = 3
                            }
                        } else {
                            var newstat = 0;
                        }

                        Bin.update({
                                status: newstat, // Update new status
                            }, {
                                where: {
                                    bin_id: req.params.id // FInd the bin who is being changed
                                }
                            })
                            .then(() => { // alert success update
                                res.send(`
                                <script>alert("Changes made successfully saved")
                                setTimeout(window.location = "/bin/binManagement", 1000)</script>
                            `);
                            })
                    } else {
                        res.send(`
                                <script>alert("Bin not found")
                                setTimeout(window.location = "/bin/binManagement", 1000)</script>
                            `);
                    }

                })
        }
    }
})

// Post route to receive information for updating bins
router.post('/updateinformation/:id', async function(req, res) {
    let regError = []; // Initialise error array
    let camera_ipaddress = req.body.camera
        // Validate ip address
    if (net.isIPv4(camera_ipaddress) == false) {
        regError.push("Invalid IP Address")
    } else {
        camera_ipaddress = "https://" + camera_ipaddress + ":8080//video";
    }
    var binId = req.params.id

    // Get all the fields from the update bin form
    let location_description = req.body.location;
    let floor_level = req.body.level;
    let status = 1;
    let overall_plastic = 0;
    let overall_metal = 0;
    let current_plastic = 0;
    let current_metal = 0;
    let threshold = req.body.threshold
    let remarks = req.body.remarks
    let crowdThreshold = req.body.crowdthreshold;


    Bin.findOne({

        })
        .then(bin => {
            if (regError.length > 0) { // see if there is error, exclude first one
                res.render('bin/addBins', {
                    layout: 'main.handlebars',
                    regError: regError,
                    type: "supervisor",
                    location_description,
                    floor_level,
                    threshold,
                    remarks,
                    crowdThreshold
                });
            } else {
                // To update a record into bin table
                Bin.update({
                        camera_ipaddress,
                        location_description,
                        floor_level,
                        status,
                        overall_plastic,
                        overall_metal,
                        current_plastic,
                        current_metal,
                        threshold,
                        remarks,
                        crowdThreshold
                    }, {
                        where: {
                            bin_id: req.params.id
                        }
                    }).then(bin => {
                        res.redirect('/bin/binManagement'); // Goes back to main user management page
                    })
                    .catch(err => console.log(err))

            }
        })
})

// Get route to update information of the bin
router.get('/updateinformation/:id', async function(req, res) {


    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)
        // Perform same validation check for session and user again
    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

        if (checkValidatorUser == "cleaner") {
            res.redirect('/dashboard/main')
        } else if (checkValidatorUser == "supervisor") {
            Bin.findOne({ where: { bin_id: req.params.id } })

            .then(bin => {
                var binData = bin

                // get all the bin information from the database for ease of person updating the bin info
                binID = bin.bin_id
                Camera = req.body.camera
                    //splits the ipWebCam link to get only the IP address
                ipaddress = bin.camera_ipaddress;
                ipaddress = ipaddress.split('https://').pop();
                ipaddress = ipaddress.split(":")[0];
                location = req.body.location
                lvl = req.body.level
                threshold = req.body.threshold
                remark = req.body.remarks
                crowdThreshold = req.body.crowdthreshold;

                // Send all data over to handlebars to prefill the fields
                res.render('bin/addBins', {
                    "binData": bin,
                    type: "supervisor",
                    binID,
                    Camera: ipaddress,
                    location: bin.location_description,
                    lvl: bin.floor_level,
                    threshold: bin.threshold,
                    remark: bin.remarks,
                    crowdThreshold: bin.crowdThreshold,

                })
            })
        }
    }
})

router.post("/updatetraffic", async(req, res) => {
    //Request validation
    if (req.body["id"] == undefined) return res.json({ "err": "true", "msg": "Invalid format" });
    let binId = req.body["id"];
    let targetBin = await Bin.findOne({
        where: {
            bin_id: binId
        }
    })
    if (targetBin == null) return res.json({ "err": "true", "msg": "Invalid ID" });

    //To increase traffic
    if (req.body["add"]) {
        try {
            let today = new Date();
            await Bin.update({ crowdFill: targetBin.crowdFill + parseInt(req.body["add"]) }, { where: { bin_id: binId } })
            await crowdRecord.create(
                today.getHours(),
                today.getMinutes(),
                today.getSeconds(),
                today.getDate(),
                today.getMonth(),
                today.getFullYear(),
                binId,
                parseInt(req.body["add"])
            )
            return res.json({ "err": "false" })
        } catch (e) {
            return res.json({ "err": "true", "msg": "Invalid value" });
        }

        //Reset Traffic
    } else if (req.body["set"]) {
        try {
            await Bin.update({ crowdFill: parseInt(req.body["set"]) }, { where: { bin_id: binId } })
            return res.json({ "err": "false" })
        } catch (e) {
            return res.json({ "err": "true", "msg": "Invalid value" });
        }
    } else return res.json({ "err": "true", "msg": "Invalid format" });
})

module.exports = router;