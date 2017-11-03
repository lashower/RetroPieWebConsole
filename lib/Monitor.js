//const os = require('os');
const spawn = require('child_process').spawn;
//const cpuStat = require('cpu-stat');
const memStat = require('mem-stat');
const psList = require('ps-list');

var appFilter = function(app)
{
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

var getPIDs = function(data)
{
    var promise = new Promise((resolve,reject) => {
        psList().then(psds => {
            var myApps = psds.filter(appFilter).map(pd => {
                if(pd.name != 'retroarch')
                {
                    pd.name = pd.cmd.substr(pd.cmd.lastIndexOf('/')+1);
                }
                return pd
            });
            if(data != null)
            {
                data.pids = myApps;
            } else
            {
                data = {pids:myApps};
            }
            resolve(data);
        })
    });
    return promise;
}

var getFileSys = function(data)
{
    var promise = new Promise((resolve,reject) => {
        var child = spawn("df",["-kh"]);

        var result = "";
        var stderr = child.stderr.on('data', (data) => {
            console.log('err',data.toString());
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
        var child = spawn("cat",["/sys/class/thermal/thermal_zone0/temp"]);

        var result = "";
        child.stderr.on('data', (data) => {
            console.log('err',data.toString());
        });

        child.stdout.on('data', (data) => {
            result += data.toString();
        });

        child.on('close', (code) => {
            if(data != null)
            {
                data.cpuTemp = Number(result)/1000;
            } else
            {
                data = {cpuTemp:(Number(result)/1000)};
            }
            resolve(data)
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
            console.log('err',data.toString());
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
            var child = spawn("cat",["/proc/stat"])

                var err = child.stderr.on('data', (data) => {
                    console.log('err',data.toString());
                });

            var out = child.stdout.on('data', (data) => {
                result.full += data;
            });

            var close = child.on('close', (code) => {
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
                console.log('err',data.toString());
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
            console.log('err',data.toString());
        });
        var stdout = child.stdout.on('data', (data) => {
            result += data.toString();
        });
        var cl = child.on('close', (code) => {
            var lines = result.split('\n');
            var detail = {bdAddress:device};
            if(lines[2].split('Company: ')[1] != null)
            {
                detail.company = lines[2].split('Company: ')[1].trim();
            }
            if(lines[3].split('Name: ')[1] != null)
            {
                detail.name = lines[3].split('Name: ')[1].trim();
            }
            if(lines[4].split("Version: ")[1] != null)
            {
                detail.lmpVersion = lines[4].split("Version: ")[1].split('Subversion:')[0].trim();
                detail.lmpSubVersion = lines[4].split('Subversion:')[1].trim();
            }
            if(lines[5].split('Manufacturer: ')[1] != null)
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

var getStats = function getStats()
{
    return getCPU().then(getMem).then(getCPUTemp).then(getGPUTemp).then(getFileSys).then(getPIDs).then(getConnectedDevices);
}
module.exports.getStats = getStats;
