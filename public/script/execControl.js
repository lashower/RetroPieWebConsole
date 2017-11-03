app.controller('ExecController',function($scope, $http, $mdDialog, item) {
    $scope.item = item;

    $scope.hide = function() {
        $mdDialog.hide();
    };

    $scope.cancel = function() {
        $mdDialog.cancel();
    };

    $scope.action = function(action) {
        if(action != 'cancel')
        {
            $http({
                transformRequest: angular.identity,
                method: 'POST',
                url: '/updateExec',
                params: {
                    details: action,
                    exec:item
                }
            }).then(function(response) {
                response.data.end_date = (response.data.end_date == null) ? null : new Date(response.data.end_date);
                response.data.added_date = (response.data.added_date == null) ? null : new Date(response.data.added_date);
                response.data.start_date = (response.data.start_date == null) ? null : new Date(response.data.start_date);
                $scope.item = response.data;
                $mdDialog.hide();
            });

        }
    };
});

