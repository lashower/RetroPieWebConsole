//const os = require('os');
const spawn = require('child_process').spawn;
const childProcess = require('child_process');
const pify = require('pify');
const memStat = require('mem-stat');
const logger = require('winston');
//const psList = require('ps-list');
const find = require('find');
const fs = require('fs-extra');
const path = require('path');

const TEN_MEGABYTE = 1000 * 1000 * 10;

var appFilter = function(app)
{
    return true;
    if(app.cmd.toUpperCase().search('RETRO') >0 && app.name != 'sh' && app.cmd.search('/bin/sh') && app.cpu > 0)
    {
        if(app.cmd.search('bash') >= 0 && !app.cmd.search('retropie_packages.sh') == -1)
        {
            return false;
        }
        return true;
    } else
    {
        return false;
    }
}


var psList = function(filter=null) {
    var opts = {};
    if(filter == null)
    {
        filter = {};
        filter.pid = null;
        filter.name = "(.*)";
        filter.cmd = "(.*)";
        filter.cpu = 0.0;
        filter.user = [process.env.USER];
        if(process.env.SUDO_USER)
        {
            filter.user.push(process.env.SUDO_USER)
        }
        filter.mem = 0.0;
    } else
    {
        filter.pid = (filter.pid == null) ? null : filter.pid;
        filter.name = (filter.name == null || filter.name == '') ? "(.*)" : filter.name;
        filter.cmd = (filter.cmd == null || filter.cmd == '') ? "(.*)" : filter.cmd;
        filter.cpu = (filter.cpu == null) ? 0 : filter.cpu;
        filter.user = (filter.user == null) ? ['pi'] : filter.user;
        filter.mem = (filter.mem == null) ? 0 : filter.mem;
    }
    const ret = {};
    const flags = (opts.all === false ? '' : 'a') + 'wwxo';
    return Promise.all(['user','comm', 'args', '%cpu','%mem'].map(cmd => {
        return pify(childProcess.execFile)('ps', [flags,`pid,${cmd}`], {
            maxBuffer: TEN_MEGABYTE
        }).then(stdout => {
            for (let line of stdout.trim().split('\n').slice(1)) {
                line = line.trim();
                const pid = line.split(' ', 1)[0];
                const val = line.slice(pid.length + 1).trim();

                if (ret[pid] === undefined) {
                    ret[pid] = {};
                }

                ret[pid][cmd] = val;
            }
        });
    })).then(() => {
        return Object.keys(ret).filter(x => {
            var pass = (ret[x].comm && ret[x].args);
            if(pass)
            {
                if(filter.pid != null && ret[x].pid != filter.pid)
                {
                    return false;
                } else
                {
                    pass = pass ? (filter.user.indexOf(ret[x].user) >= 0) : false;
                    pass = pass ? (ret[x].comm.search(filter.name) >= 0) : false;
                    pass = pass ? (ret[x]['%cpu'] >= filter.cpu) : false;
                    pass = pass ? (ret[x].args.search(filter.cmd) >= 0) : false;
                    pass = pass ? (ret[x]["%mem"] >= filter.mem) : false;
                }
            }
            return pass;
        }).map(x => {
            return {
                pid: parseInt(x, 10),
                name: path.basename(ret[x].comm),
                cmd: ret[x].args,
                cpu: ret[x]['%cpu'],
                user: ret[x]['user'],
                mem: ret[x]['%mem']
            };
        });
    });
}

var searchFiles = function(directory,expression)
{
    var promise = new Promise((resolve,reject) => {
        var results = [];
        find.file(new RegExp(expression),directory,(files) => {
            files.forEach(file => {
                results.push({path:file,name:path.basename(file)});
            })
            resolve(results);
        }).error((err) => {
            logger.error("Monitor","searchFiles",err);
            logger.debug("Monitor","searchFiles",directory,expression)
                resolve(results);
        })
    })
    return promise;  
}

var getLogs = function()
{
    var promise = new Promise((resolve,reject) => {
        var promises = [];
        promises.push(searchFiles("/dev/shm","runcommand(.*)"))
            promises.push(searchFiles("/home/pi/.emulationstation/","(.*)log(.*)"))
            promises.push(searchFiles("/root/.pm2/logs/","RetroPie(.*)"))
            Promise.all(promises).then(results => {
                var res = [];
                results.forEach(logs => {
                    logs.forEach(log => {
                        res.push(log);
                    })
                })
                resolve(res);
            }); 
    })
    return promise;
}

var getPIDs = function(data)
{
    var promise = new Promise((resolve,reject) => {
        psList().then(psds => {
            if(data != null)
            {
                data.pids = psds;
            } else
            {
                data = {pids:psds};
            }
            resolve(data);
        }).catch(err => {
            logger.error("Monitor","getPIDs",err);
        });
    });
    return promise;
}

var getFileSys = function(data)
{
    var promise = new Promise((resolve,reject) => {
        var child = spawn("df",["-kh"]);

        var result = "";
        var stderr = child.stderr.on('data', (data) => {
            logger.error("Monitor","getFileSys",data.toString());
        });

        var stdout = child.stdout.on('data', (data) => {
            result += data.toString();
        });

        var cl = child.on('close', (code) => {
            var rows = result.split('\n');
            var fsys = [];
            for(var i = 1; i < rows.length-1; i++)
            {
                if(rows[i].search('tmp') == -1)
                {
                    var cols = rows[i].split(/ +/);
                    var row = {};
                    row.fileSystem = cols[0];
                    row.size = cols[1];
                    row.used = cols[2];
                    row.available = cols[3];
                    row.used = cols[4];
                    row.mountedOn = cols[5];
                    fsys.push(row);
                }
            }
            if(data != null)
            {
                data.fileSystems = fsys;
            } else
            {
                data = {fileSystems:fsys};
            }
            resolve(data);
        });
    });
    return promise;
}

var getCPUTemp = function(data)
{
    var promise = new Promise((resolve,reject) => {
        fs.readFile(path.join(path.sep,'sys','class','thermal','thermal_zone0','temp')).then(result => {
            if(data != null)
            {
                data.cpuTemp =  Number(result)/1000;
            } else
            {
                data = {cpuTemp:(Number(result)/1000)};
            }
            resolve(data);
        });
    });
    return promise;
}

var getGPUTemp = function(data)
{
    var promise = new Promise((resolve,reject) => {
        var child = spawn("/opt/vc/bin/vcgencmd",["measure_temp"]);

        var result = "";
        child.stderr.on('data', (data) => {
            logger.error("Monitor","getGPUTemp",data.toString());
        });

        child.stdout.on('data', (data) => {
            result += data.toString();
        });

        child.on('close', (code) => {
            result = Number(result.split('=')[1].split("'")[0]);
            if(data != null)
            {
                data.gpuTemp = result;
            } else
            {
                data = {gpuTemp:result};
            }
            resolve(data)
        });
    });
    return promise;
}

var getCPUs = function(prev)
{
    var promise = new Promise((resolve,reject) => {
        var time = 0;
        if(prev != null)
        {
            time = 1000;
        }
        setTimeout(function () {
            var result = {full:""};

            fs.readFile(path.join(path.sep,'proc','stat')).then((data) => {
                result.full += data;
                result.items = result.full.split('\n').filter((row) => { return row.search('cpu') == 0})
                result.cores = [];
                for(var i = 0; i < result.items.length; i++)
                {
                    var item = result.items[i];
                    var core = {};
                    var cols = item.split(/ +/)
                        cols.shift();
                    if(i == 0)
                    {
                        core.name = "Total";
                    } else
                    {
                        core.name = "Core " + i;
                    }
                    core.idle = Number(cols[3]);
                    core.total = 0;
                    cols.forEach((value) => { core.total += Number(value)})
                        if(prev != null && prev.cores != null)
                        {
                            core.prevIdle = prev.cores[i].idle;
                            core.prevTotal = prev.cores[i].total;
                            core.diffIdle = core.idle-core.prevIdle;
                            core.diffTotal = core.total-core.prevTotal;
                            core.diffUsage = (1000*(core.diffTotal-core.diffIdle)/core.diffTotal+5)/10
                        }
                    result.cores.push(core);
                }
                resolve(result);
            });

        }, time)
    });
    return promise;
}



var getCPU = function() {
    var promise = new Promise((resolve,reject) => {
        getCPUs().then(getCPUs).then(result => { resolve(result.cores) });
    });
    return promise;
}


var getMem = function getMem(cpuDetail)
{
    var promise = new Promise((resolve,reject) => {
        var memDetail = {total:0,free:0,used:0}
        memDetail.total = memStat.total('MiB');
        memDetail.free = memStat.free('MiB');
        memDetail.used = memDetail.total - memDetail.free
            resolve({cpus:cpuDetail,memory:memDetail});
    });
    return promise;
}

var getBTConnections = function()
{
    var promise = new Promise((resolve,reject) => {
        var child = spawn("hcitool",['con']);
        var result = "";
        var child = spawn("hcitool",["-i",'hci0','con'])
            var stderr = child.stderr.on('data', (data) => {
                logger.error("Monitor","getBTConnections",data.toString());
            });
        var stdout = child.stdout.on('data', (data) => {
            result += data.toString();
        });
        var connections = [];
        var cl = child.on('close', (code) => {
            var cons = result.split('\n')
                for(var i = 1; i < cons.length-1;i++)
                {
                    connections.push(cons[i].split(/ +/)[2]);
                }
            resolve(connections);
        });
    })
    return promise;
}

var getBTConnInfo = function(device)
{
    var promise = new Promise((resolve,reject) => {
        var child = spawn("hcitool",['info',device]);
        var result = "";
        var stderr = child.stderr.on('data', (data) => {
            logger.error("Monitor","getBTConnInfo",data.toString());
        });
        var stdout = child.stdout.on('data', (data) => {
            result += data.toString();
        });
        var cl = child.on('close', (code) => {
            var lines = result.split('\n');
            var detail = {bdAddress:device};
            if(lines[2] && lines[2].split('Company: ')[1] != null)
            {
                detail.company = lines[2].split('Company: ')[1].trim();
            }
            if(lines[3]&& lines[3].split('Name: ')[1] != null)
            {
                detail.name = lines[3].split('Name: ')[1].trim();
            }
            if(lines[4] && lines[4].split("Version: ")[1] != null)
            {
                detail.lmpVersion = lines[4].split("Version: ")[1].split('Subversion:')[0].trim();
                detail.lmpSubVersion = lines[4].split('Subversion:')[1].trim();
            }
            if(lines[5] && lines[5].split('Manufacturer: ')[1] != null)
            {
                detail.manufacturer = lines[5].split('Manufacturer: ')[1].trim();
            }
            resolve(detail);
        });     
    });
    return promise;
}

var getConnectedDevices = function(data) {
    var promise = new Promise((resolve,reject) => {
        getBTConnections().then(devices => {
            Promise.all(devices.map((device) => {
                return getBTConnInfo(device);
            })).then(results => {
                if(data != null)
                {
                    data.btDevices = results;
                } else
                {
                    data = {btDevices:results};
                }
                resolve(data);
            })
        });

    });
    return promise;
}

var getStats = function()
{
    return getCPU().then(getMem).then(getCPUTemp).then(getGPUTemp).then(getFileSys).then(getPIDs).then(getConnectedDevices);
}
module.exports.getLogs = getLogs;
module.exports.psList = psList;
module.exports.getStats = getStats;
