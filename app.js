const Settings = require('./lib/Settings');
const express = require('express');
const app = express();
const RetroPieHelper = require('./lib/RetroPieHelper');
const Monitor = require('./lib/Monitor');
const RomUtil = require('./lib/RomUtil');
const cron = require('node-cron');
const logger = require('winston');
const timeout = require('connect-timeout');
const formidable = require('formidable');
const fs = require('fs-extra');
const path = require('path');
app.use(timeout(1800000));

RetroPieHelper.init().then(RetroPieHelper.updateCache.bind(null)).catch(() => {
    logger.debug('Failed to start');
});

setInterval(RetroPieHelper.updateCache,300000);

cron.schedule('5 * * * *', function(){
      logger.debug('Running updateCache every 5 minutes');
      RetroPieHelper.updateCache();
});

app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));

app.use(express.static(__dirname + '/node_modules'));

app.get('/', function(req, res) {
    res.render('pages/index');
});

app.get('/overview', function(req, res) {
    logger.debug("Loading overview");
    res.render('pages/overview');
});

app.get('/history', function(req, res) {
    logger.debug("Loading history");
    res.render('pages/history');
});

app.get('/manage', function(req, res) {
    logger.debug("Loading manage");
    res.render('pages/manage');
});

app.get('/games', function(req, res) {
    logger.debug("Loading games");
    res.render('pages/games');
});

app.get('/monitor', function(req,res) {
    logger.debug("Loading monitoring");
    res.render('pages/monitor');
})

app.get('/settings', function(req,res) {
    logger.debug("Loading settings");
    res.render('pages/settings');
});

app.get('/streaming', function(req,res) {
    res.render('pages/streaming');
});

app.get('/detail.tmpl.html',function(req,res) {
    res.render('partials/detailtmpl');
});

app.get('/build.tmpl.html',function(req,res) {
    res.render('partials/buildtmpl');
});

app.get('/app.tmpl.html',function(req,res) {
    res.render('partials/apptmpl');
});

app.get('/game.tmpl.html',function(req,res) {
    res.render('partials/gametmpl');
});

app.get('/scriptUpdate',function(req,res) {
    logger.debug("Getting Script Update");
    res.render('pages/scriptUpdate');
});

app.get('/apps', function (req, res) {
    logger.debug("Getting Apps");
    RetroPieHelper.getApps(req.query).then(result => {
        logger.silly('Result',result);
        res.json(result);
    }).catch(err => {
        logger.error('Error',err);
    });
});

app.post('/execute', function(req, res) {
    res.connection.setTimeout(0);
    logger.debug("Using execute");
    RetroPieHelper.execute(req.query).then((result) =>
    {
        //logger.debug('app.execute','success',result);
        res.json(result);
    }).catch(result => {
        //logger.warning('app.execute','failure',result);
        res.json(result);
    });
});

app.get('/getUserDetails', function(req,res) {
    logger.debug('Getting user details');
    Settings.getUserDetails().then(result => {
        result.rpsVersion = process.env.RPSVERSION;
        result.retroArchHome = process.env.RAHOME;
        res.json(result);
    }).catch(result => {
        res.json(result);
    });
});

app.get('/rest/v1/get/settings', function(req,res) {
    logger.debug('app','Getting Settings');
    Settings.getSettings().then(result => {
       res.json(result)
    }).catch(err => {
        var result = {message:'Failed to load settings'};
        result.error = err;
        res.json(err);
    }); 
});

app.post('/rest/v1/put/settings', function(req,res) {
    logger.debug('app',"Updating settings");
    logger.debug('app',req.query.settings);
    Settings.updateSettings(JSON.parse(req.query.settings)).then(result => {
        res.json(result);
    }).catch(err => {
        var result = {message:'Failed to update settings'};
        result.error = err;
        res.json(err);
    });
});

app.get('/getEmulators', function(req,res) {
    logger.debug('Getting active emulators');
    RomUtil.getEmulators().then(result => {
        res.json(result);
    }).catch(result => {
        res.json(result);
    });
});

app.get('/getRoms', function(req,res) {
    logger.debug('Getting roms');
    RomUtil.getRoms(req.query).then(result => {
        res.json(result);
    }).catch(result => {
        res.json(result);
    });
});


app.post('/updateScripts',function(req, res) {
    logger.debug("Updating scripts");
    RetroPieHelper.updateScripts(req.query.webUpdate).then(result => {
        logger.debug('success');
        res.json(result)
    }).catch(err => {
        logger.error('failure',err);
        res.json(err)}
    );
});

app.post('/killPid',function(req,res) {
    RetroPieHelper.killPid(req.query.pid).then(result => {
        res.json(result);
    }).catch(err => {
        res.json(err);
    });
});

app.get('/que',function(req,res) {
    RetroPieHelper.getQue(req.query).then(result => {
        res.json(result);
    }).catch(err => {
        res.json(err);
    });
});

app.get('/getImage',function(req,res) {
    logger.debug(req.query);
    res.sendFile(req.query.filename);
});

app.get('/downloadFile',function(req,res) {
    logger.debug(req.query);
    res.set('Content-Type','application/octet-stream');
    const src = fs.createReadStream(req.query.filename);
    src.pipe(res);
});

app.get('/readFile',function(req,res) {
    fs.readFile(req.query.filename).then(result => {
        res.send(result);
    });
});

app.get('/processStats',function(req,res) {
    Monitor.getStats().then(result => {
        result.success = true;
        res.json(result);
    }).catch(err => {
        result = {};
        result.success = false;
        result.err = err;
        res.json(result);
    });
});

app.get('/getLogs',function(req,res) {
    Monitor.getLogs().then(result => {
       res.json(result); 
    }).catch(err => {
        result = {};
        result.success = false;
        result.err = err;
        res.json(result);
    });
});

app.get('/getScreenshot',function(req,res) {
    res.set('Content-Type','image/png');
    Monitor.getScreenShot(req.query,res).then(() => {
    }).catch(err => {
        logger.error("Unable to get screenshot");
    });
});

app.get('/retrobuilds',function(req,res) {
    RetroPieHelper.getBuilds(req.query).then(result => {
        result.success = true;
        res.json(result);
    }).catch(err => {
        result = {};
        result.success = false;
        result.err = err;
        res.json(result);
    });
});

app.post('/upload/game',function(req,res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        var file = files.file;
        var dir = JSON.parse(fields.emulator).path;
        fs.chmod(file.path,777).then(() => {
            fs.chown(file.path,Number(process.env.SUDO_UID),Number(process.env.SUDO_UID)).then(() => {
                fs.rename(file.path, path.join(dir,file.name)).then(() => {
                    res.write("Success");
                    res.end();
                })
            })
        })
    });
});

app.post('/performReboot',function(req, res) {
    logger.debug("Rebooting system");
    RetroPieHelper.performReboot(req.query).then(result => { res.json(result)}).catch(err => {res.json(err)});
});

app.post('/updateExec',function(req,res) {
    RetroPieHelper.updateExec(req.query.details,req.query.exec).then(result => {
        res.json(result);
    }).catch(err => {
        res.json(err);
    });
});

app.post('/updateAppCache',function(req,res) {
    RetroPieHelper.updateCache().then((result) => {
        res.json(result);
    }).catch(err => {
        res.json({success:false});
    });
});

app.post('/updateGameInfo',function(req,res) {
    if(req.query.game)
    {
        var game = JSON.parse(req.query.game);
        RomUtil.updateGameInfo(game).then(result => { res.json({success:true}); });
    } else
    {
        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields, files) {
            var file = files.file;
            logger.debug(file);
            var game = JSON.parse(fields.game);
            RomUtil.addGameImage(file,game).then((result) => {
                game.image = result.fileName;
                RomUtil.updateGameInfo(game).then(result => { res.json({success:true}); });
            });
        });
    }
});

app.post('/updateCheat',function(req,res) {
    logger.debug(req.query.cheat);
    RomUtil.updateCheat(JSON.parse(req.query.cheat)).then((result) => {
        res.json({success:true});
    }).catch((ex) => {
        var result = {success:false};
        result.error = ex;
        res.json(result);
    });
});

app.listen(3000);
logger.debug('3000 is the magic port');
