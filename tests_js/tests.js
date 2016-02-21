
/*global $, console, xross, QUnit */

function get_new_text(name) {
    "use strict";
    return (name + '_from_response').replace('#', '');
}


$.mockjax({
    url: '*',
    response: function (settings) {
        "use strict";
        this.responseText = get_new_text(settings.data.op);
    }
});


function get_ajax_test_base(title, func_describe, func_test) {
    "use strict";
    QUnit.asyncTest(title, function () {
        expect(1);
        func_describe();
        setTimeout(function () {
            func_test();
            start();
        }, 500);

    });
}


function get_ajax_test(title, el, xross_data, test_func) {
    "use strict";
    if (test_func === undefined) {
        test_func = function () {
            equal($(el).html(), get_new_text(el));
        };
    }
    get_ajax_test_base(title,
        function () {
            xross.describe(el, $.extend({}, { event: 'xross_event' }, xross_data));
            $(el).trigger('xross_event');
        },
        test_func);
}

/**********************************************************************************/

module('basic tests');

QUnit.test('unknown handler', function () {
    throws(function () {
        xross.describe('#some_el', 'nonexistent');
    });
});

QUnit.test('register handler', function () {
    "use strict";
    var el_, params_;
    xross.registerHandler('mine', function (el, params) {
        el_ = el;
        params_ = params;
    }, {
        default_1: 0,
        override: 0
    });
    xross.describe('#box_dummy', 'mine', {
        override: 1,
        new_one: 2
    });

    equal('#' + el_.attr('id'), '#box_dummy');
    deepEqual(params_.default_1, 0);
    deepEqual(params_.override, 1);
    deepEqual(params_.new_one, 2);
});

QUnit.test('multiple elements', function () {
    "use strict";

    xross.registerHandler('multiple', function (el, params) {
        el.html(get_new_text(el.attr('id')));
    });
    xross.describe(['#box_7', '#box_8'], 'multiple');

    equal($('#box_7').html(), get_new_text('box_7'));
    equal($('#box_8').html(), get_new_text('box_8'));
});

/**********************************************************************************/

module('ajax tests');

get_ajax_test('swap event', '#box_1');

get_ajax_test('swap target', '#box_2',
    {
        target: function (el) {
            "use strict";
            return $('#box_2');
        }
    });


get_ajax_test('swap complete', '#box_2',
    {
        complete: function (el) { $('#box_2').html('box_2 complete'); }
    }, function () {
        equal($('#box_2').html(), 'box_2 complete');
    });


get_ajax_test('swap success', '#box_3', {
    success: function () { $('#box_3').html(get_new_text('box_3')); }
});


get_ajax_test('swap success append', '#box_4',
    {
        success: 'append'
    }, function () {
        equal($('#box_4').html(), 'box_4' + get_new_text('box_4'));
    });


get_ajax_test('swap success prepend', '#box_5',
    {
        success: 'prepend'
    }, function () {
        equal($('#box_5').html(),  get_new_text('box_5') + 'box_5');
    });


get_ajax_test('swap success replace', '#box_6',
    {
        success: 'replace'
    }, function () {
        deepEqual($('#box_6').length,  0);
    });


get_ajax_test_base('auto event button',
    function () {
        xross.describe('#btn');
        $('#btn').trigger('click');
    },
    function () {
        equal($('#btn').html(), get_new_text('#btn'));
    });


get_ajax_test_base('auto event link',
    function () {
        xross.describe('#a');
        $('#a').trigger('click');
    },
    function () {
        equal($('#a').html(), get_new_text('#a'));
    });