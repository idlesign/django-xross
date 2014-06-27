JavaScript Part
===============


Here you'll find some information on **xross** JavaScript part.


.. warning::

    Do not forget to include jQuery and **xross** itself in your templates:

    .. code-block:: html

        <script src="http://yandex.st/jquery/2.1.1/jquery.min.js"></script>
        <script src="{{ STATIC_URL }}js/xross/xross.js"></script>



xross.debug
-----------

Setting ``debug`` attribute to True allows **xross** to put debug information into browser console.

.. code-block:: js

    xross.debug = true;  // Remember to set this before other xross calls, e.g. automate().



xross.data_items_prefix
-----------------------

Allows to adjust a prefix for **data-** attributes of elements.

Attributes with this prefix will be considered by **xross**.

Default: **x**. E.g: use `myx` to pass all `data-myx` prefixed attributes to xross (data-myxsome, data-myxother, etc.).



xross.automate()
----------------

**Arguments:** xross_class, handler_name

Instructs **xross** to attach its handlers to page elements with a certain class (`xross` by default).

.. code-block:: js

    // You can instruct xross to watch for page elements with `xross` class.
    xross.automate();

    // Or any other, e.g. `x`. Automate elements with the default `ajax` handler.
    xross.automate('x');



xross.describe()
----------------

**Arguments:** el, handler_name, params

Under the cover `automate()` uses this method to describe various page elements in terms of **xross**.

.. code-block:: js

    // Attach the default (`ajax`) handler to 'my_element'.
    xross.describe('#my_element');



xross handlers
--------------

**xross** relies on so-called *handlers* to perform certain actions.

Each handler can accept certain parameters to adjust its behaviour.

The default handler is ``ajax``.



AJAX handler
------------

Alias: **ajax**.

AJAX handler is the default one. It simplifies sending AJAX requests to server and handling responses.


**Supported parameters**:


* **op**: operation identifier for server side. On server it is usually a name of a function to be executed.

  If not set ID attribute value of a current DOM element is used as operation ID.

  Default: **null**. Examples: null, myoperation.


* **method**: allows to set HTTP method for AJAX requests.

  Default: **GET**. Examples: POST, GET.


* **target**: allows to define a target DOM element over which some actions would be performed on success.

  Accepts a string (elements are addressed by their IDs) or an element object

  Default: **this**. Examples: this, mydiv.


* **event**: allows to define a DOM event which triggers AJAX functionality.

  If set to **auto**, xross will try to detect a proper event basing on element type.

  Default: **auto**. Examples: auto, ready, click.


* **success**: allows to set an action to performed on success.

  Accepts a function or a string (action alias).

  Default: **fill**. Examples: fill, replace.

  *Action aliases*:

    * **fill** - replaces target element content with data from server;

    * **replace** - replaces the whole target element with data from server;

    * **append** - appends data from server to target element contents;

    * **prepend** - prepends data from server to target element contents.


* **form**: allows sending form data to server vie AJAX.

  Accepts a string (forms are addressed by their IDs) or a form object

  Default: **null**. Examples: null, myform.

