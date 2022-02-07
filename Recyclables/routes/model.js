const express = require('express');
const router = express.Router();
const moment = require('moment');
const User = require('../models/User');
const uuid = require('uuidv4');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const Session = require('../models/session');
const Bin = require('../models/bin');
const path = require('path');
const fs = require('fs');

router.get('/main', async function(req, res) {
    const title = 'Overall Dashboard';

    var checkValidatorSession = await require("../utils/validation_session")(req.session.userId, req.cookies.new_cookie)

    if (checkValidatorSession == "false") {
        res.redirect('/user/login')
    } else if (checkValidatorSession == "true") {

        var checkValidatorUser = await require("../utils/validation_user")(req.session.userId)

        if (checkValidatorUser == "cleaner") {
            res.redirect('/dashboard/main')
        } else if (checkValidatorUser == "supervisor") {

            const dir_path = path.join(__dirname, '../public/img');
            var list = [];
            //var metallist = [];

            fs.readdir(dir_path, function(err, files) {
                //handling error
                if (err) {
                    return console.log('Unable to find or open the directory: ' + err);
                }
                //Print the array of images at one go
                for (var i = 0; i < files.length; i++) {
                    if (files[i].includes("microbit")) {
                        console.log(files[i])
                        var arry = files[i].split("_")
                        var name = arry[0]
                        list.push(files[i])
                        console.log(">>>>>>>>", list)
                    }



                }
            });

            res.render('model/modelManagement', { //render page
                type: "supervisor",
                list: list
            })
        }
    }
});



module.exports = router