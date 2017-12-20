app.controller('SettingController', function($scope, $http, $rootScope, $timeout) {

    $scope.settings = {};
    $scope.references = {
        CURRENT_USER:['USER_HOME','DATA_DIRECTORY','ROM_DIRECTORY','BIOS_DIRECTORY','EMULATION_HOME','CHEAT_DIR'],
        USER_HOME:['DATA_DIRECTORY','ROM_DIRECTORY','BIOS_DIRECTORY','EMULATION_HOME','CHEAT_DIR'],
        DATA_DIRECTORY:['ROM_DIRECTORY','BIOS_DIRECTORY'],
        RETROARCH_HOME:['EMU_DIRECTORY','CONFIG_DIRECTORY']
    };

    $scope.linkChanges = true;

    $scope.getPreferences = function() {
        $http({
            transformRequest: angular.identity,
            method: 'GET',
            url: '/rest/v1/get/settings'
        }).then(function(response) {
            $scope.settings = {};
            response.data.forEach(item => {
                $scope.settings[item['name']] = item;
            });
            $scope.settings.INCLUDE_EXTRA.value = Boolean($scope.settings.INCLUDE_EXTRA.value);
            console.log($scope.settings);
        });
    }

    $scope.save = function() {
        $http({
            transformRequest: angular.identity,
            method: 'POST',
            url: '/rest/v1/put/settings',
            params: {
                settings: JSON.stringify($scope.settings)
            }
        }).then(function(response) {
            console.log(response.data);
        });
    }

    $scope.updateChildren = function(oldValue,parentObject) {
        if($scope.linkChanges && $scope.references[parentObject.name])
        {
            $scope.references[parentObject.name].forEach(child => {
                if(parentObject.name == 'CURRENT_USER')
                {
                    $scope.settings[child].value = $scope.settings[child].value.replace('/' + oldValue + '/','/' + parentObject.value + '/');
                    $scope.settings[child].value = $scope.settings[child].value.replace(new RegExp('/' + oldValue + "$"),'/' + parentObject.value);
                } else
                {
                    $scope.settings[child].value = $scope.settings[child].value.replace(oldValue,parentObject.value);
                }
            });
        }
    }

    $scope.getPreferences();

});
