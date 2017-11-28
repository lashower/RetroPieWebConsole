/**
 *  Method to pull git repository for RetroPie-Setup, which the app needs to function.
 *  Might include other repositories at a later date.
 *  @author Lucas Showerman
 *  @date 10/30/2017
 */
const git = require('simple-git/promise');
const fs = require("fs-extra");
const logger = require('winston');
const path = require('path');
if (process.env.RPSHOME == null) {
    process.env.RPSHOME = '/RetroPie-Setup'
}

if (process.env.INCLUDE_EXTRA == null) {
    process.env.INCLUDE_EXTRA = true;
}

/**
 *  Method similar to RetroPie-Setup's helper.sh gitPullOrClone.
 *  @param directory The location you want to put the files or update from.
 *  @param repo The repo you want to clone from. Keep in mind it is not used for pull.
 *  @param branch The branch from the repo you want to use. Default: master
 **/
var gitPullOrClone = function(directory,repo,branch="master")
{
    var promise = new Promise((resolve,reject) => {

        if(branch == null || branch == "")
        {
            branch = "master";
        }
        var check = fs.pathExists(path.join(directory,'.git')).then(exist => {
            logger.debug("GitUtil","gitPullOrClone", "dir", directory, exist);
            var promise = null;
            if(exist)
            {
                logger.debug("GitUtil","gitPullOrClone","pulling update")
                    promise = git(directory).pull(null).
                    then(git(directory).submoduleUpdate.bind(null,['--init','--recursive']));
            } else
            {
                logger.debug("GitUtil","gitPullOrClone","cloning repository");
                var options = ['--recursive'];
                if(branch != 'master')
                {
                    options.push('--branch=' + branch);
                }
                promise = git().clone(repo,directory,options);
            }
            promise.then(result => {
                git(directory).status().then(result => { 
                    result.success = true;
                    result.name = repo.substring(repo.lastIndexOf('/')+1,repo.lastIndexOf('.'));
                    result.dir = directory;
                    result.branch = result.current;
                    result.url = repo;
                    git(directory).log().then(logDetail => {
                        result.date = logDetail.latest.date;
                        resolve(result);
                    }).catch(err => {
                        resolve(result);
                    });
                });
            }).catch(err => {
                var result = {};
                result.name = repo.substring(repo.lastIndexOf('/')+1,repo.lastIndexOf('.'));
                result.success = false;
                result.error = err;
                result.dir = directory;
                result.branch = branch;
                result.url = repo;
                reject(result);
            })
        })
    });
    return promise;
}

/**
 *   Updates the RetroPie-Setup scripts.
 **/
var updateScripts = function() {
    var promise = new Promise((resolve, reject) => {
        gitPullOrClone(process.env.RPSHOME,'https://github.com/RetroPie/RetroPie-Setup.git').
        then((res) => {
            if(process.env.INCLUDE_EXTRA)
            {
                var result = [res];
                gitPullOrClone('/RetroPie-Extra','https://github.com/zerojay/RetroPie-Extra.git').
                then(res2 => {
                    result.push(res2);
                    fs.copy(path.join('/RetroPie-Extra','scriptmodules'),path.join(process.env.RPSHOME,'scriptmodules')).then(cpResult => {
                        resolve(result);
                    }).catch(err => {
                        res2.error = "Unable to copy scriptmodules";
                        reject(result);
                    });
                }).catch(err => {
                    result.push(res2);
                    reject(result);
                });
            } else
            {
                resolve([res])
            }
        }).
        catch((err) => {
            logger.error("Update Scripts failed", err);
            reject([err]);
        });
    });
    return promise;
}

module.exports.gitPullOrClone = gitPullOrClone;
module.exports.updateScripts = updateScripts;
