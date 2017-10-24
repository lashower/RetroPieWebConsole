app.controller('OverviewController', function($scope, $http, $rootScope, Upload, $timeout) {
        
    $scope.status = "";
    $scope.userDetails = {};

    $scope.getUserDetails = function() {
        $scope.result = {};
        $http({
            transformRequest: angular.identity,
            method: 'GET',
            url: '/getUserDetails'
        }).then(function(response) {
            $scope.userDetails = response.data;
            console.log($scope.userDetails);
        });
    }
    $scope.getUserDetails();

});
