/**
 * django-xross
 * https://github.com/idlesign/django-xross
 *
 * Distributed under BSD License.
 */


/*global $, console */
/*jslint browser: true*/
/*jshint unused: true, node: true */
/*jslint unparam: true, node: true */
var xross = (function () {
    "use strict";

    return {

        _handlersRegistry: {},
        _defaultHandler: 'ajax',
        dataItemsPrefix: 'x',
        debug: false,

        /**
         * Automatically describes all elements marked with
         * the given (or default `xross`) class in xross terms.
         *
         * @param xrossMarker
         * @param handlerName
         */
        automate: function (xrossMarker, handlerName) {
            if (xrossMarker === undefined) {
                xrossMarker = 'xross';
            }
            $(function () {
                $.each($('.' + xrossMarker), function (idx, obj) {
                    xross.describe($(obj), handlerName);
                });
            });
        },

        /**
         * Bootstraps xross machinery.
         */
        bootstrap: function () {
            this.registerHandler('ajax', this.handlers.ajax);
        },

        /**
         * Registers handler object for xross environment.
         *
         * @param alias
         * @param func
         * @param defaultParams
         */
        registerHandler: function (alias, func, defaultParams) {
            if (typeof func === 'object') {
                defaultParams = func.params;
                func = func.func;
            }

            if (defaultParams === undefined) {
                defaultParams = {};
            }

            this.utils.log(function () { return 'Registering `' + alias + '` handler.'; });

            this._handlersRegistry[alias] = {
                func: func,
                params: defaultParams
            };
        },

        /**
         * Describes the given elemnt in term of xross.
         *
         * @param el
         * @param handlerName
         * @param params
         */
        describe: function (el, handlerName, params) {
            var $el = $(el);

            if (typeof handlerName !== 'string') {
                params = handlerName;
                handlerName = this._defaultHandler;
            }

            if (params === undefined) {
                params = {};
            }

            var handler = this._handlersRegistry[handlerName];
            if (handler === undefined) {
                if (handlerName === this._defaultHandler) {
                    xross.bootstrap();
                    handler = this._handlersRegistry[handlerName];
                } else {
                    throw 'You are trying to use an unregistered handler:  `' + handler + '`.';
                }
            }

            $(function () {
                if (!($el instanceof Array)) {
                    $el = [$el];
                }
                $.each($el, function (idx, $obj) {
                    xross.utils.log(function () { return 'Describing `#' + $obj.attr('id') + '` using `' +
                        handlerName + '` handler.'; });

                    handler.func($obj, $.extend({}, handler.params, params));
                });
            });
        },

        /**
         * Utility methods.
         */
        utils: {

            /**
             * Evaluates input object.
             * If it is a functions, runs it with the given argument.
             *
             * @param input
             * @param arg
             * @returns {*}
             */
            evaluate: function (input, arg) {
                if (input instanceof Function) {
                    return input(arg);
                }
                return input;
            },

            /**
             * Dumps message to console in debug mode.
             * @param message
             */
            log: function (message) {
                if (xross.debug) {
                    console.log('xross: ' + message());
                }
            },

            /**
             * Returns function object by it string representation.
             * @param name
             * @param context
             * @returns {*}
             */
            getFunction: function (name, context) {
                var pathChunks = name.split('.'),
                    func = pathChunks.pop(),
                    msg = function () { return 'Unable to find `' + name + '` function.'; },
                    i;

                for (i = 0; i < pathChunks.length; i = i + 1) {
                    context = context[pathChunks[i]];
                    if (context === undefined) {
                        xross.utils.log(msg);
                        return undefined;
                    }
                }

                return context[func];
            },

            /**
             * Gets relevant `data-...` attrs from element.
             * @param el
             * @returns {{}}
             */
            getElementData: function (el) {
                var dataFiltered = {},
                    prefix = xross.dataItemsPrefix;

                $.each(el.data(), function (name, val) {
                    var t = typeof val;
                    if ($.inArray(t, ['string', 'number', 'boolean']) > -1) {
                        // Only simple types are supported, no object serialization.

                        if (name.slice(0, prefix.length) === prefix) {
                            name = name.slice(prefix.length);
                        }
                        dataFiltered[name] = val;
                    }
                });
                return dataFiltered;
            }

        },

        /**
         * Various handlers to perform operations.
         */
        handlers: {

            /**
             * Default handler, issuing AJAX requests to server and processing responses.
             */
            ajax: {
                func: function ($el, params) {
                    var operation = $el.attr('id'),
                        elSelector = '#' + operation,
                        eventTarget = elSelector,
                        responseTargetId;

                    // Populate params with those from element's data attributes.
                    params = $.extend({}, params, xross.utils.getElementData($el));

                    if (params.op) {
                        operation = params.op;
                    }

                    if (!operation) {
                        throw 'No operation name supplied for element.';
                    }

                    if (params.event === 'auto') {
                        // Trying to automatically deduce event from element type.
                        params.event = 'ready';

                        if ($el.length) {
                            var tagName = $el.prop('tagName').toLowerCase(),
                                eventMapping = {
                                    button: 'click',
                                    a: 'click'
                                },
                                proposedEvent = eventMapping[tagName];

                            if (proposedEvent !== undefined) {
                                params.event = proposedEvent;
                            }
                        }
                    }

                    if (params.event === 'ready') {
                        if (!$el.length) {
                            // no sense in binding ready to a non existing element
                            xross.utils.log(function () {return 'Skipping binding `ready` to an unknown `' +
                                elSelector + '` element.'; });
                            return;
                        }
                        // ready is used only for document object, so we force a new event target
                        eventTarget = {};
                    }

                    if (typeof params.target === 'string') {
                        if (params.target === 'this') {
                            // `this` alias into an actual element
                            responseTargetId = elSelector;
                            if (responseTargetId === '#undefined') {
                                xross.utils.log(function () {
                                    return 'Skipping: `#undefined` element can\'t be a target (operation - `' +
                                        operation + '`).';
                                });
                                return;
                            }
                            params.target = responseTargetId;
                        } else {
                            // Trying to consider this target to be an element id.
                            responseTargetId = '#' + params.target;
                            params.target = function () { return $(responseTargetId); };
                        }
                    }

                    xross.utils.log(function () { return 'Binding `' + params.event +
                        '` to `' + elSelector + '` targeting `' + responseTargetId + '`.'; });

                    if (typeof params.complete === 'string') {
                        params.complete = xross.utils.getFunction(params.complete, window);
                    }

                    if (typeof params.success === 'string') {
                        var funcName = params.success,
                            func = xross.utils.getFunction(funcName, {
                                remove: function (data, status, xhr, target) { target.remove(); },
                                empty: function (data, status, xhr, target) { target.empty(); },
                                fill: function (data, status, xhr, target) { target.html(data); },
                                replace: function (data, status, xhr, target) { target.replaceWith(data); },
                                append: function (data, status, xhr, target) { target.append(data); },
                                prepend: function (data, status, xhr, target) { target.prepend(data); }
                            });

                        if (func === undefined) {
                            func = xross.utils.getFunction(funcName, window);
                        }

                        params.success = function (data, status, xhr) {
                            xross.utils.log(function () {
                                return 'Running `' + funcName + '` success function for `' +
                                    elSelector + '` element.';
                            });

                            func(data, status, xhr, $(xross.utils.evaluate(params.target, $el)));
                        };
                    }

                    if (typeof params.error === 'string') {
                        var errFuncName = params.error,
                            errFunc = xross.utils.getFunction(errFuncName, {
                                log: function (xhr, status, error) {
                                    xross.utils.log(function () {
                                        return 'Request failed `' + error + '`: `' + xhr.responseText + '`.';
                                    });
                                }
                            });

                        if (errFunc === undefined) {
                            errFunc = xross.utils.getFunction(errFuncName, window);
                        }

                        params.error = function (xhr, status, error) {
                            xross.utils.log(function () {
                                return 'Running `' + errFuncName + '` error function for `' + elSelector + '` element.';
                            });

                            errFunc(xhr, status, error);
                        };
                    }

                    $(document).on(params.event, eventTarget, function (e) {

                        var data = $.extend({}, { op: operation }, xross.utils.getElementData($(elSelector))),
                            form = null;

                        xross.utils.log(function () {
                            return 'Triggering `' + params.event + '` for `' + elSelector + '` with `' +
                                $.param(data) + '`.';
                        });

                        if (params.form) {
                            if (typeof params.form === 'string') {
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
                    // HTTP method to be used.
                    method: 'GET',
                    // Event name to listen to. E.g. auto (deduce from element type), ready (document loaded), click ...
                    event: 'auto',
                    // Element to target response into. this - element itself; element id.
                    target: 'this',
                    // Action to perform on element: remove, empty, fill, replace, append, prepend.
                    success: 'fill',
                    // Issued on errors. `log` - dump error into console.
                    error: 'log',
                    // A function triggered after both operation success and failure (as object or string).
                    complete: null,
                    // Accepts form element ID or a form object. Form data will be sent to server.
                    form: null,
                    // Operation identifier for server side. On server it is usually a name of a function
                    // to be executed.
                    op: null
                }
            }
        }

    };
}());
