app.controller('MonitorController', function($scope, $http, $rootScope, Upload, $timeout, $interval, $mdDialog) {
    $scope.detail = {cpus:[],memory:{total:'loading...',free:'loading...',used:'loading...'}};
    $scope.refreshInterval = 5;
    $scope.sortType     = 'core';
    $scope.sortReverse  = false;
    $scope.tempLabels = ['CPU','GPU'];
    $scope.tempData = [0,0];
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

    $scope.getStats();
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
    $scope.$on("$destroy",function(){
        if(angular.isDefined(reloadStats)) {
            $interval.cancel(reloadStats);
        }
    });

    $scope.memLabels = ["Free", "Used"];;
    $scope.memData = [0,0];
    $scope.memOptions = {maintainAspectRatio: false};
});
