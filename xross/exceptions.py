
class XrossException(Exception):
    """"""


class ResponseException(XrossException):
    """"""


class ResponseEmpty(XrossException):
    """"""


class ResponseReady(ResponseException):

    def __init__(self, response):
        self.response = response


class HandlerException(XrossException):
    """"""


class MissingOperationArgument(HandlerException):
    """"""


class OperationUnimplemented(HandlerException):
    """"""
