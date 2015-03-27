/**
 * django-xross
 * https://github.com/idlesign/django-xross
 *
 * Distributed under BSD License.
 */

xross = {

    _handlers_registry: {},
    _default_handler: 'ajax',
    data_items_prefix: 'x',
    debug: false,

    automate: function(xross_class, handler_name) {
        if (xross_class === undefined) {
            xross_class = 'xross'
        }
        $(function(){
            $.each($('.' + xross_class), function(idx, obj) {
                xross.describe('#' + $(obj).attr('id'), handler_name);
            });
        });
    },

    bootstrap: function() {
        this.register_handler('ajax', this.handlers.ajax);
    },

    register_handler: function(alias, func, default_params) {
        if (typeof func === 'object') {
            default_params = func.params;
            func = func.func;
        }

        if (default_params===undefined) {
            default_params = {};
        }

        this.utils.log(function(){ return 'Registering `' + alias + '` handler.' });

        this._handlers_registry[alias] = {
            func: func,
            params: default_params
        };
    },

    describe: function(el, handler_name, params) {

        if (typeof handler_name !== 'string') {
            params = handler_name;
            handler_name = this._default_handler;
        }

        if (params===undefined) {
            params = {}
        }

        var handler = this._handlers_registry[handler_name];
        if (handler===undefined) {
            if (handler_name===this._default_handler) {
                xross.bootstrap();
                handler = this._handlers_registry[handler_name];
            } else {
                throw { message: 'You are trying to use an unregistered handler:  `' + handler + '`.' };
            }
        }

        $(function(){
            if (!(el instanceof Array)) {
                el = [el]
            }
            $.each(el, function(idx, obj) {
                xross.utils.log(function(){ return 'Describing `' + obj + '` using `' + handler_name + '` handler.' });
                handler.func(obj, $.extend({}, handler.params, params));
            });
        });
    },

    utils: {

        evaluate: function(input, arg) {
            if (input instanceof Function) {
                return input(arg);
            }
            return input;
        },

        log: function(message) {
            if (xross.debug) {
                console.log('xross: ' + message());
            }
        },

        get_function: function(name, context) {
            var path_chunks = name.split('.'),
                func = path_chunks.pop();

            for (var i = 0; i < path_chunks.length; i++) {
                context = context[path_chunks[i]];
                if (context === undefined) {
                    xross.utils.log(function(){ return 'Unable to find `' + name + '` function.' });
                    return undefined;
                }
            }

            return context[func];
        },

        get_element_data: function(el) {
            var data_filtered = {},
                prefix = xross.data_items_prefix;

            $.each(el.data(), function(name, val){
                var t = typeof val;
                if (t == 'string' || t == 'number' || t == 'boolean') {  // Only simple types are supported, no object serialization.
                    if (name.slice(0, prefix.length) == prefix) {
                        name = name.slice(prefix.length);
                    }
                    data_filtered[name] = val;
                }
            });
            return data_filtered;
        }

    },

    handlers: {
        ajax: {
            func: function(el_selector, params) {
                var event_target = el_selector,
                    $el = $(el_selector),
                    operation_id = $el.attr('id');

                if (params.op) {
                    operation_id = params.op;
                }

                // Populate params with those from element's data attributes.
                params = $.extend({}, params, xross.utils.get_element_data($el));

                if (params.event==='auto') {
                    // Trying to automatically deduce event from element type.
                    params.event = 'ready';
                    if ($el.length) {
                        var tag_name = $el.prop('tagName').toLowerCase(),
                            event_mapping = {
                                button: 'click',
                                a: 'click'
                            },
                            proposed_event = event_mapping[tag_name];

                        if (proposed_event!==undefined) {
                            params.event = proposed_event;
                        }
                    }
                }

                if (params.event==='ready') {
                    if (!$el.length) {
                        // no sense in binding ready to a non existing element
                        xross.utils.log(function(){ return 'Skipping binding `ready` for not found `' + el_selector + '` element.' });
                        return;
                    }
                    // ready is used only for document object, so we force a new event target
                    event_target = {};
                }

                if (typeof params.target==='string') {
                    if (params.target==='this') {
                        // `this` alias into an actual element
                        params.target = el_selector;
                    } else {
                        // Trying to consider this target to be an element id.
                        var target_id = '#'+params.target;
                        params.target = function() { return $(target_id); };
                    }
                }

                if (typeof params.complete==='string') {
                    params.complete = xross.utils.get_function(params.complete, window);
                }

                if (typeof params.success==='string') {
                    var func_name = params.success,
                        func = xross.utils.get_function(func_name, {
                            remove: function(data, status, xhr, target) { target.remove(); },
                            empty: function(data, status, xhr, target) { target.empty(); },
                            fill: function(data, status, xhr, target) { target.html(data); },
                            replace: function(data, status, xhr, target) { target.replaceWith(data); },
                            append: function(data, status, xhr, target) { target.append(data); },
                            prepend: function(data, status, xhr, target) { target.prepend(data); }
                        });

                    if (func===undefined) {
                        func = xross.utils.get_function(func_name, window);
                    }

                    params.success = function(data, status, xhr) {
                        xross.utils.log(function(){ return 'Running `' + func_name + '` success function for `' + el_selector + '` element.' });
                        func(data, status, xhr, $(xross.utils.evaluate(params.target, $el)));
                    };
                }

                if (typeof params.error==='string') {
                    var err_func_name = params.error,
                        err_func = xross.utils.get_function(err_func_name, {
                            log: function(xhr, status, error) {
                                xross.utils.log(function(){ return 'Request failed `' + error + '`: `' + xhr.responseText + '`.' });
                            }
                        });

                    if (err_func===undefined) {
                        err_func = xross.utils.get_function(err_func_name, window);
                    }

                    params.error = function(xhr, status, error) {
                        xross.utils.log(function(){ return 'Running `' + err_func_name + '` error function for `' + el_selector + '` element.' });
                        err_func(xhr, status, error);
                    };
                }

                xross.utils.log(function(){ return 'Binding `' + params.event + '` for `' + el_selector + '`.' });

                $(document).on(params.event, event_target, function(e) {
                    var data = $.extend({}, { op: operation_id }, xross.utils.get_element_data($(el_selector))),
                        form = null;
                    xross.utils.log(function(){ return 'Triggering `' + params.event + '` for `' + el_selector + '` with `' + $.param(data) + '`.' });
                    if (params.form) {
                        if (typeof params.form==='string') {
                            form = $('#' + params.form);
                        } else {
                            form = params.form;
                        }
                        if (form.length) {
                            data = $.param(data) + '&' + form.serialize();  // Join form data with basic data.
                        }
                    }
                    $.ajax({
                        type: params.method,
                        data: data,
                        success: params.success,  // data, status, xhr
                        error: params.error,  // xhr, status, error
                        complete: params.complete,  // xhr, status
                        cache: false
                    });
                    e.preventDefault();
                });

            },
            params: {
                method: 'GET',
                event: 'auto',
                target: 'this',
                success: 'fill',
                error: 'log',
                complete: null,
                form: null,
                op: null
            }
        }
    }

};
