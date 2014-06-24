Python Part
===========


Here you'll find some information on Python part of **xross**.

.. note::

    Functions described here are located in **xross.toolbox**.


Operations
----------

**xross** uses ``operation`` term to describe a function which is used for handling a **xross** request.

Practically any function can be used as an ``operation``.

* **View function**:

.. code-block:: python

    def my_view_and_op(request, some_id, xross=None):
        """This view could be used both as a separate view,
        and xross operation.

        If use as an operation:

            `request`: is a request from the main view (those are decorated with @xross_view());

            `some_id`: is get from your template (namely, by default from `data-xsome_id` attribute
            of a page element with `my_view_and_op` id);

            `xross`: is a xross handler object. That can contain some useful stuff (e.g stuff in `xross.attrs`
            dictionary could be passed with `xross_listen()` -- see below).
            NB: This keyword argument may be omitted from operation signature if not used.

        """
        ...


* **Ordinary function**:

.. code-block:: python

    def my_op_func(some_id):
        """NB: it also could be made to accept `xross` keyword argument
        to have access to xross handler object."""

        ...


* **Method** (that applies also to class-based views):

.. code-block:: python

    from django.views.generic.base import View


    class MyView(View):

        def my_op_method(self, request):
            """NB: it also could be made to accept `xross` keyword argument
            to have access to xross handler object."""

            ...



xross_view()
------------

**Arguments:** *op_functions

This decorator should be used to decorate those applications views that require **xross** functionality.

Pass into it the functions (operations) responsible for handling **xross** requests.

.. code-block:: python

    from xross.toolbox import xross_view


    @xross_view(my_op_func, my_view_and_op)
    def index_page(request):
        """This is our view."""
        ...



xross_listener()
----------------

**Arguments:** **xross_attrs

Has to be put in your views in places when **xross** handling is expected.

Accepts xross handler attributes as keyword arguments. Those attributes will be available in operation functions
from xross handler object (see notes on ``xross`` keyword argument in Operations section above) in ``attrs`` attribute.

.. code-block:: python

    from django.shortcuts import render
    from xross.toolbox import xross_view, xross_listener


    def my_op_func(some_id, xross=None):

        ...

        item = xross.attrs['that_item']  # `that_item` is passed here from `xross_listener()` (see below)

        ...

        return render(request, 'mytemplates/some.html')


    @xross_view(my_op_func)
    def index_page(request):

        my_item = ...  # Imagine we need to get some item data on every request.

        # Instruct xross to handle AJAX calls from that moment.
        # And make `that_item` available to operation functions.
        xross_listener({'that_item': my_item})

        ...

        return render(request, 'mytemplates/index.html')



Debugging
---------

While DEBUG in your `settings.py` is set to ``True`` **xross** will supply you with useful debugging information
putting error description in every response to bad requests. Use your browser development console to watch it.
