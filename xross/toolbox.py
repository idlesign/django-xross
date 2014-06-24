from inspect import currentframe

from django.conf import settings
from django.http.response import HttpResponse, HttpResponseBadRequest, HttpResponseNotFound

from .exceptions import ResponseReady, ResponseEmpty, HandlerException
from .utils import build_handler_class


def xross_view(*op_functions, **kwargs):
    """This decorator should be used to decorate those applications views 
    that require xross functionality.

    :param list op_functions: operations (functions, methods) responsible for handling xross requests.
    :param kwargs:
    """

    operations = {}

    for op_function in op_functions:
        operations[op_function.__name__] = op_function

    handler_class = build_handler_class(operations)

    def dec_wrapper(func, *dargs, **dkwargs):
        def func_wrapper(*fargs, **fkwargs):

            request = fargs[0]
            if isinstance(request, object):
                request = fargs[1]

            request._xross_handler = handler_class(request, func)

            try:
                reponse = func(*fargs, **fkwargs)

            except HandlerException as e:
                return HttpResponseBadRequest(e if settings.DEBUG else b'')

            except ResponseEmpty as e:
                return HttpResponseNotFound(e if settings.DEBUG else b'')

            except ResponseReady as r:
                reponse = r.response

            return reponse

        return func_wrapper
    return dec_wrapper


def xross_listener(**xross_attrs):
    """Instructs xross to handle AJAX calls right from the moment it is called.
    
    :param dict xross_attrs: xross handler attributes. Those attributes will be available in operation functions.
    """
    handler = currentframe().f_back.f_locals['request']._xross_handler
    handler.set_attrs(**xross_attrs)
    response = handler.dispatch()
    if response:
        raise ResponseReady(response)
