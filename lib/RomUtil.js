/**
 *  Main program for dealing with anything related to roms,saves,cheats, and bios.
 *  Currently only supports getting user details.
 *  TODO Need to figure out how to handle user switch/
 *  @author Lucas Showerman
 *  @date 10/30/2017
 */
const fs = require("fs-extra");
const logger = require('winston');
const path = require('path');
const xmljson = require('xmljson');
const date = require('date-and-time');
var userHome = path.join(path.sep, 'home', process.env.SUDO_USER, 'RetroPie')
var romDir = path.join(userHome, 'roms')
var cheatsDir = path.join(path.sep,'opt','retropie','configs','all','retroarch','cheats')
var biosDir = path.join(userHome,'BIOS')
var emuHome = path.join(path.sep, 'home', process.env.SUDO_USER, '.emulationstation')


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
 *                            Rom Functions                             *
 *                                                                      *
 ***********************************************************************/

var getName = function(romFile)
{
    var temp = romFile.replace(/\((.*)\)/g,'');
    return temp.substring(0,temp.lastIndexOf('.')).trim();
}

var createRom = function(emulator,name,dirTree,gameList)
{
    var gameData = gameList.find((game) => { return game.name == name });
    var rom = {}
    rom.name = name;
    rom.playcount = gameData == null ? 0 : gameData.playcount;
    rom.lastplayed = gameData == null ? null : gameData.lastplayed;
    rom.emulator = emulator;
    rom.memory = [];
    rom.states = [];
    rom.groupings = [];
    rom.dirTree = dirTree;
    rom.desc = gameData == null ? null : gameData.desc;
    rom.developer = gameData == null ? null : gameData.developer;
    rom.genre = gameData == null ? null : gameData.genre;
    rom.image = gameData == null ? null : gameData.image;
    rom.publisher = gameData == null ? null : gameData.publisher;
    rom.thumbnail = gameData == null ? null : gameData.thumbnail;
    rom.rating = gameData == null ? null : gameData.rating;
    rom.releasedate = gameData == null ? null : gameData.releasedate;
    rom.players = gameData == null ? 1 : gameData.players;

    dirTree.forEach(item => {
        if(item.search('.state') > 0)
        {
            rom.states.push(item);
        } else if(item.search('.srm') > 0)
        {
            rom.memory.push(item);
        }
    })
    return rom;
}

var loadRomDirectory = function(emulator,groupings,gameList)
{
    var promise = new Promise((resolve,reject) => {
        var roms = [];
        var results = [];
        fs.readdir(path.join(romDir,emulator,groupings.join(path.sep))).then(romFiles => {
            romFiles.forEach(romFile => {
                var name = getName(romFile);
                if(roms.indexOf(name) == -1)
                {
                    var dirTree = [];
                    if(name != '')
                    {
                        dirTree = romFiles.filter((rf) => {
                            return getName(rf) === name;
                        });
                        var rom = createRom(emulator,name,dirTree,gameList);
                        rom.groupings = groupings;
                        roms.push(name);
                        results.push(rom);
                    } else
                    {
                        groupings.push(romFile);
                        //loadRomDirectory()
                    }
                }
            })
            if(results.length == 1)
            {
                resolve(results[0]); 
            } else
            {
                resolve(results);
            }
        });
    })
    return promise;
}

var loadRom = function(emulator,romFile,gameList,dirTree)
{
    var promise = new Promise((resolve,reject) => {
        fs.lstat(path.join(romDir,emulator,romFile)).then(detail => {
            if(detail.isDirectory())
            {
                loadRomDirectory(emulator,[romFile],gameList).then(result => {
                    resolve(result);
                })
            } else
            {
                var name = romFile.substring(0,romFile.lastIndexOf('.'));
                var rom = createRom(emulator,name,dirTree,gameList);
                resolve(rom);
            }
        });
    })
    return promise;
}

var loadRoms = function(emulator,gameList)
{
    var promise = new Promise((resolve,reject) => {
        var roms = [];
        fs.readdir(path.join(romDir,emulator)).then(romFiles => {
            var promises = [];
            romFiles.forEach(romFile => {
                var add = false;
                var name = romFile.substring(0,romFile.lastIndexOf('.'));
                if(roms.indexOf(name) == -1)
                {
                    var dirTree = [];
                    if(name != '')
                    {
                        dirTree = romFiles.filter((rf) => { 
                            return rf.substring(0,romFile.lastIndexOf('.')) === name 
                        });
                        roms.push(name);
                    }
                    promises.push(loadRom(emulator,romFile,gameList,dirTree));
                }
            });
            Promise.all(promises).then((result) => {
                resolve(result);
            })
        });
    });
    return promise;
}

var getRoms = function(options)
{
    //console.log(options);
    options.emulators = JSON.parse(options.emulators);
    var promise = new Promise((resolve,reject) => {
        fs.readdir(romDir).then(emulators => {
            var promises = [];
            emulators.forEach(emulator => {
                var emu = options.emulators.find((emu) => { return emu.name == emulator });
                if(options.emulators[0].name == "All")
                {
                    promises.push(loadRoms(emulator,options.emulators[0].gameList));
                } else if(emu != null)
                {
                    promises.push(loadRoms(emulator,emu.gameList));
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
    return promise;
}


/************************************************************************
 *                                                                      *
 *                         Emulator functions                           *
 *                                                                      *
 ***********************************************************************/

/**
 * Creates emulator object and if $emuHome/gamelists/$emulator/$gamelist file exists, then pull gameList.
 * 
 * @param emulator. The name of the emulator
 * @return emulator object containing the name and played gameList.
 *
 **/
var loadEmulator = function(emulator)
{
    var promise = new Promise((resolve,reject) => {
        var emu = {
            name: emulator,
            gameList: []
        }
        fs.exists(path.join(emuHome,'gamelists',emulator,'gamelist.xml')).then(exists => {
            if(exists)
            {
                fs.readFile(path.join(emuHome,'gamelists',emulator,'gamelist.xml')).then(data => {
                    xmljson.to_json(data.toString(),function (error, data) {
                        //console.log(data);
                        resolve(emu);
                        var keys = Object.keys(data.gameList.game);
                        if(keys[0] == "0")
                        {
                            keys.forEach(key => {
                                var game = data.gameList.game[key];
                                game.playcount = game.playcount == null ? null : Number(game.playcount);
                                game.lastplayed = game.lastplayed == null ? null : date.parse(game.lastplayed,'YYYYMMDDThhmmss');
                                emu.gameList.push(game)
                            })
                        } else
                        {
                            var game = data.gameList.game;
                            game.playcount = game.playcount == null ? null : Number(game.playcount);
                            game.lastplayed = game.lastplayed == null ? null : date.parse(game.lastplayed,'YYYYMMDDThhmmss');
                            emu.gameList.push(game)
                        }
                        resolve(emu);
                    })
                })
            } else
            {
                resolve(emu);
            }
        })
    });
    return promise;
}

/**
 *  If an emulator directory exists, then it will return the emulator.
 **/
var getEmulator = function(emulator)
{
    var promise = new Promise((resolve,reject) => {
        fs.lstat(path.join(romDir,emulator)).then(detail => {
            if(detail.isDirectory())
            {
                loadEmulator(emulator).then(emu => {
                    resolve(emu);
                })
            } else
            {
                resolve({name:emulator,gameList:[]});
            }
        })
    })
    return promise;
}

/**
 *   Searches through the romDir for all emulators, then returns the list.
 **/
var getEmulators = function() {
    var promise = new Promise((resolve,reject) => {
        fs.readdir(romDir).then(emulators => {
            var promises = [];
            emulators.forEach((emulator) => {
                promises.push(getEmulator(emulator));
            })
            Promise.all(promises).then(emus => {
                resolve(emus);
            }).catch(ex => {
                resolve(ex);
            })
        })
    });
    return promise;
}

module.exports.getRoms = getRoms;
module.exports.getEmulators = getEmulators;
module.exports.getUserDetails = getUserDetails;
