app.controller('RebootController', function($scope, $http, $rootScope, Upload, $timeout) {
    $scope.sure = false;
    $scope.result = {};
    $scope.performReboot = function() {
        $scope.result = {};
        $http({
            transformRequest: angular.identity,
            method: 'POST',
            url: '/performReboot'
        }).then(function(response) {
            $scope.result = response.data;
            console.log($scope.result);
        });
    }

    $scope.cancelReboot = function() {
        $scope.result = {};
        $http({
            transformRequest: angular.identity,
            method: 'POST',
            url: '/performReboot',
            params: {
                cancel: true,
            }
        }).then(function(response) {
            $scope.result = response.data;
        });
    }
});
