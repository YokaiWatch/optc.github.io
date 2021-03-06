/* jshint loopfunc: true */

(function() {

var MODIFIERS = [ 'Miss', 'Good', 'Great', 'Perfect' ];

window.CrunchUtils = { };

window.CrunchUtils.okamaCheck = function(array, modifiers, data) {
    for (var i=0;i<array.length;++i) {
        for (var j=0;j<data.length && i+j<array.length;++j) {
            var different = (data[j].type && array[i+j].unit.unit.type != data[j].type) ||
                (data[j].minModifier && MODIFIERS.indexOf(modifiers[i+j]) < MODIFIERS.indexOf(data[j].minModifier));
            if (different) break;
        }
        if (j == data.length) return true;
    }
    return false;
};

window.CrunchUtils.okamaSort = function(array, data) {
    var that = $.extend([], array), temp = [ ];
    for (var i=0;i<data.length;++i) {
        for (var j=0;j<that.length;++j) {
            if (that[j].unit.unit.type != data[i]) continue;
            temp.push(that.splice(j,1)[0]);
            break;
        }
        if (i == data.length) break;
    }
    if (temp.length != data.length) return null;
    else return temp.concat(that);
};

window.CrunchUtils.mihawkSort = function(array) {
    var temp = array.map(function(x) { return [ x.damage * (x.unit.unit.class.has("Slasher") ? 2.75 : 1), x ]; });
    temp.sort(function(x,y) { return x[0] - y[0]; });
    return temp.map(function(x) { return x[1]; });
};

})();
