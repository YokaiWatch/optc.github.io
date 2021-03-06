/* jshint loopfunc: true */

(function() {

var controllers = { };

/************
 * MainCtrl *
 ************/

controllers.MainCtrl = function($scope, $rootScope, $state, $stateParams, $controller) { 

    $rootScope.team = [ null, null, null, null, null, null ];
    $rootScope.options = { transient: false };

    $rootScope.changeUnit = function(unit, uid) {
        $scope.team[unit] = { uid: uid, slots: [ ] };
    };

    $scope.range = function(min, max) {
        var result = new Array(max - min);
        for (var i=0;i<result.length;++i) result[i] = min + i;
        return result;
    };

    $scope.slotCount = function(uid) {
        if (!uid) return 0;
        return units[uid - 1].slots;
    };

    $scope.onDrop = function(i,j) {
        var temp = $rootScope.team[i];
        $rootScope.team[i] = $rootScope.team[j];
        $rootScope.team[j] = temp;
        if (!$rootScope.$$phase) $rootScope.$apply();
    };

    $scope.onRemove = function(i) {
        $rootScope.team[i] = null;
        if (!$rootScope.$$phase) $rootScope.$apply();
    };

    $controller('StorageCtrl', { $scope: $scope });

};

/**************
 * PickerCtrl *
 **************/

controllers.PickerCtrl = function($scope, $state, $stateParams) { 

    /* * * * * Scope variables * * * * */

    $scope.units = [ ];
    $scope.query = '';
    $scope.recents = JSON.parse(localStorage.getItem('slotRecentUnits')) || [ ];

    $scope.isMats = $stateParams.mats;

    $scope.$watch('query',function() { populateList(); },true);

    /* * * * * Scope functions * * * * */

    $scope.pickUnit = function(unitNumber) {
        $scope.changeUnit($stateParams.unit, unitNumber + 1);
        updateRecent(unitNumber);
        $state.go('^');
    };

    /* * * * * List generation * * * * */

    var populateList = function() {
        $scope.units = [ ];
        var result, parameters = Utils.generateSearchParameters($scope.query);
        if (parameters === null) return;
        result = window.units.filter(function(x) { return x !== null && x !== undefined && x.hasOwnProperty('number'); });
        // filter by query
        if (parameters.query) {
            result = result.filter(function(unit) {
                return parameters.query.test(unit.name);
            });
        }
        $scope.units = result;
    };

    /* * * * * Recent list generation * * * * */

    var updateRecent = function(unitNumber) {
        var recentUnits = JSON.parse(JSON.stringify($scope.recents));
        var n = recentUnits.indexOf(unitNumber);
        if (n < 0) recentUnits.unshift(unitNumber);
        else recentUnits = recentUnits.splice(n,1).concat(recentUnits);
        recentUnits = recentUnits.slice(0,16);
        localStorage.setItem('slotRecentUnits',JSON.stringify(recentUnits));
    };

};

/***************
 * SummaryCtrl *
 ***************/

controllers.SummaryCtrl = function($scope, $state, $stateParams) {

    $scope.summary = [ ];

    $scope.$watch('team',function(team) {

        var points = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
        team.forEach(function(unit) {
            if (!unit || !unit.slots) return;
            unit.slots.forEach(function(slot) {
                if (!slot) return;
                points[slot.id] += slot.level;
            });
        });

        $scope.summary = points.map(function(x,n) {
            if (x === 0) return null;
            var level = 0;
            for (;level<abilities[n].levels.length && x >= abilities[n].levels[level][0];++level);
            return {
                points: x,
                level: level,
                description: (level < 1 ? 'Inactive' : abilities[n].levels[level - 1][1]),
                missing: (level < abilities[n].levels.length ? abilities[n].levels[level][0] - x : -1),
                next: (level < abilities[n].levels.length ? abilities[n].levels[level][1] : null)
            };
        });

        $scope.summaryEnabled = $scope.summary.some(function(x) { return x !== null; });

    },true);

};

/**************
 * ImportCtrl *
 **************/

controllers.ImportCtrl = function($scope, $rootScope, $state, $stateParams) {

    var data = $stateParams.data;

    if (!/^S.+P$/.test(data)) {
        $state.go('^');
        return;
    }

    data = data.slice(1,-1).split(/,/);
    var valid = data.every(function(x) {
        return (x == '!' || (/^(\d+):([0-9][1-5]){0,6}$/.test(x) && units[parseInt(x.split(/:/)[0],10)]));
    });

    if (!valid) {
        $state.go('^');
        return;
    }

    var result = data.map(function(x) {
        if (x == '!') return null;
        var tokens = x.split(/:/);
        var uid = parseInt(tokens[0],10), slots = [ ];
        for (var i=0;i<tokens[1].length;i+=2)
            slots.push({ id: parseInt(tokens[1][i],10), level: parseInt(tokens[1][i+1],10) });
        return { uid: uid, slots: slots };
    });

    $rootScope.options.transient = true;
    $rootScope.team = result;
    $state.go('^');

};

/**************
 * ExportCtrl *
 **************/

controllers.ExportCtrl = function($scope, $rootScope, $state, $stateParams, $timeout) {

    $scope.generateURL = function() {

        var result, team = $rootScope.team;

        // team
        
        var tokens = [ ];
        for (var i=0;i<6;++i) {
            var unit = team[i];
            if (!unit || !unit.uid) tokens.push('!');
            else {
                var temp = unit.slots
                    .filter(function(x) { return x; })
                    .map(function(x) { return x.id + '' + x.level; })
                    .join('');
                tokens.push(unit.uid + ':' + temp);
            }
        }

        result = '#/transfer/S' + tokens.join(',') + 'P';
        $scope.url = window.location.href.match(/^(.+?)#/)[1] + result;

        $timeout(function() {
            $('#urlContainer > input').select();
        });

    };

};

/***************
 * StorageCtrl *
 ***************/

controllers.StorageCtrl = function($scope, $rootScope) {

    var team = JSON.parse(localStorage.getItem('slotTeam')) || null;
    if (team === null) team = $rootScope.team;
    else $rootScope.team = team;

    var save = function() {
        localStorage.setItem('slotTeam', JSON.stringify($rootScope.team));
    };

    $rootScope.$watch('team',function(team) {
        if (!$rootScope.options.transient)
            save();
    },true);

    $rootScope.$watch('options.transient',function(transient) {
        if (!transient)
            save();
    });

};

/******************
 * Initialization *
 ******************/

for (var controller in controllers)
    angular.module('optc')
        .controller(controller, controllers[controller]);

})();
