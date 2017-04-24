var STORAGE = (function() {
    var set = function(key, value) {
        simpleSessionStorage.set(APP_CONFIG.PROJECT_SLUG + '-' + key, value);
    }

    var get = function(key) {
        var value = simpleSessionStorage.get(APP_CONFIG.PROJECT_SLUG + '-' + key);
        return value;
    }

    var deleteKey = function(key) {
        simpleSessionStorage.deleteKey(APP_CONFIG.PROJECT_SLUG + '-' + key);
    }

    var setTTL = function(key, ttl) {
        simpleSessionStorage.setTTL(APP_CONFIG.PROJECT_SLUG + '-' + key, ttl)
    }

    var getTTL = function(key) {
        var ttl = simpleSessionStorage.getTTL(APP_CONFIG.PROJECT_SLUG + '-' + key);
        return ttl;
    }

    var testStorage = function() {
        var test = STORAGE.get('test');
        if (test) {
            STORAGE.deleteKey('test');
        }
        console.log(simpleSessionStorage.index()); // empty array
        console.log(STORAGE.get('test')); // undefined

        STORAGE.set('test', 'haha');
        console.log(STORAGE.get('test'), STORAGE.getTTL('test')); // haha, Infinity

        STORAGE.setTTL('test', 1000);
        console.log(STORAGE.getTTL('test')); // 999 or 1000 or something close

        console.log(simpleSessionStorage.index()); // one element array
        simpleStorage.flush();
        console.log(simpleSessionStorage.index()) // empty array
    }

    return {
        'set': set,
        'get': get,
        'deleteKey': deleteKey,
        'setTTL': setTTL,
        'getTTL': getTTL,
        'testStorage': testStorage
    }
}());
