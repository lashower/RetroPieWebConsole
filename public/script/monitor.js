app.controller('MonitorController', function($scope, $http, $rootScope, Upload, $timeout, $interval, $mdDialog) {

    $scope.detail = {cpus:[],memory:{total:'loading...',free:'loading...',used:'loading...'}};
    $scope.refreshInterval = 5;
    $scope.sortType     = 'core';
    $scope.sortReverse  = false;
    $scope.tempLabels = ['CPU','GPU'];
    $scope.tempData = [0,0];
    $scope.logs = [];
    $scope.pdFilter = {
        cpu:0.2,
        mem:0.2,
        users:[{name:'pi',enable:true},{name:'root',enable:true}],
        name:'emulation|retro',
        command:'app.js|retro'
    };
    
    $scope.result = {};

    $scope.getLogs = function() {
        $http({
            transformRequest: angular.identity,
            method: 'GET',
            url: '/getLogs'
        }).then(function(response) {
            $scope.logs = response.data;
        });
    };
     
    $scope.reboot = function(isContinue) {
        console.log('reboot');
        $scope.result = {};
        var params = {};
        if(!isContinue) {
            params.cancel = true;
        }
        $http({
            transformRequest: angular.identity,
            method: 'POST',
            url: '/performReboot',
            params: params
        }).then(function(response) {
            console.log(response.data);
            $scope.result = response.data;
        });
    }

    $scope.tempOptions = {
        scales: {
            yAxes: [{id: 'y-axis-1', type: 'linear', position: 'left', ticks: {min: 0, max:80}}]
        }
    }

    $scope.killPID = function(pid) {
        $http({
            transformRequest: angular.identity,
            method: 'POST',
            url: '/killPid',
            params: {
                pid: pid
            }
        }).then(function(response) {
            console.log(response.data);
        });
    }

    $scope.filterPids = function(pid) {
        var pass = true;
        var userCheck = $scope.pdFilter.users.find(user => { return user.name == pid.user } );
        if(userCheck == null)
        {
            $scope.pdFilter.push({name:pid.user,enable:false});
            pass = false;
        } else
        {
            pass = userCheck.enable;
        }
        pass = pass ? (pid.cpu >= $scope.pdFilter.cpu) : false;
        pass = pass ? (pid.mem >= $scope.pdFilter.mem) : false;
        pass = pass ? (pid.name.toLowerCase().search($scope.pdFilter.name) >= 0) : false;
        pass = pass ? true : (pid.cmd.toLowerCase().search($scope.pdFilter.command) >= 0);
        return pass;
    }

    $scope.getStats = function() {
        $http({
            transformRequest: angular.identity,
            method: 'GET',
            url: '/processStats'
        }).then(function(response) {
            $scope.detail = response.data;
            $scope.labels = $scope.detail.cpus.map(cpu => { return cpu.name });
            $scope.data[0] = $scope.detail.cpus.map(cpu => { return cpu.diffUsage });
            $scope.memData = [$scope.detail.memory.free,$scope.detail.memory.used];
            $scope.tempData = [$scope.detail.cpuTemp,$scope.detail.gpuTemp];
        });
    };

    var reloadStats = $interval($scope.getStats,5000);
    $scope.updateInterval = function() {
        $interval.cancel(reloadStats);
        if($scope.refreshInterval > 0)
        {
            reloadStats = $interval($scope.getStats,$scope.refreshInterval*1000);
        }
    }

    $scope.labels = $scope.detail.cpus.map(cpu => { return "Core " + cpu.coreIndex });
    $scope.series = ['Series A'];
    $scope.data = [[100,100,100,100]];
    $scope.onClick = function (points, evt) {
        console.log(points, evt);
    };
    $scope.datasetOverride = [{ yAxisID: 'y-axis-1' }];
    $scope.options = {
        maintainAspectRatio: false,
        scales: {
            yAxes: [
            {
                id: 'y-axis-1',
                type: 'linear',
                display: true,
                position: 'left',
                ticks: {min: 0, max:100}
            }
            ]
        }
    };
    var reloadStats = $interval($scope.getStats,5000);
    $scope.getStats();
    $scope.getLogs();

    $scope.$on("$destroy",function(){
        if(angular.isDefined(reloadStats)) {
            $interval.cancel(reloadStats);
        }
    });

    $scope.memLabels = ["Free", "Used"];;
    $scope.memData = [0,0];
    $scope.memOptions = {maintainAspectRatio: false};

});
