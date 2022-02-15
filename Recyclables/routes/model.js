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
const zlib = require('zlib');
const { google } = require('googleapis');
const AdmZip = require("adm-zip");
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



    const oauth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.REDIRECT_URI
    );
    //setting our auth credentials
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
    //initialize google drive
    const drive = google.drive({
        version: 'v3',
        auth: oauth2Client,
    });

    const fileId = '1nnRES9H94PtEpJSWojUzMelXi8HsAIed';
    var dest = fs.createWriteStream('AI.zip');
    let progress = 0;
    const metaldb = 'AI/recyclableDataset/metal'
    const plasticdb = 'AI/recyclableDataset/plastic'

    function GetLastMetal() {
        var files = fs.readdirSync(metaldb);
        var numarray = []
        for (var i = 0; i < files.length; i++) {
            var name = files[i].replace("metal", "")
            name = name.replace(".jpg", "")
            numarray.push(Number(name))
        }
        numarray = numarray.sort(function(a, b) {
            return a - b;
        });
        return numarray[numarray.length - 1]
    }


    function GetLastPlastic() {
        var files = fs.readdirSync(plasticdb);
        var numarray = []
        for (var i = 0; i < files.length; i++) {
            var name = files[i].replace("plastic", "")
            name = name.replace(".jpg", "")
            name = name.replace(".jpeg", "")
            numarray.push(Number(name))
        }
        numarray = numarray.sort(function(a, b) {
            return a - b;
        });
        return numarray[numarray.length - 1]
    }

    function deleteEverything(path) {
        fs.unlink(path, (error) => {
            if (error) {
                console.log(error)
            }
        })
    }

    await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' }).then(ress => {
        ress.data
            .on('end', () => {
                setTimeout(() => { console.log("Done downloading file.!"); }, 2000);
                try {
                    const zip = new AdmZip('AI.zip');
                    const outputDir = 'AI';
                    zip.extractAllTo(outputDir);

                    console.log(`Extracted to "${outputDir}" successfully`);

                    var lastMetalNum = parseInt(GetLastMetal())
                    console.log(">>>>>>>>>>>>>", lastMetalNum)
                    var lastPlasticNum = parseInt(GetLastPlastic())
                    console.log(">>>>>>>>>>>>>", lastPlasticNum)

                    const dir_path = path.join(__dirname, '../public/img/');
                    var files = fs.readdirSync(dir_path);
                    for (var i = 0; i < files.length; i++) {
                        if (files[i].includes("microbit")) {
                            if (files[i].includes("Metal")) {
                                lastMetalNum += 1
                                fs.renameSync(dir_path + files[i], "AI/recyclableDataset/metal/metal" + lastMetalNum + ".jpg", (error) => {
                                    if (error) {
                                        console.log(error)
                                    } else {
                                        console.log(files[i])
                                    }
                                })

                            } else if (files[i].includes("Plastic")) {
                                lastPlasticNum += 1
                                fs.renameSync(dir_path + files[i], "AI/recyclableDataset/plastic/plastic" + lastPlasticNum + ".jpg", (error) => {
                                    if (error) {
                                        console.log(error)
                                    } else {
                                        console.log(files[i])
                                    }
                                })

                            }
                        }
                    }
                    console.log("zip")
                    const file = new AdmZip();
                    file.addLocalFolder('AI/recyclableDataset', 'recyclableDataset');
                    fs.writeFileSync('recyclableDataset.zip', file.toBuffer());

                    // delete the extracted AI folder
                    fs.rmSync("AI", { recursive: true, force: true })
                        // delete the AI zip folder
                    fs.rmSync("AI.zip", { recursive: true, force: true })


                    var fileMetadata = {
                        'name': 'recyclableDataset.zip'
                    };
                    var media = {
                        mimeType: 'application/zip',
                        body: fs.createReadStream('recyclableDataset.zip')
                    };

                    // first update it so we cna update the file
                    drive.permissions.create({
                        fileId: fileId,
                        requestBody: {
                            role: 'writer',
                            type: 'anyone',
                        },
                    });

                    drive.files.update({
                        fileId: fileId,
                        resource: fileMetadata,
                        media: media
                    }, (err, file) => {
                        if (err) {
                            // Handle error
                            console.error(err);
                        } else {
                            // no error update back permission
                            // drive.permissions.create({
                            //     fileId: fileId,
                            //     requestBody: {
                            //     role: 'viewer',
                            //     type: 'anyone',
                            //     },
                            // });

                            fs.rmSync("recyclableDataset.zip", { recursive: true, force: true })

                        }
                    });
                    res.redirect("/model/main")
                } catch (e) {
                    console.log(`Something went wrong. ${e}`);
                    res.redirect("/model/main")
                }
            })
            .on('error', err => {
                console.error('Error downloading file.');
                res.redirect("/model/main")
            })
            .pipe(dest);
    });



    //

})

module.exports = router