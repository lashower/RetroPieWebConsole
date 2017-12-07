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

var userHome = path.join(path.sep, 'home', process.env.SUDO_USER);
var rpHome = path.join(userHome, 'RetroPie')
var romDir = path.join(rpHome, 'roms')
var biosDir = path.join(rpHome,'BIOS')
var emuHome = path.join(userHome, '.emulationstation')
var cheatDir = path.join(userHome,".config","retroarch","cheats");
/**
 *
 * Retrieves user details like who is the current user and where they keep their roms.
 *
 **/
var getUserDetails = function() {
    var promise = new Promise((resolve, reject) => {
        var result = {};
        result.user = process.env.SUDO_USER;
        result.romDir = path.join('/', 'home', process.env.SUDO_USER, 'RetroPie', 'roms');
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
                cheat.enable = (results[key + "_enable"] === 'true');
                result.cheats.push(cheat);
            })
            resolve(result);
        });
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
        var stateDir = rom.directory;
        if(emulator.configs.savestates && emulator.configs.savestates != "default")
        {
            stateDir = emulator.configs.savestates;
        }
        promises.push(new Promise((resolve,reject) => {
            find.file(new RegExp(baseSearch + ".state(.*)"),stateDir,(files) => {
                resolve(files);
            }).error((err) => {
                reject(err);
            })      
        }))
        var saveDir = rom.directory;
        if(emulator.configs.saves && emulator.configs.saves != "default")
        {
            saveDir = emulator.configs.saves;
        }
        promises.push(new Promise((resolve,reject) => {
            find.file(new RegExp(baseSearch + ".srm(.*)"),saveDir,(files) => {
                resolve(files);
            }).error((err) => {
                reject(err);
            })
        }))
        var screenDir = rom.directory;
        if(emulator.configs.screenshots && emulator.configs.screenshots != "default")
        {
            screenDir = emulator.configs.screenshots;
        }
        promises.push(new Promise((resolve,reject) => {
            find.file(new RegExp(baseSearch + "(.*).png"),screenDir,(files) => {
                resolve(files);
            }).error((err) => {
                reject(err);
            })
        }))
        promises.push(new Promise((resolve,reject) => {
            find.file(new RegExp(baseSearch + "\.(.*[^srm,state,state][^0-9])"),rom.directory,(files) => {
                resolve(files);
            }).error((err) => {
                reject(err);
            })
        }))
        promises.push(new Promise((resolve,reject) => {
            find.file(new RegExp(rom.name + "(.*).cht$"),cheatDir,(files) => {
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
        }));

        Promise.all(promises).then(results => {
            rom.states = [];
            rom.memory = [];
            rom.screenshots = [];
            rom.relatedFiles = [];
            rom.cheats = [];
            results[0].forEach(state => {
                rom.states.push({path:state,name:path.basename(state)})
            })
            results[1].forEach(mem => {
                rom.memory.push({path:mem,name:path.basename(mem)})
            })
            results[2].forEach(pic => {
                rom.screenshots.push({path:pic,name:path.basename(pic)});
            });
            results[3].forEach(other => {
                if(other != rom.file)
                {
                    rom.relatedFiles.push({path:other,name:path.basename(other)});
                }
            });
            results[4].forEach(cheat => {
                rom.cheats.push(cheat);
            });
            
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
            fs.readdir(romDir).then(emulators => {
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

            XMLUtil.toXMLFile({'gameList': { 'game': emulator.gameList }},path.join(emuHome,'gamelists',emulator.name,'gamelist.xml')).then(result => {
                resolve(result);
            }).catch(result => { reject(result) });
        });
    });
    return promise;
}

var addGameImage = function(file,game)
{
    var promise = new Promise((resolve,reject) => {
        var moveFile = path.join(emuHome,'downloaded_images',game.emulator,game.name+path.extname(file.name));
        fs.ensureDir(path.dirname(moveFile)).then(() => {
            fs.chmod(file.path,777).then(() => {
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
                result.saves = obj.savefile_directory ? obj.savefile_directory.replace(/"/g,"").replace("~",userHome) : result.saves;
                result.savestates = obj.savestate_directory ? obj.savestate_directory.replace(/"/g,"").replace("~",userHome) : result.savestates;
                result.screenshots = obj.screenshot_directory ? obj.screenshot_directory.replace(/"/g,"").replace("~",userHome) : result.screenshots;
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
        fs.exists(path.join(emuHome,'gamelists',emulator.name,'gamelist.xml')).then(exists => {
            if(exists)
            {
                XMLUtil.toJSON(path.join(emuHome,'gamelists',emulator.name,'gamelist.xml')).then(data => {
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
        logger.debug('Getting emulators');
        var promises = [];
        promises.push(XMLUtil.toJSON(path.join(path.sep,'etc','emulationstation','es_systems.cfg')));
        promises.push(getEmuExtras());
        Promise.all(promises).then(results => {
            var emulators = results[0].systemList.system;
            var res = emulators.map(x => Object.assign(x, results[1].find(y => y.name == x.name)));
            resolve(res);
        }).catch(ex => { 
            logger.error('failed',ex);
            reject(ex) 
        });
    });
    return promise;
}

module.exports.addGameImage = addGameImage;
module.exports.updateGameInfo = updateGameInfo;
module.exports.getGameList = getGameList;
module.exports.loadRoms = loadRoms;
module.exports.getRoms = getRoms;
module.exports.getEmulators = getEmulators;
module.exports.getUserDetails = getUserDetails;
