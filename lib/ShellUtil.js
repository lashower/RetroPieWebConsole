//const exec = require("util").promisify(require("child_process").execFile);
const spawn = require("child_process").spawn;
const readline = require('readline');
const fs = require('fs-extra');
const path = require('path');
const Queue = require('promise-queue')
const DBUtil = require('./DBUtil');
const logger = require('winston');
const cron = require('node-cron');

var maxConcurrent = 1;
var maxQueue = Infinity;
var que = new Queue(maxConcurrent, maxQueue);
var scriptModules = process.env.RPSHOME + "/scriptmodules"

var runNext = function() {
    if(que.pendingPromises == 0)
    {
        DBUtil.getLatestExec('sh').then(result => {
            if(result != null)
            {
                var exec = {};
                exec.name = result.name;
                exec.command = result.command;
                exec.type = result.type;
                exec.priority = result.priority;
                exec.params = result.params;
                exec.state = 'executing';
                exec.added_date = result.added_date;
                exec.start_date = Date.now();
                DBUtil.updateExec(exec).then(() => {
                    execute(exec).then(() => logger.debug('finished cron item')).catch((err) => logger.debug(exec.name,' ',exec.command,'failed cron item'));
                });
            }
        }).catch(err => {
            console.log(err);
        });
    }
}

setInterval(runNext,10*1000);

/**
*   Pulls the value from a "property" in a shell script.
*   @param line The line containing the name. EX: rp_module_id="retroarch"
*   @return The pulled value. EX: retroarch
**/
var pullVal = function(line) {
    return line.split("=")[1].trim().split('"').join("").trim()
}

/**
*   Init function for loading the RetroPie-Setup Version and the RetroArch Folder.
*   If RetroArch directory variable (rootdir) is not found, then it will reject.
*   @return Returns a promise for use after the values are loaded.
**/
var init = function() {
    logger.debug("Initializing Shell Helper");
    var promise = new Promise((resolve,reject) => {
        const rl = readline.createInterface({
             input: fs.createReadStream(path.join(process.env.RPSHOME,"retropie_packages.sh"))
        });

        rl.on('line', function (line) {
            if(line.match(/__version=(.*)/) != null)
            {
                process.env.RPSVERSION = pullVal(line);
            } else if(line.match(/rootdir=(.*)/) != null)
            {
                process.env.RAHOME=pullVal(line)
            }
            if(process.env.RPSVERSION != "" && process.env.RAHOME != "")
           {
                rl.close()
            }
        });
        
        rl.on('close', () => {
            if(process.env.RAHOME == null || process.env.RAHOME == "")
            {
                reject();
            } else
            {
                resolve();
            }
        });
    });
    return promise
}

/**
 *  Add a command to the Database que.
 *  We use a DB que in case of computer restart or if they kill node.
 */
var addCommand = function(params)
{
    var app = JSON.parse(params.app);
    var promise = new Promise((resolve,reject) => {
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
var createCommand = function(exec,command)
{
    var file = path.join(process.env.RPSHOME,'retropie_packages.sh');
    var promise = new Promise((resolve,reject) => {
        var result = {stdout:"",stderr:"",error:""}
        var f;
        if(exec.isFull == true)
        {
            f = path.join(process.env.RPSHOME,'logs',exec.name+"_full.log");
        } else
        {
            f = path.join(process.env.RPSHOME,'logs',exec.name+"_"+command+".log");
        }
        fs.mkdirsSync(path.join(process.env.RPSHOME,'logs'));
        var out = fs.openSync(f,'a');
        var child = spawn(file,[exec.name,command],{
            cwd: process.env.RPSHOME,
            stdio: [ 'ignore', out, out ] 
        });
        /**child.stdout.on('data', function(data) {
            //logger.debug(data.toString());
            result.stdout += data.toString();
            //logger.debug(data.toString()); 
            logger.debug(result.stdout.length);
        });
        child.stderr.on('data', function(data) {
            //logger.warn(data.toString());
            result.stderr += data.toString();
            logger.warn(result.stderr.length);
        });**/
        child.on('close', (code) => {
            result.stdout = fs.readFileSync(f).toString();
            if((exec.isFull == true && command == 'configure') || exec.isFull == null)
            {
                fs.unlinkSync(f);
            }
            logger.debug('child process exited with code',code);
            if(code == 0)
            {
                resolve(result);
            } else
            {
                reject(result);
            }
        });
    })
    return promise;
}

var setResult = function(success,app,params,result)
{
    var response = {};
    response.app = app;
    logger.debug("execute","Finished Executing",params.command,"for",app.name);
    response.success = success;
    response.results = result.stdout;
    response.error = result.stderr;
    return response;
}

/*nd(null,list[1])).varexecuteFull = function(exec)
{
    logger.debug("executeFull","Starting");
    var promise = new Promise((resolve,reject) => {
        exec.command = "depends";
        execute(exec).then((result) => {
            exec.command = "install_bin";
            logger.debug("2");
            execute(exec).then(result => {
                exec.command = "configure";
                logger.debug("3");
                execute(exec).then(result => {
                    resolve(result);
                }).catch(details => {
                    logger.debug("3 failed");
                    reject(details);
                });
            }).catch(details => {
                logger.debug("2 failed");
                reject(details);
            });
        }).catch(details => {
            logger.debug("1 failed");
            reject(details);
        });
    });
    return promise;
}*/

var executeFull = function(exec)
{
    var list = [];
    list[0] = Object.assign({},exec);
    list[0].command = 'depends';
    list[1] = Object.assign({},exec);
    list[1].command = 'install_bin';
    list[2] = Object.assign({},exec);
    list[2].command = 'configure'
    logger.debug("executeFull","Starting");
    var promise = new Promise((resolve,reject) => {
        execute(list[0]).
        then(execute.bind(null,list[1])).
        then(execute.bind(null,list[2])).
        catch(details => {
            delete exec['isFull'];
            updateResult(false,exec,details).
            then(() => reject(details)).
            catch(() => {console.log('update failed');reject(details)});
        });
    });
    return promise;
}

var updateResult = function(success,exec,result) {
    var promise = new Promise((resolve,reject) => {
        exec.success = success;
        if(success)
        {
            exec.state = "completed";
        } else
        {
            exec.state = "failed";
        }
        exec.output = result.stdout;
        exec.error = result.stderr;
        exec.end_date = Date.now();
        DBUtil.updateExec(exec).
            then(resolve).
            catch(err => logger.info("updateResult",err));
    });
    return promise;
}

var execute = function(exec) {
    var promise = new Promise((resolve,reject) => {
        if(exec.command == 'fullInstall') 
        {
            exec.isFull = true;
            executeFull(exec).then(result => { resolve(result) }).catch(details => { reject(details)} );;
        } else
        {
            var command = exec.command;
            if(exec.alt_command != null)
            {
                logger.debug("Using alternative command",exec.alt_command);
                command = exec.alt_command;
            }
            logger.debug("execute","Executing",command,"for",exec.name);
            que.add(createCommand.bind(null,exec,command)).then(result => {
                if(!exec.isFull)
                {
                    logger.debug("execute","Finished executing.");
                    updateResult(true,exec,result)
                    resolve(result);
                } else if(exec.command == "configure")
                {
                    logger.debug("execute","Finished executing.");
                    exec.command = "fullInstall"
                    updateResult(true,exec,result)
                    resolve(result);
                } else
                {
                    resolve(result);
                }
            }).catch((result) => {
                if(exec.command == 'install' || exec.command == 'install_bin')
                {
                    logger.warn("execute","Failed executing ",exec.name," ",exec.command);
                    var tryAnother = false;
                    if(exec.alt_command == null)
                    {
                        exec.alt_command = exec.command == "install" ? "install_bin" : "install"
                        tryAnother = true;
                    }
                    if(tryAnother)
                    {
                        console.log('execute','Trying another');
                        execute(exec).then(res => {
                            updateResult(true,exec,res).then(() => resolve(exec)).catch((err) => reject({'exec':exec,'result':res}));
                        }).catch(err => {
                            updateResult(false,exec,err).then(() => reject(err)).catch(() => reject(err));
                        });
                    } else
                    {
                        updateResult(false,exec,result).then(() => reject({'result':result})).catch(() => reject({'result':result}));
                    }
                } else if(exec.isFull && exec.command == "configure")
                {
                    logger.warn("execute","Failed executing ",exec.name," fullInstall");
                    exec.command = "fullInstall";
                    updateResult(false,exec,result).then(() => reject(result)).catch(() => {console.log("failed update");reject(result)});
                } else
                {
                    updateResult(false,exec,result).then(() => reject(result)).catch(() => {console.log("failed update");reject(result)});
                }
            });
        }
    });
    return promise;
}

/**
*   Parses the RetroPie-Setup shell scripts for application data.
*   Then 
*
**/
var parseFiles = function() {
    var promise = new Promise(function(resolve,reject) {
        init().then(function() {
            fs.readdir(scriptModules, (err, folders) => {
                if(err)
                {
                    console.log(err)
                }
                folders.forEach(folder => {
                    if(fs.lstatSync(path.join(scriptModules,folder)).isDirectory())
                    {
                        fs.readdir(path.join(scriptModules,folder), (err2, files) => {
                            files.forEach(file => {
                                if(fs.lstatSync(path.join(scriptModules,folder,file)).isFile() && file.search(".sh") > 0)
                                {
                                    //logger.debug('Processing File',file);
                                    const rl = readline.createInterface({
                                         input: fs.createReadStream(path.join(scriptModules,folder,file))
                                    });
                                    var lines = [];
                                    var app = {};
                                    app.file=path.join(process.env.RAHOME,folder,file)
                                    app.isSupported = true
                                    app.name = ''
                                    app.functions = []
                                    app.modType = folder
                                    rl.on('line', function (line) {
                                        if(line.match(/^rp_module_(.*)=/) != null)
                                        {
                                            var val = pullVal(line);
                                            if(line.search('id=') > 0)
                                            {
                                                app.name = val;
                                            } else if(line.search('section=') > 0)
                                            {
                                                app.type = val;
                                            } else if(line.search('flags=') > 0)
                                            {
                                                app.flags = val;
                                            } else if(line.search('licence=') > 0)
                                            {
                                                app.license = val;
                                            } else if(line.search('desc=') > 0)
                                            {
                                                app.description = val;
                                            } else if(line.search('help=') > 0)
                                            {
                                                app.help = val
                                            }
                                        } else if(line.search('function') != -1 && line.search(app.name) > 0)
                                        {
                                            var val = line.split(' ')[1].split("_" + app.name)[0];
                                            if(!val.startsWith("_") && val != '')
                                            {
                                                app.functions.push(val);
                                            }
                                        }
                                    });
                                    rl.on('close',function(){
                                        if(fs.existsSync(path.join(process.env.RAHOME,app.modType,app.name)))
                                        {
                                            app.installed = true;
                                        } else
                                        {
                                            app.installed = false;
                                        }
                                        app.release_date = fs.statSync(path.join(scriptModules,folder,file)).mtime;
                                        DBUtil.updateApp(app);
                                    });
                                }
                            });
                        });
                    }
                });
            })
        })
    })
    return promise;
}

var getQue = function()
{
    var promise = new Promise((resolve,reject) => {
        var date = new Date()
        date.setDate(date.getDate()-1);
        DBUtil.Execs().find({$and:[{added_date: {$lt:Date.now()}},{added_date: {$gt:date}}]}).
            sort('priority').
            sort('added_date').
            then((data,err) => {
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
//module.exports.execute = execute;
module.exports.parseFiles = parseFiles;
