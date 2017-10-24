const mongoose = require('mongoose');
const logger = require('winston');

var Apps = null;
var App = null;
var Execs = null;
var Exec = null;

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
*
*   Function to load Local mongodb connection for RetroPie
*
**/
var loadConnection = function() {
    var promise = new Promise((resolve,reject) => {
    if(mongoose.connection.readyState in [mongoose.STATES.connected,mongoose.STATES.connecting])
    {
        //console.log(mongoose.STATES[mongoose.connection.readyState]);
        var promise = mongoose.connect('mongodb://localhost/RetroPie', {useMongoClient: true});
        mongoose.Promise = global.Promise;
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'MongoDB connection error:'));
        if(Apps == null)
        {
            var AppSchema = new mongoose.Schema({
                    file:String, isSupported:Boolean,
                    name: {type: String, required: true},
                    functions:[],
                    modType: { type: String , required: true },
                    type:String, flags:String, license:String,
                    description:String, help:String, installed:Boolean,
                    release_date: { type: Date },
                    updated_at: { type: Date, default: Date.now },
                    dependencies: [], gitURL: String, gitBranch: String
            });
            Apps = mongoose.model('App', AppSchema);
            App = Apps;
            var ExecSchema = new mongoose.Schema({
                name: {type:String, required: true },
                type: {type:String, default:'sh'},
                command: {type:String, required: true},
                priority: {type:Number, default: 100},
                params:[],
                state: {type:String,default: 'queued'},
                error: String,
                output: String,
                success: Boolean,
                added_date: { type: Date, default: Date.now},
                start_date: { type: Date },
                end_date: {type: Date }
            });
            Execs = mongoose.model('Execs',ExecSchema);
            Exec = Execs;
        }
        resolve();
    } else
    {
        resolve();
    }
    });
    return promise;
}

var closeConnection = function() {
    mongoose.connection.close();
}

var updateExec = function(exec)
{
    var promise = new Promise((resolve,reject) => {
        logger.silly("updateExec",exec);
        var callback = function (err, data) {
            if (err) {
                logger.warn(err);
                reject(err);
            } else
            {
                if(data == null)
                {
                    logger.debug("Creating new Exec");
                    var mExec = new Exec(exec);
                    mExec.save(function(err){
                        if(err)
                        {
                            logger.warn(err);
                            mExec.err = err;
                            reject(mExec);
                        } else
                        {
                            logger.debug(mExec.name + " Added");
                            resolve(mExec);
                        }
                    });
                } else
                {
                    logger.silly(exec.name + " Updated");
                    resolve(data);
                }
            }
        }
        Execs.findOneAndUpdate({name:exec.name,command:exec.command},exec, callback)
    });
    return promise;
}

var getLatestExec = function(ofType) {
    var promise = new Promise((resolve,reject) => {
        if(ofType == null)
        {
            ofType = 'sh';
        }
        Execs.
            findOne({$and:[{type: ofType},{success: null},{state: { $ne:'completed'}},{added_date: {$lt:Date.now()}}]}).
            sort('priority').
            sort('added_date').
            then((data,err) => {
                if(err)
                {
                    reject(err);
                } else
                {
                    resolve(data);
                }
            });
    });
    return promise;
}

var getApps = function(params) {
    var promise = new Promise((resolve,reject) => {
        logger.debug("getApps","Getting applications");
        logger.debug("getApps",'params',params);

        Apps.find(params,function (err, apps) {
            if (err)
            {
                console.error(err);
                resolve();
            } else
            {
                resolve(apps);
            }
        });
    });
    return promise;
}

var updateApp = function(app)
{
    logger.silly("updateApp",app.name);
    var callback = function (err, data) {
          if (err) {
             return console.error(err);
          }
          else {
             if(data == null)
             {
                 logger.debug("Creating new App");
                 var mApp = new App(app);
                 mApp.save(function(err){
                     if(err)
                         logger.warn(err);
                     else
                         logger.debug(mApp.name + " Added");
                 });
             } else
             {
                logger.silly(app.name + " Updated");
             }
          }
    }
    Apps.findOneAndUpdate({name:app.name},app, callback)
}

function getAppObj() {
    return Apps;
}

function getExecObj() {
    return Execs;
}

loadConnection();
module.exports.Execs = getExecObj;
module.exports.updateExec = updateExec;
module.exports.getLatestExec = getLatestExec;
module.exports.getApps = getApps;
module.exports.loadConnection = loadConnection;
module.exports.closeConnection = closeConnection;
module.exports.Apps = getAppObj;
module.exports.updateApp = updateApp;
