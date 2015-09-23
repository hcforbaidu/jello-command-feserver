var request = require("request");
var Q = require("q");

var siteUtil = {
    /**
     * 编码
     * @param obj
     * @returns {*}
     */
    encode: function (obj) {
        function dotSerialize(obj, keyPrefix, list){
            list = list || [];
            keyPrefix = keyPrefix || '';

            if(typeof obj === 'number' || typeof obj === 'string' || typeof obj === 'boolean'){
                list.push({
                    k: keyPrefix,
                    v: obj
                });
            }else if(obj instanceof Array){
                for(var i=0; i< obj.length; i++){
                    var prefix = keyPrefix === '' ? '[' + i + ']' : (keyPrefix + '[' + i + ']');
                    dotSerialize(obj[i], prefix, list);
                }
            }else if(obj instanceof Object){
                for(var k in obj){
                    var v = obj[k];
                    var prefix = keyPrefix === '' ? k : (keyPrefix + '.' + k);
                    dotSerialize(v, prefix, list);
                }
            }

            return list;
        }

        function encode(obj){
            var list = dotSerialize(obj);
            var listEntry = [];

            for(var i=0; i<list.length; i++){
                // 将值进行编码
                var encodedValue = null;
                if(list[i].v === null || list[i].v === undefined){
                    // 如果是null之类的，传递空字符串
                    encodedValue = '';
                }else{
                    encodedValue = encodeURIComponent(list[i].v);
                }
                var entry = list[i].k + '=' + encodedValue;
                listEntry.push(entry);
            }

            return listEntry.join('&');
        }

        return encode(obj);
    },

    checkPort: function(address, port) {
        if (arguments.length == 0) {
            address = "http://127.0.0.1";
            port = 80;
        }

        if (arguments.length == 1) {
            port = address;
            address = "http://127.0.0.1";
        }

        var promise = Q(request({url: address + ":" + port}));
        return promise;
    }

};

module.exports = siteUtil;