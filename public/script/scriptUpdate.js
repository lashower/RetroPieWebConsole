app.controller('ScriptUpdateController', function($scope, $http, $rootScope, Upload, $timeout) {
    $scope.sure = false;
    $scope.selfSure = false;
    $scope.disabled = false;
    $scope.results = [];
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
        });
    }
});
