/**
 *  Method to pull git repository for RetroPie-Setup, which the app needs to function.
 *  Might include other repositories at a later date.
 *  @author Lucas Showerman
 *  @date 10/30/2017
 */
const git = require('simple-git/promise');
const fse = require("fs-extra");
const logger = require('winston');
if (process.env.RPSHOME == null) {
    process.env.RPSHOME = '/RetroPie-Setup'
}

/**
 *   Check to see if the RetroPie-Setup folder exists.
 *   If the folder exists, then return a temp folder to overwrite the existing.
 *   If the temp folder exists, then it will be deleted.
 *   @return A promise that returns the directory to write to and if the primary folder is existing.
 **/
var checkRetroPieFolder = function() {
    logger.debug("checkRetroPieFolder", "Checking RetroPie Folder");
    var promise = new Promise((resolve, reject) => {
        var check = fse.pathExists(process.env.RPSHOME).then(exists => {
            logger.debug("checkRetroPieFolder", "rpshome", exists);
            if (!exists) {
                logger.debug("checkRetroPieFolder", "Using default location")
                resolve({
                    dir: process.env.RPSHOME,
                    existing: false
                })
            } else {
                logger.debug("checkRetroPieFolder", "Using temp folder");
                var temp = process.env.RPSHOME + "latest"
                var checkTmp = fse.pathExists(temp).then(exists => {
                    if (exists) {
                        logger.debug("checkRetroPieFolder", "Removing old temp folder");
                        fse.remove(temp).then(() => {
                            logger.debug("checkRetroPieFolder", "Temp folder removed.", temp);
                            resolve({
                                dir: temp,
                                existing: true
                            })
                        }).catch(err => {
                            logger.error("checkRetroPieFolder", "Failed to delete temp folder");
                            reject(err);
                        });
                    } else {
                        resolve({
                            dir: temp,
                            existing: true
                        })
                    }
                }).catch(err => {
                    logger.error("checkRetroPieFolder", 'Failed on temp check.');
                    reject(err);
                })
            }
        }).catch((err) => {
            logger.error("checkRetroPieFolder", "Failed on path check", process.env.RPSHOME);
            reject(err)
        })
    });
    return promise;
}

/**
*   Clones the RetroPie-Setup from github.
*   @param detail   Details regarding where the clone should exist.
*   @return A promise for user after the clone. Promise returns detail
            including the github url, branch, and maybe error.
**/
var cloneRetroPie = function(detail) {
    logger.debug("cloneRetroPie", "Cloning RetroPie-Setup to", detail.dir);
    var promise = new Promise(function(resolve, reject) {
        git().clone("https://github.com/RetroPie/RetroPie-Setup.git", detail.dir).then(() => {
            logger.debug("cloneRetroPie", "RetroPie-Setup cloned.")
            detail.url = "https://github.com/RetroPie/RetroPie-Setup.git";
            detail.branch = "master";
            resolve(detail);
        }).catch(err => {
            logger.debug("cloneRetroPie", "cloneRetroPie Failed");
            logger.debug("cloneRetroPie", err);
            detail.url = "https://github.com/RetroPie/RetroPie-Setup.git";
            detail.branch = "master";
            detail.error = err;
            reject(detail);
        })
    });
    return promise;
}

/**
*   Used to cleanup any RetroPie-Setup update.
*   @param detail   Contains details used for cleanup like if temp 
*                   folders need to be copied.
*   @return Returns a promise for use after cleanup is done. Includes 
            detail plus if cleanup was successful.
**/
var updateCleanup = function(detail) {
    logger.debug("updateCleanup", "Cleaning up RetroPie-Setup")
    var promise = new Promise(function(resolve, reject) {
        if (detail.existing) {
            logger.debug("updateCleanup", "Copying temp over existing");
            fse.copy(detail.dir, process.env.RPSHOME, {
                preserveTimestamps: true
            }).
            then(function() {
                detail.success = true;
                fse.remove(detail.dir).then(() => {
                    logger.debug("updateCleanup", 'RetroPie Setup update completed!');
                    detail.dir = process.env.RPSHOME;
                    resolve(detail);
                }).catch(err => {
                    logger.warn('Cleanup of temp failed');
                    detail.dir = process.env.RPSHOME;
                    resolve(detail);
                });
            }).catch(function(err) {
                logger.debug("updateCleanup", 'RetroPie Setup update failed!')
                detail.success = false;
                detail.error = err;
                detail.dir = process.env.RPSHOME;
                reject(detail);
            })
        } else {
            logger.debug("updateCleanup", 'RetroPie Setup update completed!')
            detail.success = true;
            resolve(detail);
        }
    })
    return promise;
}

/**
 *   Updates the RetroPie-Setup scripts.
 **/
var updateScripts = function() {
    var promise = new Promise((resolve, reject) => {
        checkRetroPieFolder().
        then(cloneRetroPie).
        then(updateCleanup).
        then((res) => {
            resolve(res)
        }).
        catch((err) => {
            logger.error("Update Scripts failed", err);
            reject(err);
        });
    });
    return promise;
}

module.exports.checkRetroPieFolder = checkRetroPieFolder;
module.exports.cloneRetroPie = cloneRetroPie;
module.exports.updateCleanup = updateCleanup;
module.exports.updateScripts = updateScripts;
