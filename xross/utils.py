import json
from inspect import signature, currentframe
from typing import Callable, Type, Tuple, List

from django.conf import settings
from django.http.request import HttpRequest
from django.http.response import HttpResponse, HttpResponseBadRequest, HttpResponseNotFound

from .exceptions import (
    MissingOperationArgument, OperationUnimplemented, ResponseEmpty, HandlerException, ResponseReady)


def construct_operations_dict(*op_functions: Callable) -> dict:

    operations_dict = {
        '_op_bindings': {}
    }

    for op_function in op_functions:
        method_name = XrossHandlerBase.get_op_method_name(op_function.__name__)
        operations_dict['_op_bindings'][method_name] = op_function

    return operations_dict


def build_handler_class(operations_dict: dict) -> Type['XrossHandlerBase']:
    return type('XrossDynamicHandler', (XrossHandlerBase,), operations_dict)  # noqa


def xross_listener(http_method: str = None, **xross_attrs):
    """Instructs xross to handle AJAX calls right from the moment it is called.

    This should be placed in a view decorated with `@xross_view()`.

    :param http_method: GET or POST. To be used as a source of data for xross.

    :param xross_attrs: xross handler attributes.
        Those attributes will be available in operation functions in `xross` keyword argument.

    """
    handler = currentframe().f_back.f_locals['request']._xross_handler
    handler.set_attrs(**xross_attrs)

    if http_method is not None:
        handler.http_method = http_method

    handler.dispatch()


def xross_view(*op_functions: Callable) -> Callable:
    """This decorator should be used to decorate application views that require xross functionality.

    :param list op_functions: operations (functions, methods) responsible for handling xross requests.

        Function names considered to be operations names. Using them clients will address those functions
        (e.g. xross-ready HTML elements may be marked with `data-xop` attributes to define
        the above mentioned operations, or just define `id` which will serve for the same purpose).

        They can accept `request` as first argument (for methods it'll be second, as the first is `self`),
        and other params from client side (e.g. defined in `data-x...` html element attributes).

        It can also accept `xross` keyword argument, which will contain any additional `xross attrs`
        as defined by `xross_listener()`.

        Those functions should return string or dict (handled by client as JSON) or HTTPResponse,
        e.g. from `render()` result.

        Examples:

            def do_something(request, param1_from_html_el, param2_from_html_el, xross=None):
                return f'{param1_from_html_el} - {param2_from_html_el}'

    """
    operations_dict = construct_operations_dict(*op_functions)

    def get_request(src):
        return src if isinstance(src, HttpRequest) else None

    def dec_wrapper(func: Callable):

        def func_wrapper(*fargs, **fkwargs) -> HttpResponse:

            request_idx = getattr(func, '_req_idx', None)

            if request_idx is None:
                request = get_request(fargs[0])
                request_idx = 0

                if not request:
                    # Possibly a class-based view where 0-attr is `self`.
                    request = get_request(fargs[1])
                    request_idx = 1

                func._req_idx = request_idx

            else:
                request = fargs[request_idx]

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

            except ResponseReady as ready:
                response = ready.response

                if response is None:
                    response = ''

                if isinstance(response, str):
                    response = HttpResponse(response)

                elif isinstance(response, dict):
                    response = HttpResponse(json.dumps(response), content_type='application/json')

            return response

        return func_wrapper
    return dec_wrapper


class XrossHandlerBase:

    _op_bindings = {}

    def __init__(self, request: HttpRequest, view_func: Callable):
        self.attrs = {}
        self.http_method = 'GET'
        self.request = request
        self.view_func = view_func

    def set_attrs(self, **attrs):
        self.attrs = attrs

    @classmethod
    def get_op_method_name(cls, name):
        return f'op_{name}'

    def get_op_callable(self, name: str) -> Callable:
        handler = getattr(self, name, None)

        if handler is None:
            handler = self._op_bindings.get(name)

        if handler is None:
            raise OperationUnimplemented(
                f'Requested `{name}` operation is not implemented. '
                f'Missing xross handler for `{self.view_func}`.')

        return handler

    @classmethod
    def _get_handler_args(cls, handler: Callable) -> Tuple[List[str], List[str]]:
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
        lower = val.lower()

        if lower == 'null':
            val = None

        if lower == 'true':
            val = True

        elif lower == 'false':
            val = False

        elif val.isdigit():  # NB: this won't handle floats.
            val = int(val)

        return val

    def dispatch(self):

        if not self.request.is_ajax():
            return

        request_data = getattr(self.request, self.http_method)
        operation_id = request_data.get('op', None)

        if operation_id is None:
            return

        op_name = self.get_op_method_name(operation_id)
        handler = self.get_op_callable(op_name)

        args_handler, kwargs_handler = self._get_handler_args(handler)

        cast = self._cast_val

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
                val = cast(request_data.get(arg))

            if val is not None:
                args_bound.append(val)

        if len(args_bound) != len(args_handler):
            raise MissingOperationArgument(
                f"Missing `{', '.join(set(args_handler).difference(args_bound))}` "
                f"argument(s) for `{op_name}` operation.")

        # Binding kwargs.
        kwargs_bound = {}
        if kwargs_handler:

            # xross kwarg
            if 'xross' in kwargs_handler:
                kwargs_bound['xross'] = self

            for kwarg in kwargs_handler:
                val = request_data.get(kwarg)
                if val is not None:
                    kwargs_bound[kwarg] = cast(val)

        response = handler(*args_bound, **kwargs_bound)

        raise ResponseReady(response)
