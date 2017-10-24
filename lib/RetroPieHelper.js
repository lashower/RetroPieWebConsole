const spawn = require('child_process').spawn;
const fse = require("fs-extra");
const logger = require('winston');
const dateFormat = require('dateformat');
var temp = logger.remove(logger.transports.Console);
var temp = logger.add(logger.transports.Console, {'timestamp':function() {return dateFormat(Date(), "[mm-dd H:MM:ss]"); },'colorize':true});
logger.level = 'debug'
const DBUtil = require('./DBUtil');
const GitUtil = require('./GitUtil')
const ShellUtil = require('./ShellUtil')

if(process.env.RAHOME == null)
{
    process.env.RAHOME = ""
}
if(process.env.RPSVERSION == null)
{
    process.env.RPSVERSION = "";
}
if(process.env.USESHELL == null)
{
    process.env.USESHELL = true;
}

var scriptModules = process.env.RPSHOME + "/scriptmodules"

/******************************************************************************
*                                                                             *
*                                   Helper Functions                          *
*                                                                             *
******************************************************************************/

/**
*   Pulls the value from a "property" in a shell script.
*   @param line The line containing the name. EX: rp_module_id="retroarch"
*   @return The pulled value. EX: retroarch
**/
var pullVal = function(line) {
    return line.split("=")[1].trim().split('"').join("").trim()
}

/**
*   Checks to see if an object is empty or not.
*   @param obj The object to check properties in.
**/
var isEmpty = function(obj) {
    for(var key in obj) {
            if(obj.hasOwnProperty(key))
                return false;
        }
    return true;
}

/**
*   Logs Application details for quick analysis.
**/
var logAppDetails = function(app) {
    logger.debug("");
    logger.debug("logAppDetails","File",app.file);
    logger.debug("logAppDetails",'Name:',app.name);
    logger.debug("logAppDetails",'Type:',app.type);
    logger.debug("logAppDetails",'Functions:',app.functions);
    logger.debug("logAppDetails",'Installed:',app.installed);
}

/**
*   Checks to see if RetroPie-Setup is installed or not.
*   If not, it installs it.
*   @return A promise for use after install is finished.
**/
var checkInstalled = function() {
    var promise = new Promise(function(resolve,reject) {
        fse.pathExists(process.env.RPSHOME).then(exists => {
            if(!exists) {
                logger.debug(checkInstalled,"Creating RetroPie-Setup")
                GitUtil.updateScripts().then((res) => { resolve(res) }).catch(err => {console.log("updateScripts failed",err);reject(err)});
            } else
            {
                logger.debug("Already Exists");
                resolve();
            }
        })//.catch(err => {logger.error("checkInstalled failed",err);reject(err)})
    });
    return promise;
}

/**
*   Initialization for RetroPie js script.
*   Uses checkInstalled and also loads the RetroPie-Setup 
*   process.env.RPSVERSION and process.env.RAHOME (/opt/retroarch).
*   @return a promise for use after initialization is finished.
**/
var init = function() {
    var promise = new Promise(function(resolve,reject) {
        if(process.env.RAHOME == "")
        {
            //checkInstalled().then(() => { resolve()}).catch((err) => {reject(err) });
            checkInstalled().then(ShellUtil.init).then(() => { resolve()}).catch((err) => {reject(err) });
        } else
        {
            resolve();
        }
    });
    return promise;
}

var getApps = function(params) {
    var promise = DBUtil.loadConnection().then(DBUtil.getApps.bind(null,params));
    return promise;
}

var execute = function(params) {
    var promise = new Promise((resolve,reject) => {
        ShellUtil.addCommand(params).then(res => {
            logger.debug('executeHelper','success')
            resolve(res)
        }).catch(err => {
            logger.debug('executeHelper','failure')
            reject(err)
        });
    });
    return promise;
}

var updateCache = function() {
    return ShellUtil.parseFiles();
}

var performReboot = function(params) {
    var promise = new Promise((resolve,reject) => {
        logger.debug("performReboot");
        var result = {};
        var child;
        if(params.cancel)
        {
            logger.debug("performReboot","Cancelling");
            child = spawn('shutdown',['-c']);
        } else
        {
            logger.debug("performReboot","Shutting down");
            child = spawn('shutdown',['-r']);
        }
        child.stderr.on('data', (data) => {
            result.stderr = data.toString();
            logger.debug('stderr:',{stderr:data.toString()});
        });
        child.stdout.on('data', (data) => {
            logger.debug('stdout:',{stdout:data.toString()});
            result.stdout = data.toString();
        });
        child.on('close', (code) => {
            result.code = code;
            logger.debug('close',code);
            console.log(resolve(result));
        });
    });
    return promise;
}

var getQue = function()
{
    var promise = new Promise((resolve,reject) => {
        ShellUtil.getQue().then(result => {
            resolve(result);
        }).catch(err => {
            reject(err);
        })
    })
    return promise
}

module.exports.getQue = getQue
module.exports.init = init;
module.exports.loadConnection = DBUtil.loadConnection;
module.exports.updateCache = updateCache;
module.exports.getApps = getApps;
module.exports.execute = execute;
module.exports.updateScripts = GitUtil.updateScripts;
module.exports.performReboot = performReboot;
