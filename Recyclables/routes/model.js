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
const { request } = require('https');
const { google } = require('googleapis');
const SCOPES = ['https://www.googleapis.com/auth/drive']
const TOKEN_PATH = 'token.json';
let auth;
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
                        list.push(files[i])
                    }
                }
            });
            console.log(list)
            res.render('model/modelManagement', { //render page
                type: "supervisor",
                list: list
            })
        }
    }
});

router.post('/changeMaterials', async function(req, res) {
    var array = JSON.parse(req.body.id);
    for (var i = 0; i < array.length; i++) {
        var currentname = array[i]
        var currentarray = currentname.split("_")
        if (currentarray[0] == "Plastic") {
            currentarray[0] = "Metal"
        } else if (currentarray[0] == "Metal") {
            currentarray[0] = "Plastic"
        }
        var newname = currentarray.join("_")
        const dir_path = path.join(__dirname, '../public/img/');
        console.log(dir_path)
        fs.rename(dir_path + currentname, dir_path + newname, (error) => {
            if (error) {
                console.log(error)
            }
        })
    }
})

router.post('/deleteImage', async function(req, res) {
    var array = JSON.parse(req.body.id);
    for (var i = 0; i < array.length; i++) {
        var currentname = array[i]
        const dir_path = path.join(__dirname, '../public/img/');
        console.log(dir_path)
        fs.unlink(dir_path + currentname, (error) => {
            if (error) {
                console.log(error)
            }
        })
    }
})

router.get('/confirmModelling', async function(req, res) {
    console.log("yayye")
    const dir_path = path.join(__dirname, '../public/img/');
    console.log(dir_path)
    fs.readdir(dir_path, function(err, files) {
        //handling error
        if (err) {
            return console.log('Unable to find or open the directory: ' + err);
        }
        //Print the array of images at one go
        for (var i = 0; i < files.length; i++) {
            if (files[i].includes("microbit") && files[i].includes("Metal")) {
                fs.rename(dir_path + files[i], dir_path + "/Metal/" + files[i], (error) => {
                    if (error) {
                        console.log(error)
                    }
                })
            } else if (files[i].includes("microbit") && files[i].includes("Plastic")) {
                fs.rename(dir_path + files[i], dir_path + "/Plastic/" + files[i], (error) => {
                    if (error) {
                        console.log(error)
                    }
                })
            }
        }
    });

    res.redirect("/model/main")
})

module.exports = router