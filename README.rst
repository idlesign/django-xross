django-xross
============
https://github.com/idlesign/django-xross

.. image:: https://img.shields.io/pypi/v/django-xross.svg
    :target: https://pypi.python.org/pypi/django-xross

.. image:: https://img.shields.io/pypi/dm/django-xross.svg
    :target: https://pypi.python.org/pypi/django-xross

.. image:: https://img.shields.io/pypi/l/django-xross.svg
    :target: https://pypi.python.org/pypi/django-xross

.. image:: https://img.shields.io/coveralls/idlesign/django-xross/master.svg
    :target: https://coveralls.io/r/idlesign/django-xross

.. image:: https://img.shields.io/travis/idlesign/django-xross/master.svg
    :target: https://travis-ci.org/idlesign/django-xross

.. image:: https://img.shields.io/codeclimate/github/idlesign/django-xross.svg
   :target: https://codeclimate.com/github/idlesign/django-xross


Description
-----------

*Reusable application for Django nicely bridging client and server sides.*

Streamline you server and client interaction using some declarative techniques in your HTML,
and a couple of xross functions in your views.


Somewhere in your `views.py`:

.. code-block:: python

    from django.shortcuts import render
    from xross.toolbox import xross_view, xross_listener  # That's all we need from xross.


    def list_news(request):
        """This function will be used by xross to load news using AJAX."""
        news = ...  # Here we fetch some news from DB.
        return render(request, 'mytemplates/sub_news.html', {'news': news})


    @xross_view(list_news)  # Decorate your view - instruct xross to use `list_news` when needed.
    def index_page(request):
        """This is our view to streamline."""

        xross_listener()  # xross will handle AJAX calls from that moment.

        return render(request, 'mytemplates/index.html')



Now to your `mytemplates/index.html`:

.. code-block:: html

    <!DOCTYPE html>
    <html>
    <head>
        <!-- xross depends on jQuery. Include it. -->
        <script src="http://yandex.st/jquery/2.1.1/jquery.min.js"></script>

        <!-- Now xross itself. -->
        <script src="{{ STATIC_URL }}js/xross/xross.min.js"></script>
        <script type="text/javascript">
            xross.automate();  // Instruct xross to watch for page elements with `xross` class.
        </script>
    </head>
    <body>
        <div id="list_news" class="xross">
            <!--
                Contents of this div will be replaced with news from Django's `list_news()`
                automatically on page load.

                That's the default of xross, but it knows some other nice little tricks.
                Read the docs.
             -->
        </div>
    </body>
    </html>


At last `mytemplates/sub_news.html` (nothing special):

.. code-block:: html

    {% for item in news %}
        <div>
            <div>{{ item.title }}</div>
            <div>{{ item.text }}</div>
        </div>
    {% endfor %}


That's not all, not at all. Read the docs!



Documentation
-------------

http://django-xross.readthedocs.org/

