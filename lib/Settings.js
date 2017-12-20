const fs = require('fs-extra');
const properties = require('properties');
const logger = require('winston');

var customSettings = {
    RPSHOME:'/RetroPie-Setup',
    INCLUDE_EXTRA:true,
    CURRENT_USER:"pi",
    USER_HOME:"/home/pi",
    DATA_DIRECTORY:"/home/pi/RetroPie",
    ROM_DIRECTORY:"/home/pi/RetroPie/roms",
    BIOS_DIRECTORY:"/home/pi/RetroPie/BIOS",
    EMULATION_HOME:"/home/pi/.emulationstation",
    CHEAT_DIR:"/home/pi/.config/retroarch/cheats",
    RETROARCH_HOME:"/opt/retropie",
    EMU_DIRECTORY:"/opt/retropie/emulators",
    CONFIG_DIRECTORY:"/opt/retropie/configs",
    RPS_GIT:"https://github.com/RetroPie/RetroPie-Setup.git",
    RP_EXTRA_GIT:"https://github.com/zerojay/RetroPie-Extra.git"
}

var initialLoad = function() {
    var promise = new Promise((resolve,reject) => {
        properties.parse('settings.properties',{path:true}, function(error, results) {
            var keys = (results != null) ? Object.keys(results) : [];
            keys.forEach(key => {
                if(typeof results[key] == 'string' && results[key].indexOf("${") >= 0)
                {
                    aliases = results[key].match(/\${(.*)}/g);
                    aliases.forEach(alias => {
                        results[key] = results[key].replace(alias,results[alias.substring(2,alias.length-1)]);
                    })
                }
                process.env[key] = results[key];
            })
            resolve();
        })
    });
    return promise
}

Object.keys(customSettings).forEach(key => {
    process.env[key] = customSettings[key];
});

initialLoad().then(() => { logger.debug('Settings','initialLoad','complete') });

var updateSettings = function(settings) {
    var promise = new Promise((resolve,reject) => {
        var fileUpdates = {};
        var setArray = [];
        if(settings.length != null)
        {
            setArray = settings;
        } else
        {
            Object.keys(settings).forEach(key => {
                setArray.push(settings[key]);
            });
        }
        setArray.forEach(setting => {
            var oldSetting = customSettings[setting.name];
            var update = (oldSetting == null);
            update = (update || oldSetting != setting.value);
            if(update)
            {
                fileUpdates[setting.name] = setting.value;
            }
            process.env[setting.name] = setting.value;
        });

        if(Object.keys(fileUpdates).length > 0)
        {
            var contents = properties.stringify(fileUpdates);
            fs.writeFile('settings.properties',contents).then(() => {
                var result = {success:true,updates:true,warnings:[]};
                var promises = [];
                Object.keys(fileUpdates).forEach(key => {
                    if(typeof fileUpdates[key] == 'string' && fileUpdates[key].indexOf('/') == 0)
                    {
                        promises.push(new Promise((resolve,reject) => {
                            fs.exists(fileUpdates[key]).then(exist => {
                                if(!exist)
                                {
                                    var warning = {target:key,text:"Directory/File does not exist"}
                                    resolve(warning);
                                } else
                                {
                                    resolve(null);
                                }
                            });
                        }));
                    }
                });
                Promise.all(promises).then(warnings => {
                    if(warnings != null)
                    {
                        result.warnings = warnings.filter(warn => { return warn != null });
                    }
                    resolve(result);
                });
            });
        } else
        {
            fs.remove('settings.properties').then(() => {
                resolve({success:true,updates:false})
            });
        }
    });
    return promise;
}

var getSettings = function() {
    var promise = new Promise((resolve,reject) => {
        var promises = [];
        Object.keys(customSettings).forEach(prop => {
            promises.push(new Promise((resolve,reject) => {
                var result = {name:prop};
                result['value'] = process.env[prop];
                if(typeof process.env[prop] == 'string' && process.env[prop].indexOf('/') == 0)
                {
                    result.type = 'file';
                    fs.exists(process.env[prop]).then(exists => {
                        result.exists = exists;
                        resolve(result);
                    }).catch(exists => {
                        result.exists = false;
                        resolve(result);
                    });
                } else
                {
                    resolve(result);
                }
            }));
        });
        Promise.all(promises).then(results => {
            resolve(results);
        });
    });
    return promise;
}

/**
 * 
 *  Retrieves user details like who is the current user and where they keep their roms.
 * 
 **/
var getUserDetails = function() {
    var promise = new Promise((resolve, reject) => {
        var result = {};
        result.user = process.env.CURRENT_USER;
        result.romDir = process.env.ROM_DIRECTORY;
        fs.exists(result.romDir).then(exists => {
            result.exists = true;
            resolve(result);
        }).catch(exists => {
            result.exists = false;
            resolve(result);
        });
    });
    return promise;
}

module.exports.getSettings = getSettings;
module.exports.getUserDetails = getUserDetails;
module.exports.updateSettings = updateSettings;
