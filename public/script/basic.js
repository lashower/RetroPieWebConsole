app.controller('BasicController', function($scope, $http, $rootScope, Upload, $timeout,$interval) {
    $scope.exec = {name:'install',totalCount:0,completed:0};
    $scope.sure = false;
    $scope.basicApps = [];
    $scope.sortType = 'type'
    $scope.applyFilter = function(app) {
        return app.type === 'core' || app.type === 'main';
    }

    $scope.loadApps = function() {
        $http({
            transformRequest: angular.identity,
            method: 'GET',
            url: '/apps',
        }).then(function(response) {
            $rootScope.appList = response.data;
            $scope.basicApps = $rootScope.appList.filter(
                function(app) {
                    return app.type == "core" || app.type == "main" }
                ).map(function(app){ 
                    if(app.installed)
                    {
                        app.state = "installed";
                    } else
                    {
                        app.state = "";
                    }
                    return app;
                }).sort(function(a,b) {return (a.type > b.type) ? 1 : ((b.type > a.type) ? -1 : 0);} );
        });
    };

    $scope.executeBasic = function() {
        var apps=$scope.basicApps;
        $scope.exec = {name:'install'};
        $scope.exec.totalCount = apps.length;
        $scope.exec.completed = 0;

        $scope.basicApps.forEach(function (app) {
            app.state = 'installing';
            $http({
                transformRequest: angular.identity,
                method: 'POST',
                url: '/execute',
                timeout: 1800000,
                params: {
                    command: 'fullInstall',
                    app: JSON.stringify(app),
                    priority: 1
                }
             }).then(function(response) {
                console.log(response.data);
             });
        });
    }

    $scope.updateQue = function()
    {
        $http({
            transformRequest: angular.identity,
            method: 'GET',
            url: '/que',
                timeout: 1800000
        }).then(function(response) {
            console.log(response.data.items);
            var items = response.data.items;
            $scope.exec = {name:'install',totalCount:0,completed:0,items:[]};
            items = items.filter((item) => {return $scope.basicApps.filter((app) => { return app.name == item.name }).length == 1});
            console.log(items);
            items.forEach(function (exec) {
                $scope.exec.totalCount++;
                if(exec.end_date != null)
                {
                    $scope.exec.completed++;
                }
                $scope.exec.items.push(exec);
            });
        });
    }

    $scope.loadApps();
    $scope.updateQue();
    $interval($scope.updateQue,10000);
});
