app.controller('HistoryController', function($scope, $http, $rootScope, $timeout, $interval, $mdDialog) {
        
        $scope.filter = {
            selected:'all',
            name:'',
            maxDate:new Date(),
            minDate:new Date('Jan 1, 2017')
        };
        $scope.filter.states = [ 
            { name: 'All', selected: false },
            { name: 'Completed', selected: false },
            { name: 'Failed', selected: true },
            { name: 'Executing', selected: true },
            { name: 'Queued', selected : true }
        ];

        $scope.filter.priorities = [
            { name: 'All', selected: true },
            { name: 1, selected: false},
            { name: 2, selected: false},
            { name: 3, selected: false},
            { name: 4, selected: false},
            { name: 5, selected: false},
            { name: 6, selected: false},
            { name: 7, selected: false},
            { name: 8, selected: false},
            { name: 9, selected: false},
            { name: 10, selected: false},
            { name: "10+", selected: false},
        ]

        $scope.sortType     = 'added_date'
        $scope.sortReverse  = false
        $scope.searchName   = '';
        $scope.filteredExecs;
        $scope.execs = [];

        $scope.togglePanel = function(id) {
            var pan = document.getElementById(id);
            if(pan.classList.contains('in'))
            {
                pan.classList.remove('in');
            } else
            {
                pan.classList.add('in');
            }
        }

        $scope.showDetails = function(ev,curritem) {
            console.log(curritem);
            $mdDialog.show({
                locals: {item:curritem},
                controller: DialogController,
                templateUrl: '/detail.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose:true,
                fullscreen: true
            })
            .then(function(answer) {
                $scope.status = 'You said the information was "' + answer + '".';
            }, function() {
                $scope.status = 'You cancelled the dialog.';
            });
        }

        $scope.search = function() {
            var myFilter = {}
            if($scope.filter.name != "")
            {
                myFilter.name = $scope.filter.name;
            }
            myFilter.state = $scope.filter.states.filter((f) => { return f.name != 'All' && f.selected == true }).map((f) => { return f.name.toLowerCase() });
            if(myFilter.state.length == 0)
            {
                delete myFilter['state'];
            }
            myFilter.priority = $scope.filter.priorities.filter((p) => { return p.name != 'All' && p.selected == true }).map((p) => { return p.name });
            if(myFilter.priority.length == 0)
            {
                delete myFilter['priority'];
            }
            if($scope.filter.minDate != null)
            {
                myFilter.minDate = $scope.filter.minDate;
            }
            if($scope.filter.maxDate != null)
            {
                myFilter.maxDate = $scope.filter.maxDate;
            }
            console.log(myFilter);
            $http({
                transformRequest: angular.identity,
                method: 'GET',
                url: '/que',
                params: {
                    specific: myFilter
                }
            }).then(function(response) {
                $scope.execs = response.data.items.map((item) => {
                    item.end_date = (item.end_date == null) ? null : new Date(item.end_date);
                    item.added_date = (item.added_date == null) ? null : new Date(item.added_date);
                    item.start_date = (item.start_date == null) ? null : new Date(item.start_date);
                    return item;
                });
                console.log($scope.execs);
            });
        };

        function DialogController($scope, $http, $mdDialog, item) {
            $scope.item = item;

            $scope.hide = function() {
                $mdDialog.hide();
            };

            $scope.cancel = function() {
               $mdDialog.cancel();
            };

           $scope.action = function(action) {
              console.log(action);
              console.log(item);
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
                      $scope.item = response.data;
                      $mdDialog.hide();
                  });

              }
           };
        }

        //$scope.loadExecs();
        //$scope.updateQue();
        //$interval($scope.updateQue,10000);
        //$interval($scope.updateQue,600000);
});
