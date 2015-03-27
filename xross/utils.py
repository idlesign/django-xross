import json

from collections import OrderedDict
from inspect import signature, currentframe

from django.http.response import HttpResponse, HttpResponseBadRequest, HttpResponseNotFound
from django.conf import settings

from .exceptions import (
    MissingOperationArgument, OperationUnimplemented, ResponseEmpty, HandlerException, ResponseReady)


def construct_operations_dict(*op_functions):
    operations_dict = {
        '_op_bindings': OrderedDict()
    }

    for op_function in op_functions:
        method_name = XrossHandlerBase.get_op_method_name(op_function.__name__)
        operations_dict['_op_bindings'][method_name] = op_function

    return operations_dict


def build_handler_class(operations_dict):
    return type('XrossDynamicHandler', (XrossHandlerBase,), operations_dict)


def xross_listener(**xross_attrs):
    """Instructs xross to handle AJAX calls right from the moment it is called.

    :param dict xross_attrs: xross handler attributes. Those attributes will be available in operation functions.
    """
    handler = currentframe().f_back.f_locals['request']._xross_handler
    handler.set_attrs(**xross_attrs)
    handler.dispatch()


def xross_view(*op_functions, **kwargs):
    """This decorator should be used to decorate those applications views
    that require xross functionality.

    :param list op_functions: operations (functions, methods) responsible for handling xross requests.
    :param kwargs:
    """

    operations_dict = construct_operations_dict(*op_functions)

    def dec_wrapper(func, *dargs, **dkwargs):
        def func_wrapper(*fargs, **fkwargs):

            request = fargs[0]
            if isinstance(request, object):
                request = fargs[1]

            if hasattr(request, '_xross_handler'):
                request._xross_handler._op_bindings.update(operations_dict['_op_bindings'])
            else:
                request._xross_handler = build_handler_class(operations_dict)(request, func)

            try:
                response = func(*fargs, **fkwargs)

            except HandlerException as e:
                return HttpResponseBadRequest(e if settings.DEBUG else b'')

            except ResponseEmpty as e:
                return HttpResponseNotFound(e if settings.DEBUG else b'')

            except ResponseReady as r:
                response = r.response

                if response is None:
                    response = ''

                if isinstance(response, str):
                    response = HttpResponse(response)

                elif isinstance(response, dict):
                    response = HttpResponse(json.dumps(response), content_type='application/json')

            return response

        return func_wrapper
    return dec_wrapper


class XrossHandlerBase(object):
    """"""

    http_method = 'REQUEST'
    request_data = None
    attrs = {}

    _op_bindings = {}

    def __init__(self, request, view_func):
        self.request = request
        self.view_func = view_func

    def set_attrs(self, **attrs):
        self.attrs = attrs

    @classmethod
    def get_op_method_name(cls, name):
        return 'op_%s' % name

    def get_op_callable(self, name):
        handler = getattr(self, name, None)

        if handler is None:
            handler = self._op_bindings.get(name)

        if handler is None:
            raise OperationUnimplemented(
                'Requested `%s` operation is not implemented. Missing xross handler for `%s`.' % (name, self.view_func)
            )

        return handler

    @classmethod
    def _get_handler_args(cls, handler):
        signature_params = signature(handler).parameters

        args = []
        kwargs = []

        for param_name, param in signature_params.items():

            if param.kind == param.POSITIONAL_ONLY:
                args.append(param_name)

            elif param.kind == param.POSITIONAL_OR_KEYWORD:
                if param.default == param.empty:
                    args.append(param_name)
                else:
                    kwargs.append(param_name)

        return args, kwargs

    @classmethod
    def _cast_val(cls, val):
        if val.lower() == 'null':
            val = None
        if val.lower() == 'true':
            val = True
        elif val.lower() == 'false':
            val = False
        elif val.isdigit():  # NB: this won't handle floats.
            val = int(val)
        return val

    def dispatch(self):
        if self.request.is_ajax():
            request_data = getattr(self.request, self.http_method)
            operation_id = request_data.get('op', None)

            if operation_id is not None:
                self.request_data = request_data

                op_name = self.get_op_method_name(operation_id)
                handler = self.get_op_callable(op_name)

                args_handler, kwargs_handler = self._get_handler_args(handler)

                # Binding args.
                args_bound = []
                for idx, arg in enumerate(args_handler):

                    if idx == 0 and arg == 'self':
                        view_obj = self
                        try:
                            # Trying to set handler's `self` to an appropriate obj.
                            view_obj = currentframe().f_back.f_back.f_locals['self']
                        except AttributeError:
                            pass
                        val = view_obj
                    elif idx in (0, 1) and arg == 'request':
                        val = self.request
                    else:
                        val = self._cast_val(request_data.get(arg))

                    if val is not None:
                        args_bound.append(val)

                if len(args_bound) != len(args_handler):
                    raise MissingOperationArgument(
                        'Missing `%s` argument(s) for `%s` operation.' % (
                            ', '.join(set(args_handler).difference(args_bound)), op_name
                        )
                    )

                # Binding kwargs.
                kwargs_bound = {
                    'xross': self
                }
                if kwargs_handler:
                    for kwarg in kwargs_handler:
                        val = request_data.get(kwarg)
                        if val is not None:
                            kwargs_bound[kwarg] = self._cast_val(val)

                response = handler(*args_bound, **kwargs_bound)

                raise ResponseReady(response)
