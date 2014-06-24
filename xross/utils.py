from inspect import signature, currentframe

from .exceptions import MissingOperationArgument, OperationUnimplemented, ResponseEmpty


def build_handler_class(operations):
    handler_dict = {
        '_op_bindings': {}
    }

    for op_name, op_func in operations.items():
        method_name = XrossHandlerBase.get_op_method_name(op_name)
        handler_dict['_op_bindings'][method_name] = op_func

    return type('XrossDynamicHandler', (XrossHandlerBase,), handler_dict)


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
            raise OperationUnimplemented('Requested `%s` operation is not implemented xross handler for `%s`.' % (name, self.view_func))

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
            element_id = request_data.get('el', None)

            if element_id is not None:
                self.request_data = request_data

                op_name = self.get_op_method_name(element_id)
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
                    raise MissingOperationArgument('Missing `%s` argument(s) for `%s` operation.' % (', '.join(set(args_handler).difference(args_bound)), op_name))

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

                if not response:
                    raise ResponseEmpty('Operation `%s` returned empty response.' % op_name)

                return response
