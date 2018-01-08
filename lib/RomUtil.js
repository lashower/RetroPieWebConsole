/**
 *  Main program for dealing with anything related to roms,saves,cheats, and bios.
 *  Currently only supports getting user details.
 *  TODO Need to figure out how to handle user switch
 *  @author Lucas Showerman
 *  @date 10/30/2017
 */
const fs = require("fs-extra");
const logger = require('winston');
const path = require('path');
const xmljson = require('xmljson');
const date = require('date-and-time');
const XMLUtil = require('./XMLUtil');
const find = require('find'); 
const properties = require('properties');
const Levenshtein = require('levenshtein');

/************************************************************************
 *                                                                      *
 *                           Private variables                          *
 *                                                                      *
 ************************************************************************/

/**
 *
 * Retrieves user details like who is the current user and where they keep their roms.
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

/************************************************************************
 *                                                                      *
 *                          String operations                           *
 *                                                                      *
 ***********************************************************************/

/**
 *
 * Converts a number string to a number.
 * Works for both decimals and integers.
 *
 **/
var toNumber = function(val,nulVal=null)
{
    return val ? Number(val) : nulVal;
}

/**
 *
 * Converts a date string to an actual date.
 *
 **/
var toDate = function(val,nulVal=null)
{
    return val ? date.parse(val,'YYYYMMDDThhmmss') : nulVal;
}

var toDateString = function(val)
{
    if(val == null)
    {
        return '';
    }
    var temp = Object.assign(val).toString();
    if(new Date(temp) != "Invalid Date")
    {
        temp = new Date(temp);
        return date.format(temp,'YYYYMMDDThhmmss');
    } else if(typeof val == "string")
    {
        return val;
    } else
    {
        return '';
    }
}


/**
 *  Converts null values to empty strings.
 **/
var setString = function(val,nulVal='')
{
    return val ? val : nulVal;
}

/**
 * Escapes charecters in a string for Regular Expression use.
 **/
var escapeRegExp = function(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}


/************************************************************************
 *                                                                      *
 *                            Rom Functions                             *
 *                                                                      *
 ***********************************************************************/

/**
 *  My method to get a pretty version of a game file.
 *  It removes everything in parenthesis.
 **/
var getName = function(romFile)
{
    var temp = path.basename(romFile.replace(/\((.*)\)/g,'')).replace(/\\_/g," ");
    return temp.substring(0,temp.lastIndexOf('.')).trim();
}

var loadCheats = function(file)
{
    logger.debug("RomUtil","loadCheats",file);
    var promise = new Promise((resolve,reject) => {
        var results = null;
        properties.parse(file,{ path: true }, function (error, results){
            var keys = new Set(Object.keys(results).filter(key => { return key.search('_') > 0}).map(key => { return key.split("_")[0] }));
            var result = {};
            result.file = file;
            result.name = path.basename(file);
            result.cheats = [];
            keys.forEach(key => {
                var cheat = {};
                cheat.desc = results[key + "_desc"].replace(/"/g,"");
                cheat.code = results[key + "_code"].replace(/"/g,"");
                cheat.enable = (results[key + "_enable"] === true);
                cheat.exists = true;
                result.cheats.push(cheat);
            })
            resolve(result);
        });
    });
    return promise;

}

var updateCheat = function(data)
{
    logger.debug("RomUtil","updateCheat",data.file);
    var promise = new Promise((resolve,reject) => {
        var cheats = {cheats:data.cheats.length}
        for(var i = 0; i < data.cheats.length; i++)
        {
            cheats["cheat" + i + "_desc"] = '"' + data.cheats[i].desc + '"';
            cheats["cheat" + i + "_code"] = '"' + data.cheats[i].code + '"';
            cheats["cheat" + i + "_enable"] = data.cheats[i].enable;
        }
        cheats = properties.stringify(cheats);
        fs.ensureDir(path.dirname(data.file)).then(() => {
            fs.chmod(path.dirname(data.file),'777').then((result) => { logger.debug(result) }).catch(err => { console.log(err) });
            fs.writeFile(data.file,cheats).then(() => {
                fs.chown(data.file,Number(process.env.SUDO_UID),Number(process.env.SUDO_UID)).then(() => {
                    resolve();
                }).catch(err => { reject(err) });
            }).catch(err => { reject(err) });
        });
    });
    return promise;

}

var checkDir = function(dir) {
    var promise = new Promise((resolve,reject) => {
        fs.exists(dir).then(exist => {
            if(!exist)
            {
                resolve(null);
            } else
            {
                fs.realpath(dir).then(result => {
                    resolve(result)
                });
            }
        });
    });
    return promise;
}

var searchFiles = function(directory,expression)
{
    var promise = new Promise((resolve,reject) => {
        var results = [];
        checkDir(directory).then(dir => {
            if(dir == null)
            {
                resolve(results)
            } else
            {
                find.file(new RegExp(expression),dir,(files) => {
                    files.forEach(file => {
                        results.push({path:file,name:path.basename(file)});
                    })
                    resolve(results);
                }).error((err) => {
                    logger.error("RomUtil","searchFiles",err);
                    logger.debug("RomUtil","searchFiles",directory,dir,expression);
                    resolve(results);
                })
            }
        })
    });
    return promise;
}


/**
 * Creates a ROM object containing things found in gameData.
 * All the values I set are found here: https://github.com/Aloshi/EmulationStation/blob/master/GAMELISTS.md
 **/
var createRom = function(emulator,file,gameData)
{
    var promise = new Promise((resolve,reject) => {
        var fileData = path.parse(file);
        logger.debug("RomUtil","createRom",emulator.name,fileData.name);
        var rom = gameData;
        if(rom == null)
        {
            rom = {playcount:0,players:"1"};
        }
        rom.name = rom.name ? rom.name : getName(file);
        rom.file = file;
        rom.path = rom.path ? rom.path : rom.file.replace(emulator.path,".");
        rom.emulator = emulator.name;
        rom.memory = [];
        rom.states = [];
        rom.groupings = [];
        rom.desc = setString(rom.desc);
        rom.developer = setString(rom.developer);
        rom.genre = setString(rom.genre);
        rom.image = rom.image ? rom.image : null;
        rom.publisher = setString(rom.publisher);
        rom.thumbnail = rom.thumbnail ? rom.thumbnail : null;
        rom.directory = fileData.dir;
        /* These were already loaded by the gameData lookup.
         * rom.rating = rom.rating ? rom.rating : null;
         * rom.releasedate = rom.releasedate ? rom.releasedate : null;
         * rom.players = gameData == null ? 1 : gameData.players;
         * */
        var promises = [];
        var baseSearch = escapeRegExp(fileData.name);
        var stateDir = (emulator.configs.savestates && emulator.configs.savestates != "default") ? emulator.configs.savestates : rom.directory;
        var saveDir = (emulator.configs.saves && emulator.configs.saves != "default") ? emulator.configs.saves : rom.directory;
        var screenDir = (emulator.configs.screenshots && emulator.configs.screenshots != "default") ? emulator.configs.screenshots : rom.directory;
        promises.push(searchFiles(stateDir,baseSearch + ".state(.*)"));
        promises.push(searchFiles(saveDir,baseSearch + ".srm(.*)"));
        promises.push(searchFiles(screenDir,baseSearch + "(.*).png"));
        promises.push(searchFiles(rom.directory,baseSearch + "\.(.*[^srm,state,state][^0-9])"));

        promises.push(new Promise((resolve,reject) => {
            checkDir(process.env.CHEAT_DIR).then(dir => {
                if(dir == null)
                {
                    resolve([]);
                } else
                {
                    //TODO What if cheat_dir does not exist?
                    find.file(new RegExp(baseSearch + "(.*)cht$"),process.env.CHEAT_DIR,(files) => {
                        var cheatProm = [];
                        files.forEach(file => {
                            cheatProm.push(loadCheats(file));
                        })
                        Promise.all(cheatProm).then(result => {
                            resolve(result);
                        });
                    }).error((err) => {
                        reject(err);
                    });
                }
            });
        }));

        Promise.all(promises).then(results => {
            rom.states = results[0];
            rom.memory = results[1];
            rom.screenshots = results[2];
            rom.relatedFiles = results[3];
            rom.cheats = results[4];
            if(rom.cheats.length == 0)
            {
                var cheat = {};
                cheat.file = path.join(process.env.CHEAT_DIR,emulator.name,fileData.name + ".cht");
                cheat.name = fileData.name + ".cht";
                cheat.cheats = [];
                cheat.exists = false;
                rom.cheats.push(cheat);
            }
            resolve(rom);
        })
    })
    return promise;
}

/**
 *
 * Loads all roms/games for a target emulator.
 *
 **/
var loadRoms = function(emulator,defaultConfig)
{
    var promise = new Promise((resolve,reject) => {
        logger.debug("RomUtil","loadRoms",emulator.name,emulator.path,emulator.extension);
        var promises = [getGameList(emulator)];
        promises.push(getRAConfig(emulator.name,defaultConfig));
        /* Ports has a ton of files, so we don't search recursively*/
        if(emulator.name == 'ports')
        {
            promises.push(new Promise((resolve,reject) => {
                var results = [];
                var extensions = emulator.extension.split(' ');
                fs.readdir(emulator.path).then(files => {
                    files.forEach(file => {
                        if(extensions.indexOf(path.extname(file)) != -1)
                        {
                            results.push(path.join(emulator.path,file));
                        }
                    });
                });
                resolve(results);
            }));
        } else
        {
            emulator.extension.split(' ').forEach(ext => {
                promises.push(new Promise((resolve,reject) => {
                    var reg = new RegExp("(.*)" + escapeRegExp(ext) + "$");
                    find.file(reg,emulator.path,(files) => {
                        resolve(files);
                    }).error((err) => {
                        reject(err);
                    })
                }));
            });
        }

        Promise.all(promises).then(result => {
            emulator = result[0];
            emulator.configs = result[1]
            var roms = [];
            var romProm = [];
            for(var i = 2; i < result.length; i++)
            {
                var coll = result[i];
                coll.forEach(romFile => {
                    var filePath = romFile.replace(emulator.path,'.');
                    var gameData = emulator.gameList.find((game) => { return game.path == filePath });
                    romProm.push(createRom(emulator,romFile,gameData));
                });
            }
            Promise.all(romProm).then(romsRes => {
                resolve(romsRes);
            })
        });
    });
    return promise;
}

/**
 *
 * Pulls roms/games for a list of emulators.
 * @param options Contains options regarding where to pull stuff.
 *                Currently only contains the list of emulators you 
 *                want to get.
 **/
var getRoms = function(options)
{
    options.emulators = JSON.parse(options.emulators);
    var promise = new Promise((resolve,reject) => {
        var defaultConfig = null;
        getRAConfig('all').then(result => {
            defaultConfig = result;
        }).then(() => {
            fs.readdir(process.env.ROM_DIRECTORY).then(emulators => {
                var promises = [];
                emulators.forEach(emulator => {
                    var emu = options.emulators.find((emu) => { return emu.name == emulator });
                    if(options.emulators[0].name == "All")
                    {
                        promises.push(loadRoms(emu,defaultConfig));
                    } else if(emu != null)
                    {
                        promises.push(loadRoms(emu,defaultConfig));
                    }
                });
                if(promises.length == 0)
                {
                    resolve([]);
                } else
                {
                    Promise.all(promises).then(results => {
                        resolve(results);
                    }).catch(results => {
                        resolve(results);
                    });
                }
            });
        });
    });
    return promise;
}

var updateGameInfo = function(game,emulator=null)
{
    var promise = new Promise((resolve,reject) => {
        if(emulator == null)
        {
            emulator = {name:game.emulator};
        }
        getGameList(emulator,false).then(emulator => {
            var validKeys = ['name','desc','image','thumbnail','rating',
            'releasedate','developer','publisher','genre',
            'players','playcount','lastplayed','path','favorite',
            'hidden','kidgame'];
            Object.keys(game).forEach(key => {
                if(validKeys.indexOf(key) == -1 || game[key] == null)
                {
                    delete game[key];
                } else if(typeof game[key] == 'number')
                {
                    game[key] = String(game[key])
                } else if(typeof game[key] == 'boolean')
                {
                    if(game[key])
                    {
                        game[key] = String(game[key]);
                    } else
                    {
                        delete game[key];
                    }
                }
            })

            game.releasedate = toDateString(game.releasedate);
            game.lastplayed = toDateString(game.lastplayed);
            var gIndex = emulator.gameList.findIndex(sGame => { return sGame.path == game.path });
            if(gIndex == -1)
            {
                emulator.gameList.push(game);
            } else
            {
                emulator.gameList[gIndex] = game;
            }

            XMLUtil.toXMLFile({'gameList': { 'game': emulator.gameList }},path.join(process.env.EMULATION_HOME,'gamelists',emulator.name,'gamelist.xml')).then(result => {
                resolve(result);
            }).catch(result => { reject(result) });
        });
    });
    return promise;
}

var fixPermissions = function(rootDir,fullPath)
{
    var promise = new Promise((resolve,reject) => {
        if(fullPath.search(rootDir) == -1)
        {
            resolve();
        } else
        {
            logger.debug("RomUtil","fixPermissions",fullPath);
            fs.chmod(fullPath,'755').then(() => {
                fs.chown(fullPath,Number(process.env.SUDO_UID),Number(process.env.SUDO_UID));
            });
            fixPermissions(rootDir,path.dirname(fullPath)).then(() => {
                resolve();
            });
        }
    });
    return promise;
}

var addGameImage = function(file,game)
{
    var promise = new Promise((resolve,reject) => {
        var moveFile = path.join(process.env.EMULATION_HOME,'downloaded_images',game.emulator,game.name+path.extname(file.name));
        fs.ensureDir(path.dirname(moveFile)).then(() => {
            fs.chmod(file.path,'777').then(() => {
                fs.chown(file.path,Number(process.env.SUDO_UID),Number(process.env.SUDO_UID)).then(() => {
                    fs.rename(file.path, moveFile).then(() => {
                        resolve({fileName:moveFile});
                    })
                })
            });
        });
    });
    return promise;    
}

var addGame = function(file,emulator,fileData)
{
    var promise = new Promise((resolve,reject) => {
        var dir = emulator.path;
        if(fileData.path)
        {
            dir = path.join(dir,path.dirname(fileData.path));
        }
        fs.ensureDir(dir).then(() => {
            fs.rename(file.path, path.join(dir,file.name)).then(() => {
                fixPermissions(path.join(process.env.ROM_DIRECTORY,emulator.name),path.join(dir,file.name)).catch(err => {
                    console.log("Unable to fix permissions for",path.join(dir,file.name),err);
                });
                resolve();
            })
        });
    });
    return promise;
}


/************************************************************************
 *                                                                      *
 *                         Emulator functions                           *
 *                                                                      *
 ***********************************************************************/

/**
 *
 * Retrieves RetroArch configs for the inputted emulator.
 *
 **/
var getRAConfig = function(emulator,defaults=null)
{
    var promise = new Promise((resolve,reject) => {
        properties.parse(path.join(path.sep,"opt","retropie","configs",emulator,"retroarch.cfg"),{ path: true }, function (error, obj){
            var result = {};
            if(defaults != null)
            {
                result.saves = defaults.saves;
                result.savestates = defaults.savestates;
                result.screenshots = defaults.screenshots;
            }
            if (error) {
                resolve(result);
            } else
            {
                result.saves = obj.savefile_directory ? obj.savefile_directory.replace(/"/g,"").replace("~",process.env.USER_HOME) : result.saves;
                result.savestates = obj.savestate_directory ? obj.savestate_directory.replace(/"/g,"").replace("~",process.env.USER_HOME) : result.savestates;
                result.screenshots = obj.screenshot_directory ? obj.screenshot_directory.replace(/"/g,"").replace("~",process.env.USER_HOME) : result.screenshots;
                resolve(result);
            }
        });
    });
    return promise;
}

/**
 *
 *  Pulls the game list from the gamelist.xml for an emulator.
 *  See https://github.com/Aloshi/EmulationStation/blob/master/GAMELISTS.md
 *
 **/
var getGameList = function(emulator,formatData=true)
{
    var promise = new Promise((resolve,reject) => {
        fs.exists(path.join(process.env.EMULATION_HOME,'gamelists',emulator.name,'gamelist.xml')).then(exists => {
            if(exists)
            {
                XMLUtil.toJSON(path.join(process.env.EMULATION_HOME,'gamelists',emulator.name,'gamelist.xml')).then(data => {
                    if(data.gameList.game.length == null)
                    {
                        var games = [];
                        games.push(data.gameList.game);
                        data.gameList.game = games;
                    }
                    if(formatData)
                    {
                        data.gameList.game.forEach(game => {
                            game.playcount = toNumber(game.playcount,0);
                            game.lastplayed = toDate(game.lastplayed);
                            game.releasedate = toDate(game.releasedate);
                            game.rating = toNumber(game.rating);
                            game.players = setString(game.players,'1');
                            game.favorite = Boolean(game.favorite);
                            game.hidden = Boolean(game.hidden);
                            game.kidgame = Boolean(game.kidgame);
                        })
                    }
                    emulator.gameList = data.gameList.game;
                    resolve(emulator);
                })
            } else
            {
                emulator.gameList = [];
                resolve(emulator);
            }
        })
    })
    return promise;
}

var getEmuExtras = function() {
    var promise = new Promise((resolve,reject) => {
        fs.readFile(path.join(process.cwd(),'extensions','emulators.json')).then(data => {
            resolve(JSON.parse(data.toString()));
        })
    });
    return promise;
}

/*
 *   Searches through the es_systems config file and returns the list of emulators.
 **/
var getEmulators = function() {
    var promise = new Promise((resolve,reject) => {
        var promises = [];
        logger.debug("RomUtil","getEmulators","Retrieving data from",path.join(path.sep,'etc','emulationstation','es_systems.cfg'));
        promises.push(XMLUtil.toJSON(path.join(path.sep,'etc','emulationstation','es_systems.cfg')));
        promises.push(getEmuExtras());
        Promise.all(promises).then(results => {
            var emulators = results[0].systemList.system;
            var res = emulators.map(x => Object.assign(x, results[1].find(y => y.name == x.name)));
            resolve(res);
        }).catch(ex => { 
            logger.error("RomUtil","getEmulators","failed",ex);
            reject(ex) 
        });
    });
    return promise;
}

module.exports.addGame = addGame;
module.exports.addGameImage = addGameImage;
module.exports.updateGameInfo = updateGameInfo;
module.exports.getGameList = getGameList;
module.exports.loadRoms = loadRoms;
module.exports.getRoms = getRoms;
module.exports.getEmulators = getEmulators;
module.exports.getUserDetails = getUserDetails;
module.exports.updateCheat = updateCheat;
