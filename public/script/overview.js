app.controller('OverviewController', function($scope, $http, $rootScope, $interval) {
        
    $scope.status = "";
    $scope.userDetails = {};
    $scope.screenURL = "/getScreenshot?height=400";

    $scope.getUserDetails = function() {
        $scope.result = {};
        $http({
            transformRequest: angular.identity,
            method: 'GET',
            url: '/getUserDetails'
        }).then(function(response) {
            $scope.userDetails = response.data;
            //console.log($scope.userDetails);
        });
    }

    $scope.getScreen = function() {
        $scope.screenURL = "/getScreenshot?height=400&r=" + Date.now();
    }


    var reloadScreen = $interval($scope.getScreen,5000);
    $scope.getUserDetails();

    $scope.$on("$destroy",function(){
        if(angular.isDefined(reloadScreen)) {
            $interval.cancel(reloadScreen);
        }
    });

});
