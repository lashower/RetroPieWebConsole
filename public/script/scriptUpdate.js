app.controller('ScriptUpdateController', function($scope, $http, $rootScope, Upload, $timeout) {
    $scope.sure = false;
    $scope.selfSure = false;
    $scope.disabled = false;
    $scope.results = [];
    $scope.isUp = true;
    $scope.runUpdate = function() {
        $scope.sure = false;
        $scope.disabled = true;
        $http({
            transformRequest: angular.identity,
            method: 'POST',
            url: '/updateScripts',
            params: {
                webUpdate: $scope.selfSure
            }
        }).then(function(response) {
            $scope.disabled = false;
            $scope.results = response.data;
            console.log($scope.results);
            $scope.isUp = false;
            while(!$scope.isUp)
            {
                setTimeout(function() { $scope.checkStatus()}, 5000);
            }
        });
    }

    $scope.checkStatus = function() {
        $http({
            transformRequest: angular.identity,
            method: 'GET',
            url: '/getUserDetails'
        }).then(function(response) {
            console.log(response);
            $scope.isUp = true;
        }).catch(function(err) {
            console.log(err);
            $scope.isUp = false;
        });
    }
});
