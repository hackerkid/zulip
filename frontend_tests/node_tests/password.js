add_dependencies({
    zxcvbn: 'node_modules/zxcvbn/dist/zxcvbn.js',
});

set_global('i18n', {
    t: function (s) { return 'translated: ' + s; },
});

var common = require("js/common.js");

(function test_basics() {
    var accepted;
    var password;
    var warning;

    var bar = (function () {
        var self = {};

        self.width = function (width) {
            self.w = width;
            return self;
        };

        self.removeClass = function (arg) {
            assert.equal(arg, 'bar-success bar-danger');
            return self;
        };

        self.addClass = function (arg) {
            self.added_class = arg;
            return self;
        };

        return self;
    }());

    password = 'plain';
    accepted = common.password_quality(password, bar);
    assert(!accepted);
    assert.equal(bar.w, '10.654507557627486%');
    assert.equal(bar.added_class, 'bar-danger');
    warning = common.password_warning(password);
    assert.equal(warning, 'translated: Password should be at least __length__ characters long');

    password = 'z!X4@S_&';
    accepted = common.password_quality(password, bar);
    assert(accepted);
    assert.equal(bar.w, '47.679074269445294%');
    assert.equal(bar.added_class, 'bar-success');
    warning = common.password_warning(password);
    assert.equal(warning, 'translated: ');

    function password_field(min_length, min_quality) {
        var self = {};

        self.data = function (field) {
            if (field === 'minLength') {
                return min_length;
            } else if (field === 'minQuality') {
                return min_quality;
            }
        };

        return self;
    }

    password = 'z!X4@S_&';
    accepted = common.password_quality(password, bar, password_field(10, 0.10));
    assert(!accepted);
    assert.equal(bar.w, '39.7%');
    assert.equal(bar.added_class, 'bar-danger');
    warning = common.password_warning(password, password_field(10));
    assert.equal(warning, 'translated: Password should be at least __length__ characters long');

    password = 'foo';
    accepted = common.password_quality(password, bar, password_field(2, 0.001));
    assert(accepted);
    assert.equal(bar.w, '10.390277164940581%');
    assert.equal(bar.added_class, 'bar-success');
    warning = common.password_warning(password, password_field(2));
    assert.equal(warning, 'translated: ');

    password = 'aaaaaaaa';
    accepted = common.password_quality(password, bar, password_field(6, 1000));
    assert(!accepted);
    assert.equal(bar.added_class, 'bar-danger');
    warning = common.password_warning(password, password_field(6));
    assert.equal(warning, 'translated: Repeats like "aaa" are easy to guess');

    delete global.zxcvbn;
    password = 'aaaaaaaa';
    accepted = common.password_quality(password, bar, password_field(6, 1000));
    assert(accepted === undefined);
    warning = common.password_warning(password, password_field(6));
    assert(warning === undefined);
}());
