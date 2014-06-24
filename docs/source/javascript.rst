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

