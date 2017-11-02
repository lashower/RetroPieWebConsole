/*
 * Promary utility for dealing with the MongoDB's RetroPie database.
 * @author Lucas Showerman
 * @date 10/30/2017
 */

const mongoose = require('mongoose');
const logger = require('winston');
/*
 * List of applications stored in the database
 * Expected Model:
 * {
 *  file: path,                 //The file path where we expect the installed app to be located. EX: /opt/retropie/emulators/atari800
 *  isSupported: true|false,    //Boolean true if the app is supported on the current OS/hardware.
 *                              //Not hooked in yet.
 *  name: 'App name',           //The name of the application. EX: retroarch, emulationstation, esthemes
 *  functions: ['String']       //List of function names available. We pull these from the sh files.
 *  modType: 'Mod Type'         //Essentially what folder in /RetroPie_Setup/scriptmodules is the installer script.
 *                              //EX: supplementary, emulators, admin, ports
 *  type: 'Type'                //The type of application pulled from the script. EX: config, core, driver, exp, main, opt
 *  flags: 'flags'              //The flags for install options. Will be used for isSupported later on. EXs: noinstclean !x86 !osmc !xbian !mali
 *  license: 'license'          //The license for the app. EX: MIT https://raw.githubusercontent.com/sselph/scraper/master/LICENSE
 *  description: 'desc'         //A description of the application.
 *  help: 'help text'           //Help text related to the application. EX: Steam Controller Driver from https://github.com/ynsta/steamcontroller
 *  installed: true|false       //Boolean true if file is installed. (file exists).
 *  release_date: date          //The date the application was last released. Currently set exectable file creation date.
 *  updated_at: date            //Last time the RetroPie-Setup script was updated.
 *  dependencies: []            //List of dependencies. Currently not used.
 *  gitURL: 'url'               //Location where the game can be pulled from. Currently not used.
 *  gitBranch: 'branch'         //The branch from the git repository to pull from. Currently not used.
 *
 */
var Apps = null;
//Same as Apps, but I use this because the "new Apps()" doesn't look clean.
var App = null;

/* List of RetroPie Executables, that are scheduled to run.
 * Expected Model:
 * {
 *  name: 'App name',       //Name of the application. EX: retroarch
 *  type: 'Script type',    //Type of script. Currently only 'sh' is allowed, but hoping to add js types
 *  command: 'command',     //The name of the command. EXs: depends,install,install_bin,configure
 *  priority: number,       //The priority you want this ran in. lower = more urgent. EX: 1
 *  params: []              //List of params to include. Currently not used, but will be useful for things
 *                          //like estheme's install_theme <theme name>
 *  state: 'command state'  //The state of the command's execution. EX: queued, executing, completed, failed
 *  error: 'error'          //Was supposed to be the error message from running. Currently we store everything in output. 
 *  output: 'string'        //The output from running the specified command. Hint: We write the output to 
 *                          // /Retropie-Setup/logs/<name>_<command>.log during execution.
 *  success: true|false     //Boolean true if command was completed successfully
 *  added_date: date        //The date the item was added to the queue.
 *  start_date: date        //When the command is actually executed.
 *  end_date: date          //When the command is finished executing.
 */
var Execs = null;
//Same as Execs, but I use this because new Execs() doesn't look clean.
var Exec = null;

/**
 *
 *   Function to load Local mongodb connection for RetroPie.
 *   Includes both Apps and Execs lists.
 *   TODO Add method to close connection on application exit/restart.
 **/
var loadConnection = function() {
    var promise = new Promise((resolve, reject) => {
        if (mongoose.connection.readyState in [mongoose.STATES.connected, mongoose.STATES.connecting]) {
            var promise = mongoose.connect('mongodb://localhost/RetroPie', {
                useMongoClient: true
            });
            mongoose.Promise = global.Promise;
            var db = mongoose.connection;
            db.on('error', console.error.bind(console, 'MongoDB connection error:'));
            if (Apps == null || Execs == null) {
                var AppSchema = new mongoose.Schema({
                    file: String,
                    isSupported: Boolean,
                    name: {
                        type: String,
                        required: true
                    },
                    functions: [],
                    modType: {
                        type: String,
                        required: true
                    },
                    type: String,
                    flags: String,
                    license: String,
                    description: String,
                    help: String,
                    installed: Boolean,
                    release_date: {
                        type: Date
                    },
                    updated_at: {
                        type: Date,
                        default: Date.now
                    },
                    dependencies: [],
                    gitURL: String,
                    gitBranch: String
                });
                Apps = mongoose.model('App', AppSchema);
                App = Apps;
                var ExecSchema = new mongoose.Schema({
                    name: {
                        type: String,
                        required: true
                    },
                    type: {
                        type: String,
                        default: 'sh'
                    },
                    command: {
                        type: String,
                        required: true
                    },
                    priority: {
                        type: Number,
                        default: 100
                    },
                    params: [],
                    state: {
                        type: String,
                        default: 'queued'
                    },
                    error: String,
                    output: String,
                    success: Boolean,
                    added_date: {
                        type: Date,
                        default: Date.now
                    },
                    start_date: {
                        type: Date
                    },
                    end_date: {
                        type: Date
                    }
                });
                Execs = mongoose.model('Execs', ExecSchema);
                Exec = Execs;
            }
            resolve();
        } else {
            resolve();
        }
    });
    return promise;
}

/**
 *  Method to close the connection to RetroPie.
 *  Currently not used.
 */
var closeConnection = function() {
    mongoose.connection.close();
}

/**
 *  Either updates an existing execution or adds a new one.
 */
var updateExec = function(exec) {
    logger.debug("DBUtil", "updateExec", "Updating", exec.name);
    var promise = new Promise((resolve, reject) => {
        logger.silly("DBUtil", "updateExec", exec);
        var callback = function(err, data) {
            if (err) {
                logger.warn("DBUtil", "updateExec", err);
                reject(err);
            } else {
                if (data == null) {
                    logger.debug("Creating new Exec");
                    var mExec = new Exec(exec);
                    mExec.save(function(err) {
                        if (err) {
                            logger.warn("DBUtil", "updateExec", err);
                            mExec.err = err;
                            reject(mExec);
                        } else {
                            logger.debug("DBUtil", "updateExec", mExec.name + " Added");
                            resolve(mExec);
                        }
                    });
                } else {
                    logger.silly("DBUtil", "updateExec", exec.name + " Updated");
                    resolve(data);
                }
            }
        }
        Execs.findOneAndUpdate({
            name: exec.name,
            command: exec.command
        }, exec, callback)
    });
    return promise;
}

/**
 *  Finds the latest execution to run in the DB Queue.
 *  OfType is currently not used, but will support js or sh later on.
 *  Orders by priority and added date.
 */
var getLatestExec = function(ofType) {
    var promise = new Promise((resolve, reject) => {
        if (ofType == null) {
            ofType = 'sh';
        }
        Execs.
        findOne({
            $and: [{
                type: ofType
            }, {
                success: null
            }, {
                state: {
                    $ne: 'completed'
                }
            }, {
                added_date: {
                    $lt: Date.now()
                }
            }]
        }).
        sort('priority').
        sort('added_date').
        then((data, err) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
    return promise;
}

/**
 *  Get a list of applications matching the params.
 *  While params is not usually used, it can be with REST hook.
 */
var getApps = function(params) {
    var promise = new Promise((resolve, reject) => {
        logger.debug("DBUtil", "getApps", "Getting applications");
        logger.debug("DBUtil", "getApps", 'params', params);
        Apps.find(params, function(err, apps) {
            if (err) {
                console.error(err);
                resolve();
            } else {
                resolve(apps);
            }
        });
    });
    return promise;
}

/**
 *  Update or insert an application. See App for model.
 */
var updateApp = function(app) {
    logger.silly("DBUtil", "updateApp", app.name);
    var callback = function(err, data) {
        if (err) {
            return console.error(err);
        } else {
            if (data == null) {
                logger.debug("DBUtil", "updateApp", "Creating new App");
                var mApp = new App(app);
                mApp.save(function(err) {
                    if (err) logger.warn("DBUtil", "updateApp", err);
                    else logger.debug("DBUtil", "updateApp", mApp.name + " Added");
                });
            } else {
                logger.silly("DBUtil", "updateApp", app.name + " Updated");
            }
        }
    }
    Apps.findOneAndUpdate({
        name: app.name
    }, app, callback)
}

/**
 *  Simple method for getting Apps list.
 */
function getAppObj() {
    return Apps;
}

/**
 *  Simple method for getting executables.
 */
function getExecObj() {
    return Execs;
}

//Currently we only load the connection on start.
//Do not know how to handle timeouts, which I have not ran into yet.
loadConnection();

module.exports.Execs = getExecObj;
module.exports.updateExec = updateExec;
module.exports.getLatestExec = getLatestExec;
module.exports.getApps = getApps;
module.exports.loadConnection = loadConnection;
module.exports.closeConnection = closeConnection;
module.exports.Apps = getAppObj;
module.exports.updateApp = updateApp;
