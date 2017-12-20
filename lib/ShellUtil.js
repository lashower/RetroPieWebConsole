/**
 *
 * Primary utility for running Application executables through /RetroPie=Setup/retropie_packages.sh
 * @Author: Lucas Showerman
 * @date: 10/30/2017
 *
 */
const spawn = require("child_process").spawn;
const readline = require('readline');
const fs = require('fs-extra');
const path = require('path');
const Queue = require('promise-queue')
const DBUtil = require('./DBUtil');
const logger = require('winston');
const http = require('http');

/*****************************
 *
 * Set common variables.
 *
 ****************************/
//How many things we can run at once.
var maxConcurrent = 1;
//How many items we can add to the que.
var maxQueue = Infinity;
//The que item for running commands
var que = new Queue(maxConcurrent, maxQueue);
var emudir = "";
var configdir = "";

/**************************************
 *
 * Simple helpers for parsing files
 *
 *************************************/
/**
 *    Pulls the value from a "property" in a shell script.
 *   @param line The line containing the name. EX: rp_module_id="retroarch"
 *   @return The pulled value. EX: retroarch
 **/
var pullVal = function(line) {
    return line.split("=")[1].trim().split('"').join("").trim()
}

var hasBinaries = function(app)
{
    var promise = new Promise((resolve,reject) => {
        var options = {method: 'HEAD', host: 'files.retropie.org.uk', port: 80, path: '/binaries/jessie/rpi3/' + app.modType + '/' + app.name + '.tar.gz'}
        var req = http.request(options, function(r) {
            resolve(r.statusCode == 200);
        });
        req.end();
    });
    return promise;
}

/**
 * This checks the database que to see if there is anything needing to be executed.
 * If there is, will add it to the local que.
 */
var runNext = function() {
    if (que.pendingPromises == 0) {
        //Check the database for any commands in the queue.
        DBUtil.getLatestExec('sh').then(result => {
            if (result != null) {
                logger.debug('ShellUtil', 'runNext', '\tExecution Found');
                //Create a temp variable for updating. Seems it doesn't like it when you reuse existing items.
                //Probably related to __id. Should research this more.
                var exec = {};
                exec.name = result.name;
                exec.command = result.command;
                exec.type = result.type;
                exec.priority = result.priority;
                exec.params = result.params;
                exec.state = 'executing';
                exec.added_date = result.added_date;
                exec.start_date = Date.now();
                //State that we are executing the item.
                DBUtil.updateExec(exec).then(() => {
                    //Run the execution (Install the app).
                    execute(exec).then(() => {
                        logger.debug('ShellUtil', 'runNext', '\tFinished cron item', exec.name, exec.command)
                    }).catch((err) => {
                        logger.warn('ShellUtil', 'runNext', '\tFailed cron item', exec.name, exec.command)
                    });
                });
            }
        }).catch(err => {
            logger.warn('ShellUtil', 'runNext', 'Failed to get the latest Exec', err);
        });
    }
}

//We check to see if there are things to run every 10 seconds.
setInterval(runNext, 10 * 1000);

/**
 *   Init function for loading the RetroPie-Setup Version and the RetroArch Folder.
 *   If RetroArch directory variable (rootdir) is not found, then it will reject.
 *   @return Returns a promise for use after the values are loaded.
 **/
var init = function() {
    logger.debug("ShellUtil", "init", "Starting",path.join(process.env.RPSHOME,"retropie_packages.sh"));
    var promise = new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: fs.createReadStream(path.join(process.env.RPSHOME, "retropie_packages.sh"))
        });
        rl.on('line', function(line) {
            if (line.match(/__version=(.*)/) != null) {
                process.env.RPSVERSION = pullVal(line);
            } else if (line.match(/rootdir=(.*)/) != null) {
                process.env.RAHOME = pullVal(line);
                emudir = path.join(process.env.RAHOME,'emulators');
                configdir = path.join(process.env.RAHOME,'configs');
            }
            if (process.env.RPSVERSION != null && process.env.RAHOME != null) {
                rl.close()
            }
        });
        rl.on('close', () => {
            if (process.env.RAHOME == null || process.env.RAHOME == "") {
                reject("RetroArch home folder not found in retropie_packages.sh");
            } else {
                resolve();
            }
        });
        logger.debug("ShellUtil", "init", "Exiting");
    });
    return promise
}

/**
 *  Add a command to the Database que.
 *  We use a DB que in case of computer restart or if they kill RetroPie Web Console.
 *  @params Details about what needs to be executed. Currently supports: { name, command, priority }
 *  TODO Add added_date override so you can run things whenever.
 *
 */
var addCommand = function(params) {
    var app = JSON.parse(params.app);
    var promise = new Promise((resolve, reject) => {
        var exec = {};
        exec.name = app.name;
        //Will add js hook later. Currently nothing is running js.
        exec.type = 'sh';
        exec.command = params.command;
        exec.priority = params.priority != null ? params.priority : 10;
        exec.params = [];
        exec.state = 'queued'
        exec.error = ''
        exec.output = ''
        exec.success = null
        exec.added_date = Date.now();
        exec.start_date = null;
        exec.end_date = null;
        //Update Exec does both inserts and updates. 
        DBUtil.updateExec(exec).then((result) => {
            resolve(result);
        }).catch(err => {
            exec.error = err;
            reject(exec);
        });
    });
    return promise;
}

/**
 *   Creates a retropie_packages.sh command execution with promise.
 *   @param command The command to execute. EX: retroarch install_bin
 *   @return Returns a promise that will return the output, and possibly the error details.
 **/
var createCommand = function(exec, command) {
    var file = path.join(process.env.RPSHOME, 'retropie_packages.sh');
    var promise = new Promise((resolve, reject) => {
        var result = {
            stdout: "",
            stderr: "",
            error: ""
        }
        var f;
        if (exec.isFull == true) {
            f = path.join(process.env.RPSHOME, 'logs', exec.name + "_full.log");
        } else {
            f = path.join(process.env.RPSHOME, 'logs', exec.name + "_" + command + ".log");
        }
        fs.mkdirsSync(path.join(process.env.RPSHOME, 'logs'));
        var out = fs.openSync(f, 'a');
        var child = spawn(file, [exec.name, command], {
            cwd: process.env.RPSHOME,
            stdio: ['ignore', out, out]
        });
        child.on('close', (code) => {
            result.stdout = fs.readFileSync(f).toString();
            if ((exec.isFull == true && command == 'configure') || exec.isFull == null) {
                fs.unlink(f).catch(err => {
                    logger.warn("ShellUtil","createCommand","Unable to delete",f,err);
                });
            }
            logger.debug('ShellUtil', 'createCommand', 'Exit Code:', code);
            if (code == 0) {
                resolve(result);
            } else {
                /**try {
                   fs.unlinkSync(f);
                } catch (err) {};**/
                reject(result);
            }
        });
    })
    return promise;
}

/**
 * Used to run a full install like retropie_setup.sh does. Includes depends, install_bin, and configure.
 */
var executeFull = function(exec) {
    var list = [];
    list[0] = Object.assign({}, exec);
    list[0].command = 'depends';
    list[1] = Object.assign({}, exec);
    list[1].command = 'install_bin';
    list[2] = Object.assign({}, exec);
    list[2].command = 'configure'
    logger.debug("ShellUtil", "executeFull", "Starting");
    var promise = new Promise((resolve, reject) => {
        execute(list[0]).
        then(execute.bind(null, list[1])).
        then(execute.bind(null, list[2])).
        catch((details) => {
            //delete exec['isFull'];
            logger.debug("ShellUtil", "executeFull", "Execute Full Failure", details);
            updateResult(false, exec, details).
            then(() => {
                reject(details)
            }).
            catch((err) => {
                logger.warn("ShellUtil", "executeFull", 'update failed', err);
                reject(details)
            });
        });
    });
    return promise;
}

/**
 *
 * Update the DB result for the result for the exection.
 * @param success Boolean true if execution was successful.
 * @exec The executable object. See DBUtils for object mode.
 * @result The result from the execution.
 * TODO There is a bug when running fullIntall where the result has a result object.
 *      Need to figure out how it is doing that so we can use just result.stdout.
 *
 */
var updateResult = function(success, exec, result) {
    var promise = new Promise((resolve, reject) => {
        logger.debug("ShellUtil", 'updateResult', exec.name, exec.command);
        exec.success = success;
        if (success) {
            exec.state = "completed";
        } else {
            exec.state = "failed";
        }
        logger.debug('\t', 'State:', exec.state);
        exec.output = result.stdout;
        if (exec.output == null) {
            exec.output = result.result.stdout;
        }
        exec.end_date = Date.now();
        logger.debug("\t", "Calling DBUtil");
        DBUtil.updateExec(exec).
        then((detail) => {
            resolve(exec)
        }).
        catch(err => {
            logger.info("ShellUtil","updateResult", err);
            reject(exec)
        });
    });
    return promise;
}

/**
 *  Runs an execute. Also has a custom hook for running install if install_bin fails and vice versa.
 *  @exec The executable object containing the name, command and other details. See DBUtil.Execs for more info.
 *  @return A promise containing the command output.
 */
var execute = function(exec) {
    var promise = new Promise((resolve, reject) => {
        if (exec.command == 'fullInstall') {
            exec.isFull = true;
            executeFull(exec).then(result => {
                resolve(result)
            }).catch(details => {
                reject(details)
            });;
        } else {
            var command = exec.command;
            if (exec.alt_command != null) {
                logger.debug("ShellUtil", "Using alternative command", exec.alt_command);
                command = exec.alt_command;
            }
            logger.debug("ShellUtil", "execute", "Executing", command, "for", exec.name);
            que.add(createCommand.bind(null, exec, command)).then(result => {
                if (!exec.isFull) {
                    logger.debug("ShellUtil", "execute", "Finished executing.");
                    updateResult(true, exec, result)
                    resolve(result);
                } else if (exec.command == "configure") {
                    logger.debug("ShellUtil", "execute", "Finished executing.");
                    exec.command = "fullInstall"
                    updateResult(true, exec, result)
                    resolve(result);
                } else {
                    resolve(result);
                }
            }).catch((result) => {
                if (exec.command == 'install' || exec.command == 'install_bin') {
                    logger.warn("ShellUtil","execute", "Failed executing ", exec.name, " ", exec.command);
                    var tryAnother = false;
                    if (exec.alt_command == null) {
                        exec.alt_command = exec.command == "install" ? "install_bin" : "install"
                        tryAnother = true;
                    }
                    if (tryAnother) {
                        logger.debug('ShellUtil', 'execute', 'Trying another', exec.alt_command);
                        execute(exec).then((res) => {
                            if (!exec.isFull) {
                                logger.debug('ShellUtil', 'execute', 'Alternative was successful');
                                updateResult(true, exec, res).
                                then((detail) => {
                                    logger.debug('ShellUtil', 'execute', 'Updating alternative result was successful');
                                    resolve(res);
                                }).
                                catch((err) => {
                                    logger.debug('ShellUtil', 'execute', 'Updating alternative result failed', err);
                                    reject(res)
                                });
                            } else {
                                logger.debug('ShellUtil', 'execute', "Skipping alternative update on full install");
                                resolve(res);
                            }
                        }).catch(err => {
                            if (!exec.isFull) {
                                updateResult(false, exec, err).
                                then(() => {
                                    reject(err)
                                }).catch(() => reject(err));
                            } else {
                                logger.debug('ShellUtil', 'execute', "Failed alternative");
                                reject(err);
                            }
                        });
                    } else {
                        updateResult(false, exec, result).then(() => reject({
                            'result': result
                        })).catch(() => reject({
                            'result': result
                        }));
                    }
                } else if (exec.isFull) {
                    logger.warn("ShellUtil","execute", "Failed executing ", exec.name, " fullInstall");
                    exec.command = "fullInstall";
                    updateResult(false, exec, result).then(() => reject(result)).catch(() => {
                        logger.warn('ShellUtil', 'execute', "failed update");
                        reject(result)
                    });
                } else {
                    updateResult(false, exec, result).then(() => reject(result)).catch(() => {
                        logger.warn('ShellUtil', 'execute', "failed update");
                        reject(result)
                    });
                }
            });
        }
    });
    return promise;
}

/**
 * Reads a shell file for certain properties and then updates the database with the values.
 *
 **/
var readFile = function(folder,file)
{
    var promise = new Promise((resolve,reject) => {
        var scriptModules = path.join(process.env.RPSHOME,"scriptmodules");
        fs.readFile(path.join(scriptModules, folder, file)).then(result => {
            var app = {
                file:path.join(process.env.RAHOME, folder, file),
                modType: folder
            };
            var text = result.toString();
            text.match(/rp_module_(.*)=(.*)\n/g).forEach(item => {
                app[item.split('=')[0].replace('rp_module_','')] = pullVal(item);
            })
            app.name = app['id'] ? app['id'] : null;
            app.type = app['section'] ? app['section'] : null;
            app.license = app['licence'] ? app['licence'] : '';
            app.description = app['desc'] ? app['desc'] : '';
            app.help = app['help'] ? app['help'] : '';
            app.help = app.help.replace(/\$home/g,process.env.USER_HOME);
            app.help = app.help.replace(/\$datadir/g,process.env.DATA_DIRECTORY);
            app.help = app.help.replace(/\$biosdir/g,process.env.BIOS_DIRECTORY);
            app.help = app.help.replace(/\$romdir/g,process.env.ROM_DIRECTORY);
            app.help = app.help.replace(/\$emudir/g,process.env.EMU_DIRECTORY);
            app.help = app.help.replace(/\$configdir/g,process.env.CONFIG_DIRECTORY);
            delete app['id'];
            delete app['section'];
            delete app['desc'];
            if(app.name != null)
            {
                app.sites = [];
                app.functions = text.match(/function (.*)/g).filter(
                        func => { return func.search('_' + app.name) > 0 }).map(
                            func => { return func.split(' ')[1].split("_" + app.name)[0]});
                var git = text.match(/gitPullOrClone(.*)http(.*)/);
                if(git != null)
                {
                    git = 'http' + git[2].trim().replace('.git','').replace(/"/g,"");
                    app.gitURL = git;
                    app.sites.push(git);
                }
                fs.exists(path.join(process.env.RAHOME, app.modType, app.name)).then(exist => {
                    app.installed = exist;
                    fs.stat(path.join(scriptModules, folder, file)).then(stat => {
                        app.release_date = stat.mtime;
                        DBUtil.updateApp(app);
                        resolve(app);
                    })
                })
            } else
            {
                resolve({});              
            }
        });
    });
    return promise;
}


/**
 *  Searches for shell scripts in a scriptModule's folder.
 *  For each file, it runs the readFile function that updates the database.
 **/
var readFolder = function(folder)
{
    var promise = new Promise((resolve,reject) => {
        var scriptModules = path.join(process.env.RPSHOME,"scriptmodules");
        fs.lstat(path.join(scriptModules, folder)).then(stat => {
            if(stat.isDirectory())
            {
                fs.readdir(path.join(scriptModules, folder)).then(files => {
                    var promises = [];
                    files.forEach(file => {
                        if(file.search("\\.sh") > 0 || file.search("\\.js") > 0)
                        {
                            promises.push(readFile(folder,file));
                        }
                    });
                    Promise.all(promises).then((results) => {
                        resolve(results);
                    })
                })

            } else
            {
                resolve([]);
            }
        })
    })
    return promise;
}


/**
 *  Reviews the folders in scriptModules directory for applications.
 **/
var readScriptModules = function()
{
    var promise = new Promise((resolve,reject) => {
        var scriptModules = path.join(process.env.RPSHOME,"scriptmodules");
        fs.readdir(scriptModules).then(folders => {
            var promises = [];
            folders.forEach(folder => {
                promises.push(readFolder(folder));
            })
            Promise.all(promises).then(results => {
                resolve(results);
            })
        })
    })
    return promise;
}

/**
 *   Parses the RetroPie-Setup shell scripts for application data.
 *   This is how I update the database with what is in /RetroPie-Setup/scriptmodules
 **/
var parseFiles = function() {
    var promise = new Promise(function(resolve, reject) {
        init().then(readScriptModules.bind(null)).then((results) => { resolve(results) });
    })
    return promise;
}

var convertParam = function(params,key) {
   if(typeof params.specific[key] == 'object' && !(params.specific[key] instanceof Date))
   {
       return { $in: params.specific[key] };
   } else
   {
       return params.specific[key];
   } 
}

/**
 *   Pulls available que executables. Only reason this is here is because of que.pendingPromises.
 */
var getQue = function(params) {
    var promise = new Promise((resolve, reject) => {
        var query = {}
        if(params != null && params.specific != null)
        {
            if(typeof params.specific == "string")
            {
                params.specific = JSON.parse(params.specific);
            }
            var keys = Object.keys(params.specific);
            if(keys.length > 1)
            {
                query['$and'] = [];
                keys.forEach(key => {
                    if(key == 'minDate')
                    {
                        query['$and'].push({ added_date : { $gt: params.specific[key] } });
                    } else if(key == 'maxDate')
                    {
                        query['$and'].push({ added_date : { $lt: params.specific[key] }});
                    } else
                    {
                        query[key] = convertParam(params,key);
                    }
                });
                if(query['$and'].length == 0)
                {
                    delete query['$and']
                } else if(query['$and'].length == 1)
                {
                    query['added_date'] = query['$and'][0].added_date;
                    delete query['$and']
                }
                logger.debug('ShellUtil','getQue','query=',query);
            } else
            {
                var key = keys[0];
                query[key] = convertParam(params,key);
            }
        } else {
            var date = new Date()
            date.setDate(date.getDate() - 1);
            query = {
                $and: [{
                    added_date: {
                        $lt: Date.now()
                    }
                }, {
                    added_date: {
                        $gt: date
                    }
                }, {
                    state: {
                        $ne: 'cancelled'
                    }
                }]
            }
        }
        DBUtil.Execs().find(query).
        sort('priority').
        sort('added_date').
        then((data, err) => {
            var result = {};
            result.pendingPromises = que.pendingPromises;
            result.items = data;
            resolve(result);
        })
    });
    return promise;
}

module.exports.addCommand = addCommand;
module.exports.getQue = getQue;
module.exports.init = init
module.exports.parseFiles = parseFiles;
