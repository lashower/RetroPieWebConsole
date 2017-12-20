/**
 *
 * Main helper for app.js.
 *
 * @author Lucas Showerman
 * @date 10/30/2017
 */
const spawn = require('child_process').spawn;
const fs = require("fs-extra");
const logger = require('winston');
const path = require('path');
const dateFormat = require('dateformat');
var temp = logger.remove(logger.transports.Console);
var temp = logger.add(logger.transports.Console, {
    'timestamp': function() {
        return dateFormat(Date(), "[mm-dd H:MM:ss]");
    },
    'colorize': true
});
logger.level = 'debug'
const DBUtil = require('./DBUtil');
const GitUtil = require('./GitUtil')
const ShellUtil = require('./ShellUtil')
if (process.env.RETROARCH_HOME == null) {
    process.env.RETROARCH_HOME = ""
}
if (process.env.RPSVERSION == null) {
    process.env.RPSVERSION = "";
}
if (process.env.USESHELL == null) {
    process.env.USESHELL = true;
}
var scriptModules = process.env.RPSHOME + "/scriptmodules"
/******************************************************************************
 *                                                                             *
 *                                   Helper Functions                          *
 *                                                                             *
 ******************************************************************************/

/**
 *   Logs Application details for quick analysis.
 **/
var logAppDetails = function(app) {
    logger.debug("");
    logger.debug("RetroPieHelper", "logAppDetails", "File", app.file);
    logger.debug("RetroPieHelper", "logAppDetails", 'Name:', app.name);
    logger.debug("RetroPieHelper", "logAppDetails", 'Type:', app.type);
    logger.debug("RetroPieHelper", "logAppDetails", 'Functions:', app.functions);
    logger.debug("RetroPieHelper", "logAppDetails", 'Installed:', app.installed);
}
/**
 *   Checks to see if RetroPie-Setup is installed or not.
 *   If not, it installs it.
 *   @return A promise for use after install is finished.
 **/
var checkInstalled = function() {
    var promise = new Promise(function(resolve, reject) {
        fs.pathExists(process.env.RPSHOME).then(exists => {
            if (!exists) {
                logger.debug("RetroPieHelper", "checkInstalled", "Creating RetroPie-Setup")
                GitUtil.updateScripts().then((res) => {
                    resolve(res)
                }).catch(err => {
                    logger.warn("RetroPieHelper", "checkInstalled", "GIT updateScripts failed", err);
                    reject(err)
                });
            } else {
                logger.debug("RetroPieHelper", "checkInstalled", "Already Exists");
                resolve();
            }
        })
    });
    return promise;
}

/**
 *   Initialization for RetroPie js script.
 *   Uses checkInstalled and also loads the RetroPie-Setup 
 *   process.env.RPSVERSION and process.env.RETROARCH_HOME (/opt/retroarch).
 *   @return a promise for use after initialization is finished.
 **/
var init = function() {
    var promise = new Promise(function(resolve, reject) {
        if (process.env.RETROARCH_HOME == "") {
            checkInstalled().then(ShellUtil.init).then(() => {
                resolve()
            }).catch((err) => {
                reject(err)
            });
        } else {
            resolve();
        }
    });
    return promise;
}

/**
 * Get the list of applications that can be installed.
 */
var getApps = function(params) {
    var promise = DBUtil.getApps(params);
    return promise;
}

/**
 *  Add an executable to the queue for execution.
 *  Keep in mind this does not execute immediately.
 *  Check out ShellUtil for more details.
 *  @exec The executable to add. See DBHelper for object model.
 */
var execute = function(exec) {
    var promise = new Promise((resolve, reject) => {
        ShellUtil.addCommand(exec).then(res => {
            logger.debug("RetroPieHelper", 'execute', 'success')
            resolve(res)
        }).catch(err => {
            logger.debug("RetroPieHelper", 'execute', 'failure')
            reject(err)
        });
    });
    return promise;
}

/**
 *  Updates the DB cache with what is located in the /RetroPie-Setup files.
 */
var updateCache = function() {
    return ShellUtil.parseFiles();
}

/**
 * Method to restart the computer or cancel restart.
 * Keep in mind, the shutdown command has a 1 minute wait.
 * @params  Specifies if you are cancelling or not.
 *
 */
var performReboot = function(params) {
    var promise = new Promise((resolve, reject) => {
        logger.debug("RetroPieHelper", "performReboot", 'Starting');
        var result = {};
        var options = [];
        if (params.cancel != null && params.cancel) {
            result.stdout = "The system shutdown has been cancelled.";
            logger.debug("RetroPieHelper", "performReboot", "Cancelling");
            options.push("-c");
        } else {
            logger.debug("RetroPieHelper", "performReboot", "Shutting down");
            options.push('-r');
        }
        logger.debug("RetroPieHelper", "performReboot",options);
        var child = spawn('shutdown',options);
        
        child.stderr.on('data', (data) => {
            result.stderr = data.toString();
        });

        child.stdout.on('data', (data) => {
            result.stdout = data.toString();
        });

        child.on('close', (code) => {
            if(code == 1 && params.cancel)
            {
                result.stdout = "";
            }
            result.code = code;
            logger.debug("RetroPieHelper",'performReboot', 'close', code);
            resolve(result);
        });
    });
    return promise;
}

/**
 * Updates the RetroPie-Setup scripts.
 * If webUpdate is true, then it will update my app as well.
 *
 */
var updateScripts = function(webUpdate) {
    var promise = new Promise((resolve, reject) => {
        GitUtil.updateScripts().then((result) => {
            if(webUpdate)
            {
                selfUpdate();
            }
            resolve(result);
        }).catch((result) => {
            if(webUpdate)
            {
                selfUpdate();
            }
            reject(result);
        });
    })
    return promise;
}

/**
 *  Calls the updater.sh script to update RetroPieWebConsole.
 *  Not fully tested yet. Big problem is making this run when my app is down.
 */
var selfUpdate = function() {
    fs.chmod('./updater.sh', 0777).then(() => {
        var child = spawn('./updater.sh', {
            stdio: ['ignore', 'ignore', 'ignore'],
            detached: true
        });
        child.unref();
    });
}

/**
 * Pulls the items from the Database Queue.
 * TODO Add filter options.
 */
var getQue = function(params) {
    var promise = new Promise((resolve, reject) => {
        ShellUtil.getQue(params).then(result => {
            resolve(result);
        }).catch(err => {
            reject(err);
        })
    })
    return promise
}

var killPid = function(pid) {
    var promise = new Promise((resolve,reject) => {
        var child = spawn('kill', ['-9', pid]);
        var result = {};
        child.stderr.on('data', (data) => {
            result.stderr = data.toString();
        });
        child.stdout.on('data', (data) => {
                result.stdout = data.toString();
        });
        child.on('close', (code) => {
            result.code = code;
            resolve(result);
        });
    });
    return promise;
}

var updateExec = function(details,exec) {
    var promise = new Promise((resolve,reject) => {
        exec = JSON.parse(exec);
        delete exec['__v'];
        delete exec['_id'];
        if(details == 'rerun')
        {
            exec.state = 'queued'
            exec.added_date = Date.now();
            exec.start_date = null;
            exec.end_date = null;
            exec.success = null;
            exec.output = "";
            DBUtil.updateExec(exec).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        } else if(details == "delete")
        {
            exec.state = "cancelled";
            DBUtil.updateExec(exec).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        } else if(details == "update")
        {
            DBUtil.pudateExec(exec).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        } else if(details == "escalate")
        {
            exec.priority = 0;
            DBUtil.updateExec(exec).then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
        }

    });
    return promise;
}

var getBuilds = function(params) {
    var promise = new Promise((resolve,reject) => {
        var retrobuilds = path.join(process.cwd(),'retrobuilds');
        fs.readdir(retrobuilds).then(files => {
            var promises = [];
            for(var i = 0; i < files.length; i++)
            {
                promises[i] = fs.readFileSync(path.join(retrobuilds,files[i]));
            }
            Promise.all(promises).then(results => {
                for(var i = 0; i < results.length; i++)
                {
                    results[i] = JSON.parse(results[i])
                }
                resolve(results);
            })
        })
    });
    return promise;
}

module.exports.getBuilds = getBuilds;
module.exports.updateExec = updateExec;
module.exports.killPid = killPid;
module.exports.getQue = getQue
module.exports.init = init;
module.exports.loadConnection = DBUtil.loadConnection;
module.exports.updateCache = updateCache;
module.exports.getApps = getApps;
module.exports.execute = execute;
module.exports.updateScripts = updateScripts;
module.exports.performReboot = performReboot;
