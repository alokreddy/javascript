    var unique_ordinal_val = {};
    var distinct_ordinal_val = [];
    for (var i in data) {
        if (typeof (unique_ordinal_val[data[i][ordinalVar]]) == "undefined" && data[i][ordinalVar].length > 10) {
            distinct_ordinal_val.push(data[i][ordinalVar].substring(0, 10) + '..');
            unique_ordinal_val[data[i][ordinalVar]] = 0;
        } else if (typeof (unique_ordinal_val[data[i][ordinalVar]]) == "undefined" && data[i][ordinalVar].length < 10) {
            distinct_ordinal_val.push(data[i][ordinalVar]);
            unique_ordinal_val[data[i][ordinalVar]] = 0;
        }
    };