/**
 *  Main program for dealing with anything related to roms,saves,cheats, and bios.
 *  Currently only supports getting user details.
 *  TODO Need to figure out how to handle user switch/
 *  @author Lucas Showerman
 *  @date 10/30/2017
 */

const fse = require("fs-extra");
const logger = require('winston');
const path = require('path');
var getUserDetails = function() {
    var promise = new Promise((resolve, reject) => {
        var result = {};
        result.user = process.env.SUDO_USER;
        result.romDir = path.join('/', 'home', process.env.SUDO_USER, 'RetroPie', 'roms');
        fse.exists(result.romDir).then(exists => {
            result.exists = true;
            resolve(result);
        }).catch(exists => {
            result.exists = false;
            resolve(result);
        });
    });
    return promise;
}
module.exports.getUserDetails = getUserDetails;
