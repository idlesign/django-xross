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
                func = func.attach;
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
                if (!(el instanceof Array)) {
                    el = [el];
                }
                $.each(el, function (idx, obj) {
                    var $obj = $(obj);
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
            },

            /**
             * Resolves function from handler parameter. Strings are resolved against
             * the given context.
             *
             * @param param
             * @param funcContext
             * @returns {*}
             */
            resolveFuncFromParam: function (param, funcContext) {

                if (typeof param === 'string') {
                    var funcName = param,
                        func = xross.utils.getFunction(funcName, funcContext);

                    // Try to get function from window (global).
                    if (func === undefined) {
                        func = xross.utils.getFunction(funcName, window);
                    }

                    return func;
                }

                return param;
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

                /**
                 * Resolves request-response complete handling function.
                 *
                 * @param params
                 * @param $el
                 * @param elSelector
                 * @returns {Function}
                 * @private
                 */
                _resolveFuncComplete: function (params, $el, elSelector) {
                    var func = xross.utils.resolveFuncFromParam(params.complete, window);

                    params.complete = function () {
                        xross.utils.log(function () {
                            return 'Running `' + func + '` complete function for `' + elSelector + '` element.';
                        });
                        if (func) {
                            func();
                        }
                        $el.trigger($.Event('xrossajaxafter'));
                    };

                },

                /**
                 * Resolves error handling function.
                 *
                 * @param params
                 * @param $el
                 * @param elSelector
                 * @returns {params.error|*}
                 * @private
                 */
                _resolveFuncError: function (params, $el, elSelector) {
                    var func = xross.utils.resolveFuncFromParam(params.error, {
                            log: function (xhr, status, error) {
                                xross.utils.log(function () {
                                    return 'Request failed `' + error + '`: `' + xhr.responseText + '`.';
                                });
                            }
                        });

                    params.error = function (xhr, status, error) {
                        xross.utils.log(function () {
                            return 'Running `' + func + '` error function for `' + elSelector + '` element.';
                        });
                        if (func) {
                            func(xhr, status, error);
                        }
                    };

                },

                /**
                 * Resolves success handling function.
                 *
                 * @param params
                 * @param $el
                 * @param elSelector
                 * @returns {params.success|*}
                 * @private
                 */
                _resolveFuncSuccess: function (params, $el, elSelector) {
                    var func = xross.utils.resolveFuncFromParam(params.success, {
                            remove: function (data, status, xhr, target) { target.remove(); },
                            empty: function (data, status, xhr, target) { target.empty(); },
                            fill: function (data, status, xhr, target) { target.html(data); },
                            replace: function (data, status, xhr, target) { target.replaceWith(data); },
                            append: function (data, status, xhr, target) { target.append(data); },
                            prepend: function (data, status, xhr, target) { target.prepend(data); }
                        });

                    params.success = function (data, status, xhr) {
                        xross.utils.log(function () {
                            return 'Running `' + func + '` success function for `' + elSelector + '` element.';
                        });
                        if (func) {
                            func(data, status, xhr, $(xross.utils.evaluate(params.target, $el)));
                        }
                    };
                },

                /**
                 * Resolves event type and return event source (element).
                 *
                 * @param params
                 * @param $el
                 * @param elSelector
                 * @returns {*}
                 * @private
                 */
                _resolveEvent: function (params, $el, elSelector) {
                    var eventSource = elSelector,
                        event = params.event;

                    if (event === 'auto') {
                        // Trying to automatically deduce event from element type.
                        event = 'ready';

                        if ($el.length) {
                            var tagName = $el.prop('tagName').toLowerCase(),
                                eventMapping = {
                                    button: 'click',
                                    a: 'click'
                                },
                                proposedEvent = eventMapping[tagName];

                            if (proposedEvent !== undefined) {
                                event = proposedEvent;
                            }
                        }
                    }

                    if (event === 'ready') {
                        if (!$el.length) {
                            // no sense in binding ready to a non existing element
                            xross.utils.log(function () {return 'Skipping binding `ready` to an unknown `' +
                                elSelector + '` element.'; });
                            return;
                        }
                        // ready is used only for document object, so we force a new event target
                        eventSource = {};
                    }

                    return {event: event, source: eventSource};
                },

                /**
                 * Resolves target element.
                 *
                 * @param params
                 * @param $el
                 * @param elSelector
                 * @returns {*}
                 * @private
                 */
                _resolveTarget: function (params, $el, elSelector) {
                    var targetId;

                    if (typeof params.target === 'string') {
                        if (params.target === 'this') {
                            // `this` alias into an actual element
                            targetId = elSelector;
                            if (targetId === '#undefined') {
                                xross.utils.log(function () {
                                    return 'Skipping: `#undefined` element can\'t be a target.';
                                });
                                return;
                            }
                            params.target = targetId;
                        } else {
                            // Trying to consider this target to be an element id.
                            targetId = '#' + params.target;
                            params.target = function () { return $(targetId); };
                        }
                    }

                    return targetId;
                },

                /**
                 * Main handler entry point.
                 * Attaches xross machinery to the element.
                 *
                 * @param $el
                 * @param defaultParams
                 */
                attach: function ($el, defaultParams) {
                    var operation = $el.attr('id'),
                        elSelector = '#' + operation,

                        // Populate params with those from element's data attributes.
                        params = $.extend({}, defaultParams, xross.utils.getElementData($el));

                    if (params.op) {
                        operation = params.op;
                    }

                    if (!operation) {
                        throw 'No operation name supplied for element.';
                    }

                    var e = xross.handlers.ajax._resolveEvent(params, $el, elSelector),
                        event = e.event,
                        eventSource = e.source,
                        responseTargetId = xross.handlers.ajax._resolveTarget(params, $el, elSelector);

                    xross.handlers.ajax._resolveFuncComplete(params, $el, elSelector);
                    xross.handlers.ajax._resolveFuncSuccess(params, $el, elSelector);
                    xross.handlers.ajax._resolveFuncError(params, $el, elSelector);

                    xross.utils.log(function () { return 'Binding `' + event +
                        '` to `' + elSelector + '` targeting `' + responseTargetId + '`.'; });

                    $(document).on(event, eventSource, function (e) {

                        var $srcEl = $(elSelector),
                            data = $.extend({}, { op: operation }, xross.utils.getElementData($srcEl)),
                            form = params.form,
                            formData = {};

                        xross.utils.log(function () {
                            return 'Triggering `' + event + '` for `' + elSelector + '` with `' +
                                $.param(data) + '`.';
                        });

                        if (form) {
                            if (typeof form === 'string') {
                                form = $('#' + form);
                            }
                            if (form.length) {
                                if (form[0].checkValidity && !form[0].checkValidity()) {
                                    return;
                                }
                                formData = form.serializeArray();
                            }
                        }

                        var eBefore = $.Event('xrossajaxbefore', {
                            xrossData: data,
                            xrossFormData: formData
                        });

                        if (!$srcEl.trigger(eBefore)) {
                            return;
                        }

                        if (!$.isEmptyObject(formData)) {
                            data = $.param(data) + '&' + $.param(formData);  // Join form data with basic data.
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
